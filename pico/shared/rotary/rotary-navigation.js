// Rate estimation and gearing: raw knob detents → units a screen can use.
//
//   RateMeter — detents per second over a short sliding window. The Pico firmware sends no
//               per-detent timestamps, so the rate is estimated from arrival time × |delta|.
//   DialGear  — for precise dials. Slow turning is ALWAYS one unit per detent, so the player
//               can stop on any value. Only a brisk spin borrows a higher gear ratio.
//   NavGear   — for menus and lists. Accelerates through long lists when spun quickly.
//
// Gears never share state: a fast menu flick can never leak extra units into a dial.

const WINDOW = 260; // ms of history used to estimate the turning rate

export class RateMeter {
  constructor(windowMs = WINDOW) {
    this.window = windowMs;
    this.samples = [];
  }
  push(n, t) {
    // A clock that went backwards invalidates the history.
    if (this.samples.length && t < this.samples[this.samples.length - 1].t) this.samples.length = 0;
    this.samples.push({ t, n: Math.abs(n) });
    return this.rate(t);
  }
  // Detents per second.
  rate(t) {
    while (this.samples.length && t - this.samples[0].t > this.window) this.samples.shift();
    let sum = 0;
    for (const s of this.samples) sum += s.n;
    return sum / (this.window / 1000);
  }
  reset() {
    this.samples.length = 0;
  }
}

export const SENSITIVITY = {
  precise: { label: '精密', maxGear: 1 },
  standard: { label: '標準', maxGear: 3 },
  swift: { label: '快速', maxGear: 5 },
};

export class DialGear {
  constructor(sensitivity = 'standard') {
    this.meter = new RateMeter();
    this.setSensitivity(sensitivity);
  }

  setSensitivity(name) {
    this.maxGear = (SENSITIVITY[name] || SENSITIVITY.standard).maxGear;
  }

  // Gear ratio for the current detent rate (detents per second).
  ratio(rate) {
    if (this.maxGear <= 1 || rate < 9) return 1;
    if (rate < 16) return Math.min(2, this.maxGear);
    if (rate < 26) return Math.min(3, this.maxGear);
    return this.maxGear;
  }

  // detents (integer, any size, sign = direction) -> graduations (integer)
  detents(n, t) {
    if (!n) return 0;
    const rate = this.meter.push(n, t);
    return n * this.ratio(rate);
  }

  reset() {
    this.meter.reset();
  }
}

export class NavGear {
  constructor() {
    this.meter = new RateMeter();
  }

  steps(n, t) {
    if (!n) return 0;
    const rate = this.meter.push(n, t);
    const k = rate > 30 ? 3 : rate > 16 ? 2 : 1;
    return n * k;
  }

  reset() {
    this.meter.reset();
  }
}
