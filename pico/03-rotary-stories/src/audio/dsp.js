// Offline DSP kit. Every sound in ROTARY STORIES is synthesised: nothing is a recording.
// These helpers render deterministic sample arrays in plain JS (so they also run in tests),
// which the audio core turns into AudioBuffers.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// RBJ biquad. type: lowpass | highpass | bandpass | peaking | lowshelf | highshelf | notch
export class Biquad {
  constructor(type, freq, q = 0.707, sr = 44100, gainDb = 0) {
    this.sr = sr;
    this.type = type;
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(freq, q, gainDb);
  }
  set(freq, q = this.q, gainDb = this.gainDb || 0) {
    this.freq = freq;
    this.q = q;
    this.gainDb = gainDb;
    const w = (2 * Math.PI * Math.min(freq, this.sr * 0.49)) / this.sr;
    const cw = Math.cos(w);
    const sw = Math.sin(w);
    const alpha = sw / (2 * q);
    const A = Math.pow(10, gainDb / 40);
    let b0, b1, b2, a0, a1, a2;
    switch (this.type) {
      case 'highpass':
        b0 = (1 + cw) / 2; b1 = -(1 + cw); b2 = (1 + cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'bandpass':
        b0 = alpha; b1 = 0; b2 = -alpha; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'notch':
        b0 = 1; b1 = -2 * cw; b2 = 1; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
        break;
      case 'peaking':
        b0 = 1 + alpha * A; b1 = -2 * cw; b2 = 1 - alpha * A; a0 = 1 + alpha / A; a1 = -2 * cw; a2 = 1 - alpha / A;
        break;
      case 'lowshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 - (A - 1) * cw + s); b1 = 2 * A * (A - 1 - (A + 1) * cw); b2 = A * (A + 1 - (A - 1) * cw - s);
        a0 = A + 1 + (A - 1) * cw + s; a1 = -2 * (A - 1 + (A + 1) * cw); a2 = A + 1 + (A - 1) * cw - s;
        break;
      }
      case 'highshelf': {
        const s = 2 * Math.sqrt(A) * alpha;
        b0 = A * (A + 1 + (A - 1) * cw + s); b1 = -2 * A * (A - 1 + (A + 1) * cw); b2 = A * (A + 1 + (A - 1) * cw - s);
        a0 = A + 1 - (A - 1) * cw + s; a1 = 2 * (A - 1 - (A + 1) * cw); a2 = A + 1 - (A - 1) * cw - s;
        break;
      }
      default: // lowpass
        b0 = (1 - cw) / 2; b1 = 1 - cw; b2 = (1 - cw) / 2; a0 = 1 + alpha; a1 = -2 * cw; a2 = 1 - alpha;
    }
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
  }
  p(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

export class OnePole {
  constructor(freq, sr = 44100) {
    this.sr = sr;
    this.y = 0;
    this.set(freq);
  }
  set(freq) {
    this.a = 1 - Math.exp((-2 * Math.PI * freq) / this.sr);
  }
  lp(x) {
    this.y += this.a * (x - this.y);
    return this.y;
  }
  hp(x) {
    return x - this.lp(x);
  }
}

// Pink-ish noise (Paul Kellet's economy filter) from a uniform source.
export class PinkNoise {
  constructor(rand) {
    this.r = rand;
    this.b0 = this.b1 = this.b2 = 0;
  }
  next() {
    const w = this.r() * 2 - 1;
    this.b0 = 0.99765 * this.b0 + w * 0.099046;
    this.b1 = 0.963 * this.b1 + w * 0.2965164;
    this.b2 = 0.57 * this.b2 + w * 1.0526913;
    return (this.b0 + this.b1 + this.b2 + w * 0.1848) * 0.2;
  }
}

export class BrownNoise {
  constructor(rand) {
    this.r = rand;
    this.y = 0;
  }
  next() {
    this.y = (this.y + 0.02 * (this.r() * 2 - 1)) / 1.02;
    return this.y * 3.5;
  }
}

// Smooth random curve in [0,1]: cosine-interpolated value noise sampled at `rate` points/s.
export function valueNoise(seed, rate = 1) {
  const rand = mulberry32(seed);
  const pts = [];
  const at = (i) => {
    while (pts.length <= i) pts.push(rand());
    return pts[i];
  };
  return (t) => {
    const x = Math.max(0, t * rate);
    const i = Math.floor(x);
    const f = x - i;
    const u = (1 - Math.cos(f * Math.PI)) / 2;
    return at(i) * (1 - u) + at(i + 1) * u;
  };
}

// Schroeder reverb, mono in → stereo out. Good enough for rooms, halls and open air.
export function reverb(input, sr, { size = 1, decay = 0.78, damp = 0.35, wet = 0.3, dry = 1, predelay = 0.01 } = {}) {
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116].map((n) => Math.round(((n * sr) / 44100) * size));
  const allp = [556, 441, 341, 225].map((n) => Math.round((n * sr) / 44100));
  const make = (spread) => {
    const cs = combs.map((n) => ({ buf: new Float32Array(n + spread), i: 0, f: 0 }));
    const as = allp.map((n) => ({ buf: new Float32Array(n + spread), i: 0 }));
    return { cs, as };
  };
  const L = make(0);
  const R = make(23);
  const pd = Math.round(predelay * sr);
  const outL = new Float32Array(input.length);
  const outR = new Float32Array(input.length);
  const run = (net, x) => {
    let s = 0;
    for (const c of net.cs) {
      const y = c.buf[c.i];
      c.f = y * (1 - damp) + c.f * damp;
      c.buf[c.i] = x + c.f * decay;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of net.as) {
      const b = a.buf[a.i];
      const y = -s + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y;
    }
    return s;
  };
  for (let i = 0; i < input.length; i++) {
    const x = (i >= pd ? input[i - pd] : 0) * 0.015;
    outL[i] = input[i] * dry + run(L, x) * wet;
    outR[i] = input[i] * dry + run(R, x) * wet;
  }
  return [outL, outR];
}

export function normalize(chans, peak = 0.9) {
  let m = 1e-9;
  for (const c of chans) for (let i = 0; i < c.length; i++) m = Math.max(m, Math.abs(c[i]));
  const k = peak / m;
  for (const c of chans) for (let i = 0; i < c.length; i++) c[i] *= k;
  return chans;
}

export function fadeEdges(chans, sr, fadeIn = 0.005, fadeOut = 0.01) {
  for (const c of chans) {
    const a = Math.min(c.length, Math.round(fadeIn * sr));
    const b = Math.min(c.length, Math.round(fadeOut * sr));
    for (let i = 0; i < a; i++) c[i] *= i / a;
    for (let i = 0; i < b; i++) c[c.length - 1 - i] *= i / b;
  }
  return chans;
}

// Make a loop seamless by crossfading its tail into its head.
export function loopable(chans, sr, xfade = 0.5) {
  const n = Math.round(xfade * sr);
  return chans.map((c) => {
    const out = c.slice(0, c.length - n);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      out[i] = out[i] * Math.sqrt(t) + c[c.length - n + i] * Math.sqrt(1 - t);
    }
    return out;
  });
}

// A struck resonance: sum of decaying partials [{f, a, d}] (Hz, amplitude, decay seconds).
export function modal(out, start, sr, partials, gain = 1, rand = Math.random) {
  for (const p of partials) {
    const len = Math.min(out.length - start, Math.round(p.d * 6 * sr));
    const ph = rand() * Math.PI * 2;
    const w = (2 * Math.PI * p.f) / sr;
    const k = Math.exp(-1 / (p.d * sr));
    let env = p.a * gain;
    for (let i = 0; i < len; i++) {
      out[start + i] += Math.sin(ph + w * i) * env;
      env *= k;
    }
  }
}

export const dbToGain = (db) => Math.pow(10, db / 20);
