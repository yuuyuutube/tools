// Audio output is independent of input and pitch mapping. A future Wah processor
// can be inserted between filter and gain without changing the instrument.
export class Synth {
  constructor({ Context = globalThis.AudioContext || globalThis.webkitAudioContext, onState = () => {} } = {}) {
    this.Context = Context; this.onState = onState;
    this.context = null; this.voice = null; this.enabled = false;
    this.generation = 0; this.enableGeneration = 0; this.frequency = 220;
  }
  async setEnabled(enabled) {
    const request = ++this.enableGeneration;
    this.enabled = false;
    this.stop();
    if (!enabled) return false;
    if (!this.Context) throw new Error('此瀏覽器不支援 Web Audio，仍可使用滑軌與圖表。');
    try {
      this.context ||= new this.Context();
      // Called directly from a user gesture, never on page load.
      await this.context.resume();
      if (request !== this.enableGeneration) return false;
      this.enabled = true;
      return true;
    } catch {
      if (request === this.enableGeneration) this.enabled = false;
      throw new Error('音訊未能啟動。請再按一次聲音開關，或檢查瀏覽器的音訊設定。');
    }
  }
  setFrequency(frequency) {
    this.frequency = frequency;
    if (this.voice) this.voice.osc.frequency.setTargetAtTime(frequency, this.context.currentTime, .008);
  }
  async play() {
    if (!this.enabled) return;
    this.stop();
    const request = this.generation;
    try {
      await this.context.resume();
      if (request !== this.generation || !this.enabled) return;
      const ctx = this.context, osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      osc.type = 'sawtooth'; osc.frequency.value = this.frequency;
      filter.type = 'lowpass'; filter.frequency.value = 1150;
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      this.voice = { osc, filter, gain };
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); };
      osc.start();
      gain.gain.linearRampToValueAtTime(.045, ctx.currentTime + .012);
      this.onState(true);
    } catch {
      this.stop();
      this.onState(false, '音訊被瀏覽器中斷，請關閉再開啟聲音。');
    }
  }
  stop() {
    ++this.generation; // Invalidates pending resume calls, including release-before-resume.
    const voice = this.voice;
    this.voice = null;
    if (voice) {
      const now = this.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now);
      voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
      voice.gain.gain.linearRampToValueAtTime(0, now + .025);
      voice.osc.stop(now + .035);
    }
    this.onState(false);
  }
}
