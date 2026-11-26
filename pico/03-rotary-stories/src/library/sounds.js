// Library sounds: the soft knock of a book moving one place along the shelf, a heavier knock
// at either end, and the slide of a book being taken out. Synthesised, a few ms each.
import { mulberry32, Biquad, fadeEdges } from '../audio/dsp.js';

const SR = 44100;

function knock(seed, { body = 180, bright = 2400, len = 0.09, gain = 1 } = {}) {
  const r = mulberry32(seed);
  const n = Math.round(len * SR);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', bright, 1.4, SR);
  const lp = new Biquad('lowpass', body * 3, 0.7, SR);
  for (let i = 0; i < n; i++) {
    const t = i / SR;
    const env = Math.exp(-t * 70);
    const tone = Math.sin(2 * Math.PI * body * t) * Math.exp(-t * 45);
    out[i] = (bp.p((r() * 2 - 1) * env) * 0.6 + lp.p(tone) * 0.9) * gain;
  }
  return { channels: fadeEdges([out], SR, 0.001, 0.02), sr: SR };
}

function slide(seed) {
  const r = mulberry32(seed);
  const n = Math.round(0.42 * SR);
  const out = new Float32Array(n);
  const bp = new Biquad('bandpass', 1800, 0.8, SR);
  for (let i = 0; i < n; i++) {
    const t = i / n;
    const env = Math.sin(Math.PI * Math.min(1, t * 1.3)) * (1 - t * 0.6);
    out[i] = bp.p(r() * 2 - 1) * env * 0.5;
  }
  return { channels: fadeEdges([out], SR, 0.01, 0.05), sr: SR };
}

export function librarySounds(core) {
  return {
    step: core.buffer('lib.step', () => knock(11, { body: 210, bright: 2600, gain: 0.55 })),
    stepB: core.buffer('lib.stepB', () => knock(12, { body: 190, bright: 2300, gain: 0.5 })),
    limit: core.buffer('lib.limit', () => knock(13, { body: 95, bright: 900, len: 0.18, gain: 0.9 })),
    slide: core.buffer('lib.slide', () => slide(14)),
  };
}
