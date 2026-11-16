import test from 'node:test';
import assert from 'node:assert/strict';
import { SandSimulation, widthAt, HALF_HEIGHT, RADIUS, STEP, INITIAL_ANGLE } from '../src/simulation.js';

function advance(sim, seconds) { for (let i = 0; i < Math.round(seconds / STEP); i++) sim.step(); }
function assertContained(sim) {
  for (let i = 0; i < sim.count; i++) {
    assert.ok(Number.isFinite(sim.x[i]) && Number.isFinite(sim.y[i]), `particle ${i} is finite`);
    assert.ok(Math.abs(sim.y[i]) <= HALF_HEIGHT - RADIUS + 1e-7, `particle ${i} respects caps`);
    assert.ok(Math.abs(sim.x[i]) <= widthAt(sim.y[i]) - RADIUS + 1e-7, `particle ${i} respects walls`);
  }
}

test('sand passes through the neck upward, and reversing brings it back', () => {
  const sim = new SandSimulation();
  assert.equal(sim.metrics().upper, 0);
  advance(sim, 20);
  assert.ok(sim.metrics().upper > sim.count * .9, 'reverse gravity transports sand into upper bulb');
  assertContained(sim);
  sim.fieldAngle = Math.PI;
  advance(sim, 20);
  assert.ok(sim.metrics().upper < sim.count * .1, 'normal gravity returns sand through neck');
  assertContained(sim);
});

test('the field direction changes the actual center of mass', () => {
  const left = new SandSimulation(), right = new SandSimulation();
  left.rotateTo(0); right.rotateTo(0);
  left.fieldAngle = -Math.PI / 2; right.fieldAngle = Math.PI / 2;
  advance(left, 8); advance(right, 8);
  assert.ok(left.metrics().centerX < -35);
  assert.ok(right.metrics().centerX > 35);
  assertContained(left); assertContained(right);
});

test('zero gravity preserves isolated stationary sand and damps existing momentum', () => {
  const sim = new SandSimulation(1);
  sim.strength = 0;
  sim.x[0] = sim.px[0] = 0; sim.y[0] = sim.py[0] = 100;
  advance(sim, 2);
  assert.equal(sim.y[0], 100);
  sim.px[0] = -.08;
  advance(sim, 2);
  assert.ok(sim.x[0] > 0);
  assert.ok(sim.metrics().maxSpeed < 4);
  assertContained(sim);
});

test('rotating the container preserves unclipped particle world positions', () => {
  const sim = new SandSimulation(1);
  sim.x[0] = sim.px[0] = 0; sim.y[0] = sim.py[0] = 60;
  const wx = -Math.sin(sim.angle) * 60, wy = Math.cos(sim.angle) * 60;
  sim.rotateTo(sim.angle + .15);
  assert.ok(Math.abs(Math.cos(sim.angle) * sim.x[0] - Math.sin(sim.angle) * sim.y[0] - wx) < 1e-8);
  assert.ok(Math.abs(Math.sin(sim.angle) * sim.x[0] + Math.cos(sim.angle) * sim.y[0] - wy) < 1e-8);
});

test('one simulated minute of rapid rotation and extreme fields stays finite and contained', () => {
  const sim = new SandSimulation();
  for (let i = 0; i < 7200; i++) {
    if (i % 30 === 0) {
      sim.rotateTo(i * .037);
      sim.fieldAngle = i * .019;
      sim.strength = [0, .05, 1, 2][Math.floor(i / 30) % 4];
    }
    sim.step();
    if (i % 120 === 0) assertContained(sim);
  }
  assertContained(sim);
  assert.equal(sim.x.length, 2400);
  assert.equal(sim.head.length, sim.cols * sim.rows);
});

test('reset restores the complete deterministic initial state', () => {
  const sim = new SandSimulation();
  const initialX = [...sim.x], initialY = [...sim.y];
  advance(sim, 1); sim.rotateTo(2); sim.strength = 0; sim.reset();
  assert.deepEqual([...sim.x], initialX); assert.deepEqual([...sim.y], initialY);
  assert.deepEqual([...sim.px], initialX); assert.deepEqual([...sim.py], initialY);
  assert.equal(sim.angle, INITIAL_ANGLE); assert.equal(sim.fieldAngle, 0); assert.equal(sim.strength, 1);
  const second = new SandSimulation();
  advance(sim, 1); advance(second, 1);
  assert.deepEqual([...sim.x], [...second.x]); assert.deepEqual([...sim.y], [...second.y]);
});
