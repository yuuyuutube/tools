// Artwork data (what gets saved and exported) kept apart from editor UI state, plus undo/redo and autosave.
import { DEFAULT_BG, DEFAULT_MINE, NEUTRALS, PALETTES, sizeById } from "./data.js";
import { buildPresets } from "./shapes.js";

const ART_KEY = "pwm.art.v1",
  ASSET_KEY = "pwm.assets.v1",
  UI_KEY = "pwm.ui.v1";

export const store = {
  art: null, // { v, size, bg, texture, pieces: [{ id, a, x, y, s, r, fx, fy, c, e, seed }] }
  custom: [], // user-made shapes: { id, rings, w, h, gen: { type, variant, seed, strokes }, hidden }
  presets: {},
  ui: { set: 0, paper: 0, mode: "snip", mine: [...DEFAULT_MINE], seen: false },
  undo: [],
  redo: [],
};

const listeners = new Set();
export const onChange = (fn) => listeners.add(fn);
export const emit = (what) => listeners.forEach((fn) => fn(what));

export function initStore() {
  store.presets = buildPresets();
  try {
    const ui = JSON.parse(localStorage.getItem(UI_KEY) || "null");
    if (ui) Object.assign(store.ui, ui);
  } catch {}
  try {
    const custom = JSON.parse(localStorage.getItem(ASSET_KEY) || "null");
    if (Array.isArray(custom)) store.custom = custom.map(unpackAsset).filter(Boolean);
  } catch {}
  try {
    const art = JSON.parse(localStorage.getItem(ART_KEY) || "null");
    if (art && art.v === 1 && Array.isArray(art.pieces)) store.art = art;
  } catch {}
}

export function newArtwork(sizeId) {
  store.art = { v: 1, size: sizeId, bg: DEFAULT_BG, texture: "textured", pieces: [] };
  store.undo = [];
  store.redo = [];
  save();
}

export const size = () => sizeById(store.art?.size);

export function getAsset(id) {
  return store.presets[id] || store.custom.find((a) => a.id === id) || null;
}

export function paperColors(setIndex = store.ui.set) {
  const p = PALETTES[setIndex] || PALETTES[0];
  return p.colors || store.ui.mine;
}
// Paper index 0–4 is the active set, 5–6 the neutral cream / white sheets.
export const currentColor = () => {
  const i = store.ui.paper;
  return i >= 5 ? NEUTRALS[i - 5] || NEUTRALS[0] : paperColors()[i] || paperColors()[0];
};

/* ---------- history ---------- */

export function snap() {
  store.undo.push(JSON.stringify(store.art));
  if (store.undo.length > 80) store.undo.shift();
  store.redo.length = 0;
}
export function undo() {
  if (!store.undo.length) return false;
  store.redo.push(JSON.stringify(store.art));
  store.art = JSON.parse(store.undo.pop());
  save();
  return true;
}
export function redo() {
  if (!store.redo.length) return false;
  store.undo.push(JSON.stringify(store.art));
  store.art = JSON.parse(store.redo.pop());
  save();
  return true;
}

/* ---------- persistence ---------- */

// Rings are stored as flat arrays with one decimal; plenty for 100-unit shapes.
function packAsset(a) {
  return { ...a, rings: a.rings.map((r) => r.flatMap((p) => [Math.round(p[0] * 10) / 10, Math.round(p[1] * 10) / 10])) };
}
function unpackAsset(a) {
  if (!a || !Array.isArray(a.rings)) return null;
  const rings = a.rings.map((r) => {
    if (Array.isArray(r[0])) return r;
    const out = [];
    for (let i = 0; i + 1 < r.length; i += 2) out.push([r[i], r[i + 1]]);
    return out;
  });
  return { ...a, rings };
}

let saveTimer = 0;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}
export function saveNow() {
  clearTimeout(saveTimer);
  try {
    if (store.art) localStorage.setItem(ART_KEY, JSON.stringify(store.art));
    else localStorage.removeItem(ART_KEY);
    localStorage.setItem(ASSET_KEY, JSON.stringify(store.custom.map(packAsset)));
  } catch (e) {
    console.warn("autosave failed", e);
  }
  saveUI();
}
export function saveUI() {
  try {
    localStorage.setItem(UI_KEY, JSON.stringify(store.ui));
  } catch {}
}
addEventListener("pagehide", saveNow);
