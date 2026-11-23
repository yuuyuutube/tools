// 墨 DIFFUSE — symmetric marbling. Ink drops are exact area-preserving maps;
// every pixel is traced backwards through the list of drops and stirs.
import { rng } from '../core/prng.js';
import { COMMON_GLSL, createProgram, setPalette } from '../gl/gl.js';

export const MAX_OPS = 384;
export const WINDOW = 40; // rounds kept on the bath
const FADE = 7; // the oldest rounds dissolve over this many periods
export const ROUND_PERIOD = 2.4; // seconds between rounds of drops
const BLOOM = 1.7; // seconds for a drop to spread
const DROP = 1, VORTEX = 2;

export function inkParams(seed) {
  const r = rng('ink', seed);
  return {
    seed,
    k: r.weighted([[3, 2], [4, 2], [5, 3], [6, 3], [7, 1], [8, 1]]),
    twist: r.range(0, Math.PI * 2),
    ringBias: r.range(0.4, 0.62),
    scale: r.range(0.92, 1.15),
    petal: r.range(0.15, 0.45),
    inkWeights: [
      [1, r.range(0.8, 1.4)],
      [2, r.range(0.8, 1.4)],
      [3, r.range(0.8, 1.4)],
      [4, 0.18],
    ],
    clearRate: r.range(0.45, 0.7),
    stir: r.range(0.2, 0.3),
    spin: r.sign(),
  };
}

// One round: a centre drop or a ring of k drops, followed by a stir.
export function roundSpec(P, n) {
  const r = rng('ink-round', P.seed, n);
  const ink = n % 2 === 0 || !r.chance(P.clearRate);
  const color = ink ? r.weighted(P.inkWeights) : 0;
  const accent = color === 4;
  const ring = r.chance(P.ringBias);
  const drops = [];
  if (ring) {
    const R = r.range(0.22, 0.85) * P.scale;
    const rad = (accent ? r.range(0.035, 0.055) : r.range(0.05, 0.12)) * P.scale;
    const offset = P.twist + ((n % 2) * Math.PI) / P.k + r.range(-0.15, 0.15);
    const petal = r.chance(0.25) ? r.range(0.15, P.petal) : 0;
    for (let i = 0; i < P.k; i++) {
      const a = offset + (i * 2 * Math.PI) / P.k;
      drops.push({ x: Math.cos(a) * R, y: Math.sin(a) * R, r: rad, k: 2, e: petal, ph: -2 * a });
    }
  } else {
    const rad = (accent ? r.range(0.07, 0.1) : r.range(0.13, 0.3)) * P.scale;
    const petal = r.chance(0.35) ? r.range(0.12, P.petal) : 0;
    drops.push({ x: 0, y: 0, r: rad, k: P.k, e: petal, ph: r.range(0, Math.PI * 2) });
  }
  const area = drops.reduce((s, d) => s + Math.PI * d.r * d.r, 0);
  return {
    color,
    drops,
    area,
    // Mostly one direction per universe, so turning the knob winds the whole bath.
    stirWeight: (r.chance(0.18) ? -P.spin : P.spin) * r.range(0.35, 1.0),
    stirReach: r.range(0.2, 0.85),
  };
}

const easeOut = (x) => 1 - (1 - x) ** 3;

// Build the operation list for (seed, t, dial). Pure and deterministic.
// The bath holds a fixed window of rounds; the oldest ones shrink away smoothly,
// so nothing ever pops in or out.
export function buildOps(P, t, dial, out = new Float32Array(MAX_OPS * 8)) {
  const now = t / ROUND_PERIOD;
  const newest = Math.floor(now);
  let i = 0;
  const put = (a0, a1, a2, a3, b0, b1, b2, b3) => {
    out[i * 4] = a0; out[i * 4 + 1] = a1; out[i * 4 + 2] = a2; out[i * 4 + 3] = a3;
    const o = MAX_OPS * 4 + i * 4;
    out[o] = b0; out[o + 1] = b1; out[o + 2] = b2; out[o + 3] = b3;
    i++;
  };
  for (let n = newest - WINDOW + 1; n <= newest; n++) {
    const spec = roundSpec(P, n);
    const age = now - n; // in periods
    if (age >= WINDOW) continue;
    const bloom = Math.sqrt(easeOut(Math.min(Math.max((age * ROUND_PERIOD) / BLOOM, 0), 1)));
    const fade = Math.sqrt(smooth(Math.min(Math.max((WINDOW - age) / FADE, 0), 1)));
    const grow = bloom * fade;
    if (grow <= 1e-4) continue;
    for (const d of spec.drops) put(DROP, d.x, d.y, d.r * grow, spec.color, d.k, d.e, d.ph);
    const drift = 0.6 * Math.sin(t * 0.045 + n * 1.7);
    const strength = (dial + drift) * P.stir * spec.stirWeight * bloom;
    put(VORTEX, strength, spec.stirReach, 0, 0, 0, 0, 0);
  }
  return { data: out, count: i };
}

const smooth = (x) => x * x * (3 - 2 * x);

const FS = COMMON_GLSL + `
uniform highp sampler2D uOps;
uniform int uCount;

vec3 inkColor(int idx, vec2 local, float rim, int opIndex) {
  vec3 paper = pal(0);
  if (idx == 0) {
    float stain = fbm(local * 2.3 + float(opIndex) * 3.1) - 0.5;
    return overprint(paper, pal(1), 0.025 + stain * 0.03);
  }
  float n = fbm(local * 2.6 + float(opIndex) * 7.37);
  float cov = 0.8 + 0.2 * n + rim * 0.12;
  return laydown(paper, pal(idx), cov);
}

void main() {
  vec2 p = screenPos();
  float px = pixelSize();
  // Jacobian of (current traced position) w.r.t. screen position, for exact edge AA.
  mat2 J = mat2(1.0);

  vec3 found = pal(0);
  bool done = false;
  bool cont = false;
  vec3 first = vec3(0.0);
  float firstW = 1.0;
  float outW = 0.0;
  vec3 outCol = vec3(0.0);

  for (int i = uCount - 1; i >= 0; i--) {
    vec4 A = texelFetch(uOps, ivec2(i, 0), 0);
    vec4 B = texelFetch(uOps, ivec2(i, 1), 0);
    if (A.x < 1.5) {
      vec2 d = p - A.yz;
      float L = dot(d, d) + 1e-12;
      float h = A.w * A.w;
      if (B.z > 0.0) h *= 1.0 + B.z * cos(B.y * atan(d.y, d.x) + B.w);
      float sl = sqrt(L), sh = sqrt(h);
      vec2 n = d / sl;
      float pxl = clamp(px * length(transpose(J) * n), px * 0.25, 0.25);
      if (L < h) {
        float edgeIn = sh - sl;
        vec2 local = d / max(A.w, 1e-4);
        float rim = smoothstep(0.8, 1.0, sl / sh);
        vec3 col = inkColor(int(B.x + 0.5), local, rim, i);
        if (!cont && edgeIn < pxl) {
          // Near the rim: find the colour just outside and blend.
          first = col;
          firstW = clamp(0.5 + 0.5 * edgeIn / pxl, 0.5, 1.0);
          cont = true;
          p = A.yz;
          continue;
        }
        found = cont ? mix(col, first, firstW) : col;
        done = true;
        break;
      }
      float o = (sl - sh) / pxl;
      if (!cont && o < 1.0 && 0.5 - 0.5 * o > outW) {
        outW = 0.5 - 0.5 * o;
        outCol = inkColor(int(B.x + 0.5), vec2(0.7), 1.0, i);
      }
      float f = sqrt(max(1.0 - h / L, 0.0));
      J = (mat2(f) + (h / (L * L * max(f, 1e-3))) * outerProduct(d, d)) * J;
      p = A.yz + d * f;
    } else {
      float L = dot(p, p);
      float l2 = A.z * A.z;
      // Counter-rotating stir: the centre and the rim turn opposite ways, so rings shear.
      float a = -A.y * (l2 / (l2 + L) - 0.35);
      float c = cos(a), s = sin(a);
      mat2 R = mat2(c, s, -s, c);
      vec2 gradA = A.y * l2 * 2.0 * p / ((l2 + L) * (l2 + L));
      vec2 dRp = R * vec2(-p.y, p.x);
      J = (R + outerProduct(dRp, gradA)) * J;
      p = R * p;
    }
  }
  if (!done) found = cont ? mix(pal(0), first, firstW) : pal(0);
  found = mix(found, outCol, outW);
  outColor = vec4(found, 1.0);
}
`;

export function createInk(gl) {
  const { program, uniforms: u } = createProgram(gl, FS);
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, MAX_OPS, 2, 0, gl.RGBA, gl.FLOAT, null);
  const buffer = new Float32Array(MAX_OPS * 8);
  const cache = new Map();
  const params = (seed) => {
    if (!cache.has(seed)) {
      if (cache.size > 3) cache.delete(cache.keys().next().value);
      cache.set(seed, inkParams(seed));
    }
    return cache.get(seed);
  };

  return {
    id: 'ink',
    resolution: 0.72, // marbled edges are soft; this halves the cost of the heaviest engine
    draw(view) {
      const P = params(view.seed);
      buffer.fill(0);
      const { count } = buildOps(P, view.t, view.dial, buffer);
      gl.useProgram(program);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, MAX_OPS, 2, gl.RGBA, gl.FLOAT, buffer);
      gl.uniform1i(u.uOps, 0);
      gl.uniform1i(u.uCount, count);
      setPalette(gl, u, view.palette);
      gl.uniform2f(u.uRes, view.width, view.height);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
