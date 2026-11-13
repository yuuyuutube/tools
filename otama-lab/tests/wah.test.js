import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
import { wahParameters, WahSynth } from '../src/wah/audio.js';
import { bindWahInput } from '../src/wah/input.js';
import { spectrumPoints, WahSpectrum } from '../src/wah/spectrum.js';
class WahParam {
  value = 0;
  setTargetAtTime(value) { this.value = value; }
  linearRampToValueAtTime(value) { this.value = value; }
  setValueAtTime(value) { this.value = value; }
  cancelScheduledValues() {}
}
class WahNode {
  frequency = new WahParam(); Q = new WahParam(); gain = new WahParam(); links = []; stopped = false;
  connect(next) { this.links.push(next); return next; }
  disconnect() { this.disconnected = true; }
  start() { this.started = true; }
  stop() { this.stopped = true; this.onended?.(); }
}
class WahContext extends EventTarget {
  state = 'running'; currentTime = 0; destination = {}; oscillators = [];
  resume() { return Promise.resolve(); }
  createAnalyser() { return new WahNode(); }
  createOscillator() { const node = new WahNode(); this.oscillators.push(node); return node; }
  createBiquadFilter() { return new WahNode(); }
  createGain() { return new WahNode(); }
}
test('Wah resonance mapping is monotonic and bounded; opening never changes oscillator pitch', async () => {
  let previous = wahParameters(0);
  for (let i = 1; i <= 1000; i++) { const p = wahParameters(i / 1000); assert.ok(p.lowHz > previous.lowHz && p.highHz > previous.highHz); previous = p; }
  assert.deepEqual(wahParameters(-1), wahParameters(0)); assert.deepEqual(wahParameters(2), wahParameters(1));
  const synth = new WahSynth({ Context: WahContext }); synth.setFrequency(445.123);
  await synth.setEnabled(true); assert.equal(synth.context.oscillators.length, 0);
  await synth.play(); const voice = synth.voice;
  for (const opening of [0, .2, .7, 1]) { synth.setOpening(opening); assert.equal(voice.osc.frequency.value, 445.123); assert.equal(voice.low.frequency.value, wahParameters(opening).lowHz); }
  synth.setFrequency(660); assert.equal(voice.osc.frequency.value, 660);
  synth.stop(); synth.stop(); assert.equal(synth.voice, null); assert.ok(voice.osc.stopped); assert.ok(voice.nodes.every(node => node.disconnected));
});
test('Wah release and mute invalidate pending resumes, overlapping play creates just one voice', async () => {
  const synth = new WahSynth({ Context: WahContext }); await synth.setEnabled(true);
  let resolve; synth.context.resume = () => new Promise(r => { resolve = r; });
  const pending = synth.play(); synth.stop(); resolve(); await pending;
  assert.equal(synth.context.oscillators.length, 0);
  const slow = synth.setEnabled(true); await synth.setEnabled(false); resolve(); await slow; assert.equal(synth.enabled, false);
  synth.context.resume = () => Promise.resolve(); await synth.setEnabled(true);
  await Promise.all([synth.play(), synth.play()]); assert.equal(synth.context.oscillators.length, 1);
  await synth.setEnabled(false); assert.equal(synth.voice, null);
});
test('Wah interrupted, unsupported and rejected audio startup are recoverable', async () => {
  await assert.rejects(new WahSynth({ Context: null }).setEnabled(true), /Web Audio/);
  const messages = [], synth = new WahSynth({ Context: WahContext, onState: (_, error) => { if (error) messages.push(error); } });
  await synth.setEnabled(true); await synth.play(); const voice = synth.voice;
  synth.context.state = 'interrupted'; synth.context.dispatchEvent(new Event('statechange'));
  assert.equal(synth.enabled, false); assert.equal(synth.voice, null); assert.ok(voice.osc.stopped); assert.match(messages.at(-1), /暫停/);
  await assert.rejects(synth.setEnabled(true), /未能啟動/);
  synth.context.state = 'running'; await synth.setEnabled(true); await synth.play(); assert.ok(synth.voice); synth.stop();
});
test('spectrum contains actual band maxima and handles true silence without invented peaks', () => {
  const data = new Float32Array(2048).fill(-Infinity); const empty = spectrumPoints(data, 48000, 4096);
  assert.equal(empty.length, 160); assert.ok(empty.every(point => point.db === -96));
  data[100] = -28; const points = spectrumPoints(data, 48000, 4096);
  assert.ok(points.some(point => point.db === -28 && Math.abs(point.frequencyHz - 1171.875) < 40));
  assert.ok(points.every(point => point.frequencyHz > 80 && point.frequencyHz < 8000 && point.db <= -12));
});
test('spectrum respects reduced motion and cancels the animation loop while idle', () => {
  const oldRequest = globalThis.requestAnimationFrame, oldCancel = globalThis.cancelAnimationFrame;
  const callbacks = []; let cancelled = false, draws = 0;
  globalThis.requestAnimationFrame = callback => { callbacks.push(callback); return 1; };
  globalThis.cancelAnimationFrame = () => { cancelled = true; };
  const node = { setAttribute() {} }, empty = { hidden: false };
  try {
    const spectrum = new WahSpectrum({ svg: node, trace: node, fundamental: node, empty, getAnalyser() {}, reducedMotion: { matches: true } });
    spectrum.draw = () => { draws++; };
    spectrum.start(); spectrum.start(); assert.equal(callbacks.length, 1); assert.equal(empty.hidden, true);
    callbacks.shift()(0); callbacks.shift()(30); callbacks.shift()(130); assert.equal(draws, 2);
    spectrum.clear(); callbacks.shift()(260); assert.equal(draws, 2); assert.equal(callbacks.length, 0); assert.equal(cancelled, true); assert.equal(empty.hidden, false);
  } finally { globalThis.requestAnimationFrame = oldRequest; globalThis.cancelAnimationFrame = oldCancel; }
});
class Surface extends EventTarget {
  ids = new Set(); value = '0';
  getBoundingClientRect() { return { top: 0, height: 100 }; }
  setPointerCapture(id) { this.ids.add(id); }
  hasPointerCapture(id) { return this.ids.has(id); }
  releasePointerCapture(id) { this.ids.delete(id); }
}
function event(target, type, props = {}) { const e = new Event(type, { cancelable: true }); Object.assign(e, { button: 0, buttons: 1, pointerType: 'touch', isPrimary: true, clientY: 50, ...props }); target.dispatchEvent(e); return e; }
test('two independent touch IDs work in either order, ignore extra fingers and release only their own control', () => {
  const oldWindow = globalThis.window; const win = globalThis.window = new EventTarget();
  try {
    for (const mouthFirst of [true, false]) {
      const neck = new Surface(), face = new Surface(), range = new Surface(); let position = 0, opening = 0, held = false;
      const input = bindWahInput({ neck, track: neck, face, openingRange: range, getPosition: () => position, getOpening: () => opening, onPosition: x => { position = x; }, onOpening: x => { opening = x; }, onHold: () => { held = true; }, onRelease: () => { held = false; } });
      const downNeck = () => event(neck, 'pointerdown', { pointerId: 11, isPrimary: !mouthFirst });
      const downMouth = () => event(face, 'pointerdown', { pointerId: 22, isPrimary: mouthFirst });
      if (mouthFirst) { downMouth(); downNeck(); } else { downNeck(); downMouth(); }
      assert.ok(held); assert.equal(position, .5); assert.equal(opening, .45);
      event(win, 'pointermove', { pointerId: 22, clientY: 100 }); assert.ok(opening > .99); assert.equal(position, .5);
      event(neck, 'pointerdown', { pointerId: 33, clientY: 0 }); event(win, 'pointermove', { pointerId: 33, clientY: 0 }); assert.equal(position, .5);
      event(win, 'pointerup', { pointerId: 22 }); assert.equal(opening, 0); assert.ok(held);
      event(win, 'pointermove', { pointerId: 11, clientY: 100 }); assert.equal(position, 1);
      event(win, 'pointercancel', { pointerId: 11 }); assert.equal(held, false);
      downNeck(); event(neck, 'lostpointercapture', { pointerId: 11 }); assert.equal(held, false);
      input.stop(); assert.equal(neck.ids.size, 0); assert.equal(face.ids.size, 0);
    }
  } finally { globalThis.window = oldWindow; }
});
test('Wah page ships a subpath-safe classic bundle, real character, SVG controls and Simulation label', async () => {
  const html = await readFile(new URL('../dist/wah.html', import.meta.url), 'utf8');
  assert.match(html, /wah\.bundle\.js\?v=[a-f0-9]{12}/); assert.match(html, /src\/wah\/styles\.css\?v=[a-f0-9]{12}/);
  assert.match(html, /Approximate Wah Simulation/); assert.match(html, /class="eye left"/); assert.match(html, /class="mouth"/);
  assert.doesNotMatch(html, /\p{Extended_Pictographic}|type="module"/u);
  assert.doesNotThrow(() => new Script(requireWahBundle));
});
const requireWahBundle = await readFile(new URL('../wah.bundle.js', import.meta.url), 'utf8');
