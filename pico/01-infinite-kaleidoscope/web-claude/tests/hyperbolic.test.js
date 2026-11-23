import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cx, triangle, reflectL1, reflectL2, invertC, insideFundamental, wythoff, geodesicSide,
  identity, applyIso, compose, inverse, mirrorIsos, foldCamera, Walk,
} from '../src/art/hyperbolic.js';

const close = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) <= eps, `${a} != ${b}`);
const closeZ = (a, b, eps = 1e-9) => { close(a[0], b[0], eps); close(a[1], b[1], eps); };

function angleAt(vertex, dirA, dirB) {
  const la = Math.hypot(...dirA), lb = Math.hypot(...dirB);
  return Math.acos((dirA[0] * dirB[0] + dirA[1] * dirB[1]) / (la * lb));
}

test('triangle has the requested interior angles and C is orthogonal to the unit circle', () => {
  for (const [p, q, r] of [[7, 2, 3], [4, 3, 4], [5, 2, 4], [3, 3, 4], [6, 3, 3]]) {
    const T = triangle(p, q, r);
    close(cx.abs2(T.c), 1 + T.rho * T.rho);
    // Angle at v1 between L1 (toward origin) and the arc of C (going up).
    const rad1 = cx.sub(T.v1, T.c);
    const tan1 = [-rad1[1], rad1[0]];
    const up1 = tan1[1] >= 0 ? tan1 : [-tan1[0], -tan1[1]];
    close(angleAt(T.v1, [-1, 0], up1), Math.PI / q, 1e-9);
    // Angle at v2 between L2 (toward origin) and the arc of C (going down toward v1).
    const rad2 = cx.sub(T.v2, T.c);
    let tan2 = [-rad2[1], rad2[0]];
    const toward = cx.sub(T.v1, T.v2);
    if (tan2[0] * toward[0] + tan2[1] * toward[1] < 0) tan2 = [-tan2[0], -tan2[1]];
    close(angleAt(T.v2, cx.neg(T.v2), tan2), Math.PI / r, 1e-9);
    // Vertices lie on their mirrors.
    close(cx.abs(cx.sub(T.v1, T.c)), T.rho);
    close(cx.abs(cx.sub(T.v2, T.c)), T.rho);
  }
});

test('reflections are involutions', () => {
  const T = triangle(7, 2, 3);
  const z = [0.31, -0.12];
  closeZ(reflectL1(reflectL1(z)), z);
  closeZ(reflectL2(T, reflectL2(T, z)), z);
  closeZ(invertC(T, invertC(T, z)), z);
});

test('isometry composition and inverse', () => {
  const F = { a: [0.3, -0.2], u: cx.expi(0.7), f: false, par: 0 };
  const G = { a: [-0.1, 0.4], u: cx.expi(-1.3), f: true, par: 1 };
  const z = [0.12, 0.33];
  closeZ(applyIso(compose(F, G), z), applyIso(F, applyIso(G, z)));
  closeZ(applyIso(compose(G, F), z), applyIso(G, applyIso(F, z)));
  closeZ(applyIso(compose(F, inverse(F)), z), z);
  closeZ(applyIso(compose(inverse(G), G), z), z);
});

test('mirror isometries match the point reflections', () => {
  const T = triangle(5, 2, 4);
  const M = mirrorIsos(T);
  const z = [0.21, 0.17];
  closeZ(applyIso(M.L1, z), reflectL1(z));
  closeZ(applyIso(M.L2, z), reflectL2(T, z));
  closeZ(applyIso(M.C, z), invertC(T, z), 1e-9);
});

test('folding the camera keeps the image identical and the centre in the fundamental triangle', () => {
  const T = triangle(7, 2, 3);
  const M = mirrorIsos(T);
  const F = { a: [0.83, -0.41], u: cx.expi(2.1), f: false, par: 0 };
  const G = foldCamera(T, M, F);
  assert.ok(insideFundamental(T, G.a, 1e-7));
  // Same point of the tiling: folding both images gives the same fundamental point.
  const fold = (z) => {
    let w = z;
    for (let i = 0; i < 500; i++) {
      if (w[1] < 0) w = reflectL1(w);
      else if (w[0] * T.n2[0] + w[1] * T.n2[1] > 0) w = reflectL2(T, w);
      else if (cx.abs(cx.sub(w, T.c)) < T.rho) w = invertC(T, w);
      else break;
    }
    return w;
  };
  for (const z of [[0, 0], [0.2, 0.1], [-0.4, 0.3]]) closeZ(fold(applyIso(F, z)), fold(applyIso(G, z)), 1e-7);
});

test('the walk is deterministic, continuous and stays numerically bounded', () => {
  const T = triangle(4, 3, 4);
  const a = new Walk(T, { curvature: 0.37 });
  const b = new Walk(T, { curvature: 0.37 });
  for (const s of [0, 1.234, 17.5, -3.3, 250.01]) {
    const A = a.at(s), B = b.at(s);
    closeZ(A.a, B.a, 0);
    assert.ok(cx.abs(A.a) < 0.95);
  }
  // Continuity across a step boundary (images of the origin agree up to tiling symmetry).
  const s = 0.05 * 40;
  const left = a.at(s - 1e-7), right = a.at(s + 1e-7);
  const fold = (z) => foldCamera(T, a.mirrors, { a: z, u: [1, 0], f: false, par: 0 }).a;
  closeZ(fold(applyIso(left, [0.1, 0.05])), fold(applyIso(right, [0.1, 0.05])), 1e-5);
});

test('wythoff generator sits inside the triangle and geodesics are oriented', () => {
  const T = triangle(7, 2, 3);
  const W = wythoff(T, [0.4, 0.3, 0.3]);
  assert.ok(insideFundamental(T, W.g));
  const [P1, P2, P3] = W.geos;
  assert.ok(geodesicSide(P1, T.v0) * W.signs[0] > 0);
  assert.ok(geodesicSide(P1, T.v1) * W.signs[0] < 0);
  assert.ok(geodesicSide(P2, T.v0) * W.signs[1] > 0);
  assert.ok(geodesicSide(P3, T.v1) * W.signs[2] > 0);
  assert.ok(geodesicSide(P3, T.v2) * W.signs[2] < 0);
  // Each geodesic passes through the generator.
  for (const P of W.geos) close(geodesicSide(P, W.g), 0, 1e-9);
  assert.deepEqual(identity().par, 0);
});
