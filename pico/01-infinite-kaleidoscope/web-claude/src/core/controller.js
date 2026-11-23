// The Art Controller: the single place every input (Pico, mouse, touch, keyboard) lands.
// It owns the state, smooths the dial, and announces changes. No DOM, no WebGL.
import { MODES, createState } from './state.js';
import { randomSeed } from './prng.js';
import { paletteCount } from './palettes.js';

const SMOOTH_RATE = 11; // 1/s, exponential approach
const MAX_SPEED = 36; // detents per second, so a fast spin never strobes
const LONG_GUARD_MS = 350; // ignore a stray "short" right after a "long"

export class ArtController {
  constructor(initial = {}, { now = () => Date.now() } = {}) {
    this.state = { ...createState(randomSeed()), ...initial };
    this.state.dials = (initial.dials || this.state.dials).slice();
    this.smooth = this.state.dials.slice(); // what is on screen
    this.motion = true;
    this.speed = 1;
    this.now = now;
    this.lastLong = -Infinity;
    this.listeners = new Map();
  }

  on(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(fn);
    return () => this.listeners.get(type).delete(fn);
  }

  emit(type, detail) {
    for (const fn of this.listeners.get(type) || []) fn(detail);
    if (type !== 'change') for (const fn of this.listeners.get('change') || []) fn({ type, detail });
  }

  // ---- inputs -------------------------------------------------------------

  // delta is in knob detents and may be any size or a fraction (mouse wheel, drag).
  rotate(delta, source = 'unknown') {
    if (!Number.isFinite(delta) || delta === 0) return;
    this.state.dials[this.state.mode] += delta;
    this.emit('rotate', { delta, source });
  }

  // Hardware button semantics. Each event performs exactly one action.
  press(kind, source = 'unknown') {
    if (kind === 'long') {
      this.lastLong = this.now();
      this.newUniverse(source);
    } else if (kind === 'short') {
      if (this.now() - this.lastLong < LONG_GUARD_MS) return;
      this.nextMode(1, source);
    }
  }

  nextMode(dir = 1, source = 'unknown') {
    const n = MODES.length;
    this.setMode((this.state.mode + dir + n) % n, dir, source);
  }

  setMode(index, dir = 1, source = 'unknown') {
    if (index === this.state.mode || index < 0 || index >= MODES.length) return;
    const from = this.state.mode;
    this.state.mode = index;
    this.emit('mode', { from, to: index, dir, source });
  }

  newUniverse(source = 'unknown', seed = randomSeed()) {
    const from = this.state.seed;
    const before = this.snapshot();
    this.state.seed = seed >>> 0;
    // A fresh universe starts with a slightly stirred ink bowl and a turned film.
    this.state.dials = [0, 4 + (seed % 9), ((seed >>> 8) % 7) - 3];
    this.smooth = this.state.dials.slice();
    this.state.t = 0;
    this.emit('universe', { from, to: this.state.seed, before, source });
  }

  setPalette(index) {
    if (!Number.isInteger(index) || index === this.state.palette) return;
    const i = ((index % paletteCount) + paletteCount) % paletteCount;
    const from = this.state.palette;
    this.state.palette = i;
    this.emit('palette', { from, to: i });
  }

  cyclePalette(dir = 1) {
    this.setPalette(this.state.palette + dir);
  }

  setMotion(on) {
    this.motion = Boolean(on);
    this.emit('motion', { on: this.motion });
  }

  // ---- time ---------------------------------------------------------------

  // Advance smoothing and art time. Returns true while anything is still moving.
  update(dt) {
    const step = Math.min(Math.max(dt, 0), 0.1);
    let moving = false;
    const k = 1 - Math.exp(-SMOOTH_RATE * step);
    for (let i = 0; i < this.smooth.length; i++) {
      const target = this.state.dials[i];
      const gap = target - this.smooth[i];
      if (Math.abs(gap) < 1e-4) {
        this.smooth[i] = target;
        continue;
      }
      let move = gap * k;
      const cap = MAX_SPEED * step;
      if (Math.abs(move) > cap) move = Math.sign(move) * cap;
      this.smooth[i] += move;
      moving = true;
    }
    if (this.motion) {
      this.state.t += step * this.speed;
      moving = true;
    }
    return moving;
  }

  // The state on screen right now, rounded exactly as a share link stores it,
  // so an exported PNG and its link describe the same image.
  snapshot() {
    const r3 = (v) => Math.round(v * 1000) / 1000;
    return {
      mode: this.state.mode,
      seed: this.state.seed,
      palette: this.state.palette,
      dials: this.smooth.map(r3),
      t: r3(this.state.t),
    };
  }
}
