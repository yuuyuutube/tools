import test from 'node:test';
import assert from 'node:assert/strict';
import { Synth } from '../src/audio.js';
class Param {
  value = 0;
  setTargetAtTime(v) { this.value = v; }
  linearRampToValueAtTime(v) { this.value = v; }
  cancelScheduledValues() {}
  setValueAtTime(v) { this.value = v; }
}
class AudioNode {
  frequency = new Param(); gain = new Param(); stopped = false; started = false;
  connect(n) { return n; } disconnect() {}
  start() { this.started = true; }
  stop(time) { this.stopped = true; this.stopTime = time; this.onended?.(); }
}
class Context extends EventTarget {
  state = 'running';
  currentTime = 1; destination = {}; nodes = [];
  resume() { return Promise.resolve(); }
  createOscillator() { const node = new AudioNode(); this.nodes.push(node); return node; }
  createBiquadFilter() { return new AudioNode(); }
  createGain() { return new AudioNode(); }
}
function deferred() { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; }
test('no audio on enable; hold, glide, release and repeated stop', async () => {
  const synth = new Synth({ Context });
  await synth.setEnabled(true); assert.equal(synth.context.nodes.length, 0);
  synth.setFrequency(440); await synth.play();
  const voice = synth.voice; assert.equal(voice.osc.frequency.value, 440);
  synth.setFrequency(445.25); assert.equal(voice.osc.frequency.value, 445.25);
  synth.stop(); synth.stop();
  assert.equal(synth.voice, null); assert.equal(voice.osc.stopped, true);
  assert.equal(voice.gain.gain.value, 0); assert.ok(voice.osc.stopTime <= 1.04);
});
test('release before resume finishes never creates a late note', async () => {
  const synth = new Synth({ Context }); await synth.setEnabled(true);
  const gate = deferred(); synth.context.resume = () => gate.promise;
  const pending = synth.play(); synth.stop(); gate.resolve(); await pending;
  assert.equal(synth.voice, null); assert.equal(synth.context.nodes.length, 0);
});
test('disable during pending enable stays disabled', async () => {
  const gate = deferred();
  class SlowContext extends Context { resume() { return gate.promise; } }
  const synth = new Synth({ Context: SlowContext });
  const pending = synth.setEnabled(true); await synth.setEnabled(false);
  gate.resolve(); await pending;
  assert.equal(synth.enabled, false); await synth.play(); assert.equal(synth.voice, null);
});
test('overlapping play requests create only the latest voice', async () => {
  const synth = new Synth({ Context }); await synth.setEnabled(true);
  const gate = deferred(); synth.context.resume = () => gate.promise;
  const first = synth.play(), second = synth.play(); gate.resolve(); await Promise.all([first, second]);
  assert.equal(synth.context.nodes.length, 1);
  const voice = synth.voice; await synth.setEnabled(false); assert.equal(voice.osc.stopped, true);
});
test('unsupported audio and rejected resume are recoverable', async () => {
  await assert.rejects(new Synth({ Context: null }).setEnabled(true), /Web Audio/);
  const synth = new Synth({ Context }); await synth.setEnabled(true);
  synth.context.resume = () => Promise.reject(new Error('interrupted'));
  await synth.play(); assert.equal(synth.voice, null);
  await assert.rejects(synth.setEnabled(true), /音訊未能啟動/);
  assert.equal(synth.enabled, false);
});

test('a resumed but interrupted context never reports sound enabled', async () => {
  class InterruptedContext extends Context { state = 'interrupted'; }
  const synth = new Synth({ Context: InterruptedContext });
  await assert.rejects(synth.setEnabled(true), /音訊未能啟動/);
  assert.equal(synth.enabled, false);
  assert.equal(synth.context.nodes.length, 0);
});
test('context interruptions stop an existing voice and allow a click to retry', async () => {
  const messages = [];
  const synth = new Synth({ Context, onState: (playing, message) => { if (message) messages.push(message); } });
  await synth.setEnabled(true); await synth.play();
  const voice = synth.voice;
  synth.context.state = 'interrupted'; synth.context.dispatchEvent(new Event('statechange'));
  assert.equal(synth.enabled, false); assert.equal(synth.voice, null); assert.equal(voice.osc.stopped, true);
  assert.match(messages.at(-1), /音訊已暫停/);
  synth.context.state = 'running'; await synth.setEnabled(true); await synth.play();
  assert.ok(synth.voice); synth.stop();
});
test('a fresh enable gesture supersedes a blocked first resume', async () => {
  const gate = deferred(); let attempts = 0;
  class RetryContext extends Context { resume() { return ++attempts === 1 ? gate.promise : Promise.resolve(); } }
  const synth = new Synth({ Context: RetryContext });
  const first = synth.setEnabled(true);
  assert.equal(await synth.setEnabled(true), true);
  gate.resolve(); assert.equal(await first, false);
  assert.equal(synth.enabled, true);
});
