// Device and room sounds aboard 遠星三號 and at station 001. All synthesised offline in JS.
// Each turning device has its own voice: the shutter ratchet is heavy and metallic, the year
// wheel is a light plastic detent, the jog wheel is almost silent, the microscope focus is a
// whisper, the ledger roller is soft, the camera motors whir. None of them share a click.
import { mulberry32, Biquad, OnePole, PinkNoise, BrownNoise, valueNoise, modal, reverb, loopable, fadeEdges, normalize } from '../../../src/audio/dsp.js';

const SR = 44100;
const LSR = 32000; // long loops: lower rate keeps generation fast

function buf(len, sr = SR) {
  return new Float32Array(Math.round(len * sr));
}

// ---- one-shots ------------------------------------------------------------------------------

function ratchet(seed, { soft = false } = {}) {
  const r = mulberry32(seed);
  const out = buf(0.16);
  const hp = new Biquad('highpass', soft ? 900 : 1800, 0.8, SR);
  const n = Math.round(0.006 * SR);
  for (let i = 0; i < n; i++) out[i] += hp.p(r() * 2 - 1) * (1 - i / n) * (soft ? 0.25 : 0.7);
  const f = soft ? 0.7 : 1;
  modal(out, 0, SR, [
    { f: 2180 * f * (0.97 + r() * 0.06), a: soft ? 0.05 : 0.16, d: 0.018 },
    { f: 3470 * f, a: soft ? 0.03 : 0.1, d: 0.012 },
    { f: 5260 * f, a: soft ? 0.02 : 0.06, d: 0.008 },
    { f: 142, a: soft ? 0.12 : 0.28, d: 0.035 },
    { f: 410, a: 0.08, d: 0.025 },
  ], 1, r);
  return { channels: fadeEdges([out], SR, 0.0005, 0.02), sr: SR };
}

function endStop(seed, weight = 1) {
  const r = mulberry32(seed);
  const out = buf(0.9);
  const lp = new Biquad('lowpass', 500, 0.7, SR);
  const n = Math.round(0.03 * SR);
  for (let i = 0; i < n; i++) out[i] += lp.p(r() * 2 - 1) * (1 - i / n) * 0.9 * weight;
  modal(out, 0, SR, [
    { f: 62, a: 0.5 * weight, d: 0.18 },
    { f: 97, a: 0.3, d: 0.12 },
    { f: 412, a: 0.08, d: 0.22 },
    { f: 733, a: 0.05, d: 0.3 },
    { f: 1290, a: 0.025, d: 0.25 },
  ], 1, r);
  const [L, R] = reverb(out, SR, { size: 0.6, decay: 0.7, wet: 0.25 });
  return { channels: normalize(fadeEdges([L, R], SR, 0.0005, 0.08), 0.8), sr: SR };
}

function detentClick(seed, { pitch = 1, body = 0.4, len = 0.05 } = {}) {
  const r = mulberry32(seed);
  const out = buf(len);
  const bp = new Biquad('bandpass', 3800 * pitch, 2.2, SR);
  const m = Math.round(0.003 * SR);
  for (let i = 0; i < m; i++) out[i] += bp.p(r() * 2 - 1) * (1 - i / m);
  modal(out, 0, SR, [
    { f: 1250 * pitch, a: 0.07, d: 0.01 },
    { f: 260 * pitch, a: 0.06 * body * 2, d: 0.014 },
  ], 1, r);
  return { channels: fadeEdges([out], SR, 0.0003, 0.01), sr: SR };
}

function slideChange(seed) {
  // A projector-like change: a soft mechanical shutter, two quick blades.
  const r = mulberry32(seed);
  const out = buf(0.22);
  for (const [t0, g] of [[0, 0.5], [0.07, 0.35]]) {
    const s = Math.round(t0 * SR);
    const bp = new Biquad('bandpass', 2200, 1.2, SR);
    const n = Math.round(0.02 * SR);
    for (let i = 0; i < n; i++) out[s + i] += bp.p(r() * 2 - 1) * Math.exp(-i / (0.004 * SR)) * g;
    modal(out, s, SR, [{ f: 620, a: 0.05 * g, d: 0.02 }, { f: 180, a: 0.06 * g, d: 0.03 }], 1, r);
  }
  return { channels: fadeEdges([out], SR, 0.0005, 0.02), sr: SR };
}

function turretClunk(seed) {
  const r = mulberry32(seed);
  const out = buf(0.4);
  const lp = new Biquad('lowpass', 1400, 0.9, SR);
  const n = Math.round(0.012 * SR);
  for (let i = 0; i < n; i++) out[i] += lp.p(r() * 2 - 1) * (1 - i / n) * 0.7;
  modal(out, 0, SR, [
    { f: 1830, a: 0.08, d: 0.05 },
    { f: 2960, a: 0.05, d: 0.04 },
    { f: 230, a: 0.25, d: 0.05 },
    { f: 640, a: 0.1, d: 0.06 },
  ], 1, r);
  return { channels: fadeEdges([out], SR, 0.0005, 0.05), sr: SR };
}

function captureTone() {
  const out = buf(0.35);
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 9);
    out[i] = (Math.sin(2 * Math.PI * 523.25 * t) * 0.6 + Math.sin(2 * Math.PI * 784 * t) * 0.25 * Math.exp(-t * 6)) * env * 0.35;
  }
  return { channels: fadeEdges([out], SR, 0.002, 0.05), sr: SR };
}

function relay(seed) {
  const r = mulberry32(seed);
  const out = buf(0.08);
  const hp = new Biquad('highpass', 2500, 0.7, SR);
  for (const s of [0, Math.round(0.011 * SR)]) {
    for (let i = 0; i < 60; i++) out[s + i] += hp.p(r() * 2 - 1) * (1 - i / 60) * 0.35;
  }
  return { channels: fadeEdges([out], SR, 0.0003, 0.01), sr: SR };
}

function stamp(seed) {
  const r = mulberry32(seed);
  const out = buf(0.3);
  const lp = new Biquad('lowpass', 900, 0.8, SR);
  const n = Math.round(0.02 * SR);
  for (let i = 0; i < n; i++) out[i] += lp.p(r() * 2 - 1) * (1 - i / n) * 0.8;
  modal(out, 0, SR, [{ f: 150, a: 0.3, d: 0.04 }, { f: 330, a: 0.12, d: 0.03 }], 1, r);
  return { channels: fadeEdges([out], SR, 0.0005, 0.04), sr: SR };
}

function shutterClick(seed) {
  // 喀嚓: release click, curtain travel, second curtain slap, a little body resonance.
  const r = mulberry32(seed);
  const out = buf(0.5);
  const parts = [
    [0, 0.6, 5200, 0.002],
    [0.004, 0.35, 2400, 0.012],
    [0.032, 0.8, 3300, 0.003],
    [0.036, 0.4, 1600, 0.02],
  ];
  for (const [t0, g, f, dec] of parts) {
    const s = Math.round(t0 * SR);
    const bp = new Biquad('bandpass', f, 1.1, SR);
    const n = Math.round(0.05 * SR);
    for (let i = 0; i < n; i++) out[s + i] += bp.p(r() * 2 - 1) * Math.exp(-i / (dec * SR)) * g;
  }
  modal(out, Math.round(0.032 * SR), SR, [{ f: 190, a: 0.18, d: 0.03 }, { f: 870, a: 0.05, d: 0.05 }], 1, r);
  const [L, R] = reverb(out, SR, { size: 0.3, decay: 0.5, wet: 0.12 });
  return { channels: normalize(fadeEdges([L, R], SR, 0.0003, 0.05), 0.85), sr: SR };
}

function rollerTick(seed) {
  return detentClick(seed, { pitch: 0.55, body: 0.8, len: 0.06 });
}

function paperSlide(seed) {
  const r = mulberry32(seed);
  const out = buf(0.3);
  const bp = new Biquad('bandpass', 2600, 0.6, SR);
  for (let i = 0; i < out.length; i++) {
    const t = i / out.length;
    out[i] = bp.p(r() * 2 - 1) * Math.sin(Math.PI * t) * 0.35;
  }
  return { channels: fadeEdges([out], SR, 0.01, 0.05), sr: SR };
}

// ---- loops ----------------------------------------------------------------------------------

function vent(seed, { tone = 380, air = 0.25, hum = 96, len = 14 } = {}) {
  const r = mulberry32(seed);
  const b = new BrownNoise(r);
  const p = new PinkNoise(r);
  const lp = new Biquad('lowpass', tone, 0.6, LSR);
  const bp = new Biquad('bandpass', 2400, 0.5, LSR);
  const wob = valueNoise(seed + 1, 0.4);
  const L = buf(len + 1, LSR);
  const R = buf(len + 1, LSR);
  const dl = new OnePole(300, LSR);
  for (let i = 0; i < L.length; i++) {
    const t = i / LSR;
    const base = lp.p(b.next()) * 0.6;
    const hiss = bp.p(p.next()) * air * (0.8 + wob(t) * 0.4);
    const h = hum ? Math.sin(2 * Math.PI * hum * t) * 0.012 + Math.sin(4 * Math.PI * hum * t) * 0.006 : 0;
    L[i] = base + hiss + h;
    R[i] = dl.lp(base) * 0.9 + hiss * 0.9 + h;
  }
  return { channels: normalize(loopable([L, R], LSR, 1), 0.35), sr: LSR };
}

function rumble(seed) {
  // Shutter slats travelling in their guides: low, gritty, with slat-joint knocks.
  const r = mulberry32(seed);
  const b = new BrownNoise(r);
  const bp = new Biquad('bandpass', 170, 0.9, LSR);
  const bp2 = new Biquad('bandpass', 640, 2, LSR);
  const out = buf(4, LSR);
  for (let i = 0; i < out.length; i++) {
    const grit = r() < 0.004 ? (r() * 2 - 1) * 0.9 : 0;
    out[i] = bp.p(b.next()) * 1.2 + bp2.p(grit) * 0.8;
  }
  const looped = loopable([out], LSR, 0.4)[0];
  return { channels: normalize([looped, looped.slice()], 0.5), sr: LSR };
}

function motor(seed, { f = 120, bright = 1800, len = 2 } = {}) {
  const r = mulberry32(seed);
  const out = buf(len, LSR);
  const bp = new Biquad('bandpass', bright, 1.5, LSR);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    ph += f / LSR;
    const saw = (ph % 1) * 2 - 1;
    out[i] = bp.p(saw * 0.6 + (r() * 2 - 1) * 0.25);
  }
  const looped = loopable([out], LSR, 0.2)[0];
  return { channels: normalize([looped, looped.slice()], 0.4), sr: LSR };
}

function pumpWhine(seed) {
  const r = mulberry32(seed);
  const len = 16;
  const out = buf(len, LSR);
  const wob = valueNoise(seed, 0.25);
  const lp = new Biquad('lowpass', 900, 0.7, LSR);
  let ph = 0;
  for (let i = 0; i < out.length; i++) {
    const t = i / LSR;
    const f = 117 + wob(t) * 6;
    ph += f / LSR;
    const s = Math.sin(2 * Math.PI * ph) * 0.5 + Math.sin(4 * Math.PI * ph) * 0.25 + Math.sin(6 * Math.PI * ph) * 0.12;
    // The "又在叫" part: every so often the bearing sings for a few seconds.
    const sing = Math.max(0, Math.sin(t * 0.39 + 1.3)) ** 6;
    const whine = Math.sin(2 * Math.PI * (f * 7.02) * t) * 0.06 * sing;
    out[i] = lp.p(s * 0.3 + (r() * 2 - 1) * 0.05) + whine;
  }
  const looped = loopable([out], LSR, 1)[0];
  return { channels: normalize([looped, looped.slice()], 0.3), sr: LSR };
}

function drip(seed) {
  const r = mulberry32(seed);
  const out = buf(0.4);
  // A drop into water: a short rising "plip".
  for (let i = 0; i < out.length; i++) {
    const t = i / SR;
    const f = 900 + 1800 * Math.min(1, t / 0.03);
    out[i] = Math.sin(2 * Math.PI * f * t) * Math.exp(-t * 40) * 0.4;
  }
  const [L, R] = reverb(out, SR, { size: 0.5, wet: 0.2 });
  void r;
  return { channels: fadeEdges([L, R], SR, 0.0005, 0.05), sr: SR };
}

function racks(seed) {
  const r = mulberry32(seed);
  const p = new PinkNoise(r);
  const bp = new Biquad('bandpass', 1100, 0.4, LSR);
  const lp = new Biquad('lowpass', 250, 0.7, LSR);
  const len = 12;
  const L = buf(len, LSR);
  const R = buf(len, LSR);
  for (let i = 0; i < L.length; i++) {
    const t = i / LSR;
    const fan = bp.p(p.next()) * 0.5;
    const body = lp.p(p.next()) * 0.6;
    const tone = Math.sin(2 * Math.PI * 186 * t) * 0.01 + Math.sin(2 * Math.PI * 1490 * t) * 0.003;
    L[i] = fan + body + tone;
    R[i] = fan * 0.9 + body + tone;
  }
  return { channels: normalize(loopable([L, R], LSR, 1), 0.35), sr: LSR };
}

export function wind(seed, { len = 20, strength = 1, low = 260, gust = 0.18 } = {}) {
  const r = mulberry32(seed);
  const pL = new PinkNoise(r);
  const pR = new PinkNoise(r);
  const fL = new Biquad('lowpass', low, 0.8, LSR);
  const fR = new Biquad('lowpass', low, 0.8, LSR);
  const wh = new Biquad('bandpass', 900, 3, LSR);
  const g = valueNoise(seed + 7, gust);
  const g2 = valueNoise(seed + 9, gust * 3.1);
  const L = buf(len, LSR);
  const R = buf(len, LSR);
  for (let i = 0; i < L.length; i++) {
    const t = i / LSR;
    const amp = (0.35 + g(t) * 0.65) * (0.8 + g2(t) * 0.2) * strength;
    if (i % 64 === 0) {
      const c = low * (0.7 + amp * 1.2);
      fL.set(c);
      fR.set(c * 1.04);
      wh.set(500 + amp * 700);
    }
    const a = pL.next();
    const b = pR.next();
    L[i] = fL.p(a) * amp + wh.p(a) * amp * amp * 0.08;
    R[i] = fR.p(b) * amp + wh.p(b) * amp * amp * 0.06;
  }
  return { channels: normalize(loopable([L, R], LSR, 2), 0.5), sr: LSR };
}

// ---- catalogue ------------------------------------------------------------------------------

const MAKERS = {
  ratchet0: () => ratchet(101),
  ratchet1: () => ratchet(102),
  ratchet2: () => ratchet(103),
  ratchetSoft0: () => ratchet(111, { soft: true }),
  ratchetSoft1: () => ratchet(112, { soft: true }),
  endOpen: () => endStop(121, 1),
  endClosed: () => endStop(122, 0.8),
  shutterRumble: () => rumble(131),
  ventShip: () => vent(141),
  ventStation: () => vent(142, { tone: 520, air: 0.4, hum: 0, len: 12 }),
  ventArchive: () => vent(143, { tone: 300, air: 0.32, hum: 60, len: 12 }),
  yearDetent: () => detentClick(151, { pitch: 1 }),
  yearDetentEmpty: () => detentClick(152, { pitch: 0.7, body: 0.1 }),
  slideChange: () => slideChange(153),
  yearLimit: () => endStop(154, 0.35),
  turret: () => turretClunk(161),
  focusTick: () => detentClick(162, { pitch: 1.8, body: 0.05, len: 0.02 }),
  capture: () => captureTone(),
  pump: () => pumpWhine(171),
  drip: () => drip(172),
  greenhouseVent: () => vent(173, { tone: 520, air: 0.45, hum: 0, len: 14 }),
  racks: () => racks(181),
  relay: () => relay(182),
  roller: () => rumble(183),
  rollerTick: () => rollerTick(184),
  stamp: () => stamp(185),
  paper: () => paperSlide(186),
  servo: () => motor(187, { f: 52, bright: 300, len: 3 }),
  panMotor: () => motor(191, { f: 140, bright: 1200 }),
  zoomMotor: () => motor(192, { f: 260, bright: 2600 }),
  focusMotor: () => motor(193, { f: 420, bright: 3800 }),
  panDetent: () => detentClick(194, { pitch: 0.8, body: 0.3 }),
  shutter: () => shutterClick(195),
  windOutside: () => wind(196, { strength: 0.8, low: 340 }),
  windOutsideOpen: () => wind(197, { strength: 1, low: 520, gust: 0.12 }),
};

// Buffers are built on first use and cached by the audio core (null until audio is unlocked).
export function shipSound(core, name) {
  const make = MAKERS[name];
  if (!make || !core.ctx) return null;
  return core.buffer(`eist.${name}`, make);
}

export const SHIP_SOUND_NAMES = Object.keys(MAKERS);
