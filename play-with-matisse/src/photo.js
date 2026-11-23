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

// Running max (or min) over a window of 2r + 1 along one line, with a monotonic queue: O(n).
function slide(src, dst, n, idx, r, isMax) {
  const q = new Int32Array(n);
  let head = 0,
    tail = 0,
    j = 0;
  const better = (a, b) => (isMax ? src[idx(a)] >= src[idx(b)] : src[idx(a)] <= src[idx(b)]);
  for (let i = 0; i < n; i++) {
    for (; j < n && j <= i + r; j++) {
      while (tail > head && better(j, q[tail - 1])) tail--;
      q[tail++] = j;
    }
    while (q[head] < i - r) head++;
    dst[idx(i)] = src[idx(q[head])];
  }
}

// Square grey-level filter of radius r: max (grow the paper) or min (shrink it back).
function rank(src, w, h, r, isMax) {
  const tmp = new Float32Array(src.length),
    out = new Float32Array(src.length);
  for (let y = 0; y < h; y++) slide(src, tmp, w, (i) => y * w + i, r, isMax);
  for (let x = 0; x < w; x++) slide(tmp, out, h, (i) => i * w + x, r, isMax);
  return out;
}

// Paper white at every pixel, by a grey-level closing (max, then min, over a ~60 px square). Anything
// darker and narrower than the square (pencil lines, small coloured-in areas) is wiped out of it, while
// broad changes in light keep their exact shape, edges included. So a hand or phone shadow is part of
// "the paper" and cancels out, instead of its edge reading as a line. ink = how much darker than that.
function inkMap({ w, h, gray }) {
  const r = Math.max(8, Math.round(Math.max(w, h) / 14));
  const g = Float32Array.from(gray);
  const bg = rank(rank(g, w, h, r, true), w, h, r, false);
  // A big area coloured in with marker would count as paper too. Shadows rarely take paper below half
  // its white, marker does: so the paper is never taken to be darker than half the brightest paper.
  // (A dark table round the page also passes this; it touches the photo's edge and is dropped later.)
  const sorted = Float32Array.from(bg).sort(),
    floor = sorted[Math.floor(sorted.length * 0.95)] * 0.5;
  for (let i = 0; i < bg.length; i++) if (bg[i] < floor) bg[i] = floor;
  const ink = new Float32Array(w * h);
  for (let i = 0; i < ink.length; i++) {
    const paper = Math.max(bg[i], 40);
    ink[i] = clamp((paper - g[i]) / paper, 0, 1);
  }
  return ink;
}

// Starting threshold: just above the paper's own noise, so light pencil comes through. Paper is most of
// the middle of a sketch photo, so its median and spread don't move when there are big dark areas too.
// Only the middle counts, so a strip of table along the edge doesn't skew it. The slider moves it from there.
function autoLevel({ w, h, ink }) {
  const mx = Math.round(w * 0.1),
    my = Math.round(h * 0.1),
    vals = [];
  for (let y = my; y < h - my; y++) for (let x = mx; x < w - mx; x++) vals.push(ink[y * w + x]);
  const v = Float32Array.from(vals).sort(),
    med = v[v.length >> 1],
    dev = v.map((x) => Math.abs(x - med)).sort(),
    mad = dev[dev.length >> 1];
  return clamp(Math.round((med + mad * 8 + 0.07) * 100) / 100, 0.1, 0.3);
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
    // Then trim what is still a bare pencil line: a stroke that ran past a corner, a stray tail. Only
    // strands a few pixels thin go, so filled areas and their points stay.
    const t = Math.max(2, Math.round(r / 2));
    const opened = morph(morph(m, w, h, t, false), w, h, t, true);
    if (opened.some((v) => v)) m = opened;
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
