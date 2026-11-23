import { palettes } from '../palettes/index.js';
import { BLOOM_START, BLOOM_STYLES, MAX_BLOOM_PROGRESS } from './bloom.js';

export const engines = ['kaleido', 'spiro', 'optical', 'bloom'];
export const version = 1;
export const initialArtwork = {
  engine: 'kaleido',
  seed: 36173,
  position: 0,
  phase: 0,
  palette: 'moss-cyclamen',
};

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const mod = (value, modulus) => ((value % modulus) + modulus) % modulus;
export const smooth = (x) => x * x * (3 - 2 * x);

export function seededRandom(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), seed | 1);
    n ^= n + Math.imul(n ^ (n >>> 7), n | 61);
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}

export function universe(seed) {
  const random = seededRandom(seed);
  return [random(), random(), random(), random()];
}

export function newSeed() {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}

export function stateURL(state, base) {
  const url = new URL(base);
  url.hash = '';
  const params = new URLSearchParams({
    v: version, e: state.engine, s: state.seed, x: state.position,
    t: state.phase, p: state.palette,
  });
  if (state.engine === 'bloom') {
    params.set('b', state.bloomProgress);
    params.set('style', state.bloomStyle ?? BLOOM_START.bloomStyle);
  }
  url.search = params.toString();
  return url;
}

export function restoreState(value, base) {
  let params;
  try {
    params = new URL(value, base).searchParams;
  } catch {
    return null;
  }

  const keys = ['v', 'e', 's', 'x', 't', 'p'];
  if (params.get('e') === 'bloom') keys.push('b');
  for (const key of keys) {
    if (params.getAll(key).length !== 1 || params.get(key).trim() === '') return null;
  }
  const state = {
    engine: params.get('e'),
    seed: Number(params.get('s')),
    position: Number(params.get('x')),
    phase: Number(params.get('t')),
    palette: params.get('p'),
  };
  if (params.get('v') !== String(version) ||
      !engines.includes(state.engine) ||
      !Number.isInteger(state.seed) || state.seed < 0 || state.seed > 0xffffffff ||
      !Number.isFinite(state.position) || Math.abs(state.position) > 1e9 ||
      !Number.isFinite(state.phase) || state.phase < 0 || state.phase > 1e9 ||
      !palettes.some((palette) => palette.id === state.palette)) return null;
  if (state.engine === 'bloom') {
    state.bloomProgress = Number(params.get('b'));
    state.bloomStyle = params.get('style') ?? BLOOM_START.bloomStyle;
    if (params.getAll('style').length > 1 || !BLOOM_STYLES.some(({ id }) => id === state.bloomStyle) ||
        !Number.isFinite(state.bloomProgress) || Math.abs(state.bloomProgress) > MAX_BLOOM_PROGRESS) return null;
  }
  return state;
}
