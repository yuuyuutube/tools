// Shape generator: turns a few strokes into cut-paper silhouettes, and builds the preset pieces.
// Every generator emits simple primitives (filled polygons, round lines, circles, and "cut" versions of
// each), which are rasterised, softened and traced back into clean vector rings. Tracing makes overlaps
// merge into one piece of paper and keeps cut-outs (slits, holes) as real holes.
import { boxBlur, chaikin, dist, normalizeRings, orientRings, polyLen, rdpClosed, resample, ringNormals, signedArea, smooth, traceField } from "./geom.js";
import { TAU, canvas, noise2, rng } from "./util.js";

export const TYPES = ["leaf", "branch", "flower", "organic", "free"];
export const VARIANTS = ["original", "soft", "bold"];

const RAST = 360;

/* ---------- primitives → rings ---------- */

export function rasterize(prims, { blur = 1.2, pad = 12, minArea = 0.0015 } = {}) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  const grow = (x, y, r = 0) => {
    x0 = Math.min(x0, x - r);
    y0 = Math.min(y0, y - r);
    x1 = Math.max(x1, x + r);
    y1 = Math.max(y1, y + r);
  };
  for (const p of prims) {
    if (p.cut) continue;
    if (p.t === "circle") grow(p.x, p.y, p.r);
    else for (const q of p.pts) grow(q[0], q[1], p.t === "line" ? p.w / 2 : 0);
  }
  if (!isFinite(x0)) return null;
  const b = Math.ceil(blur * 2);
  const bw = Math.max(x1 - x0, 1e-3),
    bh = Math.max(y1 - y0, 1e-3);
  const s = (RAST - 2 * (pad + b)) / Math.max(bw, bh);
  const w = Math.ceil(bw * s + 2 * (pad + b)),
    hgt = Math.ceil(bh * s + 2 * (pad + b));
  const c = canvas(w, hgt),
    ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.setTransform(s, 0, 0, s, pad + b - x0 * s, pad + b - y0 * s);
  ctx.lineCap = ctx.lineJoin = "round";
  for (const p of prims) {
    ctx.globalCompositeOperation = p.cut ? "destination-out" : "source-over";
    ctx.fillStyle = ctx.strokeStyle = "#000";
    ctx.beginPath();
    if (p.t === "circle") {
      ctx.arc(p.x, p.y, Math.max(p.r, 0.01), 0, TAU);
      ctx.fill();
    } else if (p.t === "poly") {
      p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
      ctx.closePath();
      ctx.fill(p.rule || "nonzero");
    } else if (p.t === "line") {
      if (p.pts.length === 1) {
        ctx.arc(p.pts[0][0], p.pts[0][1], p.w / 2, 0, TAU);
        ctx.fill();
      } else {
        p.pts.forEach((q, i) => (i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])));
        ctx.lineWidth = p.w;
        ctx.stroke();
      }
    }
  }
  const data = ctx.getImageData(0, 0, w, hgt).data,
    f = new Float32Array(w * hgt);
  for (let i = 0; i < f.length; i++) f[i] = data[i * 4 + 3] / 255;
  boxBlur(f, w, hgt, Math.round(blur));
  let rings = traceField(f, w, hgt, 0.5)
    .map((r) => rdpClosed(r, 0.3))
    .filter((r) => r.length >= 3 && Math.abs(signedArea(r)) > minArea * w * hgt);
  if (!rings.length) return null;
  orientRings(rings);
  return normalizeRings(rings);
}

// Gentle low-frequency wobble along the outline ("Bold" organic edges).
function waveRings(shape, { amp, lambda }, seed) {
  const n = noise2(seed ^ 0x2c1b3c6d);
  const rings = shape.rings.map((ring, ri) => {
    const pts = resample(ring, 1.2, true);
    if (pts.length < 6) return ring;
    const N = ringNormals(pts),
      L = pts.length * 1.2,
      R = L / (TAU * lambda);
    const out = pts.map((p, i) => {
      const th = (TAU * i) / pts.length;
      const d = n(Math.cos(th) * R + ri * 31, Math.sin(th) * R + ri * 17) * amp;
      return [p[0] + N[i][0] * d, p[1] + N[i][1] * d];
    });
    return smooth(out, 2, true);
  });
  return normalizeRings(rings);
}

/* ---------- building blocks ---------- */

function tangents(path) {
  const n = path.length;
  return path.map((_, i) => {
    const a = path[Math.max(0, i - 1)],
      b = path[Math.min(n - 1, i + 1)];
    const tx = b[0] - a[0],
      ty = b[1] - a[1],
      L = Math.hypot(tx, ty) || 1;
    return [tx / L, ty / L];
  });
}

// A leaf grown around a midrib path: base at path[0], tip at the end.
export function leafOutline(path, { w, p = 0.8, tip = 0.85, asym = 0, wave = null }) {
  const T = tangents(path),
    n = path.length,
    left = [],
    right = [];
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const prof = Math.pow(Math.max(0, Math.sin(Math.PI * Math.pow(t, tip))), p);
    let wl = w * prof * (1 + asym),
      wr = w * prof * (1 - asym);
    if (wave) {
      wl *= 1 + wave.amp * Math.sin(wave.f * TAU * t + wave.ph);
      wr *= 1 + wave.amp * Math.sin(wave.f * TAU * t + wave.ph + 1.7);
    }
    const [x, y] = path[i],
      nx = -T[i][1],
      ny = T[i][0];
    left.push([x + nx * wl, y + ny * wl]);
    right.push([x - nx * wr, y - ny * wr]);
  }
  return left.concat(right.reverse());
}

// Tapered ribbon (stems).
function ribbon(path, w0, w1) {
  const T = tangents(path),
    n = path.length,
    l = [],
    r = [];
  for (let i = 0; i < n; i++) {
    const t = i / Math.max(1, n - 1),
      w = (w0 + (w1 - w0) * t) / 2;
    const [x, y] = path[i],
      nx = -T[i][1],
      ny = T[i][0];
    l.push([x + nx * w, y + ny * w]);
    r.push([x - nx * w, y - ny * w]);
  }
  return l.concat(r.reverse());
}

function curve(p0, p1, bend = 0, n = 24) {
  const mx = (p0[0] + p1[0]) / 2,
    my = (p0[1] + p1[1]) / 2,
    dx = p1[0] - p0[0],
    dy = p1[1] - p0[1];
  const cx = mx - dy * bend,
    cy = my + dx * bend,
    out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n,
      u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * cx + t * t * p1[0], u * u * p0[1] + 2 * u * t * cy + t * t * p1[1]]);
  }
  return out;
}

function walker(path) {
  const cum = [0];
  for (let i = 1; i < path.length; i++) cum.push(cum[i - 1] + dist(path[i - 1], path[i]));
  const L = cum[cum.length - 1] || 1,
    T = tangents(path);
  return {
    L,
    at(d) {
      d = Math.max(0, Math.min(L, d));
      let i = 1;
      while (i < cum.length - 1 && cum[i] < d) i++;
      const a = path[i - 1],
        b = path[i] || a,
        seg = cum[i] - cum[i - 1] || 1,
        t = (d - cum[i - 1]) / seg;
      return { p: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t], tan: T[i] || T[i - 1] };
    },
  };
}

const rot = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a)];
const add = (p, v, k = 1) => [p[0] + v[0] * k, p[1] + v[1] * k];
const circ = (x, y, r, cut) => ({ t: "circle", x, y, r, cut });
const poly = (pts, extra) => ({ t: "poly", pts, ...extra });
const line = (pts, w, cut) => ({ t: "line", pts, w, cut });

function polar(fn, n = 300) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU,
      r = fn(a);
    out.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return out;
}

/* ---------- strokes → generators ---------- */

function prepStrokes(strokes) {
  const all = strokes.flat();
  if (!all.length) return { list: [] };
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of all) {
    x0 = Math.min(x0, p[0]);
    y0 = Math.min(y0, p[1]);
    x1 = Math.max(x1, p[0]);
    y1 = Math.max(y1, p[1]);
  }
  const S = Math.max(40, Math.hypot(x1 - x0, y1 - y0));
  const list = strokes
    .filter((s) => s.length)
    .map((s) => {
      let p = s.length > 1 ? resample(s, S / 90) : s.map((q) => [q[0], q[1]]);
      if (p.length > 4) p = smooth(p, 2);
      const L = polyLen(p);
      const closed = p.length > 5 && L > S * 0.4 && dist(p[0], p[p.length - 1]) < Math.max(L * 0.16, S * 0.08);
      return { p, L, closed, dot: L < S * 0.05 };
    });
  return { list, S, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

const dotPrim = (s, r) => circ(s.p[0][0], s.p[0][1], r);

const GEN = {
  leaf(prep, v, R) {
    const prims = [];
    for (const s of prep.list) {
      if (s.dot) {
        prims.push(dotPrim(s, prep.S * 0.05));
        continue;
      }
      const path = resample(s.p, s.L / 60),
        L = s.L;
      if (v === "original") prims.push(poly(leafOutline(path, { w: L * 0.11, p: 0.85, tip: 0.9, asym: (R() - 0.5) * 0.15 })));
      else if (v === "soft") prims.push(poly(leafOutline(path, { w: L * 0.2, p: 0.5, tip: 0.8, asym: (R() - 0.5) * 0.2 })));
      else {
        const w = L * 0.25;
        prims.push(poly(leafOutline(path, { w, p: 0.55, tip: 0.75, asym: (R() - 0.5) * 0.25, wave: { amp: 0.1, f: 2 + R() * 2, ph: R() * 6 } })));
        const W = walker(path),
          nS = Math.max(2, Math.min(7, Math.round(L / (w * 0.8))));
        for (let k = 0; k < nS; k++)
          for (const side of [1, -1]) {
            const d = W.L * (0.16 + (0.7 * (k + (side > 0 ? 0.35 : 0.75))) / nS);
            const { p, tan } = W.at(d),
              N = [-tan[1] * side, tan[0] * side];
            prims.push(line([add(p, N, w * 0.28), add(add(p, N, w * 1.6), tan, w * 0.55)], w * 0.075, true));
          }
        for (let k = 0; k < 2; k++) {
          const { p, tan } = W.at(W.L * (0.3 + k * 0.25)),
            side = k ? 1 : -1;
          prims.push(circ(...add(p, [-tan[1] * side, tan[0] * side], w * 0.42), w * 0.07, true));
        }
      }
    }
    return { prims, opt: { blur: v === "soft" ? 3 : 1.2 } };
  },

  branch(prep, v, R) {
    const prims = [];
    const cfg = {
      original: { stem: 0.022, len: 0.2, wr: 0.2, p: 0.8, gap: 0.55, ang: 52 },
      soft: { stem: 0.03, len: 0.16, wr: 0.42, p: 0.5, gap: 0.75, ang: 55 },
      bold: { stem: 0.032, len: 0.27, wr: 0.17, p: 0.85, gap: 0.42, ang: 38 },
    }[v];
    for (const s of prep.list) {
      if (s.dot) {
        prims.push(dotPrim(s, prep.S * 0.05));
        continue;
      }
      const path = resample(s.p, s.L / 80),
        L = s.L,
        W = walker(path);
      prims.push(poly(ribbon(path, L * cfg.stem, L * cfg.stem * 0.45)));
      const leafLen = L * cfg.len,
        leaf = (p, dir, len, side) => {
          const lp = curve(p, add(p, dir, len), -0.1 * side, 20);
          prims.push(poly(leafOutline(lp, { w: len * cfg.wr, p: cfg.p, tip: 0.8 })));
        };
      let side = 1;
      for (let d = L * 0.14; d < L * 0.9; d += leafLen * cfg.gap * (0.85 + R() * 0.3)) {
        const { p, tan } = W.at(d),
          len = leafLen * (0.7 + 0.4 * (1 - d / L)) * (0.9 + R() * 0.2);
        const ang = ((cfg.ang * Math.PI) / 180) * side + (R() - 0.5) * 0.2;
        leaf(p, rot(tan, ang), len, side);
        if (v === "bold") leaf(p, rot(tan, -ang), len, -side);
        else side = -side;
      }
      const end = W.at(W.L);
      leaf(end.p, end.tan, leafLen * 0.85, 1);
    }
    return { prims, opt: { blur: v === "soft" ? 2.5 : 1.2 } };
  },

  flower(prep, v, R) {
    const prims = [],
      bins = 72,
      prof = new Array(bins).fill(0);
    const { cx, cy } = prep;
    for (const s of prep.list)
      for (const q of s.p) {
        const a = Math.atan2(q[1] - cy, q[0] - cx),
          d = Math.hypot(q[0] - cx, q[1] - cy);
        const b = ((Math.round((a / TAU) * bins) % bins) + bins) % bins;
        prof[b] = Math.max(prof[b], d);
      }
    let maxR = Math.max(...prof);
    if (maxR < prep.S * 0.08) {
      maxR = prep.S * 0.3;
      prof.fill(maxR);
    }
    // Fill empty angles by interpolating around the circle, then keep it from collapsing.
    const known = prof.map((r, i) => (r > 0 ? i : -1)).filter((i) => i >= 0);
    for (let i = 0; i < bins; i++) {
      if (prof[i] > 0) continue;
      let a = known[known.length - 1] - bins,
        b = known[0] + bins;
      for (const k of known) {
        if (k < i) a = k;
        if (k > i) {
          b = k;
          break;
        }
      }
      const ra = prof[(a + bins) % bins],
        rb = prof[b % bins];
      prof[i] = ra + ((rb - ra) * (i - a)) / (b - a);
    }
    for (let i = 0; i < bins; i++) prof[i] = Math.max(prof[i], maxR * 0.45);
    let sm = prof;
    for (let k = 0; k < 4; k++) sm = sm.map((_, i) => (sm[(i - 1 + bins) % bins] + 2 * sm[i] + sm[(i + 1) % bins]) / 4);
    const at = (a) => {
      const f = (((a / TAU) * bins) % bins + bins) % bins,
        i = Math.floor(f),
        t = f - i;
      return sm[i] * (1 - t) + sm[(i + 1) % bins] * t;
    };
    const ph = R() * TAU;
    if (v === "original") {
      const n = 5 + ((prep.list.length + Math.floor(R() * 3)) % 4);
      prims.push(poly(polar((a) => at(a) * (0.84 + 0.16 * Math.pow(Math.abs(Math.cos((n * (a - ph)) / 2)), 0.7))).map((q) => [q[0] + cx, q[1] + cy])));
      prims.push(circ(cx, cy, maxR * 0.1, true));
    } else if (v === "soft") {
      const n = 5 + Math.floor(R() * 2);
      prims.push(poly(polar((a) => at(a) * (0.52 + 0.48 * Math.pow(Math.abs(Math.cos((n * (a - ph)) / 2)), 0.45))).map((q) => [q[0] + cx, q[1] + cy])));
    } else {
      const n = 6 + Math.floor(R() * 4);
      for (let k = 0; k < n; k++) {
        const a = ph + (k * TAU) / n,
          len = at(a) * 1.02,
          d = [Math.cos(a), Math.sin(a)];
        const path = resample([add([cx, cy], d, maxR * 0.26), add([cx, cy], d, len)], len / 18);
        prims.push(poly(leafOutline(path, { w: Math.min(len * 0.34, maxR * Math.sin(Math.PI / n) * 1.05), p: 0.55, tip: 0.7 })));
      }
      prims.push(circ(cx, cy, maxR * 0.19));
    }
    return { prims, opt: { blur: v === "soft" ? 3 : 1.2 } };
  },

  organic(prep, v) {
    const prims = [],
      w = { original: 0.06, soft: 0.15, bold: 0.11 }[v] * prep.S;
    for (const s of prep.list) {
      if (s.dot) {
        prims.push(dotPrim(s, w * 0.9));
        continue;
      }
      if (s.closed) prims.push(poly(s.p));
      prims.push(line(s.p, w));
    }
    return {
      prims,
      opt: { blur: v === "soft" ? 6 : v === "bold" ? 3 : 1.2 },
      wave: v === "bold" ? { amp: 5, lambda: 22 } : v === "soft" ? { amp: 1.5, lambda: 30 } : null,
    };
  },

  free(prep, v) {
    const prims = [],
      S = prep.S;
    for (const s of prep.list) {
      if (s.dot) {
        prims.push(dotPrim(s, S * 0.03));
        continue;
      }
      prims.push(poly(v === "soft" ? chaikin(s.p, true, 3) : s.p, { rule: "evenodd" }));
      prims.push(line(s.p, S * (v === "bold" ? 0.07 : v === "soft" ? 0.03 : 0.012)));
    }
    return { prims, opt: { blur: v === "soft" ? 4 : 1 }, wave: v === "bold" ? { amp: 3.5, lambda: 16 } : null };
  },
};

// strokes: arrays of [x, y] in any unit. Never returns null when there is at least one stroke.
export function generate(type, strokes, variant, seed) {
  const prep = prepStrokes(strokes);
  if (!prep.list.length) return null;
  const R = rng(seed + VARIANTS.indexOf(variant) * 7919 + TYPES.indexOf(type) * 104729);
  let out = null;
  try {
    const spec = GEN[type](prep, variant, R);
    out = rasterize(spec.prims, spec.opt);
    if (out && spec.wave) out = waveRings(out, spec.wave, seed);
  } catch (e) {
    console.warn("shape fallback", e);
  }
  if (!out) out = rasterize(GEN.organic(prep, "original", R).prims, { blur: 1 });
  return out;
}

/* ---------- presets: an original set of cut-paper pieces ---------- */

const PRESETS = {
  monstera() {
    const path = curve([0, 110], [8, -100], 0.07, 60),
      w = 64,
      W = walker(path),
      prims = [poly(leafOutline(path, { w, p: 0.42, tip: 0.78 }))];
    prims.push(line([[0, 108], [-3, 140]], 6));
    for (let k = 0; k < 6; k++)
      for (const side of [1, -1]) {
        const { p, tan } = W.at(W.L * (0.17 + k * 0.12 + (side > 0 ? 0 : 0.05))),
          N = [-tan[1] * side, tan[0] * side];
        prims.push(line([add(p, N, w * 0.3), add(add(p, N, w * 1.6), tan, w * 0.6)], 6.5, true));
      }
    for (let k = 0; k < 4; k++) {
      const { p, tan } = W.at(W.L * (0.25 + k * 0.13)),
        side = k % 2 ? 1 : -1;
      prims.push(circ(...add(p, [-tan[1] * side, tan[0] * side], w * 0.48), 4.6, true));
    }
    return prims;
  },
  banana() {
    const path = curve([0, 140], [6, -140], 0.06, 80),
      w = 30,
      W = walker(path),
      prims = [poly(leafOutline(path, { w, p: 0.3, tip: 0.95 })), line([[0, 138], [0, 172]], 5)];
    const R = rng(11);
    for (let k = 0; k < 8; k++) {
      const side = k % 2 ? 1 : -1,
        { p, tan } = W.at(W.L * (0.18 + k * 0.085 + R() * 0.03)),
        N = [-tan[1] * side, tan[0] * side];
      prims.push(line([add(p, N, w * 1.3), add(add(p, N, w * (0.2 + R() * 0.2)), tan, 3)], 2.4, true));
    }
    return prims;
  },
  palm() {
    const path = curve([0, 150], [14, -150], 0.1, 80),
      W = walker(path),
      prims = [poly(ribbon(path, 6, 2.5))];
    for (let i = 0; i < 11; i++) {
      const t = 0.08 + i * 0.083,
        { p, tan } = W.at(W.L * t),
        len = 104 * (1 - 0.62 * t);
      for (const side of [1, -1]) {
        const dir = rot(tan, side * (0.82 - t * 0.25));
        prims.push(poly(leafOutline(curve(p, add(p, dir, len), 0.1 * side, 20), { w: len * 0.075, p: 0.8, tip: 0.9 })));
      }
    }
    return prims;
  },
  fern() {
    const path = curve([0, 130], [-10, -130], -0.06, 60),
      W = walker(path),
      prims = [poly(ribbon(path, 4.5, 2))];
    for (let i = 0; i < 12; i++) {
      const t = 0.1 + i * 0.07,
        { p, tan } = W.at(W.L * t),
        len = 46 * (1 - 0.65 * t);
      for (const side of [1, -1]) prims.push(poly(leafOutline(curve(p, add(p, rot(tan, side * 1.15), len), 0.05 * side, 16), { w: len * 0.34, p: 0.5, tip: 0.8 })));
    }
    prims.push(poly(leafOutline(curve(W.at(W.L).p, add(W.at(W.L).p, W.at(W.L).tan, 22), 0, 12), { w: 7, p: 0.5 })));
    return prims;
  },
  round() {
    return [poly(leafOutline(curve([0, 70], [4, -70], 0.05, 40), { w: 60, p: 0.5, tip: 0.72 })), line([[0, 68], [-4, 106]], 5)];
  },
  slim() {
    return [poly(leafOutline(curve([0, 120], [0, -120], 0.18, 50), { w: 22, p: 0.9, tip: 0.9 }))];
  },
  sprout() {
    const path = curve([0, 120], [0, -110], 0.16, 60),
      W = walker(path),
      prims = [poly(ribbon(path, 5, 2.5))];
    let side = 1;
    for (let i = 0; i < 5; i++) {
      const { p, tan } = W.at(W.L * (0.16 + i * 0.16)),
        len = 52 - i * 4;
      prims.push(poly(leafOutline(curve(p, add(p, rot(tan, side * 0.9), len), -0.08 * side, 18), { w: len * 0.42, p: 0.5, tip: 0.8 })));
      side = -side;
    }
    const e = W.at(W.L);
    prims.push(poly(leafOutline(curve(e.p, add(e.p, e.tan, 40), 0, 16), { w: 16, p: 0.5 })));
    return prims;
  },
  flower() {
    return [poly(polar((a) => 60 * (0.54 + 0.46 * Math.pow(Math.abs(Math.cos((5 * a) / 2)), 0.45)))), circ(0, 0, 7, true)];
  },
  daisy() {
    const prims = [circ(0, 0, 14)];
    for (let k = 0; k < 11; k++) {
      const a = (k * TAU) / 11,
        d = [Math.cos(a), Math.sin(a)];
      prims.push(poly(leafOutline(resample([add([0, 0], d, 19), add([0, 0], d, 72)], 3), { w: 7.5, p: 0.6, tip: 0.8 })));
    }
    return prims;
  },
  bloom() {
    const prims = [];
    for (let k = 0; k < 7; k++) {
      const a = (k * TAU) / 7,
        d = [Math.cos(a), Math.sin(a)];
      prims.push(poly(leafOutline(curve(add([0, 0], d, 8), add([0, 0], d, 66), 0.12, 20), { w: 22, p: 0.45, tip: 0.65 })));
    }
    prims.push(circ(0, 0, 13, true), circ(0, 0, 8));
    return prims;
  },
  lemon() {
    return [poly(leafOutline(resample([[-66, 0], [66, 0]], 2), { w: 38, p: 0.55, tip: 1 }))];
  },
  fruit() {
    return [circ(0, 12, 46), line([[0, -30], [2, -46]], 5), poly(leafOutline(curve([2, -42], [40, -70], -0.2, 20), { w: 13, p: 0.6 }))];
  },
  sun() {
    const prims = [circ(0, 0, 38)];
    for (let k = 0; k < 14; k++) {
      const a = (k * TAU) / 14,
        r1 = k % 2 ? 58 : 70,
        hw = 0.11;
      prims.push(poly([[Math.cos(a - hw) * 47, Math.sin(a - hw) * 47], [Math.cos(a) * r1, Math.sin(a) * r1], [Math.cos(a + hw) * 47, Math.sin(a + hw) * 47]]));
    }
    return prims;
  },
  moon() {
    return [circ(0, 0, 50), circ(26, -14, 44, true)];
  },
  star() {
    return [poly(polar((a) => 72 * (0.36 + 0.64 * Math.pow(Math.abs(Math.cos(4 * a)), 6)), 480))];
  },
  sparkle() {
    return [poly(polar((a) => 70 * (0.16 + 0.84 * Math.pow(Math.abs(Math.cos(2 * a)), 14)), 480))];
  },
  blob() {
    return [poly(polar((a) => 50 * (1 + 0.16 * Math.sin(2 * a + 0.4) + 0.1 * Math.sin(3 * a + 2.1) + 0.06 * Math.sin(5 * a + 1))))];
  },
  pebble() {
    return [poly(polar((a) => 50 * (1 + 0.28 * Math.cos(2 * a) + 0.07 * Math.sin(3 * a + 0.7))))];
  },
  wave() {
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const x = -90 + i * 2.25;
      pts.push([x, 18 * Math.sin((x / 90) * TAU * 1.1)]);
    }
    return [line(pts, 17)];
  },
  swirl() {
    const pts = [];
    for (let i = 0; i <= 140; i++) {
      const t = i / 140,
        a = t * 3.3 * Math.PI,
        r = 6 + t * 56;
      pts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
    return [line(pts, 13)];
  },
  drop() {
    return [poly(leafOutline(resample([[0, -70], [0, 70]], 2), { w: 40, p: 0.55, tip: 1.8 }))];
  },
  dot() {
    return [circ(0, 0, 50)];
  },
};

export const PRESET_IDS = Object.keys(PRESETS);

export function buildPresets() {
  const out = {};
  for (const id of PRESET_IDS) {
    const shape = rasterize(PRESETS[id](), { blur: 1.2 });
    if (shape) out["p:" + id] = { id: "p:" + id, preset: true, ...shape };
  }
  return out;
}
