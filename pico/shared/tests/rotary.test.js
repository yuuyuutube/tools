import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RotaryHub } from '../rotary/rotary-hub.js';
import { RotationTracker, AngleAccumulator, angleDelta } from '../rotary/angle-tracker.js';
import { RateMeter, NavGear } from '../rotary/rotary-navigation.js';
import { LineDecoder, parseEvent } from '../rotary/protocol.js';

test('hub: Pico deltas keep their full size and honour invert; other sources do not invert', () => {
  const hub = new RotaryHub({ invert: true });
  const got = [];
  hub.onRotate((n, info) => got.push([n, info.source]));
  hub.serialEvent({ type: 'rotate', delta: 4 });
  hub.detents(-2, 'keyboard');
  assert.deepEqual(got, [[-4, 'pico'], [-2, 'keyboard']]);
});

test('hub: only short and long presses are dispatched, and handlers can unsubscribe', () => {
  const hub = new RotaryHub();
  const got = [];
  const off = hub.onPress((k, info) => got.push(`${k}:${info.source}`));
  hub.serialEvent({ type: 'press', kind: 'long' });
  hub.press('double', 'ui');
  hub.press('short', 'pointer');
  off();
  hub.press('short', 'pointer');
  assert.deepEqual(got, ['long:pico', 'short:pointer']);
});

test('hub: describe() fields travel with every rotate event', () => {
  class Moded extends RotaryHub {
    describe() {
      return { mode: 'x' };
    }
  }
  const hub = new Moded();
  let info = null;
  hub.onRotate((n, i) => (info = i));
  hub.exact(3, 'keyboard', 10);
  assert.equal(info.mode, 'x');
  assert.equal(info.t, 10);
});

test('tracker: total, turns, travel, reversals', () => {
  const tr = new RotationTracker();
  let t = 0;
  for (let i = 0; i < 40; i++) tr.push(18, (t += 30)); // two full clockwise turns
  for (let i = 0; i < 10; i++) tr.push(-18, (t += 30));
  assert.equal(tr.total, 540);
  assert.equal(tr.turns, 1.5);
  assert.equal(tr.travel, 900);
  assert.equal(tr.reversals, 1);
  assert.equal(tr.direction, -1);
});

test('tracker: speed follows the knob and settles to zero after it stops', () => {
  const tr = new RotationTracker();
  let t = 0;
  for (let i = 0; i < 30; i++) tr.push(18, (t += 20)); // 900 deg/s
  assert.ok(tr.speed > 600 && tr.speed < 1000, `speed ${tr.speed}`);
  tr.decay(t + 2000);
  assert.equal(tr.speed, 0);
});

test('angle helpers: seam unwrapping and fractional accumulation', () => {
  assert.equal(angleDelta(179, -179), 2);
  const acc = new AngleAccumulator(18);
  let n = 0;
  for (let i = 0; i < 36; i++) n += acc.push(10);
  assert.equal(n, 20);
});

test('rate meter forgets old samples; nav gear accelerates only when spun quickly', () => {
  const m = new RateMeter();
  m.push(5, 0);
  assert.equal(m.rate(1000), 0);
  const g = new NavGear();
  assert.equal(g.steps(1, 0), 1);
  let t = 0;
  let last = 0;
  for (let i = 0; i < 20; i++) last = g.steps(1, (t += 10));
  assert.equal(last, 3);
});

test('protocol is the one the firmware speaks', () => {
  const dec = new LineDecoder();
  const events = dec.push('{"type":"rotate","delta":-3}\r\n{"type":"press","kind":"short"}\n').map(parseEvent);
  assert.deepEqual(events, [
    { type: 'rotate', delta: -3 },
    { type: 'press', kind: 'short' },
  ]);
});
