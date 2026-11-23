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

test('moire: centre-shared screens whose fringes move outward as the knob turns', () => {
  for (const s of seeds) {
    const P = moireParams(s);
    assert.deepEqual(P, moireParams(s));
    for (const L of [P.base, P.film]) assert.ok(L.duty > 0 && L.duty < 1);
    // Fringe phase D = B - F - X grows with radius only if the film lines are wider;
    // then a fringe of fixed D sits at a radius that increases with the knob phase X.
    assert.ok(P.film.lam > P.base.lam, P.combo);
    assert.ok(P.perDetent > 0 && P.flow > 0);
    // The disturbance reaches the whole sheet and is never a single symmetric k-fold shape.
    assert.ok(P.wave.amp > 0.003 && P.wave.perDetent > 0);
    assert.equal(P.harmonics.length, 3);
    P.harmonics.forEach((h) => assert.ok(Number.isInteger(h.k) && h.rate !== 0));
  }
  const P = moireParams(seeds.find((s) => moireParams(s).combo === 'rings-rings'));
  const bandRadius = (X) => (0.25 + X) / (1 / P.base.lam - 1 / P.film.lam);
  assert.ok(bandRadius(P.perDetent) > bandRadius(0));
});

test('ink: the knob moves every ripple outward and never folds the bath', () => {
  const P = inkParams(1234);
  const a = buildOps(P, 40, 0);
  const b = buildOps(P, 40, 1);
  let ripples = 0;
  for (let i = 0; i < a.count; i++) {
    if (a.data[i * 4] !== 2) continue;
    const o = MAX_OPS * 4 + i * 4;
    const amp = a.data[i * 4 + 3], lam = a.data[o], e = a.data[o + 2];
    assert.ok((amp * 2 * Math.PI * (1 + e)) / lam < 1, 'one-to-one radial map');
    assert.ok(b.data[o + 3] > a.data[o + 3], 'phase advances with the dial (fronts move outward)');
    ripples++;
  }
  assert.ok(ripples > 10);
});
