// Deterministic randomness. Every generative decision flows from a 32-bit seed.

export function hash32(...values) {
  let h = 0x9e3779b9;
  for (const v of values) {
    let k = typeof v === 'number' ? v | 0 : hashString(String(v));
    k = Math.imul(k ^ (k >>> 16), 0x85ebca6b);
    k = Math.imul(k ^ (k >>> 13), 0xc2b2ae35);
    k ^= k >>> 16;
    h = Math.imul(h ^ k, 0x27d4eb2f);
    h ^= h >>> 15;
  }
  return h >>> 0;
}

export function hashString(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small toolkit bound to one stream.
export function rng(...salts) {
  const next = mulberry32(hash32(...salts));
  const api = {
    next,
    range: (lo, hi) => lo + (hi - lo) * next(),
    int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
    chance: (p) => next() < p,
    sign: () => (next() < 0.5 ? -1 : 1),
    pick: (list) => list[Math.floor(next() * list.length)],
    weighted(entries) {
      let total = 0;
      for (const [, w] of entries) total += w;
      let r = next() * total;
      for (const [v, w] of entries) {
        r -= w;
        if (r <= 0) return v;
      }
      return entries[entries.length - 1][0];
    },
  };
  return api;
}

export function randomSeed() {
  const c = globalThis.crypto;
  if (c && c.getRandomValues) return c.getRandomValues(new Uint32Array(1))[0] >>> 0;
  return (Date.now() * 2654435761) >>> 0;
}

export const seedToHex = (seed) => (seed >>> 0).toString(16).padStart(8, '0');

export function hexToSeed(text) {
  if (typeof text !== 'string' || !/^[0-9a-f]{1,8}$/i.test(text)) return null;
  return parseInt(text, 16) >>> 0;
}
