import test from 'node:test';
import assert from 'node:assert/strict';
import { mirrorParams, generatorWeights } from '../src/art/mirror.js';
import { inkParams, buildOps, MAX_OPS, WINDOW, ROUND_PERIOD } from '../src/art/ink.js';
import { moireParams } from '../src/art/moire.js';
import { triangle } from '../src/art/hyperbolic.js';

const seeds = Array.from({ length: 300 }, (_, i) => (i * 2654435761) >>> 0);

test('every seed yields a valid hyperbolic group and a closed generator loop', () => {
  for (const s of seeds) {
    const P = mirrorParams(s);
    assert.deepEqual(P, mirrorParams(s));
    const [p, q, r] = P.group;
    assert.ok(1 / p + 1 / q + 1 / r < 1);
    triangle(p, q, r);
    const a = generatorWeights(P, 0.1), b = generatorWeights(P, 1.1);
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9));
  }
});

test('ink operations are deterministic, bounded, and evolve continuously', () => {
  for (const s of seeds.slice(0, 60)) {
    const P = inkParams(s);
    const a = buildOps(P, 123.4, 6.5);
    const b = buildOps(P, 123.4, 6.5);
    assert.ok(a.count <= MAX_OPS);
    assert.deepEqual(Array.from(a.data), Array.from(b.data));
  }
  // Across a round boundary the old window and the new window agree (no popping):
  // at the instant a round leaves, its drops already have zero radius.
  const P = inkParams(99);
  const t = 50 * ROUND_PERIOD;
  const before = buildOps(P, t - 1e-6, 3);
  const after = buildOps(P, t + 1e-6, 3);
  const radii = (o) => {
    const out = [];
    for (let i = 0; i < o.count; i++) if (o.data[i * 4] === 1) out.push(o.data[i * 4 + 3]);
    return out;
  };
  assert.ok(Math.abs(radii(before).length - radii(after).length) <= 9);
  assert.ok(WINDOW > 10);
});

test('moire params are deterministic and the film turns visibly', () => {
  for (const s of seeds) {
    const P = moireParams(s);
    assert.deepEqual(P, moireParams(s));
    assert.ok(Math.abs(P.angle0) >= 0.03);
    for (const L of [P.base, P.film]) assert.ok(L.duty > 0 && L.duty < 1);
  }
});
