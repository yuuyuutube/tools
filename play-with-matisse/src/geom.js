// Polyline / polygon helpers and the raster → vector contour tracer.
// Rings are arrays of [x, y]. Outer rings have positive shoelace area, holes negative, so the
// right-hand normal (dy, -dx) always points away from the paper.

export const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);

export function polyLen(pts, closed = false) {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += dist(pts[i - 1], pts[i]);
  if (closed && pts.length > 2) L += dist(pts[pts.length - 1], pts[0]);
  return L;
}

export function resample(pts, step, closed = false) {
  if (pts.length < 2 || !(step > 0)) return pts.map((p) => [p[0], p[1]]);
  const src = closed ? [...pts, pts[0]] : pts;
  const out = [[src[0][0], src[0][1]]];
  let acc = 0;
  for (let i = 1; i < src.length; i++) {
    const a = src[i - 1],
      b = src[i],
      d = dist(a, b);
    if (!d) continue;
    let pos = 0;
    while (acc + (d - pos) >= step) {
      pos += step - acc;
      acc = 0;
      const t = pos / d;
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
    acc += d - pos;
  }
  if (closed) {
    if (out.length > 2 && dist(out[out.length - 1], out[0]) < step * 0.5) out.pop();
  } else {
    const last = src[src.length - 1];
    if (dist(out[out.length - 1], last) > step * 0.3) out.push([last[0], last[1]]);
    else out[out.length - 1] = [last[0], last[1]];
  }
  return out;
}

export function smooth(pts, iters = 1, closed = false) {
  let p = pts;
  const n = p.length;
  if (n < 3) return p;
  for (let k = 0; k < iters; k++) {
    const q = new Array(n);
    for (let i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) {
        q[i] = p[i];
        continue;
      }
      const a = p[(i - 1 + n) % n],
        b = p[i],
        c = p[(i + 1) % n];
      q[i] = [(a[0] + 2 * b[0] + c[0]) / 4, (a[1] + 2 * b[1] + c[1]) / 4];
    }
    p = q;
  }
  return p;
}

export function chaikin(pts, closed = true, iters = 2) {
  let p = pts;
  for (let k = 0; k < iters; k++) {
    const q = [];
    const n = p.length;
    const m = closed ? n : n - 1;
    if (!closed) q.push(p[0]);
    for (let i = 0; i < m; i++) {
      const a = p[i],
        b = p[(i + 1) % n];
      q.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      q.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    if (!closed) q.push(p[n - 1]);
    p = q;
  }
  return p;
}

export function signedArea(r) {
  let s = 0;
  for (let i = 0, n = r.length; i < n; i++) {
    const a = r[i],
      b = r[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

export function pointInRing(p, r) {
  let inside = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const a = r[i],
      b = r[j];
    if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

function rdp(pts, eps) {
  if (pts.length < 3) return pts;
  const a = pts[0],
    b = pts[pts.length - 1];
  const dx = b[0] - a[0],
    dy = b[1] - a[1],
    L = Math.hypot(dx, dy) || 1e-9;
  let max = 0,
    idx = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + b[0] * a[1] - b[1] * a[0]) / L;
    if (d > max) {
      max = d;
      idx = i;
    }
  }
  if (max <= eps) return [a, b];
  const l = rdp(pts.slice(0, idx + 1), eps),
    r = rdp(pts.slice(idx), eps);
  return l.slice(0, -1).concat(r);
}

export function rdpClosed(ring, eps) {
  if (ring.length < 8) return ring;
  let far = 0,
    fd = 0;
  for (let i = 1; i < ring.length; i++) {
    const d = dist(ring[0], ring[i]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = rdp(ring.slice(0, far + 1), eps),
    b = rdp(ring.slice(far).concat([ring[0]]), eps);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

export function ringNormals(r) {
  const n = r.length,
    out = new Array(n);
  for (let i = 0; i < n; i++) {
    const a = r[(i - 1 + n) % n],
      b = r[(i + 1) % n];
    const tx = b[0] - a[0],
      ty = b[1] - a[1],
      L = Math.hypot(tx, ty) || 1;
    out[i] = [ty / L, -tx / L];
  }
  return out;
}

// Separable box blur, run twice ≈ gaussian.
export function boxBlur(f, w, h, r) {
  if (r < 1) return f;
  const tmp = new Float32Array(f.length);
  for (let pass = 0; pass < 2; pass++) {
    for (let y = 0; y < h; y++) {
      let s = 0;
      const row = y * w;
      for (let x = -r; x <= r; x++) s += f[row + Math.min(w - 1, Math.max(0, x))];
      for (let x = 0; x < w; x++) {
        tmp[row + x] = s / (2 * r + 1);
        s += f[row + Math.min(w - 1, x + r + 1)] - f[row + Math.max(0, x - r)];
      }
    }
    for (let x = 0; x < w; x++) {
      let s = 0;
      for (let y = -r; y <= r; y++) s += tmp[Math.min(h - 1, Math.max(0, y)) * w + x];
      for (let y = 0; y < h; y++) {
        f[y * w + x] = s / (2 * r + 1);
        s += tmp[Math.min(h - 1, y + r + 1) * w + x] - tmp[Math.max(0, y - r) * w + x];
      }
    }
  }
  return f;
}

// Marching squares with linear interpolation; the image border counts as empty, so every contour closes.
export function traceField(f, w, h, thr = 0.5) {
  const val = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : f[y * w + x]);
  const W = w + 2;
  const kH = (x, y) => ((y + 1) * W + (x + 1)) * 2;
  const kV = (x, y) => ((y + 1) * W + (x + 1)) * 2 + 1;
  const pts = new Map(),
    adj = new Map();
  const add = (k, n) => {
    const l = adj.get(k);
    if (l) l.push(n);
    else adj.set(k, [n]);
  };
  for (let y = -1; y < h; y++)
    for (let x = -1; x < w; x++) {
      const a = val(x, y),
        b = val(x + 1, y),
        c = val(x + 1, y + 1),
        d = val(x, y + 1);
      const idx = (a >= thr ? 8 : 0) | (b >= thr ? 4 : 0) | (c >= thr ? 2 : 0) | (d >= thr ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      const T = kH(x, y),
        B = kH(x, y + 1),
        L = kV(x, y),
        R = kV(x + 1, y);
      if (!pts.has(T) && (a >= thr) !== (b >= thr)) pts.set(T, [x + (thr - a) / (b - a), y]);
      if (!pts.has(B) && (d >= thr) !== (c >= thr)) pts.set(B, [x + (thr - d) / (c - d), y + 1]);
      if (!pts.has(L) && (a >= thr) !== (d >= thr)) pts.set(L, [x, y + (thr - a) / (d - a)]);
      if (!pts.has(R) && (b >= thr) !== (c >= thr)) pts.set(R, [x + 1, y + (thr - b) / (c - b)]);
      const seg = (p, q) => {
        add(p, q);
        add(q, p);
      };
      const centre = (a + b + c + d) / 4 >= thr;
      switch (idx) {
        case 1: case 14: seg(L, B); break;
        case 2: case 13: seg(B, R); break;
        case 3: case 12: seg(L, R); break;
        case 4: case 11: seg(T, R); break;
        case 6: case 9: seg(T, B); break;
        case 7: case 8: seg(L, T); break;
        case 5: if (centre) { seg(L, T); seg(B, R); } else { seg(T, R); seg(L, B); } break;
        case 10: if (centre) { seg(T, R); seg(L, B); } else { seg(L, T); seg(B, R); } break;
      }
    }
  const seen = new Set(),
    rings = [];
  for (const k of adj.keys()) {
    if (seen.has(k)) continue;
    const ring = [];
    let prev = -1,
      cur = k;
    while (cur !== undefined && !seen.has(cur)) {
      seen.add(cur);
      ring.push(pts.get(cur));
      const n = adj.get(cur);
      const next = n[0] !== prev ? n[0] : n[1];
      prev = cur;
      cur = next;
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

export function orientRings(rings) {
  for (let i = 0; i < rings.length; i++) {
    let depth = 0;
    for (let j = 0; j < rings.length; j++) if (j !== i && pointInRing(rings[i][0], rings[j])) depth++;
    const outer = depth % 2 === 0,
      a = signedArea(rings[i]);
    if ((outer && a < 0) || (!outer && a > 0)) rings[i].reverse();
  }
  return rings;
}

export function bbox(rings) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const r of rings)
    for (const p of r) {
      if (p[0] < x0) x0 = p[0];
      if (p[1] < y0) y0 = p[1];
      if (p[0] > x1) x1 = p[0];
      if (p[1] > y1) y1 = p[1];
    }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
}

// Centre on the origin; the longer side becomes 100 units.
export function normalizeRings(rings) {
  const b = bbox(rings);
  const s = 100 / Math.max(b.w, b.h, 1e-6),
    cx = (b.x0 + b.x1) / 2,
    cy = (b.y0 + b.y1) / 2;
  const out = rings.map((r) => r.map((p) => [Math.round((p[0] - cx) * s * 100) / 100, Math.round((p[1] - cy) * s * 100) / 100]));
  return { rings: out, w: Math.round(b.w * s * 100) / 100, h: Math.round(b.h * s * 100) / 100 };
}
