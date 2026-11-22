// Paper effects and the one renderer used by the editor, thumbnails and the PNG export alike.
// Snip: the traced outline drawn with smooth curves. Rip: the outline torn with seeded, periodic noise at
// three scales, plus a pale fibrous rim where the paper core shows — deterministic per (shape, seed).
import { resample, ringNormals } from "./geom.js";
import { TAU, canvas, hashStr, noise2, rng } from "./util.js";

export const RIM = "#FBF7EE";
const geoCache = new Map();

function smoothPath(rings, path = new Path2D()) {
  for (const r of rings) {
    const n = r.length;
    if (n < 3) continue;
    const mid = (i) => [(r[i % n][0] + r[(i + 1) % n][0]) / 2, (r[i % n][1] + r[(i + 1) % n][1]) / 2];
    const m0 = mid(0);
    path.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) {
      const c = r[i % n],
        m = mid(i);
      path.quadraticCurveTo(c[0], c[1], m[0], m[1]);
    }
    path.closePath();
  }
  return path;
}

function linePath(rings, path = new Path2D()) {
  for (const r of rings) {
    r.forEach((p, i) => (i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1])));
    path.closePath();
  }
  return path;
}

function rip(rings, seed) {
  const n = noise2(seed),
    R = rng(seed ^ 0x5bd1e995),
    step = 0.7;
  const body = [],
    rim = [],
    fib = new Path2D();
  rings.forEach((ring, ri) => {
    const pts = resample(ring, step, true);
    if (pts.length < 6) {
      body.push(ring);
      rim.push(ring);
      return;
    }
    const N = ringNormals(pts),
      L = pts.length * step,
      ox = ri * 37.1,
      oy = ri * 11.7;
    const per = (s, lambda, o) => {
      const th = (TAU * s) / L,
        Rr = L / (TAU * lambda);
      return n(Math.cos(th) * Rr + ox + o, Math.sin(th) * Rr + oy + o * 1.3);
    };
    const b = [],
      m = [];
    pts.forEach((p, i) => {
      const s = i * step;
      const d = per(s, 14, 0) * 1.5 + per(s, 4, 50) * 0.65 + per(s, 1.1, 100) * 0.3 + (R() - 0.5) * 0.14 - 0.5;
      const rw = Math.max(0, 0.3 + per(s, 9, 200) * 1.4 + per(s, 2.4, 300) * 0.4);
      const e = d + rw + 0.12 * (per(s, 0.7, 400) + 1);
      const nx = N[i][0],
        ny = N[i][1];
      b.push([p[0] + nx * d, p[1] + ny * d]);
      const q = [p[0] + nx * e, p[1] + ny * e];
      m.push(q);
      if (rw > 0.5 && R() < 0.11) {
        const a = Math.atan2(ny, nx) + (R() - 0.5) * 1.2,
          len = 0.3 + R() * 0.8;
        fib.moveTo(q[0] - nx * 0.3, q[1] - ny * 0.3);
        fib.quadraticCurveTo(q[0] + Math.cos(a) * len * 0.5 + (R() - 0.5) * 0.4, q[1] + Math.sin(a) * len * 0.5, q[0] + Math.cos(a) * len, q[1] + Math.sin(a) * len);
      }
    });
    body.push(b);
    rim.push(m);
  });
  return { body: linePath(body), rim: linePath(rim), fib };
}

// Cached Path2Ds for one shape in one edge style.
export function geometry(asset, edge, seed) {
  const key = asset.id + "|" + (edge === "rip" ? "r" + seed : "s");
  let g = geoCache.get(key);
  if (g) return g;
  if (edge === "rip") g = rip(asset.rings, seed);
  else g = { body: smoothPath(asset.rings), rim: null, fib: null };
  if (geoCache.size > 600) geoCache.delete(geoCache.keys().next().value);
  geoCache.set(key, g);
  return g;
}

/* ---------- paper texture ---------- */

const texCache = new Map();
export function textureTile(kind) {
  if (kind === "smooth") return null;
  if (texCache.has(kind)) return texCache.get(kind);
  const S = 256,
    c = canvas(S, S),
    ctx = c.getContext("2d"),
    img = ctx.createImageData(S, S),
    d = img.data,
    R = rng(kind === "fibrous" ? 77 : 42),
    mott = noise2(9, 8),
    mott2 = noise2(19, 32);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const i = (y * S + x) * 4;
      const v = (R() - 0.5) * 0.9 + mott((x / S) * 8, (y / S) * 8) * 0.14 + mott2((x / S) * 32, (y / S) * 32) * 0.22;
      const light = v > 0;
      d[i] = d[i + 1] = d[i + 2] = light ? 255 : 60;
      d[i + 3] = Math.min(255, Math.abs(v) * (light ? 22 : 16));
    }
  ctx.putImageData(img, 0, 0);
  if (kind === "fibrous") {
    ctx.lineCap = "round";
    for (let k = 0; k < 140; k++) {
      const x = R() * S,
        y = R() * S,
        a = R() * TAU,
        len = 6 + R() * 26,
        light = R() < 0.65;
      ctx.strokeStyle = light ? `rgba(255,255,255,${0.18 + R() * 0.2})` : `rgba(40,30,20,${0.06 + R() * 0.07})`;
      ctx.lineWidth = 0.5 + R() * 0.8;
      for (const ox of [-S, 0, S])
        for (const oy of [-S, 0, S]) {
          ctx.beginPath();
          ctx.moveTo(x + ox, y + oy);
          ctx.quadraticCurveTo(x + ox + Math.cos(a + 0.6) * len * 0.5, y + oy + Math.sin(a + 0.6) * len * 0.5, x + ox + Math.cos(a) * len, y + oy + Math.sin(a) * len);
          ctx.stroke();
        }
    }
  }
  texCache.set(kind, c);
  return c;
}

/* ---------- rendering ---------- */

// base: DOMMatrix mapping design px → device px. W/H: design size of the artwork.
export function drawPiece(ctx, piece, asset, base, env) {
  const g = geometry(asset, piece.e, piece.seed),
    sc = piece.s / 100;
  const m = base
    .translate(piece.x, piece.y)
    .rotate((piece.r * 180) / Math.PI)
    .scale(sc * (piece.fx ? -1 : 1), sc * (piece.fy ? -1 : 1));
  const dev = Math.hypot(base.a, base.b),
    unit = Math.max(env.W, env.H) / 1000;
  ctx.setTransform(m);
  if (env.shadow !== false) {
    ctx.shadowColor = "rgba(52,40,24,.2)";
    ctx.shadowBlur = 5 * unit * dev;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 1.6 * unit * dev;
  }
  ctx.fillStyle = g.rim ? RIM : piece.c;
  ctx.fill(g.rim || g.body);
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  if (g.rim) {
    ctx.strokeStyle = RIM;
    ctx.lineWidth = 0.16;
    ctx.stroke(g.fib);
    ctx.fillStyle = piece.c;
    ctx.fill(g.body);
  }
  if (env.pattern) {
    ctx.save();
    ctx.clip(g.body);
    const h = hashStr(String(piece.id)),
      ox = (h % 997) * 1.3,
      oy = ((h >> 10) % 991) * 1.3;
    ctx.setTransform(base.translate(-ox, -oy));
    ctx.fillStyle = env.pattern;
    const r = piece.s * 0.75;
    ctx.fillRect(piece.x - r + ox, piece.y - r + oy, r * 2, r * 2);
    ctx.restore();
  }
}

export function makeEnv(ctx, art, W, H, shadow = true) {
  const tile = textureTile(art.texture);
  let pattern = null;
  if (tile) {
    pattern = ctx.createPattern(tile, "repeat");
    const k = Math.max(W, H) / 900;
    pattern.setTransform(new DOMMatrix().scale(k));
  }
  return { W, H, pattern, shadow };
}

export function renderArtwork(ctx, art, base, W, H, getAsset, opts = {}) {
  const env = makeEnv(ctx, art, W, H, opts.shadow);
  ctx.setTransform(base);
  ctx.fillStyle = art.bg;
  ctx.fillRect(0, 0, W, H);
  if (env.pattern) {
    ctx.fillStyle = env.pattern;
    ctx.fillRect(0, 0, W, H);
  }
  for (const p of art.pieces) {
    const a = getAsset(p.a);
    if (a) drawPiece(ctx, p, a, base, env);
  }
}

// Thumbnail of a single shape, centred in a square canvas (tray, variants).
export function drawShapeThumb(c, asset, color, edge, seed) {
  const ctx = c.getContext("2d"),
    S = c.width,
    pad = S * 0.12;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, S, S);
  if (!asset) return;
  const size = S - pad * 2,
    piece = { id: asset.id, x: S / 2, y: S / 2, s: size, r: 0, c: color, e: edge, seed };
  drawPiece(ctx, piece, asset, new DOMMatrix(), { W: S * 3, H: S * 3, pattern: null, shadow: true });
}
