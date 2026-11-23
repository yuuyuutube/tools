// 鏡 REFLECT — a hyperbolic hall of three mirrors, seen through a round eyepiece.
import { rng } from '../core/prng.js';
import { COMMON_GLSL, createProgram, setPalette } from '../gl/gl.js';
import { triangle, Walk, wythoff } from './hyperbolic.js';

// (p, q, r): angles π/p at the centre of the eyepiece, π/q and π/r at the other corners.
const GROUPS = [
  [[7, 2, 3], 3], [[3, 2, 7], 2], [[4, 2, 5], 3], [[5, 2, 4], 3], [[6, 2, 4], 2],
  [[4, 2, 6], 2], [[8, 2, 3], 2], [[5, 2, 5], 2], [[4, 3, 4], 3], [[3, 3, 4], 3],
  [[6, 3, 3], 2], [[4, 4, 4], 2], [[3, 4, 4], 2], [[5, 3, 3], 2],
];

export const DISK = 0.93;

export function mirrorParams(seed) {
  const r = rng('mirror', seed);
  const group = r.weighted(GROUPS);
  const paperFace = r.chance(0.6);
  const faces = [2, 3, paperFace ? 0 : 4];
  for (let i = faces.length - 1; i > 0; i--) {
    const j = Math.floor(r.next() * (i + 1));
    [faces[i], faces[j]] = [faces[j], faces[i]];
  }
  const ang = r.range(0, Math.PI * 2);
  return {
    group,
    faces,
    dotInk: paperFace ? 4 : 0,
    style: r.weighted([[0, 3], [1, 3], [2, 2]]),
    curvature: r.sign() * r.range(0.12, 0.42),
    speed: r.range(0.045, 0.07),
    base: [r.range(0.25, 1), r.range(0.25, 1), r.range(0.25, 1)],
    amp: r.range(0.55, 0.95),
    phase: r.next(),
    keyShift: [Math.cos(ang) * r.range(0.0016, 0.003), Math.sin(ang) * r.range(0.0016, 0.003)],
    lineWidth: r.range(0.028, 0.05),
    dotRadius: r.range(0.06, 0.11),
  };
}

// Weights for the Wythoff generator: a closed loop that visits regular, truncated,
// rectified and omnitruncated tilings as the phase goes round.
export function generatorWeights(P, phase) {
  const a = phase * Math.PI * 2;
  return [0, 1, 2].map((i) => {
    const w = P.base[i] + P.amp * Math.cos(a - (i * 2 * Math.PI) / 3);
    return Math.max(w, 0.03);
  });
}

const FS = COMMON_GLSL + `
uniform float uAlpha;
uniform vec2 uN2;
uniform vec2 uC;
uniform float uRho;
uniform vec2 uCamA;
uniform vec2 uCamU;
uniform float uCamF;
uniform float uCamPar;
uniform vec2 uGen;
uniform vec4 uGeo[3];
uniform float uDisk;
uniform int uStyle;
uniform int uFace[3];
uniform int uDotInk;
uniform vec2 uKeyShift;
uniform float uLine;
uniform float uDot;

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cdiv(vec2 a, vec2 b) { return vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / dot(b, b); }

struct Fold { vec2 z; float par; float scale; bool ok; };

// Eyepiece coordinates -> world (hyperbolic isometry) -> fundamental triangle.
Fold locate(vec2 z) {
  Fold F;
  vec2 w = uCamF > 0.5 ? vec2(z.x, -z.y) : z;
  w = cmul(uCamU, w);
  vec2 den = vec2(1.0, 0.0) + cmul(vec2(uCamA.x, -uCamA.y), w);
  F.scale = (1.0 - dot(uCamA, uCamA)) / dot(den, den);
  z = cdiv(w + uCamA, den);
  F.par = uCamPar;
  F.ok = false;
  for (int i = 0; i < 60; i++) {
    float ang = atan(z.y, z.x);
    float sector = floor(ang / uAlpha);
    float local = ang - sector * uAlpha;
    if (mod(sector, 2.0) > 0.5) local = uAlpha - local;
    F.par += abs(sector);
    z = length(z) * vec2(cos(local), sin(local));
    vec2 d = z - uC;
    float L = dot(d, d);
    if (L >= uRho * uRho) { F.ok = true; break; }
    float k = uRho * uRho / L;
    z = uC + d * k;
    F.scale *= k;
    F.par += 1.0;
    if (F.scale < 2e-5) break;
  }
  F.z = z;
  return F;
}

float side(vec4 G, vec2 z) {
  if (G.z < 0.0) return dot(G.xy, z);
  vec2 d = z - G.xy;
  return (dot(d, d) - G.z * G.z) * G.w;
}
float gdist(vec4 G, vec2 z) {
  if (G.z < 0.0) return abs(dot(G.xy, z));
  return abs(length(z - G.xy) - G.z);
}

struct Cell { int region; float edge; float mirror; float par; float px; float hf; vec2 z; bool ok; };

Cell classify(vec2 disk, float pxDisk) {
  Fold F = locate(disk);
  Cell c;
  c.ok = F.ok;
  c.z = F.z;
  c.par = mod(F.par, 2.0);
  c.hf = 2.0 / max(1.0 - dot(F.z, F.z), 1e-3); // Euclidean -> hyperbolic length
  c.px = pxDisk * F.scale * c.hf;
  vec2 z = F.z;
  float s1 = side(uGeo[0], z), s2 = side(uGeo[1], z), s3 = side(uGeo[2], z);
  float d1 = gdist(uGeo[0], z), d2 = gdist(uGeo[1], z), d3 = gdist(uGeo[2], z);
  if (s1 > 0.0 && s2 > 0.0) { c.region = 0; c.edge = min(d1, d2); }
  else if (s1 <= 0.0 && s3 > 0.0) { c.region = 1; c.edge = min(d1, d3); }
  else { c.region = 2; c.edge = min(d2, d3); }
  c.edge *= c.hf;
  float m = min(z.y, -dot(z, uN2));
  m = min(m, length(z - uC) - uRho);
  c.mirror = max(m, 0.0) * c.hf;
  return c;
}

// Ink coverage pattern for odd-parity triangles.
float oddPattern(Cell c) {
  if (uStyle == 0) {
    // Halftone dots on a lattice tied to the triangle, so they shrink toward infinity.
    float cell = 0.075;
    vec2 q = mat2(0.966, 0.259, -0.259, 0.966) * (c.z * c.hf * 0.5) / cell;
    vec2 f = fract(q) - 0.5;
    float d = length(f) * cell;
    float cov = clamp((0.33 * cell - d) / c.px + 0.5, 0.0, 1.0);
    return mix(cov, 0.36, smoothstep(0.25 * cell, 0.9 * cell, c.px));
  }
  if (uStyle == 1) {
    // Contour ripples: echoes of the tile outline.
    float spacing = 0.085;
    float x = c.edge / spacing;
    float w = c.px / spacing;
    float stripe = clamp((abs(fract(x) - 0.5) - 0.22) / max(w, 1e-4) + 0.5, 0.0, 1.0);
    return mix(stripe, 0.56, smoothstep(0.2, 0.6, w));
  }
  return 1.0;
}

vec3 faceColor(Cell c, float parity) {
  vec3 paper = pal(0);
  int ink = uFace[c.region];
  if (ink == 0) {
    // Unprinted face: odd triangles carry a light tint of the neighbouring ink.
    if (parity < 0.5) return paper;
    return laydown(paper, pal(uFace[(c.region + 1) % 3]), 0.16);
  }
  vec3 col = pal(ink);
  if (parity < 0.5) return col;
  if (uStyle == 2) {
    int other = uFace[(c.region + 2) % 3];
    if (other == 0) return overprint(col, pal(1), 0.3);
    return overprint(col, pal(other), 0.85);
  }
  return laydown(paper, col, oddPattern(c));
}

vec3 meanColor() {
  vec3 s = vec3(0.0);
  for (int i = 0; i < 3; i++) s += uFace[i] == 0 ? pal(0) : pal(uFace[i]);
  return overprint(s / 3.0, pal(1), 0.18);
}

void main() {
  vec2 p = screenPos();
  float px = pixelSize();
  vec3 paper = pal(0);
  float r = length(p);
  vec2 disk = p / uDisk;
  float pxDisk = px / uDisk;
  vec3 col = paper;

  if (r < uDisk + px * 2.0) {
    Cell c = classify(disk, pxDisk);
    vec3 inside;
    if (!c.ok) {
      inside = meanColor();
    } else {
      // Anti-alias the parity change at mirror lines.
      float pw = 0.5 * (1.0 - clamp(c.mirror / c.px, 0.0, 1.0));
      inside = mix(faceColor(c, c.par), faceColor(c, 1.0 - c.par), pw);
      // Fade to the mean tone where tiles become smaller than a pixel.
      inside = mix(inside, meanColor(), smoothstep(0.35, 1.6, c.px / uLine * 0.25));
    }
    // Key line, printed from a slightly misregistered screen.
    Cell k = classify(disk + uKeyShift / uDisk, pxDisk);
    float keyCov = k.ok ? lineCov(k.edge, uLine, k.px) : 0.5;
    keyCov = mix(keyCov, 0.4, smoothstep(0.6, 3.0, k.px / uLine));
    inside = overprint(inside, pal(1), keyCov * 0.92);
    // Vertices of the uniform tiling: opaque dots printed last, with a key outline.
    if (c.ok) {
      float dv = length(c.z - uGen) * c.hf;
      float fade = 1.0 - smoothstep(0.5, 2.0, c.px / uDot);
      inside = overprint(inside, pal(1), lineCov(dv, uDot + uLine * 0.6, c.px) * fade);
      inside = laydown(inside, pal(uDotInk), lineCov(dv, uDot, c.px) * fade);
    }
    float edge = clamp((uDisk - r) / px + 0.5, 0.0, 1.0);
    col = mix(paper, inside, edge);
  }
  // The rim of the eyepiece.
  col = overprint(col, pal(1), lineCov(abs(r - uDisk - px * 0.5), px * 0.9, px) * 0.9);
  outColor = vec4(col, 1.0);
}
`;

export function createMirror(gl) {
  const { program, uniforms: u } = createProgram(gl, FS);
  const cache = new Map();

  function prepared(seed) {
    if (!cache.has(seed)) {
      const P = mirrorParams(seed);
      const T = triangle(...P.group);
      const walk = new Walk(T, { curvature: P.curvature });
      if (cache.size > 3) cache.delete(cache.keys().next().value);
      cache.set(seed, { P, T, walk });
    }
    return cache.get(seed);
  }

  return {
    id: 'mirror',
    prepare: prepared,
    draw(view) {
      const { P, T, walk } = prepared(view.seed);
      const s = view.t * P.speed + view.dial * 0.085;
      const cam = walk.at(s);
      const phase = P.phase + view.dial / 60 + view.t * 0.0032;
      const W = wythoff(T, generatorWeights(P, phase));
      gl.useProgram(program);
      setPalette(gl, u, view.palette);
      gl.uniform2f(u.uRes, view.width, view.height);
      gl.uniform1f(u.uAlpha, T.alpha);
      gl.uniform2f(u.uN2, T.n2[0], T.n2[1]);
      gl.uniform2f(u.uC, T.c[0], T.c[1]);
      gl.uniform1f(u.uRho, T.rho);
      gl.uniform2f(u.uCamA, cam.a[0], cam.a[1]);
      gl.uniform2f(u.uCamU, cam.u[0], cam.u[1]);
      gl.uniform1f(u.uCamF, cam.f ? 1 : 0);
      gl.uniform1f(u.uCamPar, cam.par % 2);
      gl.uniform2f(u.uGen, W.g[0], W.g[1]);
      const geo = [];
      W.geos.forEach((G, i) => {
        if (G.kind === 'line') geo.push(G.n[0] * W.signs[i], G.n[1] * W.signs[i], -1, 1);
        else geo.push(G.c[0], G.c[1], G.r, W.signs[i]);
      });
      gl.uniform4fv(u.uGeo, geo);
      gl.uniform1f(u.uDisk, DISK);
      gl.uniform1i(u.uStyle, P.style);
      gl.uniform1iv(u.uFace, P.faces);
      gl.uniform1i(u.uDotInk, P.dotInk);
      gl.uniform2f(u.uKeyShift, P.keyShift[0], P.keyShift[1]);
      gl.uniform1f(u.uLine, P.lineWidth);
      gl.uniform1f(u.uDot, P.dotRadius);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
