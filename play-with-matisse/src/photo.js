// Photo of a sketch on paper → ink mask. Lighting is evened out first (a local paper-white estimate),
// so a phone photo with a shadow across it still reads as clean lines. The mask then either stays as
// lines or has its enclosed areas filled in, and shapes.js traces it like any generated shape.
import { traceMask } from "./shapes.js";
import { canvas, clamp } from "./util.js";

export const PHOTO_TYPES = ["fill", "line"];
const P = 420; // long side of the working image

/* ---------- loading ---------- */

function loadImage(src) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => fail(new Error("image"));
    img.src = src;
  });
}

// File (or a stored data URL) → small grey image. Browsers apply EXIF rotation when drawing an <img>.
export async function loadPhoto(src) {
  const url = src instanceof Blob ? URL.createObjectURL(src) : src;
  try {
    const img = await loadImage(url);
    const k = Math.min(1, P / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(8, Math.round(img.naturalWidth * k)),
      h = Math.max(8, Math.round(img.naturalHeight * k));
    const c = canvas(w, h),
      ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const d = ctx.getImageData(0, 0, w, h).data,
      gray = new Uint8ClampedArray(w * h);
    for (let i = 0; i < gray.length; i++) gray[i] = d[i * 4] * 0.299 + d[i * 4 + 1] * 0.587 + d[i * 4 + 2] * 0.114;
    // Stored copy (for re-editing later) is the grey image itself, not the full photo.
    for (let i = 0; i < gray.length; i++) d[i * 4] = d[i * 4 + 1] = d[i * 4 + 2] = gray[i];
    ctx.putImageData(new ImageData(d, w, h), 0, 0);
    const photo = { w, h, gray, url: c.toDataURL("image/jpeg", 0.82), view: c };
    photo.ink = inkMap(photo);
    photo.auto = autoLevel(photo);
    return photo;
  } finally {
    if (src instanceof Blob) URL.revokeObjectURL(url);
  }
}

/* ---------- ink map ---------- */

// Paper white per block (a bright percentile); blocks full of ink borrow the paper around them; then it
// is interpolated back to every pixel. ink = how much darker than the paper.
function inkMap({ w, h, gray }) {
  const B = 20,
    gw = Math.ceil(w / B),
    gh = Math.ceil(h / B);
  let grid = new Float32Array(gw * gh);
  const hist = new Uint32Array(256);
  for (let gy = 0; gy < gh; gy++)
    for (let gx = 0; gx < gw; gx++) {
      hist.fill(0);
      let n = 0;
      for (let y = gy * B; y < Math.min(h, gy * B + B); y++)
        for (let x = gx * B; x < Math.min(w, gx * B + B); x++) {
          hist[gray[y * w + x]]++;
          n++;
        }
      let acc = 0,
        v = 255;
      for (; v > 0; v--) if ((acc += hist[v]) >= n * 0.1) break;
      grid[gy * gw + gx] = v;
    }
  const pass = (fn) => {
    const out = new Float32Array(grid.length);
    for (let y = 0; y < gh; y++)
      for (let x = 0; x < gw; x++) {
        const vals = [];
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++) {
            const xx = x + dx,
              yy = y + dy;
            if (xx >= 0 && yy >= 0 && xx < gw && yy < gh) vals.push(grid[yy * gw + xx]);
          }
        out[y * gw + x] = fn(grid[y * gw + x], vals);
      }
    grid = out;
  };
  const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;
  // A block much darker than its brightest neighbour is mostly ink (a coloured-in area): give it the
  // brighter half of its neighbours. Gentle shading changes less than that from block to block, so it
  // is left alone and keeps evening out.
  const lift = (self, v) => {
    if (self >= Math.max(...v) * 0.82) return self;
    const top = v.sort((a, b) => b - a).slice(0, Math.ceil(v.length / 2));
    return mean(top);
  };
  for (let k = 0; k < 4; k++) pass(lift);
  pass((_, v) => mean(v));
  const ink = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const fy = clamp((y + 0.5) / B - 0.5, 0, gh - 1),
      y0 = Math.floor(fy),
      y1 = Math.min(gh - 1, y0 + 1),
      ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = clamp((x + 0.5) / B - 0.5, 0, gw - 1),
        x0 = Math.floor(fx),
        x1 = Math.min(gw - 1, x0 + 1),
        tx = fx - x0;
      const top = grid[y0 * gw + x0] * (1 - tx) + grid[y0 * gw + x1] * tx,
        bot = grid[y1 * gw + x0] * (1 - tx) + grid[y1 * gw + x1] * tx,
        bg = Math.max(top * (1 - ty) + bot * ty, 40);
      ink[y * w + x] = clamp((bg - gray[y * w + x]) / bg, 0, 1);
    }
  }
  return ink;
}

// Starting threshold: just above the paper's own noise, so light pencil comes through, but never above
// Otsu's split (paper vs the darkest marks). Only the middle of the photo counts, so a strip of table
// along the edge doesn't skew it. The slider moves it from there.
function autoLevel({ w, h, ink }) {
  const hist = new Float64Array(101),
    mx = Math.round(w * 0.1),
    my = Math.round(h * 0.1);
  let n = 0;
  for (let y = my; y < h - my; y++)
    for (let x = mx; x < w - mx; x++) {
      hist[Math.round(ink[y * w + x] * 100)]++;
      n++;
    }
  let sum = 0;
  for (let i = 0; i <= 100; i++) sum += i * hist[i];
  let wB = 0,
    sB = 0,
    best = 0,
    otsu = 25,
    p90 = -1;
  for (let i = 0; i <= 100; i++) {
    wB += hist[i];
    if (p90 < 0 && wB >= n * 0.9) p90 = i;
    if (!wB || wB === n) continue;
    sB += i * hist[i];
    const mB = sB / wB,
      mF = (sum - sB) / (n - wB),
      between = wB * (n - wB) * (mB - mF) ** 2;
    if (between > best) {
      best = between;
      otsu = i;
    }
  }
  const noise = (Math.max(p90, 0) * 2 + 8) / 100;
  return clamp(Math.min(noise, (otsu / 100) * 0.8), 0.1, 0.35);
}

/* ---------- mask ---------- */

// Square dilation (grow) or erosion, separable: a pixel takes the "want" value when one lies within r
// along the row, then along the column. Two sweeps find the nearest one on either side.
function morph(m, w, h, r, grow) {
  if (r < 1) return m;
  const want = grow ? 1 : 0,
    tmp = new Uint8Array(m.length),
    out = new Uint8Array(m.length);
  const line = (src, dst, n, idx) => {
    const after = new Int32Array(n);
    let next = 1e9;
    for (let i = n - 1; i >= 0; i--) {
      if (src[idx(i)] === want) next = i;
      after[i] = next;
    }
    let prev = -1e9;
    for (let i = 0; i < n; i++) {
      if (src[idx(i)] === want) prev = i;
      dst[idx(i)] = i - prev <= r || after[i] - i <= r ? want : 1 - want;
    }
  };
  for (let y = 0; y < h; y++) line(m, tmp, w, (i) => y * w + i);
  for (let x = 0; x < w; x++) line(tmp, out, h, (i) => i * w + x);
  return out;
}

// Connected pieces of the mask, with size and whether they touch the photo's edge. Diagonal neighbours
// count, or a thin pencil line drawn at an angle falls apart into specks.
function components(m, w, h) {
  const label = new Int32Array(m.length).fill(-1),
    stack = new Int32Array(m.length),
    parts = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i] || label[i] >= 0) continue;
    const id = parts.length;
    let sp = 0,
      area = 0,
      edge = false;
    stack[sp++] = i;
    label[i] = id;
    while (sp) {
      const j = stack[--sp],
        x = j % w,
        y = (j / w) | 0;
      area++;
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) edge = true;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx,
            yy = y + dy,
            k = yy * w + xx;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[k] && label[k] < 0) {
            label[k] = id;
            stack[sp++] = k;
          }
        }
    }
    parts.push({ area, edge });
  }
  return { label, parts };
}

// Everything the outside of the drawing can't reach, i.e. the drawing with its insides filled.
function fillEnclosed(m, w, h) {
  const out = new Uint8Array(m.length).fill(1),
    stack = new Int32Array(m.length);
  let sp = 0;
  const push = (k) => {
    if (!m[k] && out[k]) {
      out[k] = 0;
      stack[sp++] = k;
    }
  };
  for (let x = 0; x < w; x++) push(x), push((h - 1) * w + x);
  for (let y = 0; y < h; y++) push(y * w), push(y * w + w - 1);
  while (sp) {
    const j = stack[--sp],
      x = j % w,
      y = (j / w) | 0;
    if (x > 0) push(j - 1);
    if (x < w - 1) push(j + 1);
    if (y > 0) push(j - w);
    if (y < h - 1) push(j + w);
  }
  return out;
}

// level: ink threshold (lower = picks up fainter pencil). Returns { mask, w, h } or null when nothing is found.
export function photoMask(photo, type, level) {
  const { w, h, ink } = photo;
  let m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = ink[i] >= level ? 1 : 0;
  const { label, parts } = components(m, w, h);
  const total = parts.reduce((a, p) => a + p.area, 0);
  if (!total) return null;
  // Specks are paper grain and JPEG noise. Pieces touching the photo's edge are the table or the
  // paper's shadow; they are only kept when nothing else is left (a drawing that runs off the edge).
  const speck = w * h * 0.0003;
  const dropEdge = parts.some((p) => !p.edge && p.area >= speck);
  const keep = parts.map((p) => p.area >= speck && !(dropEdge && p.edge));
  for (let i = 0; i < m.length; i++) m[i] = m[i] && keep[label[i]] ? 1 : 0;
  if (!m.some((v) => v)) return null;
  if (type === "fill") {
    // Close small gaps in a hand-drawn outline so its inside can be filled, then shrink back.
    const r = Math.max(2, Math.round(Math.max(w, h) / 90));
    m = morph(fillEnclosed(morph(m, w, h, r, true), w, h), w, h, r, false);
  }
  return { mask: m, w, h };
}

// The pad asks for the same mask three times per change (once per look) and once more for the preview.
let memo = null;
export function cachedMask(photo, type, level) {
  if (memo && memo.photo === photo && memo.type === type && memo.level === level) return memo.res;
  memo = { photo, type, level, res: photoMask(photo, type, level) };
  return memo.res;
}

// Same three looks as the drawing pad: original follows the photo closely, soft rounds it off, bold
// thickens it and gives the edge a slow hand-cut wobble.
const LOOK = {
  original: { line: 1, fill: 0, blur: 1 },
  soft: { line: 2, fill: 0, blur: 4 },
  bold: { line: 3, fill: 1, blur: 2, wave: { amp: 4, lambda: 20 } },
};

export function photoShape(photo, type, variant, level, seed) {
  const res = cachedMask(photo, type, level);
  if (!res) return null;
  const look = LOOK[variant];
  const m = morph(res.mask, res.w, res.h, type === "line" ? look.line : look.fill, true);
  return traceMask(m, res.w, res.h, { blur: look.blur, wave: look.wave, seed });
}
