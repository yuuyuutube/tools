// Native AnalyserNode magnitudes, displayed on a logarithmic frequency axis.
// Each display band takes the maximum real FFT bin; no decorative/fake waveform.
export function spectrumPoints(data, sampleRate, fftSize, count = 160) {
  const points = [], binHz = sampleRate / fftSize;
  for (let i = 0; i < count; i++) {
    const lowHz = 80 * 100 ** (i / count), highHz = 80 * 100 ** ((i + 1) / count);
    let db = -96;
    const first = Math.max(1, Math.floor(lowHz / binHz)), last = Math.min(data.length - 1, Math.max(first, Math.floor(highHz / binHz)));
    for (let bin = first; bin <= last; bin++) if (Number.isFinite(data[bin])) db = Math.max(db, data[bin]);
    points.push({ frequencyHz: Math.sqrt(lowHz * highHz), db: Math.max(-96, Math.min(-12, db)) });
  }
  return points;
}

export class WahSpectrum {
  constructor({ svg, trace, fundamental, empty, getAnalyser, reducedMotion = matchMedia('(prefers-reduced-motion: reduce)') }) {
    this.svg = svg; this.trace = trace; this.fundamental = fundamental; this.empty = empty; this.getAnalyser = getAnalyser;
    this.reducedMotion = reducedMotion; this.frame = null; this.frequency = 330; this.data = null; this.active = false; this.last = -Infinity;
    this.clear();
  }
  setFrequency(frequency) {
    this.frequency = frequency;
    const x = 42 + Math.log(frequency / 80) / Math.log(100) * 350;
    this.fundamental.setAttribute('x1', x); this.fundamental.setAttribute('x2', x);
  }
  start() {
    if (this.active) return;
    this.active = true; this.empty.hidden = true; this.last = -Infinity;
    const tick = timestamp => {
      if (!this.active) return;
      if (timestamp - this.last >= (this.reducedMotion.matches ? 125 : 1000 / 30)) {
        this.last = timestamp; this.draw();
      }
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }
  draw() {
    const analyser = this.getAnalyser();
    if (!analyser) return;
    if (!this.data || this.data.length !== analyser.frequencyBinCount) this.data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(this.data);
    const points = spectrumPoints(this.data, analyser.context.sampleRate, analyser.fftSize);
    this.trace.setAttribute('d', points.map((point, i) => `${i ? 'L' : 'M'}${(42 + Math.log(point.frequencyHz / 80) / Math.log(100) * 350).toFixed(2)},${(132 - (point.db + 96) / 84 * 118).toFixed(2)}`).join(' '));
  }
  clear() {
    this.active = false; if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null;
    this.trace.setAttribute('d', ''); this.empty.hidden = false;
  }
}
