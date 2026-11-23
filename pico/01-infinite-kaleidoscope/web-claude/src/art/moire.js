// 紋 INTERFERE — two printed line screens; the top one is a round film you turn.
import { rng } from '../core/prng.js';
import { COMMON_GLSL, createProgram, setPalette } from '../gl/gl.js';

export const DEG_PER_DETENT = 0.36; // a 1:50 reduction gear between knob and film

const CONCENTRIC = 0, RADIAL = 1, PARALLEL = 2, SPIRAL = 3, LOGSPIRAL = 4, ZONE = 5;

const COMBOS = [
  ['zone-zone', 3], ['radial-radial', 3], ['rings-rings', 3], ['lines-lines', 2],
  ['spiral-spiral', 2], ['log-log', 2], ['lines-rings', 2], ['zone-lines', 1],
];

function layer(type, lam, n, duty) {
  return { type, lam, n, duty };
}

export function moireParams(seed) {
  const r = rng('moire', seed);
  const combo = r.weighted(COMBOS);
  const duty = () => r.range(0.26, 0.36);
  let base, film;
  let baseOff = [0, 0];
  let filmOff = r.range(0.04, 0.2);
  switch (combo) {
    case 'zone-zone': {
      const lam = r.range(0.06, 0.085);
      base = layer(ZONE, lam, 0, duty());
      film = layer(ZONE, lam * r.range(0.985, 1.015), 0, duty());
      filmOff = r.range(0.05, 0.16);
      break;
    }
    case 'radial-radial': {
      const n = r.int(110, 200);
      base = layer(RADIAL, 1, n, duty());
      film = layer(RADIAL, 1, n + r.int(-2, 2), duty());
      filmOff = r.range(0.08, 0.3);
      break;
    }
    case 'rings-rings': {
      const lam = r.range(0.019, 0.026);
      base = layer(CONCENTRIC, lam, 0, duty());
      film = layer(CONCENTRIC, lam * r.range(0.99, 1.03), 0, duty());
      const a = r.range(0, Math.PI * 2);
      const d = r.range(0.05, 0.25);
      baseOff = [Math.cos(a) * d, Math.sin(a) * d];
      filmOff = r.range(0.1, 0.3);
      break;
    }
    case 'lines-lines': {
      const lam = r.range(0.016, 0.022);
      base = layer(PARALLEL, lam, 0, duty());
      film = layer(PARALLEL, lam * r.range(1.0, 1.05), 0, duty());
      filmOff = 0;
      break;
    }
    case 'spiral-spiral': {
      const lam = r.range(0.024, 0.034);
      const n = r.int(1, 4);
      base = layer(SPIRAL, lam, n, duty());
      film = layer(SPIRAL, lam * r.range(0.99, 1.02), r.chance(0.6) ? -n : n, duty());
      filmOff = r.range(0.02, 0.12);
      break;
    }
    case 'log-log': {
      const lam = r.range(0.03, 0.05);
      const n = r.int(18, 48);
      base = layer(LOGSPIRAL, lam, n, duty());
      film = layer(LOGSPIRAL, lam * r.range(0.97, 1.03), r.chance(0.5) ? -n : n + r.int(-3, 3), duty());
      filmOff = r.range(0.0, 0.08);
      break;
    }
    case 'lines-rings': {
      const lam = r.range(0.017, 0.023);
      base = layer(PARALLEL, lam, 0, duty());
      film = layer(CONCENTRIC, lam * r.range(0.98, 1.04), 0, duty());
      filmOff = r.range(0.2, 0.6);
      break;
    }
    default: {
      // zone-lines
      base = layer(ZONE, r.range(0.06, 0.085), 0, duty());
      film = layer(PARALLEL, r.range(0.017, 0.022), 0, duty());
      filmOff = 0;
      break;
    }
  }
  const field = r.weighted([[[2, 3], 3.5], [[3, 2], 2.5], [[2, 0], 2], [[3, 0], 2]]);
  const big = r.chance(0.35);
  return {
    combo,
    base,
    film,
    baseOff,
    filmOff,
    filmOffAngle: r.range(0, Math.PI * 2),
    filmRadius: big ? 3 : r.range(0.72, 0.9),
    angle0: r.sign() * r.range(0.03, 0.08),
    field,
    accent: r.chance(0.6) ? 4 : 0,
    accentWidth: r.range(0.05, 0.09),
    fringeShift: r.next(),
    drift: r.range(0.03, 0.06) * r.sign(),
    spin: r.range(0.0012, 0.0025) * r.sign(),
    orbit: r.range(0.02, 0.06),
  };
}

const FS = COMMON_GLSL + `
uniform ivec2 uType;   // base, film
uniform vec2 uLam;
uniform vec2 uN;
uniform vec2 uDuty;
uniform vec2 uBaseC;
uniform vec2 uFilmC;   // pattern centre in film coordinates
uniform float uFilmAngle;
uniform float uFilmR;
uniform vec2 uPhase;   // phase drift per layer
uniform ivec4 uInk;    // line ink, field ink 1, field ink 2, accent (0 = none)
uniform float uAccentW;
uniform float uFringeShift;

const float TAU = 6.28318530718;

// Phase of a line screen and its gradient (per unit length).
vec3 phaseOf(int type, vec2 q, float lam, float n) {
  float r2 = max(dot(q, q), 1e-10);
  float r = sqrt(r2);
  float th = atan(q.y, q.x);
  vec2 radial = q / r;
  vec2 swirl = vec2(-q.y, q.x) / r2 * (n / TAU);
  if (type == 0) return vec3(r / lam, radial / lam);
  if (type == 1) return vec3(n * th / TAU, swirl);
  if (type == 2) return vec3(q.x / lam, 1.0 / lam, 0.0);
  if (type == 3) return vec3(r / lam + n * th / TAU, radial / lam + swirl);
  if (type == 4) return vec3(log(r) / lam + n * th / TAU, radial / (r * lam) + swirl);
  return vec3(r2 / (lam * lam), 2.0 * q / (lam * lam));
}

// Fraction of [x - w/2, x + w/2] whose fractional part lies in [lo, hi).
float band(float x, float w, float lo, float hi) {
  w = max(w, 1e-4);
  float a = x - 0.5 * w, b = x + 0.5 * w;
  float G = (floor(b) - floor(a)) * (hi - lo) + (clamp(fract(b), lo, hi) - clamp(fract(a), lo, hi));
  return mix(G / w, hi - lo, smoothstep(0.45, 1.1, w));
}

// A line screen; once its lines are finer than a pixel it settles to a light tone
// so the fringe colours underneath stay clean.
float screenCov(float x, float w, float duty) {
  float c = band(x, w, 0.0, duty);
  return mix(c, duty * 0.4, smoothstep(0.35, 1.0, w));
}

void main() {
  vec2 p = screenPos();
  float px = pixelSize();
  vec3 col = pal(0);

  // Base sheet.
  vec3 B = phaseOf(uType.x, p - uBaseC, uLam.x, uN.x);
  B.x += uPhase.x;
  float covB = screenCov(B.x, length(B.yz) * px, uDuty.x);

  // Film, in its own rotated frame; gradients rotated back to the page.
  float c = cos(uFilmAngle), s = sin(uFilmAngle);
  vec2 f = mat2(c, -s, s, c) * p;
  vec3 F = phaseOf(uType.y, f - uFilmC, uLam.y, uN.y);
  F.x += uPhase.y;
  vec2 gF = mat2(c, s, -s, c) * F.yz;
  float covF = screenCov(F.x, length(gF) * px, uDuty.y);

  float r = length(p);
  float mask = clamp((uFilmR - r) / px + 0.5, 0.0, 1.0);

  // Shadow of the film on the sheet.
  vec2 sh = p - vec2(0.012, -0.018);
  float shadow = (1.0 - mask) * smoothstep(uFilmR + 0.07, uFilmR - 0.02, length(sh));

  // Outside the film: only the base screen.
  vec3 outside = overprint(col, pal(uInk.x), covB * 0.9);
  outside *= 1.0 - 0.10 * shadow;

  // Inside: the fringe (difference phase) separated into inks, then both screens on top.
  float D = B.x - F.x + uFringeShift;
  float wD = length(B.yz - gF) * px;
  float acc = uInk.w > 0 ? uAccentW : 0.0;
  float k1 = band(D, wD, 0.0, 0.5 - acc);
  float kA = band(D, wD, 0.5 - acc, 0.5);
  float k2 = 1.0 - k1 - kA;
  vec3 field = pal(uInk.y) * k1 + pal(uInk.z) * k2 + (uInk.w > 0 ? pal(uInk.w) : pal(0)) * kA;
  vec3 inside = laydown(col, field, 0.9);
  inside = overprint(inside, pal(uInk.x), covB * 0.78);
  inside = overprint(inside, pal(uInk.x), covF * 0.78);
  float rim = lineCov(abs(r - uFilmR + px), px * 0.8, px);
  inside = overprint(inside, pal(uInk.x), rim * 0.5);

  outColor = vec4(mix(outside, inside, mask), 1.0);
}
`;

export function createMoire(gl) {
  const { program, uniforms: u } = createProgram(gl, FS);
  const cache = new Map();
  const params = (seed) => {
    if (!cache.has(seed)) {
      if (cache.size > 3) cache.delete(cache.keys().next().value);
      cache.set(seed, moireParams(seed));
    }
    return cache.get(seed);
  };

  return {
    id: 'moire',
    draw(view) {
      const P = params(view.seed);
      const t = view.t;
      const angle = P.angle0 + (view.dial * DEG_PER_DETENT * Math.PI) / 180 + t * P.spin;
      const oa = t * 0.021;
      gl.useProgram(program);
      setPalette(gl, u, view.palette);
      gl.uniform2f(u.uRes, view.width, view.height);
      gl.uniform2i(u.uType, P.base.type, P.film.type);
      gl.uniform2f(u.uLam, P.base.lam, P.film.lam);
      gl.uniform2f(u.uN, P.base.n, P.film.n);
      gl.uniform2f(u.uDuty, P.base.duty, P.film.duty);
      gl.uniform2f(u.uBaseC, P.baseOff[0] + Math.cos(oa) * P.orbit, P.baseOff[1] + Math.sin(oa * 1.3) * P.orbit);
      gl.uniform2f(u.uFilmC, Math.cos(P.filmOffAngle) * P.filmOff, Math.sin(P.filmOffAngle) * P.filmOff);
      gl.uniform1f(u.uFilmAngle, angle);
      gl.uniform1f(u.uFilmR, P.filmRadius);
      gl.uniform2f(u.uPhase, t * P.drift, -t * P.drift * 0.5);
      gl.uniform4i(u.uInk, 1, P.field[0], P.field[1], P.accent);
      gl.uniform1f(u.uAccentW, P.accentWidth);
      gl.uniform1f(u.uFringeShift, P.fringeShift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
