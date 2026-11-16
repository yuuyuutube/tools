import test from 'node:test';
import assert from 'node:assert/strict';
import { BubbleBody, BubbleSimulation, BUBBLE_STEP } from '../src/bubble-simulation.js';

const advance = (sim, seconds) => { for (let i = 0; i < seconds / BUBBLE_STEP; i++) sim.step(); };
const width = b => Math.max(...b.x) - Math.min(...b.x);
function finite(sim) {
  for (const b of sim.bubbles) {
    assert.ok(b.area() > b.area0 * .5, 'membrane retains positive area');
    for (let i = 0; i < b.count; i++) {
      assert.ok(Number.isFinite(b.x[i]) && Number.isFinite(b.y[i]));
      assert.ok(Math.abs(b.x[i]) <= 270 && Math.abs(b.y[i]) <= 215);
    }
  }
}

test('membranes preserve area and remain stable at rest', () => {
  const s = new BubbleSimulation(); advance(s, 10);
  for (const b of s.bubbles) assert.ok(Math.abs(b.area() / b.area0 - 1) < .01);
  finite(s);
});
test('opposed pointer grabs deform actual geometry, then recover on release', () => {
  const s = new BubbleSimulation(); s.bubbles = [s.bubbles[0]];
  const b = s.bubbles[0], before = width(b);
  s.grab('left', b.x[28], b.y[28]); s.grab('right', b.x[0], b.y[0]);
  s.move('left', -245, 10); s.move('right', 250, -20); advance(s, 2);
  assert.ok(width(b) > before * 1.3, 'two touch points produce a meaningful stretch');
  finite(s);
  s.releaseAll(); advance(s, 12);
  assert.ok(Math.abs(width(b) / before - 1) < .06, 'surface tension restores shape');
  assert.ok(Math.abs(b.area() / b.area0 - 1) < .01);
});
test('holding a breath increases simulated area and release returns it', () => {
  const s = new BubbleSimulation(); s.blowing = true; advance(s, 4);
  assert.ok(s.inflation > 1.4);
  for (const b of s.bubbles) assert.ok(b.area() / b.area0 > 1.3);
  s.blowing = false; advance(s, 10);
  assert.ok(Math.abs(s.inflation - 1) < .005); finite(s);
});
test('microphone strength controls the amount of inflation continuously', () => {
  const quiet = new BubbleSimulation(), strong = new BubbleSimulation();
  quiet.blowing = strong.blowing = true; quiet.breathStrength = .2; strong.breathStrength = .9;
  advance(quiet,3); advance(strong,3);
  assert.ok(strong.inflation > quiet.inflation + .25);
  assert.ok(strong.bubbles[0].area() > quiet.bubbles[0].area() * 1.15);
});
test('contact constraints separate overlapping membranes', () => {
  const s = new BubbleSimulation();
  s.bubbles = [new BubbleBody(0, -60, 0, 80), new BubbleBody(1, 60, 0, 80)];
  const intersections = () => s.bubbles[0].x.reduce((n,x,i) => n + (s.bubbles[1].contains(x,s.bubbles[0].y[i]) ? 1 : 0),0);
  const before = intersections(); assert.ok(before > 0);
  advance(s, 4);
  assert.ok(intersections() < before / 2, 'penetrating surface nodes are pushed apart'); finite(s);
});
test('five bubbles, extreme pulls and breathing remain bounded for one simulated minute', () => {
  const s = new BubbleSimulation(); s.add(); s.add(); assert.equal(s.add(), null);
  for (let i = 0; i < 7200; i++) {
    if (i % 240 === 0) {
      s.releaseAll(); s.blowing = (i / 240) % 2 === 0; s.elasticity = (i / 240) % 2 ? .15 : 1;
      const b = s.bubbles[(i / 240) % 5]; s.grab(1, b.x[0], b.y[0]);
      s.move(1, Math.sin(i) * 500, Math.cos(i) * 500);
    }
    s.step(); if (i % 120 === 0) finite(s);
  }
  finite(s); assert.equal(s.bubbles.length, 5);
});
test('reset restores initial positions, count, material and input state deterministically', () => {
  const s = new BubbleSimulation(), initial = s.bubbles.map(b => [...b.x,...b.y]);
  s.add(); s.blowing = true; s.elasticity = 1; advance(s, 1); s.reset();
  assert.deepEqual(s.bubbles.map(b => [...b.x,...b.y]),initial);
  assert.equal(s.blowing,false); assert.equal(s.inflation,1); assert.equal(s.elasticity,.6); assert.equal(s.grabs.size,0);
});
