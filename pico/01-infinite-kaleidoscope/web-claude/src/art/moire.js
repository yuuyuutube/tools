// 紋 INTERFERE — two printed line screens sharing one centre; the top one is a round film.
// The knob pushes the film's lines outward from the centre. Moiré magnifies that tiny
// shift into large fringe rings that stream out of the middle like an endless tunnel.
import { rng } from '../core/prng.js';
import { COMMON_GLSL, createProgram, setPalette } from '../gl/gl.js';

const CONCENTRIC = 0, SPIRAL = 3, LOGSPIRAL = 4, ZONE = 5;

// Only centre-symmetric screens: every fringe is a ring (or a spiral) around the middle.
const COMBOS = [['zone-zone', 2], ['rings-rings', 4], ['log-log', 3], ['spiral-spiral', 2]];

function layer(type, lam, n, duty) {
  return { type, lam, n, duty };
}

export function moireParams(seed) {
  const r = rng('moire', seed);
  const combo = r.weighted(COMBOS);
  const duty = () => r.range(0.26, 0.36);
  let base, film, ratio;
  // The film's lines are always a little wider than the base's (ratio > 1), which makes
  // the fringe phase grow with radius; pushing the film phase forward moves fringes outward.
  switch (combo) {
    case 'zone-zone': {
      const lam = r.range(0.06, 0.085);
      ratio = r.range(1.008, 1.025);
      base = layer(ZONE, lam, 0, duty());
      film = layer(ZONE, lam * ratio, 0, duty());
      break;
    }
    case 'rings-rings': {
      const lam = r.range(0.019, 0.026);
      ratio = r.range(1.035, 1.09);
      base = layer(CONCENTRIC, lam, 0, duty());
      film = layer(CONCENTRIC, lam * ratio, 0, duty());
      break;
    }
    case 'log-log': {
      const lam = r.range(0.03, 0.05);
      // Same arm count on both sheets: the fringes are log-spaced rings, an endless zoom.
      const n = r.int(12, 30);
      ratio = r.range(1.04, 1.1);
      base = layer(LOGSPIRAL, lam, n, duty());
      film = layer(LOGSPIRAL, lam * ratio, n, duty());
      break;
    }
    default: {
      // spiral-spiral, opposite hands: the fringes are 2n arms reaching out of the centre.
      const lam = r.range(0.024, 0.034);
      const n = r.int(2, 5);
      ratio = r.range(1.03, 1.07);
      base = layer(SPIRAL, lam, n, duty());
      film = layer(SPIRAL, lam * ratio, -n, duty());
      break;
    }
  }
  // The disturbance: a wave that runs from the centre across the whole sheet. Its front is
  // bent by three mismatched angular harmonics plus flowing noise, so it is never symmetric,
  // and the knob both sends it outward and reshapes it.
  const harmonics = [0, 1, 2].map(() => ({
    k: r.int(2, 9),
    a: r.range(0.15, 0.5),
    p: r.range(0, Math.PI * 2),
    rate: r.sign() * r.range(0.05, 0.16), // radians per detent
  }));
  // Each universe has its own temperament, from a slow swell to a storm. Zone plates have
  // very fine lines toward the rim, so they get a gentler push or their fringes shred to grey.
  const intensity = r.range(0.55, 1.25) * (combo === 'zone-zone' ? 0.32 : 1);
  const wave = {
    amp: r.range(0.024, 0.04) * intensity,
    lam: r.range(0.22, 0.45),
    perDetent: r.range(0.12, 0.2), // wavelengths per detent
    flow: r.range(0.02, 0.04), // wavelengths per second, on its own
    noise: r.range(0.5, 1.0),
    noiseSeed: r.range(0, 100),
    baseShare: r.range(0.3, 0.6), // the base sheet moves less...
    baseLag: r.range(0.12, 0.32), // ...and a little behind, which moiré magnifies
  };
  const field = r.weighted([[[2, 3], 3.5], [[3, 2], 2.5], [[2, 0], 2], [[3, 0], 2]]);
  const big = r.chance(0.6);
  return {
    combo,
    base,
    film,
    harmonics,
    wave,
    filmOff: r.range(0.01, 0.06),
    filmOffAngle: r.range(0, Math.PI * 2),
    filmRadius: big ? 3 : r.range(0.72, 0.9),
    angle0: r.range(0, Math.PI * 2),
    field,
    accent: r.chance(0.6) ? 4 : 0,
    accentWidth: r.range(0.05, 0.09),
    fringeShift: r.next(),
    perDetent: r.range(0.06, 0.1), // line periods the film is pushed per detent
    flow: r.range(0.012, 0.025), // the tunnel keeps breathing outward on its own
    spin: r.range(0.003, 0.008) * r.sign(), // the film turns very slowly on its own
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
uniform vec4 uWave;    // amplitude, wavelength, phase, noise amount
uniform vec3 uHK;      // harmonic k
uniform vec3 uHA;      // harmonic amplitude
uniform vec3 uHP;      // harmonic phase
uniform vec2 uNoiseOff;
uniform vec2 uBaseWave; // base sheet: share of the amplitude, phase lag

const float TAU = 6.28318530718;

// Phase of a line screen and its gradient (per unit length).
vec3 phaseOf(int type, vec2 q, float lam, float n) {
  float r2 = max(dot(q, q), 1e-10);
  float r = sqrt(r2);
  float th = atan(q.y, q.x);
  vec2 u = q / r;
  vec2 swirl = vec2(-u.y, u.x) / r * (n / TAU);
  if (type == 0) return vec3(r / lam, u / lam);
  if (type == 3) return vec3(r / lam + n * th / TAU, u / lam + swirl);
  if (type == 4) return vec3(log(r) / lam + n * th / TAU, u / (r * lam) + swirl);
  return vec3(r2 / (lam * lam), 2.0 * q / (lam * lam));
}

// Where the travelling disturbance carries page point p. Irregular front, full reach.
vec2 disturb(vec2 p, float share, float lag) {
  float r = length(p) + 1e-6;
  float th = atan(p.y, p.x);
  vec3 h = uHA * cos(uHK * th + uHP);
  float shape = 1.0 + h.x + h.y + h.z;
  float wave = sin(TAU * (r / uWave.y - uWave.z + lag));
  float env = smoothstep(0.0, 0.22, r) * (0.75 + 0.45 * r);
  vec2 n = vec2(vnoise(p * 2.1 + uNoiseOff), vnoise(p * 2.1 + uNoiseOff + 31.7)) - 0.5;
  return p + share * uWave.x * env * ((p / r) * wave * shape + n * uWave.w * (1.2 + wave));
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

  // Both sheets ride the disturbance; gradients go through its Jacobian (finite differences).
  float h = px;
  vec2 qb = disturb(p, uBaseWave.x, uBaseWave.y);
  mat2 Jb = mat2((disturb(p + vec2(h, 0.0), uBaseWave.x, uBaseWave.y) - qb) / h,
                 (disturb(p + vec2(0.0, h), uBaseWave.x, uBaseWave.y) - qb) / h);
  vec2 qf = disturb(p, 1.0, 0.0);
  mat2 Jf = mat2((disturb(p + vec2(h, 0.0), 1.0, 0.0) - qf) / h,
                 (disturb(p + vec2(0.0, h), 1.0, 0.0) - qf) / h);

  // Base sheet.
  vec3 B = phaseOf(uType.x, qb - uBaseC, uLam.x, uN.x);
  B.x += uPhase.x;
  vec2 gB = transpose(Jb) * B.yz;
  float covB = screenCov(B.x, length(gB) * px, uDuty.x);

  // Film, in its own rotated frame; gradients rotated back to the page.
  float c = cos(uFilmAngle), s = sin(uFilmAngle);
  vec2 f = mat2(c, -s, s, c) * qf;
  vec3 F = phaseOf(uType.y, f - uFilmC, uLam.y, uN.y);
  F.x += uPhase.y;
  vec2 gF = transpose(Jf) * (mat2(c, s, -s, c) * F.yz);
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
  float wD = length(gB - gF) * px;
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
      gl.useProgram(program);
      setPalette(gl, u, view.palette);
      gl.uniform2f(u.uRes, view.width, view.height);
      gl.uniform2i(u.uType, P.base.type, P.film.type);
      gl.uniform2f(u.uLam, P.base.lam, P.film.lam);
      gl.uniform2f(u.uN, P.base.n, P.film.n);
      gl.uniform2f(u.uDuty, P.base.duty, P.film.duty);
      gl.uniform2f(u.uBaseC, 0, 0);
      gl.uniform2f(u.uFilmC, Math.cos(P.filmOffAngle) * P.filmOff, Math.sin(P.filmOffAngle) * P.filmOff);
      gl.uniform1f(u.uFilmAngle, P.angle0 + t * P.spin);
      gl.uniform1f(u.uFilmR, P.filmRadius);
      // Pushing the film phase forward moves every fringe away from the centre.
      gl.uniform2f(u.uPhase, 0, view.dial * P.perDetent + t * P.flow);
      const W = P.wave;
      const H = P.harmonics;
      const d = view.dial;
      gl.uniform4f(u.uWave, W.amp, W.lam, d * W.perDetent + t * W.flow, W.noise);
      gl.uniform3f(u.uHK, H[0].k, H[1].k, H[2].k);
      gl.uniform3f(u.uHA, H[0].a, H[1].a, H[2].a);
      gl.uniform3f(u.uHP, H[0].p + d * H[0].rate, H[1].p + d * H[1].rate, H[2].p + d * H[2].rate);
      gl.uniform2f(u.uNoiseOff, W.noiseSeed + d * 0.045 + t * 0.01, W.noiseSeed * 0.7 - d * 0.03);
      gl.uniform2f(u.uBaseWave, W.baseShare, W.baseLag);
      gl.uniform4i(u.uInk, 1, P.field[0], P.field[1], P.accent);
      gl.uniform1f(u.uAccentW, P.accentWidth);
      gl.uniform1f(u.uFringeShift, P.fringeShift);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
