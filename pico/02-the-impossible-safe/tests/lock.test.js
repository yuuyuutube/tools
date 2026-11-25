import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Lock, DialTracker, ringDistance, mod } from '../src/core/lock-state-machine.js';
import { play, sweep } from './helpers.js';

test('dial tracker keeps absolute travel, wraps the reading, counts reversals', () => {
  const d = new DialTracker({ size: 100, abs: 98 });
  const { crossed } = d.move(5, 0);
  assert.deepEqual(crossed, [99, 0, 1, 2, 3]);
  assert.equal(d.abs, 103);
  assert.equal(d.position, 3);
  d.move(-7, 10);
  assert.equal(d.position, 96);
  assert.equal(d.directionChanges, 1);
  assert.equal(d.totalTravel, 12);
});

test('a multi-graduation delta is never collapsed: every graduation is reported', () => {
  const d = new DialTracker();
  const { crossed } = d.move(-250, 0);
  assert.equal(crossed.length, 250);
  assert.equal(d.abs, -250);
  assert.equal(d.position, 50);
});

test('ring distance is the shortest signed path', () => {
  assert.equal(ringDistance(95, 5, 100), 10);
  assert.equal(ringDistance(5, 95, 100), -10);
  assert.equal(mod(-1, 100), 99);
});

test('stage needs direction, turns and number; then the handle opens it', () => {
  const lock = new Lock({ stages: [{ dir: 1, turns: 1, target: 30 }, { dir: -1, turns: 0, target: 70 }] });
  let t = 0;
  const turn = (n) => {
    for (let i = 0; i < Math.abs(n); i++) lock.rotate(Math.sign(n), (t += 50));
  };
  turn(30);
  assert.equal(lock.confirm(t).reason, 'not-enough-turns');
  turn(100);
  assert.equal(lock.turnsDone, 1);
  assert.deepEqual(lock.confirm(t), { ok: true, stageDone: 0 });
  turn(-60);
  const r = lock.confirm(t);
  assert.equal(r.ok, true);
  assert.equal(r.aligned, true);
  assert.equal(lock.phase, 'handle');
  assert.equal(lock.confirm(t).opened, true);
});

test('overshoot and nudge back keeps the turns in the lenient model', () => {
  const lock = new Lock({ stages: [{ dir: 1, turns: 1, target: 30 }] });
  let t = 0;
  for (let i = 0; i < 133; i++) lock.rotate(1, (t += 40));
  for (let i = 0; i < 3; i++) lock.rotate(-1, (t += 40));
  assert.equal(lock.position, 30);
  assert.equal(lock.confirm(t).ok, true);
});

test('strict mode resets the stage travel after reversing beyond the tolerance', () => {
  const lock = new Lock({ strict: true, tolerance: 3, stages: [{ dir: 1, turns: 1, target: 30 }] });
  let t = 0;
  for (let i = 0; i < 135; i++) lock.rotate(1, (t += 40));
  const ev = [];
  for (let i = 0; i < 5; i++) ev.push(...lock.rotate(-1, (t += 40)));
  assert.ok(ev.some((e) => e.type === 'travel-reset'));
  assert.equal(lock.position, 30);
  assert.equal(lock.confirm(t).reason, 'not-enough-turns');
});

test('wrong direction is reported as such', () => {
  const lock = new Lock({ stages: [{ dir: 1, turns: 0, target: 90 }] });
  let t = 0;
  for (let i = 0; i < 10; i++) lock.rotate(-1, (t += 40));
  assert.equal(lock.confirm(t).reason, 'wrong-direction');
});

test('resetOnError sends a wrong confirm back to stage one', () => {
  const lock = new Lock({ resetOnError: true, stages: [{ dir: 1, turns: 0, target: 5 }, { dir: -1, turns: 0, target: 1 }] });
  let t = 0;
  for (let i = 0; i < 5; i++) lock.rotate(1, (t += 40));
  assert.equal(lock.confirm(t).ok, true);
  lock.rotate(-1, (t += 40));
  const r = lock.confirm(t);
  assert.equal(r.ok, false);
  assert.equal(r.reset, true);
  assert.equal(lock.stageIndex, 0);
});

test('turning away after alignment re-opens the last stage, turning back re-aligns', () => {
  const spec = { stages: [{ dir: 1, turns: 1, target: 20 }] };
  const lock = new Lock(spec);
  let t = 0;
  for (let i = 0; i < 120; i++) lock.rotate(1, (t += 40));
  assert.equal(lock.confirm(t).aligned, true);
  const ev = [];
  for (let i = 0; i < 6; i++) ev.push(...lock.rotate(1, (t += 40)));
  assert.ok(ev.some((e) => e.type === 'unaligned'));
  for (let i = 0; i < 6; i++) lock.rotate(-1, (t += 40));
  assert.equal(lock.confirm(t).aligned, true);
});

test('gates resonate only in the stage direction, at a careful speed, and consistently', () => {
  const spec = { stages: [{ dir: 1, turns: 1, target: 42, gate: { tone: 'mid' } }] };
  const lock = new Lock(spec);
  const a = sweep(lock, 1);
  assert.deepEqual(a.hits.map((h) => h.pos), [42]);
  const b = sweep(lock, 1, { t0: a.t });
  assert.deepEqual(b.hits.map((h) => h.pos), [42], 'same state, same answer');
  const c = sweep(lock, -1, { t0: b.t });
  assert.equal(c.hits.length, 0, 'silent in the wrong direction');
  const fast = new Lock(spec);
  const d = sweep(fast, 1, { gap: 8 });
  assert.equal(d.hits.length, 0, 'silent when spun too fast');
});

test('proximity gates rise toward the answer; rhythm gates go silent on it', () => {
  const near = new Lock({ stages: [{ dir: 1, turns: 0, target: 50, gate: { tone: 'mid', proximity: true } }] });
  const { hits } = sweep(near, 1, { kinds: ['gate', 'near'] });
  assert.deepEqual(hits.map((h) => h.pos), [47, 48, 49, 50, 51, 52, 53]);
  const rh = new Lock({ stages: [{ dir: -1, turns: 0, target: 10, gate: { rhythm: true } }] });
  const ev = [];
  let t = 0;
  for (let i = 0; i < 100; i++) ev.push(...rh.rotate(-1, (t += 160)));
  const dead = ev.filter((e) => e.type === 'resonance' && e.kind === 'dead').map((e) => e.pos);
  const dbl = ev.filter((e) => e.type === 'resonance' && e.kind === 'double').map((e) => e.pos);
  assert.deepEqual(dead, [10]);
  assert.equal(dbl.length, 8);
  assert.ok(ev.some((e) => e.type === 'tick' && e.pos === 10 && e.silent));
});

test('shy safe withdraws after a fast spin, then talks again when handled gently', () => {
  const lock = new Lock({ shy: { limit: 7, withdrawMs: 3000 }, stages: [{ dir: 1, turns: 0, target: 60, gate: { tone: 'mid' } }] });
  let t = 0;
  const ev = [];
  for (let i = 0; i < 40; i++) ev.push(...lock.rotate(1, (t += 20)));
  assert.ok(ev.some((e) => e.type === 'too-fast'));
  // Gently, but still inside the withdrawal window: nothing.
  const quiet = [];
  for (let i = 0; i < 15; i++) quiet.push(...lock.rotate(1, (t += 170)));
  assert.ok(!quiet.some((e) => e.type === 'resonance'));
  t += 3200;
  const later = sweep(lock, 1, { gap: 170, t0: t });
  assert.deepEqual(later.hits.map((h) => h.pos), [60]);
});

test('sleeping safe wakes after four gentle swings and is startled by a big one', () => {
  const lock = new Lock({ wake: { swings: 4, min: 2, max: 8 }, stages: [{ dir: 1, turns: 0, target: 5 }] });
  let t = 0;
  const swing = (n) => {
    const ev = [];
    for (let i = 0; i < Math.abs(n); i++) ev.push(...lock.rotate(Math.sign(n), (t += 80)));
    return ev;
  };
  assert.equal(lock.confirm(t).reason, 'asleep');
  swing(4);
  swing(-4);
  swing(4);
  const big = swing(-12);
  assert.ok(big.some((e) => e.type === 'startled'));
  assert.equal(lock.swings, 0);
  swing(3);
  swing(-3);
  swing(3);
  swing(-3);
  const ev = swing(3);
  assert.ok(ev.some((e) => e.type === 'awake'));
  assert.equal(lock.phase, 'dial');
});

test('impatient safe clears the stage when its patience runs out', () => {
  const lock = new Lock({ patience: { drain: 0.5, brisk: 14, refill: 0.03 }, stages: [{ dir: 1, turns: 1, target: 10 }] });
  let t = 0;
  for (let i = 0; i < 60; i++) lock.rotate(1, (t += 30));
  assert.ok(lock.net > 0);
  const ev = lock.update(t + 2500);
  assert.ok(ev.some((e) => e.type === 'bored'));
  assert.equal(lock.net, 0);
});

test('retired safe moves half as far as it is asked', () => {
  const lock = new Lock({ gear: 0.5, stages: [{ dir: 1, turns: 0, target: 10 }] });
  let t = 0;
  for (let i = 0; i < 20; i++) lock.rotate(1, (t += 50));
  assert.equal(lock.position, 10);
});

test('the canonical solution opens locks from any starting position', () => {
  const spec = { strict: true, resetOnError: true, stages: [{ dir: -1, turns: 2, target: 88 }, { dir: 1, turns: 1, target: 12 }, { dir: -1, turns: 0, target: 47 }] };
  for (const start of [0, 12, 47, 88, 99, -350, 1234]) {
    const { lock, results } = play(spec, { startAbs: start });
    assert.ok(results.every((r) => r.ok), `start ${start}: ${JSON.stringify(results)}`);
    assert.equal(lock.phase, 'open');
  }
});
