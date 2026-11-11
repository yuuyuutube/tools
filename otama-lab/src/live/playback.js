// Reconstruct continuous pitch, not the original microphone waveform or timbre.
export function pitchSegments(recording) {
  const segments = []; let segment = null;
  for (let i = 0; i < recording.frames.length; i++) {
    const frame = recording.frames[i], previous = recording.frames[i - 1];
    if (frame.frequencyHz === null) { segment = null; continue; }
    if (!segment || frame.timeMs - previous.timeMs > 200) { segment = { frames: [], endMs: 0 }; segments.push(segment); }
    segment.frames.push(frame);
    const next = recording.frames[i + 1];
    segment.endMs = Math.min(recording.durationMs, next && next.timeMs - frame.timeMs <= 200 ? next.timeMs : frame.timeMs + 100);
  }
  return segments;
}

export function pitchAtPlayback(segments, timeMs) {
  for (const segment of segments) {
    if (timeMs < segment.frames[0].timeMs || timeMs >= segment.endMs) continue;
    const frames = segment.frames;
    let lo = 0, hi = frames.length - 1;
    while (lo < hi) { const mid = Math.ceil((lo + hi) / 2); if (frames[mid].timeMs <= timeMs) lo = mid; else hi = mid - 1; }
    const a = frames[lo], b = frames[lo + 1];
    return b ? a.frequencyHz * (b.frequencyHz / a.frequencyHz) ** ((timeMs - a.timeMs) / (b.timeMs - a.timeMs)) : a.frequencyHz;
  }
  return null;
}

export class PitchPlayer {
  constructor({ Context, onProgress = () => {}, onState = () => {} } = {}) {
    this.Context = Context; this.onProgress = onProgress; this.onState = onState;
    this.context = null; this.voice = null; this.generation = 0; this.active = false; this.tick = null;
  }
  async play(recording, offsetMs = 0) {
    this.stop();
    const request = this.generation; this.active = true; this.onState(true);
    try {
      const Context = this.Context || globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Context) throw new Error('此瀏覽器不支援合成音重播。');
      if (!this.context || this.context.state === 'closed') {
        const ctx = this.context = new Context();
        ctx.addEventListener('statechange', () => { if (this.context === ctx && ctx.state !== 'running' && this.active) this.stop(); });
      }
      await this.context.resume(); // Invoked from the play button's user gesture.
      if (request !== this.generation) return;
      if (this.context.state !== 'running') throw new Error('音訊未能啟動，請再按一次播放。');
      const ctx = this.context, osc = ctx.createOscillator(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
      const segments = pitchSegments(recording), offset = Math.max(0, Math.min(recording.durationMs, offsetMs)), origin = ctx.currentTime + .025;
      osc.type = 'sawtooth'; filter.type = 'lowpass'; filter.frequency.value = 1150; gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ctx.destination);
      const at = time => origin + (time - offset) / 1000;
      for (const segment of segments) {
        const start = Math.max(offset, segment.frames[0].timeMs), end = segment.endMs;
        if (end <= start) continue;
        osc.frequency.setValueAtTime(pitchAtPlayback([segment], start), at(start));
        gain.gain.setValueAtTime(0, at(start));
        gain.gain.linearRampToValueAtTime(.045, at(Math.min(start + 6, (start + end) / 2)));
        for (const frame of segment.frames) if (frame.timeMs > start && frame.timeMs < end) osc.frequency.exponentialRampToValueAtTime(frame.frequencyHz, at(frame.timeMs));
        gain.gain.setValueAtTime(.045, at(Math.max((start + end) / 2, end - 6)));
        gain.gain.linearRampToValueAtTime(0, at(end));
      }
      this.voice = { osc, filter, gain }; osc.start(origin); osc.stop(at(recording.durationMs) + .02);
      osc.onended = () => { osc.disconnect(); filter.disconnect(); gain.disconnect(); if (this.voice?.osc === osc) this.stop(); };
      const update = () => {
        if (request !== this.generation) return;
        const time = Math.min(recording.durationMs, offset + Math.max(0, ctx.currentTime - origin) * 1000);
        this.onProgress(time, pitchAtPlayback(segments, time));
        if (time >= recording.durationMs) this.stop();
        else this.tick = requestAnimationFrame(update);
      };
      update();
    } catch (error) { if (request === this.generation) { this.stop(); this.onState(false, error.message); } }
  }
  stop() {
    ++this.generation; this.active = false;
    if (this.tick !== null) cancelAnimationFrame(this.tick); this.tick = null;
    const voice = this.voice; this.voice = null;
    if (voice) {
      const now = this.context.currentTime;
      voice.gain.gain.cancelScheduledValues(now); voice.gain.gain.setValueAtTime(0, now);
      voice.osc.stop(now + .005);
    }
    this.onState(false);
  }
}
