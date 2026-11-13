import { clamp } from '../pitch.js';

// A playful two-resonance approximation, not a physical DX acoustic model.
// Mouth state never changes the oscillator's fundamental frequency.
export function wahParameters(opening) {
  const x = clamp(opening);
  return { lowHz: 400 * 2.5 ** x, highHz: 850 * (3000 / 850) ** x, lowQ: 2.1, highQ: 3.2 };
}

export class WahSynth {
  constructor({ Context = globalThis.AudioContext || globalThis.webkitAudioContext, onState = () => {} } = {}) {
    this.Context = Context; this.onState = onState; this.context = null; this.analyser = null;
    this.voice = null; this.enabled = false; this.frequency = 330; this.opening = 0;
    this.generation = 0; this.enableGeneration = 0;
  }
  async setEnabled(enabled) {
    const request = ++this.enableGeneration;
    this.enabled = false; this.stop();
    if (!enabled) return false;
    if (!this.Context) throw new Error('此瀏覽器不支援 Web Audio。');
    try {
      if (!this.context || this.context.state === 'closed') {
        const ctx = this.context = new this.Context();
        const analyser = this.analyser = ctx.createAnalyser();
        analyser.fftSize = 4096; analyser.smoothingTimeConstant = .55;
        analyser.minDecibels = -96; analyser.maxDecibels = -12;
        analyser.connect(ctx.destination);
        ctx.addEventListener('statechange', () => {
          if (ctx !== this.context || ctx.state === 'running' || !this.enabled) return;
          this.enabled = false; ++this.enableGeneration; this.stop();
          this.onState(false, '音訊已暫停，請按聲音按鈕重新啟動。');
        });
      }
      await this.context.resume();
      if (request !== this.enableGeneration) return false;
      if (this.context.state !== 'running') throw new Error('interrupted');
      this.enabled = true; return true;
    } catch {
      if (request === this.enableGeneration) this.enabled = false;
      throw new Error('聲音未能啟動，請再按一次聲音按鈕。');
    }
  }
  setFrequency(frequency) {
    this.frequency = frequency;
    this.voice?.osc.frequency.setTargetAtTime(frequency, this.context.currentTime, .008);
  }
  setOpening(value) {
    this.opening = clamp(value);
    if (!this.voice) return;
    const params = wahParameters(this.opening), now = this.context.currentTime;
    this.voice.low.frequency.setTargetAtTime(params.lowHz, now, .018);
    this.voice.high.frequency.setTargetAtTime(params.highHz, now, .018);
  }
  async play() {
    if (!this.enabled || this.voice) return;
    const request = ++this.generation;
    try {
      await this.context.resume();
      if (request !== this.generation || !this.enabled) return;
      if (this.context.state !== 'running') throw new Error('interrupted');
      const ctx = this.context, osc = ctx.createOscillator(), low = ctx.createBiquadFilter(), high = ctx.createBiquadFilter();
      const body = ctx.createBiquadFilter(), dry = ctx.createGain(), lowMix = ctx.createGain(), highMix = ctx.createGain(), gain = ctx.createGain();
      const params = wahParameters(this.opening);
      osc.type = 'sawtooth'; osc.frequency.value = this.frequency;
      low.type = high.type = 'bandpass'; low.frequency.value = params.lowHz; high.frequency.value = params.highHz;
      low.Q.value = params.lowQ; high.Q.value = params.highQ;
      body.type = 'lowpass'; body.frequency.value = 6000; body.Q.value = .5;
      dry.gain.value = .18; lowMix.gain.value = .7; highMix.gain.value = .3; gain.gain.value = 0;
      osc.connect(body).connect(dry).connect(gain);
      osc.connect(low).connect(lowMix).connect(gain); osc.connect(high).connect(highMix).connect(gain);
      gain.connect(this.analyser);
      const nodes = [osc, low, high, body, dry, lowMix, highMix, gain];
      this.voice = { osc, low, high, gain, nodes };
      osc.onended = () => nodes.forEach(node => node.disconnect());
      osc.start(); gain.gain.linearRampToValueAtTime(.065, ctx.currentTime + .012);
      this.onState(true);
    } catch {
      if (request !== this.generation) return;
      this.enabled = false; this.stop(); this.onState(false, '音訊中斷，請按聲音按鈕重試。');
    }
  }
  stop() {
    ++this.generation;
    const voice = this.voice; this.voice = null;
    if (voice) {
      const now = this.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + .02); voice.osc.stop(now + .03);
    }
    this.onState(false);
  }
}
