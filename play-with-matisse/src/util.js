// Small shared helpers: DOM, seeded randomness, value noise.

export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const TAU = Math.PI * 2;

export const reduceMotion = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
export const newSeed = () => (Math.random() * 2 ** 31) | 0;
export const uid = (p = "") => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

// mulberry32: tiny, fast, good enough for shapes.
export function rng(seed) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// Seeded 2D value noise in [-1, 1]. `period` makes it tile (used for paper texture).
export function noise2(seed, period = 256) {
  const r = rng(seed),
    p = new Uint16Array(512),
    v = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    p[i] = i;
    v[i] = r() * 2 - 1;
  }
  for (let i = 255; i > 0; i--) {
    const j = (r() * (i + 1)) | 0;
    [p[i], p[j]] = [p[j], p[i]];
  }
  for (let i = 0; i < 256; i++) p[i + 256] = p[i];
  const fade = (t) => t * t * (3 - 2 * t);
  const P = Math.min(256, period);
  return (x, y) => {
    const xi = Math.floor(x),
      yi = Math.floor(y),
      u = fade(x - xi),
      w = fade(y - yi);
    const X = ((xi % P) + P) % P,
      Y = ((yi % P) + P) % P,
      X1 = (X + 1) % P,
      Y1 = (Y + 1) % P;
    const a = v[p[p[X] + Y]],
      b = v[p[p[X1] + Y]],
      c = v[p[p[X] + Y1]],
      d = v[p[p[X1] + Y1]];
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
}

export function canvas(w, h) {
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

export function h(tag, props = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v;
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "style" && typeof v === "object") for (const [sk, sv] of Object.entries(v)) el.style.setProperty(sk.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()), sv);
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) if (kid != null) el.append(kid);
  return el;
}

// Long-press that works the same for mouse, pen and touch.
export function onLongPress(el, fn, ms = 520) {
  let timer = 0,
    start = null;
  const cancel = () => {
    clearTimeout(timer);
    timer = 0;
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button > 0) return;
    start = [e.clientX, e.clientY];
    timer = setTimeout(() => {
      timer = 0;
      el.dataset.longPressed = "1";
      fn(e);
    }, ms);
  });
  el.addEventListener("pointermove", (e) => {
    if (timer && start && Math.hypot(e.clientX - start[0], e.clientY - start[1]) > 8) cancel();
  });
  for (const n of ["pointerup", "pointercancel", "pointerleave"]) el.addEventListener(n, cancel);
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    cancel();
    el.dataset.longPressed = "1";
    fn(e);
  });
  // Swallow the click that follows a long-press.
  el.addEventListener(
    "click",
    (e) => {
      if (el.dataset.longPressed) {
        delete el.dataset.longPressed;
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
}
