import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Handwheel, DetentSelector, BoundedDial, CyclicDial, Flywheel } from '../src/interactions/models.js';
import { KnobInput, DETENT_DEG } from '../src/engine/knob-input.js';

test('knob input: a Pico burst keeps every detent (delta 3 → 54°) and invert applies to the Pico only', () => {
  const k = new KnobInput({ invert: true });
  const got = [];
  k.onRotate((deg, info) => got.push([deg, info.source, info.detents]));
  k.serialEvent({ type: 'rotate', delta: 3 });
  k.detents(-2, 'keyboard');
  k.angle(7.5, 'pointer');
  assert.deepEqual(got, [[-3 * DETENT_DEG, 'pico', -3], [-36, 'keyboard', -2], [7.5, 'pointer', undefined]]);
});

test('knob input: disabled input drops rotation and presses (used while a scene animates itself)', () => {
  const k = new KnobInput();
  let n = 0;
  k.onRotate(() => n++);
  k.onPress(() => n++);
  k.enabled = false;
  k.detents(1, 'pico');
  k.press('short', 'pico');
  assert.equal(n, 0);
});

test('handwheel: four turns end to end, one ratchet event per tooth even in one big delta', () => {
  const w = new Handwheel({ turns: 4, toothDeg: 15 });
  const ev = w.turn(90);
  assert.equal(ev.filter((e) => e.type === 'tooth').length, 6);
  const rest = w.turn(10000);
  assert.equal(rest.filter((e) => e.type === 'tooth').length, (1440 - 90) / 15);
  assert.ok(rest.some((e) => e.type === 'limit' && e.end === 'open'));
  assert.equal(w.target, 1);
  assert.equal(w.turn(30).filter((e) => e.type === 'limit').length, 0, 'pushing at the stop does not repeat the thud');
});

test('handwheel: the load lags the hand and then arrives', () => {
  const w = new Handwheel({ turns: 4, stiffness: 9, damping: 6.2 });
  w.turn(1440);
  w.update(0.1);
  assert.ok(w.open > 0 && w.open < 0.5, `lag ${w.open}`);
  for (let i = 0; i < 300; i++) w.update(1 / 60);
  assert.ok(w.open > 0.99);
});

test('detent selector: steps, skips empty slots, stops at the ends', () => {
  const s = new DetentSelector({ count: 6, stepDeg: 18, skip: (i) => i === 2 });
  const ev = s.turn(36);
  assert.deepEqual(ev.map((e) => e.type), ['step', 'skip', 'step']);
  assert.equal(s.index, 3);
  const end = s.turn(18 * 10);
  assert.equal(s.index, 5);
  assert.ok(end.some((e) => e.type === 'limit'));
});

test('detent selector: fast spins borrow a gear, slow turns never do', () => {
  const s = new DetentSelector({ count: 100, stepDeg: 18, accel: (sp) => (sp > 600 ? 3 : 1) });
  s.turn(18, { speed: 100 });
  assert.equal(s.index, 1);
  s.turn(18, { speed: 900 });
  assert.equal(s.index, 4);
});

test('bounded dial: clamps, reports ticks and a fresh limit once', () => {
  const d = new BoundedDial({ value: 0.5, degPerRange: 360, tickDeg: 10 });
  const ev = d.turn(90);
  assert.equal(d.value, 0.75);
  assert.equal(ev.find((e) => e.type === 'tick').count, 9);
  const lim = d.turn(400);
  assert.equal(d.value, 1);
  assert.ok(lim.some((e) => e.type === 'limit' && e.fresh));
});

test('cyclic dial: endless, wraps across 0°, counts detents', () => {
  const c = new CyclicDial({ angle: 350, ratio: 0.25, detentDeg: 15 });
  const ev = c.turn(80); // +20°
  assert.equal(Math.round(c.angle), 10);
  assert.ok(ev.some((e) => e.type === 'detent'));
  c.turn(-1440 * 2); // two full camera turns backwards
  assert.equal(Math.round(c.angle), 10);
});

test('flywheel: a decisive flick coasts after the hand lets go; a slow turn does not', () => {
  const f = new Flywheel({ length: 500, unitsPerDeg: 1 / 18 });
  f.turn(36, { speed: 100 });
  for (let i = 0; i < 60; i++) f.update(1 / 60);
  assert.equal(f.pos, 2);
  f.turn(36, { speed: 1800 });
  for (let i = 0; i < 120; i++) f.update(1 / 60);
  assert.ok(f.pos > 20, `coasted to ${f.pos}`);
  const ev = f.move(1000);
  assert.ok(ev.some((e) => e.type === 'limit'));
  assert.equal(f.pos, 500);
});
