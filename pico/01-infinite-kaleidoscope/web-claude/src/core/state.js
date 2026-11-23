// The whole artwork is a pure function of this state.
import { hexToSeed, seedToHex } from './prng.js';
import { paletteCount } from './palettes.js';

export const MODES = ['mirror', 'ink', 'moire'];

export function createState(seed) {
  return {
    mode: 0,
    seed: seed >>> 0,
    palette: 0,
    dials: [0, 0, 0],
    t: 0,
  };
}

const round = (v, d) => {
  const f = 10 ** d;
  return Math.round(v * f) / f;
};

export function encodeState(s) {
  const parts = [
    `m=${MODES[s.mode]}`,
    `s=${seedToHex(s.seed)}`,
    `p=${s.palette}`,
    `d=${s.dials.map((v) => round(v, 3)).join(',')}`,
    `t=${round(s.t, 3)}`,
  ];
  return parts.join('&');
}

// Returns a partial state containing only the fields that parsed cleanly.
export function decodeState(text) {
  const out = {};
  if (typeof text !== 'string') return out;
  const params = new URLSearchParams(text.replace(/^#/, ''));
  const m = MODES.indexOf(params.get('m'));
  if (m >= 0) out.mode = m;
  const seed = hexToSeed(params.get('s'));
  if (seed !== null) out.seed = seed;
  const p = Number(params.get('p'));
  if (params.has('p') && Number.isInteger(p) && p >= 0 && p < paletteCount) out.palette = p;
  const d = (params.get('d') || '').split(',').map(Number);
  if (d.length === MODES.length && d.every((v) => Number.isFinite(v) && Math.abs(v) < 1e6)) out.dials = d;
  const t = Number(params.get('t'));
  if (params.has('t') && Number.isFinite(t) && t >= 0 && t < 1e7) out.t = t;
  return out;
}
