import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LineDecoder, parseEvent } from '../../shared/rotary/protocol.js';
import { InputController } from '../src/input/input-controller.js';
import { DialGear, NavGear } from '../../shared/rotary/rotary-navigation.js';
import { AngleAccumulator, angleDelta } from '../../shared/rotary/angle-tracker.js';
import { PicoSerial } from '../../shared/rotary/serial-adapter.js';

test('protocol: accumulated deltas survive, garbage is dropped', () => {
  assert.deepEqual(parseEvent('{"type":"rotate","delta":-4}'), { type: 'rotate', delta: -4 });
  assert.deepEqual(parseEvent('{"type":"press","kind":"long"}'), { type: 'press', kind: 'long' });
  for (const bad of ['', 'RIGHT | POSITION: 3', '{"type":"rotate","delta":1.5}', '{"type":"rotate","delta":0}', '{"type":"press","kind":"double"}', '{"type":"rotate"', 'null', '{}']) {
    assert.equal(parseEvent(bad), null, bad);
  }
});

test('protocol: lines split across USB packets are reassembled once', () => {
  const dec = new LineDecoder();
  const out = [];
  for (const chunk of ['{"type":"rot', 'ate","delta":3}\n{"type":"pre', 'ss","kind":"short"}\r\n', '{"type":"rotate","delta":-1}\n']) {
    out.push(...dec.push(chunk).map(parseEvent));
  }
  assert.deepEqual(out, [
    { type: 'rotate', delta: 3 },
    { type: 'press', kind: 'short' },
    { type: 'rotate', delta: -1 },
  ]);
});

test('protocol: an oversized line is skipped and the stream resyncs', () => {
  const dec = new LineDecoder(64);
  const lines = [...dec.push('x'.repeat(200)), ...dec.push('yyy\n{"type":"rotate","delta":2}\n')];
  assert.deepEqual(lines.map(parseEvent).filter(Boolean), [{ type: 'rotate', delta: 2 }]);
});

test('dial gear: slow turning is always one graduation per detent', () => {
  for (const sens of ['precise', 'standard', 'swift']) {
    const g = new DialGear(sens);
    let t = 0;
    for (let i = 0; i < 30; i++) assert.equal(g.detents(1, (t += 200)), 1);
  }
});

test('dial gear: a brisk spin borrows a higher ratio, except in precise mode', () => {
  const g = new DialGear('swift');
  let t = 0;
  let last = 0;
  for (let i = 0; i < 20; i++) last = g.detents(1, (t += 20));
  assert.equal(last, 5);
  const p = new DialGear('precise');
  t = 0;
  for (let i = 0; i < 20; i++) last = p.detents(1, (t += 20));
  assert.equal(last, 1);
  assert.equal(new DialGear('standard').detents(-4, 0) < 0, true, 'a burst keeps its sign');
});

test('menu acceleration lives apart from the dial', () => {
  const nav = new NavGear();
  const dial = new DialGear('standard');
  let t = 0;
  let steps = 0;
  for (let i = 0; i < 30; i++) steps += nav.steps(1, (t += 15));
  assert.ok(steps > 30);
  t += 1000;
  assert.equal(dial.detents(1, t), 1, 'menu flicks never warm up the dial gear');
});

test('angle accumulator keeps fractions across events and handles reversal', () => {
  const acc = new AngleAccumulator(3.6);
  let units = 0;
  for (let i = 0; i < 100; i++) units += acc.push(1.8);
  assert.equal(units, 50);
  for (let i = 0; i < 10; i++) units += acc.push(-3.6);
  assert.equal(units, 40);
});

test('circular drag unwraps across the ±180° seam', () => {
  assert.equal(angleDelta(175, -175), 10);
  assert.equal(angleDelta(-175, 175), -10);
  let total = 0;
  let a = 0;
  for (let i = 0; i < 720; i++) {
    const next = ((a + 5 + 180) % 360) - 180;
    total += angleDelta(a, next);
    a = next;
  }
  assert.equal(total, 3600, 'ten clockwise turns');
});

test('input controller routes by mode and honours the invert setting for the Pico only', () => {
  const input = new InputController({ invert: true });
  const got = [];
  input.onRotate((u, info) => got.push([u, info.source, info.mode]));
  input.serialEvent({ type: 'rotate', delta: 2 });
  input.detents(1, 'keyboard');
  input.setMode('dial', 100);
  input.angle(7.3, 'pointer');
  assert.deepEqual(got, [[-2, 'pico', 'nav'], [1, 'keyboard', 'nav'], [2, 'pointer', 'dial']]);
  const presses = [];
  input.onPress((k) => presses.push(k));
  input.serialEvent({ type: 'press', kind: 'short' });
  input.press('triple');
  assert.deepEqual(presses, ['short']);
});

test('serial adapter reports unsupported browsers without throwing', () => {
  const s = new PicoSerial({ serial: null });
  assert.equal(s.supported, false);
  assert.equal(s.status, 'unsupported');
});
