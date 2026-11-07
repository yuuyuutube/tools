import test from 'node:test';
import assert from 'node:assert/strict';
import { createYin } from '../src/analysis/yin.js';
import { PitchStability } from '../src/analysis/stability.js';
import { PitchHistory } from '../src/live/timeline.js';
import { MicrophoneInput, microphoneError } from '../src/input/microphone.js';

const wave = (frequency, rate, harmonics = [1], dc = 0) => Float32Array.from({ length: rate > 60000 ? 8192 : 4096 }, (_, i) => dc + harmonics.reduce((sum, amplitude, h) => sum + .2 * amplitude * Math.sin(2 * Math.PI * frequency * (h + 1) * i / rate), 0));
for (const rate of [44100, 48000, 96000]) test(`YIN: arbitrary pitches and harmonics at ${rate} Hz`, () => {
  const detect = createYin();
  for (const f of [60, 82.41, 130.8128, 195.9977, 440, 440 * 2 ** (37 / 1200), 1174.659, 2000]) {
    for (const harmonics of [[1], [.35, 1, .5], [1, .5, .33, .25]]) {
      const result = detect(wave(f, rate, harmonics, .1), rate);
      assert.ok(result.frequencyHz, `detected ${f}`);
      assert.ok(Math.abs(1200 * Math.log2(result.frequencyHz / f)) < 6, `${f} → ${result.frequencyHz}`);
      assert.ok(result.confidence > .9);
    }
  }
});
test('YIN: silence, DC, weak input, seeded noise and invalid data never invent a pitch', () => {
  const detect = createYin(); let seed = 71;
  const noise = Float32Array.from({ length: 4096 }, () => { seed = (1664525 * seed + 1013904223) >>> 0; return (seed / 2 ** 32 - .5) * .4; });
  for (const samples of [new Float32Array(4096), new Float32Array(4096).fill(.5), wave(440, 48000).map(x => x * .001), noise, new Float32Array([NaN])]) {
    assert.equal(detect(samples, 48000).frequencyHz, null);
  }
  assert.equal(detect(wave(440, 48000), 0).frequencyHz, null);
  assert.equal(detect(wave(440, 48000).map(x => x * 6), 48000).clipped, true);
});
test('YIN follows continuous glissando and vibrato without snapping', () => {
  const detect = createYin();
  for (let i = 0; i < 40; i++) {
    const f = 220 * 2 ** ((i * .31 + .3 * Math.sin(i)) / 12);
    const result = detect(wave(f, 48000), 48000);
    assert.ok(Math.abs(1200 * Math.log2(result.frequencyHz / f)) < 3);
  }
});
test('stability requires a time window; vibrato and gaps stay distinct from confidence', () => {
  const stability = new PitchStability(); let result;
  for (let time = 0; time <= 500; time += 50) result = stability.update({ frequencyHz: 440, timestampMs: time });
  assert.equal(result.stable, true);
  result = stability.update({ frequencyHz: 450, timestampMs: 550 });
  assert.equal(result.label, '變動中');
  result = stability.update({ frequencyHz: null, timestampMs: 600 });
  assert.equal(result.spreadCents, null);
  assert.equal(stability.update({ frequencyHz: 440, timestampMs: 650 }).stable, false);
});
test('history uses continuous musical pitch, splits silence and late frames, expires after 12 seconds', () => {
  const history = new PitchHistory();
  for (const [timestampMs, frequencyHz] of [[0, 440], [50, 445], [100, null], [150, 440], [500, 441]]) history.add({ timestampMs, frequencyHz });
  assert.equal(history.segments().length, 3);
  assert.notEqual(history.points[1].midi, Math.round(history.points[1].midi));
  history.add({ timestampMs: 12550, frequencyHz: null });
  assert.equal(history.segments().length, 0);
  history.clear(); assert.equal(history.points.length, 0);
});

function micFixture(media) {
  const events = [], frames = [], workers = [], contexts = [], timers = new Map(); let timerId = 0;
  class Track extends EventTarget { stop() { this.stopped = true; } }
  const track = new Track(), stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  class Context extends EventTarget {
    constructor() { super(); this.state = 'suspended'; this.sampleRate = 48000; this.connections = []; contexts.push(this); }
    async resume() { this.state = 'running'; }
    async close() { this.state = 'closed'; }
    createAnalyser() { return { getFloatTimeDomainData() {}, disconnect() {} }; }
    createMediaStreamSource() { return { connect: target => this.connections.push(target), disconnect() {} }; }
  }
  class WorkerClass {
    constructor() { workers.push(this); }
    postMessage(message) { this.last = message; }
    terminate() { this.terminated = true; }
  }
  const mic = new MicrophoneInput({ Context, WorkerClass, mediaDevices: { getUserMedia: media || (async () => stream) }, secure: true, workerURL: 'test',
    onState: (state, message) => events.push({ state, message }), onFrame: frame => frames.push(frame),
    schedule: (fn, delay) => { timers.set(++timerId, { fn, delay }); return timerId; }, cancel: id => timers.delete(id), now: () => 100 });
  return { mic, events, frames, workers, contexts, track, stream, timers };
}
test('microphone: native graph is analysis-only; stop releases every resource and rejects late replies', async () => {
  const f = micFixture(); assert.equal(await f.mic.start(), true);
  assert.equal(f.mic.state, 'listening');
  assert.equal(f.contexts[0].connections.length, 1); // source → analyser, no output
  assert.equal(f.workers[0].last.sampleRate, 48000);
  f.workers[0].onmessage({ data: { frequencyHz: 440 } }); assert.equal(f.frames.length, 1);
  f.mic.stop(); assert.equal(f.track.stopped, true); assert.equal(f.workers[0].terminated, true);
  assert.equal(f.contexts[0].state, 'closed'); assert.equal(f.timers.size, 0);
  f.workers[0].onmessage({ data: { frequencyHz: 440 } }); assert.equal(f.frames.length, 1);
});
test('microphone: cancellation during permission request stops a later stream', async () => {
  let resolve; const f = micFixture(() => new Promise(r => { resolve = r; }));
  const start = f.mic.start(); f.mic.stop(); resolve(f.stream);
  assert.equal(await start, false); assert.equal(f.track.stopped, true); assert.equal(f.workers.length, 0);
});
test('microphone: permission denial is recoverable', async () => {
  const f = micFixture(async () => { throw Object.assign(new Error(), { name: 'NotAllowedError' }); });
  assert.equal(await f.mic.start(), false); assert.equal(f.mic.state, 'error');
  assert.match(f.events.at(-1).message, /權限/); assert.equal(f.contexts[0].state, 'closed');
  f.mic.mediaDevices.getUserMedia = async () => f.stream;
  assert.equal(await f.mic.start(), true); f.mic.stop();
});
test('microphone: failed audio resume still releases a later permission stream', async () => {
  let resolve; const f = micFixture(() => new Promise(r => { resolve = r; }));
  class RejectedContext extends f.mic.Context { async resume() { throw new Error('resume denied'); } }
  f.mic.Context = RejectedContext;
  assert.equal(await f.mic.start(), false);
  resolve(f.stream); await Promise.resolve();
  assert.equal(f.track.stopped, true); assert.equal(f.contexts[0].state, 'closed');
});
test('microphone: track loss, context interruption and worker timeout are explicit recoverable errors', async () => {
  for (const trigger of ['ended', 'context', 'timeout', 'worker']) {
    const f = micFixture(); await f.mic.start();
    if (trigger === 'ended') f.track.dispatchEvent(new Event('ended'));
    if (trigger === 'context') { f.contexts[0].state = 'interrupted'; f.contexts[0].dispatchEvent(new Event('statechange')); }
    if (trigger === 'timeout') [...f.timers.values()].find(timer => timer.delay === 3000).fn();
    if (trigger === 'worker') f.workers[0].onerror({ preventDefault() {} });
    assert.equal(f.mic.state, 'error', trigger); assert.equal(f.track.stopped, true); assert.equal(f.workers[0].terminated, true);
  }
});
test('microphone: insecure / unsupported browsers give actionable messages', async () => {
  const f = micFixture(); f.mic.secure = false; await f.mic.start();
  assert.match(f.events.at(-1).message, /HTTPS/);
  assert.match(microphoneError({ name: 'NotFoundError' }), /找不到/);
  assert.match(microphoneError({ name: 'NotReadableError' }), /讀取/);
});
