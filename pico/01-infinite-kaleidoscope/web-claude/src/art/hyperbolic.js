// Hyperbolic geometry in the Poincaré disk. Pure math, no DOM, testable in Node.
//
// Mirrors of the triangle group (p, q, r):
//   L1: the real axis               (fundamental side: y >= 0)
//   L2: line through 0 at angle π/p (fundamental side: below it)
//   C : circle orthogonal to |z|=1  (fundamental side: outside it)
// Interior angles: π/p at 0, π/q at L1∩C, π/r at L2∩C.

// ---- complex numbers as [re, im] ---------------------------------------------
export const cx = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1]],
  mul: (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]],
  div: (a, b) => {
    const d = b[0] * b[0] + b[1] * b[1];
    return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
  },
  conj: (a) => [a[0], -a[1]],
  scale: (a, s) => [a[0] * s, a[1] * s],
  abs2: (a) => a[0] * a[0] + a[1] * a[1],
  abs: (a) => Math.hypot(a[0], a[1]),
  expi: (t) => [Math.cos(t), Math.sin(t)],
  neg: (a) => [-a[0], -a[1]],
};
const ONE = [1, 0];

export function triangle(p, q, r) {
  const alpha = Math.PI / p;
  const cq = Math.cos(Math.PI / q);
  const cr = Math.cos(Math.PI / r);
  const K = (cr + cq * Math.cos(alpha)) / Math.sin(alpha);
  const den = K * K + cq * cq - 1;
  if (!(den > 0)) throw new Error(`triangle (${p},${q},${r}) is not hyperbolic`);
  const rho = 1 / Math.sqrt(den);
  const c = [rho * K, rho * cq];
  const n2 = [-Math.sin(alpha), Math.cos(alpha)];
  // Vertices.
  const v0 = [0, 0];
  const s = Math.sqrt(rho * rho - c[1] * c[1]);
  const v1 = [c[0] - s, 0];
  const u = [Math.cos(alpha), Math.sin(alpha)];
  const uc = u[0] * c[0] + u[1] * c[1];
  const t2 = uc - Math.sqrt(uc * uc - 1);
  const v2 = [u[0] * t2, u[1] * t2];
  return { p, q, r, alpha, c, rho, n2, v0, v1, v2 };
}

// ---- point reflections --------------------------------------------------------
export function reflectL1(z) {
  return [z[0], -z[1]];
}
export function reflectL2(T, z) {
  const d = z[0] * T.n2[0] + z[1] * T.n2[1];
  return [z[0] - 2 * d * T.n2[0], z[1] - 2 * d * T.n2[1]];
}
export function invertC(T, z) {
  const d = cx.sub(z, T.c);
  const k = (T.rho * T.rho) / cx.abs2(d);
  return [T.c[0] + d[0] * k, T.c[1] + d[1] * k];
}
export function insideFundamental(T, z, eps = 1e-9) {
  const s2 = z[0] * T.n2[0] + z[1] * T.n2[1];
  return z[1] >= -eps && s2 <= eps && cx.abs(cx.sub(z, T.c)) >= T.rho - eps;
}

// ---- Klein model (geodesics are straight) --------------------------------------
export const toKlein = (z) => cx.scale(z, 2 / (1 + cx.abs2(z)));
export const fromKlein = (k) => cx.scale(k, 1 / (1 + Math.sqrt(Math.max(0, 1 - cx.abs2(k)))));

// Geodesic through two points: { kind: 'line', n } or { kind: 'circle', c, r }.
export function geodesicThrough(a, b) {
  const cross = a[0] * b[1] - a[1] * b[0];
  const scaleRef = Math.max(cx.abs(a), cx.abs(b), 1e-9);
  if (Math.abs(cross) < 1e-9 * scaleRef) {
    const d = cx.abs(cx.sub(b, a)) > 1e-12 ? cx.sub(b, a) : a;
    const len = cx.abs(d) || 1;
    return { kind: 'line', n: [-d[1] / len, d[0] / len] };
  }
  // Circle through a, b and the inversion of a in the unit circle.
  const a2 = cx.scale(a, 1 / cx.abs2(a));
  return circleThrough(a, b, a2);
}

function circleThrough(p1, p2, p3) {
  const ax = p1[0], ay = p1[1], bx = p2[0], by = p2[1], cxx = p3[0], cy = p3[1];
  const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cxx * (ay - by));
  const a2 = ax * ax + ay * ay, b2 = bx * bx + by * by, c2 = cxx * cxx + cy * cy;
  const ux = (a2 * (by - cy) + b2 * (cy - ay) + c2 * (ay - by)) / d;
  const uy = (a2 * (cxx - bx) + b2 * (ax - cxx) + c2 * (bx - ax)) / d;
  return { kind: 'circle', c: [ux, uy], r: Math.hypot(ax - ux, ay - uy) };
}

export function geodesicSide(g, z) {
  if (g.kind === 'line') return g.n[0] * z[0] + g.n[1] * z[1];
  return cx.abs2(cx.sub(z, g.c)) - g.r * g.r;
}

// Wythoff construction: generator point from three non-negative weights, and the
// three geodesics through it that are perpendicular to each mirror, oriented so that
// P1, P2 are positive toward v0 and P3 is positive toward v1.
export function wythoff(T, weights) {
  const w = weights.map((v) => Math.max(v, 0.03));
  const sum = w[0] + w[1] + w[2];
  const k0 = toKlein(T.v0), k1 = toKlein(T.v1), k2 = toKlein(T.v2);
  const k = [
    (w[0] * k0[0] + w[1] * k1[0] + w[2] * k2[0]) / sum,
    (w[0] * k0[1] + w[1] * k1[1] + w[2] * k2[1]) / sum,
  ];
  const g = fromKlein(k);
  const P1 = geodesicThrough(g, reflectL1(g));
  const P2 = geodesicThrough(g, reflectL2(T, g));
  const P3 = geodesicThrough(g, invertC(T, g));
  const orient = (P, ref) => (geodesicSide(P, ref) >= 0 ? 1 : -1);
  return {
    g,
    geos: [P1, P2, P3],
    signs: [orient(P1, T.v0), orient(P2, T.v0), orient(P3, T.v1)],
  };
}

// ---- isometries ------------------------------------------------------------------
// F(z) = T_a(u · σ(z)), T_a(w) = (w + a) / (1 + conj(a) w), σ = conj when f.
// par counts reflections (mod 2 matters for colouring).
export const identity = () => ({ a: [0, 0], u: [1, 0], f: false, par: 0 });

export function applyIso(F, z) {
  const w = cx.mul(F.u, F.f ? cx.conj(z) : z);
  return cx.div(cx.add(w, F.a), cx.add(ONE, cx.mul(cx.conj(F.a), w)));
}

export function compose(F1, F2) {
  const a2 = F1.f ? cx.conj(F2.a) : F2.a;
  const u2 = F1.f ? cx.conj(F2.u) : F2.u;
  const c = cx.mul(F1.u, a2);
  const den = cx.add(ONE, cx.mul(cx.conj(F1.a), c));
  const d = cx.div(cx.add(F1.a, c), den);
  const g = cx.div(cx.add(ONE, cx.mul(F1.a, cx.conj(c))), den);
  let u = cx.mul(cx.mul(g, F1.u), u2);
  const n = cx.abs(u);
  u = [u[0] / n, u[1] / n];
  return { a: d, u, f: F1.f !== F2.f, par: F1.par + F2.par };
}

export function inverse(F) {
  const uBar = cx.conj(F.u);
  if (!F.f) return { a: cx.neg(cx.mul(uBar, F.a)), u: uBar, f: false, par: F.par };
  return { a: cx.neg(cx.mul(F.u, cx.conj(F.a))), u: F.u, f: true, par: F.par };
}

const translate = (a) => ({ a, u: [1, 0], f: false, par: 0 });

export function mirrorIsos(T) {
  const L1 = { a: [0, 0], u: [1, 0], f: true, par: 1 };
  const L2 = { a: [0, 0], u: cx.expi(2 * T.alpha), f: true, par: 1 };
  // Inversion in C = T_m ∘ (reflection in the diameter ⟂ to m) ∘ T_{-m}.
  const cl = cx.abs(T.c);
  const m = cx.scale(T.c, (cl - T.rho) / cl);
  const beta = Math.atan2(T.c[1], T.c[0]) + Math.PI / 2;
  const R = { a: [0, 0], u: cx.expi(2 * beta), f: true, par: 1 };
  const C = compose(translate(m), compose(R, translate(cx.neg(m))));
  C.par = 1;
  return { L1, L2, C };
}

// Pull the camera back into the fundamental triangle using symmetries of the tiling.
// The rendered image is unchanged except for parity, which the shader accounts for.
export function foldCamera(T, mirrors, F) {
  let G = F;
  for (let i = 0; i < 400; i++) {
    const a = G.a;
    if (a[1] < 0) G = compose(mirrors.L1, G);
    else if (a[0] * T.n2[0] + a[1] * T.n2[1] > 0) G = compose(mirrors.L2, G);
    else if (cx.abs(cx.sub(a, T.c)) < T.rho) G = compose(mirrors.C, G);
    else break;
  }
  return G;
}

// A step of travel: turn by `turn` radians, then walk `dist` along the screen x axis.
export function stepIso(dist, turn) {
  return { a: [Math.tanh(dist / 2), 0], u: cx.expi(turn), f: false, par: 0 };
}

// Deterministic infinite walk. camera(s) depends only on s and the path definition,
// never on frame timing, so a given (seed, t, dial) always renders the same image.
export class Walk {
  constructor(T, { step = 0.05, curvature = 0.3, start = identity() } = {}) {
    this.T = T;
    this.mirrors = mirrorIsos(T);
    this.step = step;
    this.curvature = curvature;
    this.fwd = [start];
    this.back = [start];
    this.G = stepIso(step, curvature * step);
    this.Ginv = inverse(this.G);
  }

  node(k) {
    if (k >= 0) {
      while (this.fwd.length <= k) {
        const prev = this.fwd[this.fwd.length - 1];
        this.fwd.push(foldCamera(this.T, this.mirrors, compose(prev, this.G)));
      }
      return this.fwd[k];
    }
    const j = -k;
    while (this.back.length <= j) {
      const prev = this.back[this.back.length - 1];
      this.back.push(foldCamera(this.T, this.mirrors, compose(prev, this.Ginv)));
    }
    return this.back[j];
  }

  at(s) {
    const x = s / this.step;
    const k = Math.floor(x);
    const frac = (x - k) * this.step;
    const base = this.node(k);
    return compose(base, stepIso(frac, this.curvature * frac));
  }
}
