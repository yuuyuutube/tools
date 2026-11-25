// Every sound in the vault is synthesised here with Web Audio. No samples.
// A brick-wall limiter sits on the master bus and tick sounds are rate-capped, so spinning
// the dial as fast as a finger can go never clips or floods the audio thread.

const TICK_MIN_GAP = 0.011; // seconds between two dial ticks at most ~90/s

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.8;
    this.ambientOn = false;
    this.lastTick = 0;
    this.lastMenu = 0;
    this.loops = {};
    this.listeners = new Set();
  }

  get ready() {
    return Boolean(this.ctx && this.ctx.state === 'running');
  }

  onState(fn) {
    this.listeners.add(fn);
  }

  // Must be called from a user gesture (click, key, touch) the first time.
  unlock() {
    if (!this.ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!AC) return;
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;
      this.limiter = ctx.createDynamicsCompressor();
      this.limiter.threshold.value = -9;
      this.limiter.knee.value = 2;
      this.limiter.ratio.value = 20;
      this.limiter.attack.value = 0.002;
      this.limiter.release.value = 0.12;
      this.master = ctx.createGain();
      this.master.gain.value = this.volume;
      this.master.connect(this.limiter).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.connect(this.master);
      this.amb = ctx.createGain();
      this.amb.gain.value = 0;
      this.amb.connect(this.master);
      this.noise = makeNoise(ctx, 2);
      this.brown = makeBrown(ctx, 4);
      ctx.onstatechange = () => this.listeners.forEach((fn) => fn(this.ready));
      if (this.ambientOn) this.startAmbient();
    }
    if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.master) this.master.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.03);
  }

  // ---- building blocks -------------------------------------------------------------

  t0() {
    return this.ctx.currentTime + 0.004;
  }

  env(gainNode, t, peak, attack, decay) {
    const g = gainNode.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.0001, t);
    g.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + attack);
    g.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  tone({ t, freq, type = 'sine', peak = 0.2, attack = 0.002, decay = 0.08, to = null, glide = 0, out = this.sfx, detune = 0 }) {
    const ctx = this.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (detune) o.detune.value = detune;
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + (glide || decay));
    const g = ctx.createGain();
    this.env(g, t, peak, attack, decay);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + attack + decay + 0.03);
    return o;
  }

  burst({ t, peak = 0.3, attack = 0.001, decay = 0.02, filter = 'bandpass', freq = 3000, q = 1, to = null, out = this.sfx, buffer = this.noise }) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = filter;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(to, t + attack + decay);
    f.Q.value = q;
    const g = ctx.createGain();
    this.env(g, t, peak, attack, decay);
    src.connect(f).connect(g).connect(out);
    const offset = Math.random() * (buffer.duration - 0.6);
    src.start(t, offset);
    src.stop(t + attack + decay + 0.04);
  }

  // ---- the dial --------------------------------------------------------------------

  // A machined detent: bright pin click, a tiny steel ring, and a soft thunk underneath.
  tick({ speed = 0, major = false, at = 0 } = {}) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    let t = Math.max(now + 0.002 + at, this.lastTick + TICK_MIN_GAP);
    if (t - now > 0.08) return; // a backlog would only smear; drop it
    this.lastTick = t;
    const fast = Math.min(1, speed / 60);
    const level = (major ? 1.15 : 1) * (1 - fast * 0.5);
    const wobble = 1 + (Math.random() - 0.5) * 0.03;
    this.burst({ t, peak: 0.42 * level, decay: 0.006, freq: 4300 * wobble, q: 1.4 });
    this.tone({ t, freq: 2630 * wobble, peak: 0.05 * level, decay: 0.028 });
    if (fast < 0.7) this.tone({ t, freq: 170, to: 120, peak: 0.16 * level, decay: 0.016 });
  }

  ticks(count, info = {}) {
    if (!this.ready || count <= 0) return;
    const n = Math.min(count, 8);
    const span = Math.min(0.028, 0.006 * n);
    for (let i = 0; i < n; i++) this.tick({ ...info, major: info.majors && info.majors[i], at: (span * i) / n });
  }

  // The fictional resonance gate: a hollow, woody "tok" that is clearly not a tick.
  resonance({ kind = 'gate', tone = 'mid', strength = 1 } = {}) {
    if (!this.ready) return;
    const t = this.t0() + 0.006;
    if (kind === 'dead') return; // the dead spot: the absence is the clue
    if (kind === 'double') {
      this.tick({ at: 0.03 });
      this.burst({ t: t + 0.03, peak: 0.18, decay: 0.006, freq: 2100, q: 2 });
      return;
    }
    const base = { low: 240, mid: 430, high: 880 }[tone] || 430;
    const s = Math.max(0.15, strength);
    const near = kind === 'near';
    this.tone({ t, freq: base, peak: 0.34 * s, attack: 0.003, decay: near ? 0.07 : 0.16 });
    this.tone({ t, freq: base * 1.51, peak: 0.12 * s, attack: 0.003, decay: near ? 0.05 : 0.11 });
    this.tone({ t, freq: base * 2.76, peak: 0.05 * s, attack: 0.002, decay: 0.05 });
    this.burst({ t, peak: 0.22 * s, decay: 0.03, freq: base * 2, q: 3, filter: 'bandpass' });
  }

  // ---- the lock --------------------------------------------------------------------

  stageConfirm() {
    if (!this.ready) return;
    const t = this.t0();
    this.burst({ t, peak: 0.5, decay: 0.05, filter: 'lowpass', freq: 1400, q: 0.7 });
    this.tone({ t, freq: 150, to: 82, peak: 0.42, decay: 0.09 });
    this.burst({ t: t + 0.085, peak: 0.32, decay: 0.012, freq: 2400, q: 2 });
    this.tone({ t: t + 0.085, freq: 1870, peak: 0.06, decay: 0.12 });
  }

  lockEngaged() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 92, to: 58, peak: 0.6, attack: 0.003, decay: 0.42 });
    this.burst({ t, peak: 0.55, decay: 0.22, filter: 'lowpass', freq: 420, q: 0.8 });
    this.burst({ t, peak: 0.3, decay: 0.018, freq: 3000, q: 1.5 });
    this.tone({ t: t + 0.01, freq: 1240, peak: 0.05, decay: 0.8 });
    this.tone({ t: t + 0.01, freq: 1873, peak: 0.03, decay: 0.6 });
  }

  // Bolts withdraw one after another.
  lockReleased(count = 3, gap = 0.34) {
    if (!this.ready) return;
    const t = this.t0();
    for (let i = 0; i < count; i++) {
      const s = t + i * gap;
      this.burst({ t: s, peak: 0.16, attack: 0.04, decay: 0.16, freq: 700, to: 1700, q: 4 });
      this.burst({ t: s + 0.2, peak: 0.42, decay: 0.07, filter: 'lowpass', freq: 1200, q: 0.8 });
      this.tone({ t: s + 0.2, freq: 210 - i * 20, to: 120, peak: 0.3, decay: 0.12 });
    }
  }

  handleTurn() {
    if (!this.ready) return;
    const t = this.t0();
    this.burst({ t, peak: 0.12, attack: 0.05, decay: 0.3, freq: 500, to: 300, q: 6 });
    this.tone({ t: t + 0.32, freq: 130, to: 70, peak: 0.4, decay: 0.16 });
    this.burst({ t: t + 0.32, peak: 0.3, decay: 0.05, filter: 'lowpass', freq: 900 });
  }

  // A heavy door on old hinges: stick-slip friction over a low rumble.
  doorCreak(duration = 3) {
    if (!this.ready) return;
    const ctx = this.ctx;
    const t = this.t0();
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(68, t);
    o.frequency.linearRampToValueAtTime(96, t + duration * 0.4);
    o.frequency.linearRampToValueAtTime(74, t + duration);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 760;
    bp.Q.value = 7;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.25);
    g.gain.setValueAtTime(0.16, t + duration * 0.75);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    // Stick-slip: an irregular chopper on the amplitude.
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.setValueAtTime(13, t);
    lfo.frequency.linearRampToValueAtTime(7, t + duration);
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.07;
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    lfo.connect(lfoGain).connect(chop.gain);
    o.connect(bp).connect(chop).connect(g).connect(this.sfx);
    o.start(t);
    lfo.start(t);
    o.stop(t + duration + 0.05);
    lfo.stop(t + duration + 0.05);
    this.burst({ t, peak: 0.22, attack: 0.4, decay: duration, filter: 'lowpass', freq: 140, q: 0.7, buffer: this.brown });
    this.tone({ t: t + duration - 0.05, freq: 70, to: 45, peak: 0.3, decay: 0.3 });
  }

  // The ceremony: three bell strikes, then a warm chord that takes its time.
  reveal() {
    if (!this.ready) return;
    const t = this.t0();
    const bell = (when, f, p) => {
      this.tone({ t: when, freq: f, peak: 0.16 * p, attack: 0.003, decay: 2.2 });
      this.tone({ t: when, freq: f * 2.01, peak: 0.05 * p, attack: 0.003, decay: 1.2 });
      this.tone({ t: when, freq: f * 3.42, peak: 0.025 * p, attack: 0.002, decay: 0.5 });
    };
    bell(t, 523.25, 1);
    bell(t + 0.32, 659.25, 0.9);
    bell(t + 0.64, 783.99, 1.1);
    const chord = [261.63, 329.63, 392.0, 493.88, 587.33];
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(500, t + 0.9);
    lp.frequency.linearRampToValueAtTime(2200, t + 2.2);
    lp.Q.value = 0.5;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + 0.9);
    g.gain.exponentialRampToValueAtTime(0.11, t + 2.0);
    g.gain.setValueAtTime(0.11, t + 3.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 6);
    lp.connect(g).connect(this.sfx);
    chord.forEach((f, i) => {
      for (const det of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = f;
        o.detune.value = det + i;
        o.connect(lp);
        o.start(t + 0.9);
        o.stop(t + 6.1);
      }
    });
  }

  stamp() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 120, to: 52, peak: 0.6, decay: 0.12 });
    this.burst({ t, peak: 0.55, decay: 0.04, filter: 'lowpass', freq: 2400, q: 0.6 });
    this.burst({ t: t + 0.004, peak: 0.25, decay: 0.012, freq: 900, q: 3 });
  }

  paper() {
    if (!this.ready) return;
    const t = this.t0();
    this.burst({ t, peak: 0.12, attack: 0.03, decay: 0.22, filter: 'highpass', freq: 2500, to: 5000, q: 0.5 });
  }

  error() {
    if (!this.ready) return;
    const t = this.t0();
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.connect(this.sfx);
    this.tone({ t, freq: 196, type: 'square', peak: 0.12, attack: 0.004, decay: 0.09, out: lp });
    this.tone({ t: t + 0.12, freq: 147, type: 'square', peak: 0.12, attack: 0.004, decay: 0.14, out: lp });
  }

  // ---- interface ---------------------------------------------------------------------

  // Clean, small, electronic — the menu is a precision instrument, not a button.
  menuTick(dir = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    const t = Math.max(now + 0.002, this.lastMenu + 0.018);
    if (t - now > 0.06) return;
    this.lastMenu = t;
    this.tone({ t, freq: dir > 0 ? 3150 : 2880, peak: 0.07, attack: 0.0008, decay: 0.012 });
    this.burst({ t, peak: 0.18, decay: 0.004, freq: 6000, q: 1.2 });
    this.tone({ t, freq: 240, to: 160, peak: 0.08, decay: 0.012 });
  }

  bump() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 95, to: 60, peak: 0.32, decay: 0.07 });
  }

  select() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 1760, peak: 0.07, decay: 0.05 });
    this.tone({ t: t + 0.045, freq: 2637, peak: 0.06, decay: 0.08 });
    this.burst({ t, peak: 0.2, decay: 0.008, freq: 3800, q: 1.5 });
  }

  back() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 2637, peak: 0.06, decay: 0.04 });
    this.tone({ t: t + 0.04, freq: 1760, peak: 0.06, decay: 0.07 });
  }

  // ---- safe personalities ----------------------------------------------------------

  slip() {
    if (!this.ready) return;
    this.burst({ t: this.t0(), peak: 0.06, decay: 0.01, filter: 'lowpass', freq: 900 });
  }

  sigh() {
    if (!this.ready) return;
    const t = this.t0();
    this.burst({ t, peak: 0.1, attack: 0.25, decay: 1.1, freq: 700, to: 300, q: 2.5 });
  }

  wake() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 392, peak: 0.1, attack: 0.02, decay: 0.3 });
    this.tone({ t: t + 0.14, freq: 587.33, peak: 0.1, attack: 0.02, decay: 0.5 });
  }

  rock(n = 1) {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 300 + n * 40, peak: 0.06, attack: 0.02, decay: 0.18 });
  }

  startled() {
    if (!this.ready) return;
    const t = this.t0();
    this.burst({ t, peak: 0.25, decay: 0.08, freq: 1600, q: 4 });
    this.tone({ t, freq: 880, to: 1320, peak: 0.08, decay: 0.12 });
  }

  bored() {
    if (!this.ready) return;
    const t = this.t0();
    this.tone({ t, freq: 330, to: 196, peak: 0.12, attack: 0.02, decay: 0.45, type: 'triangle' });
  }

  // Looping beds: ambient room tone and the sleeping safe's breathing.
  loop(name, on) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const cur = this.loops[name];
    if (!on) {
      if (cur) {
        cur.gain.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.25);
        setTimeout(() => cur.stop(), 1500);
        delete this.loops[name];
      }
      return;
    }
    if (cur) return;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    const nodes = [];
    if (name === 'snore') {
      const src = ctx.createBufferSource();
      src.buffer = this.noise;
      src.loop = true;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 420;
      bp.Q.value = 1.6;
      const breath = ctx.createGain();
      breath.gain.value = 0;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.28;
      const depth = ctx.createGain();
      depth.gain.value = 0.11;
      lfo.connect(depth).connect(breath.gain);
      src.connect(bp).connect(breath).connect(gain).connect(this.sfx);
      src.start();
      lfo.start();
      nodes.push(src, lfo);
      gain.gain.setTargetAtTime(1, ctx.currentTime, 0.5);
    } else if (name === 'ambient') {
      const src = ctx.createBufferSource();
      src.buffer = this.brown;
      src.loop = true;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 190;
      const hum = ctx.createOscillator();
      hum.frequency.value = 50;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.012;
      src.connect(lp).connect(gain);
      hum.connect(humGain).connect(gain);
      gain.connect(this.amb);
      src.start();
      hum.start();
      nodes.push(src, hum);
      gain.gain.setTargetAtTime(0.5, ctx.currentTime, 1.2);
    }
    this.loops[name] = {
      gain,
      stop: () => nodes.forEach((n) => {
        try {
          n.stop();
        } catch {
          /* already stopped */
        }
      }),
    };
  }

  setAmbient(on) {
    this.ambientOn = on;
    if (!this.ctx) return;
    if (on) this.startAmbient();
    else {
      this.amb.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
      this.loop('ambient', false);
    }
  }

  startAmbient() {
    this.amb.gain.setTargetAtTime(0.6, this.ctx.currentTime, 0.6);
    this.loop('ambient', true);
  }
}

function makeNoise(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function makeBrown(ctx, seconds) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const d = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < d.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    d[i] = last * 3.5;
  }
  return buf;
}
