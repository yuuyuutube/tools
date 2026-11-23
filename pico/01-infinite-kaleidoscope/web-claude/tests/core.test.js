import test from 'node:test';
import assert from 'node:assert/strict';
import { ArtController } from '../src/core/controller.js';
import { encodeState, decodeState, createState } from '../src/core/state.js';
import { mulberry32, hash32, rng } from '../src/core/prng.js';

test('rotate accumulates integer and fractional deltas on the current mode only', () => {
  const c = new ArtController({ seed: 1, dials: [0, 0, 0] });
  c.rotate(1);
  c.rotate(-1);
  c.rotate(5);
  c.rotate(-12);
  c.rotate(0.25);
  assert.equal(c.state.dials[0], -6.75);
  c.setMode(2);
  c.rotate(3);
  assert.deepEqual(c.state.dials, [-6.75, 0, 3]);
});

test('smoothing reaches the target without overshoot and caps speed', () => {
  const c = new ArtController({ seed: 1, dials: [0, 0, 0] });
  c.motion = false;
  c.rotate(100);
  c.update(0.1);
  assert.ok(c.smooth[0] <= 36 * 0.1 + 1e-9, 'speed cap');
  for (let i = 0; i < 400; i++) c.update(1 / 60);
  assert.equal(c.smooth[0], 100);
});

test('short press switches mode once; long press makes one new universe and never a short action', () => {
  let now = 0;
  const c = new ArtController({ seed: 1, dials: [0, 0, 0] }, { now: () => now });
  const log = [];
  c.on('mode', () => log.push('mode'));
  c.on('universe', () => log.push('universe'));
  c.press('short');
  assert.deepEqual(log, ['mode']);
  assert.equal(c.state.mode, 1);
  now = 1000;
  const seed = c.state.seed;
  c.press('long');
  assert.deepEqual(log, ['mode', 'universe']);
  assert.notEqual(c.state.seed, seed);
  now = 1100;
  c.press('short'); // a stray short right after a long is ignored
  assert.deepEqual(log, ['mode', 'universe']);
  now = 2000;
  c.press('short');
  assert.deepEqual(log, ['mode', 'universe', 'mode']);
  c.press('double');
  assert.equal(log.length, 3);
});

test('new universe carries the old state so the transition can draw it', () => {
  const c = new ArtController({ seed: 42, dials: [3, 4, 5], t: 12 });
  let before;
  c.on('universe', (e) => (before = e.before));
  c.newUniverse('test', 7);
  assert.equal(before.seed, 42);
  assert.equal(before.t, 12);
  assert.equal(c.state.seed, 7);
  assert.equal(c.state.t, 0);
});

test('share state round-trips exactly through the URL', () => {
  const c = new ArtController({ seed: 0xdeadbeef, palette: 4, mode: 2, dials: [1.23456, -7.1, 12], t: 83.20049 });
  c.update(0);
  const snap = c.snapshot();
  const back = decodeState(`#${encodeState(snap)}`);
  assert.deepEqual(back, snap);
});

test('decodeState ignores garbage', () => {
  assert.deepEqual(decodeState('#m=nope&s=xyz&p=99&d=1,2&t=-4'), {});
  assert.deepEqual(decodeState(''), {});
  assert.equal(createState(5).seed, 5);
});

test('PRNG is deterministic and well spread', () => {
  const a = mulberry32(123), b = mulberry32(123);
  for (let i = 0; i < 100; i++) assert.equal(a(), b());
  assert.notEqual(hash32('ink', 1), hash32('ink', 2));
  const r = rng('x', 9);
  let sum = 0;
  for (let i = 0; i < 10000; i++) sum += r.next();
  assert.ok(Math.abs(sum / 10000 - 0.5) < 0.02);
});
