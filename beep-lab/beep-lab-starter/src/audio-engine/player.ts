import { eventSeconds, frequency, timeline, type Melody, type MusicEvent } from '../music-core/model';
export type AudioAvailability = 'idle' | 'ready' | 'blocked' | 'unavailable';
const ACTIVATION_TIMEOUT_MS = 1500;

export class AudioActivationError extends Error {
  constructor(public readonly recoverable: boolean) {
    super(recoverable ? '聲音尚未啟用，請點「啟用聲音」再試一次。' : '此瀏覽器無法啟用聲音，請改用 Safari 或 Chrome。');
    this.name = 'AudioActivationError';
  }
}

type Voice = { oscillator: OscillatorNode; gain: GainNode; end: number };
export class AudioEngine {
  private context?: AudioContext;
  private master?: GainNode;
  private voices = new Set<Voice>();
  private timer?: ReturnType<typeof setInterval>;
  private frame?: number;
  private generation = 0;
  private muted = false;
  isPlaying = false;
  onPosition: (index: number | null) => void = () => {};
  onEnd: () => void = () => {};
  onProgress: (seconds:number|null,totalSeconds:number) => void = () => {};
  private activationAttempt = 0;
  availability: AudioAvailability = 'idle';
  onAvailability: (availability: AudioAvailability) => void = () => {};
  private setAvailability(availability: AudioAvailability) {
    if (this.availability === availability) return;
    this.availability = availability;
    this.onAvailability(availability);
  }
  async unlock(): Promise<void> {
    const attempt = ++this.activationAttempt;
    if (this.context?.state === 'closed') { this.context = undefined; this.master = undefined; }
    if (!this.context) {
      const Constructor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) {
        this.setAvailability('unavailable');
        throw new AudioActivationError(false);
      }
      try {
        const context = new Constructor();
        const master = context.createGain();
        master.gain.value = this.muted ? 0 : 0.13;
        master.connect(context.destination);
        this.context = context;
        this.master = master;
        context.onstatechange = () => {
          if (this.context !== context) return;
          if (context.state === 'running') this.setAvailability('ready');
          else if (context.state === 'closed') {
            this.stop();
            this.context = undefined;
            this.master = undefined;
            this.setAvailability('blocked');
          } else if (this.availability === 'ready') {
            this.stop();
            this.setAvailability('blocked');
          }
        };
      } catch {
        this.setAvailability('blocked');
        throw new AudioActivationError(true);
      }
    }
    const context = this.context;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      // Some mobile browsers leave resume() pending instead of rejecting it.
      if (context.state !== 'running') await Promise.race([
        context.resume(),
        new Promise<never>((_, reject) => {
          timeout = setTimeout(() => reject(new AudioActivationError(true)), ACTIVATION_TIMEOUT_MS);
        }),
      ]);
      if (context.state !== 'running') throw new AudioActivationError(true);
      this.setAvailability('ready');
    } catch {
      if (context.state === 'running') { this.setAvailability('ready'); return; }
      if (attempt === this.activationAttempt) this.setAvailability('blocked');
      throw new AudioActivationError(true);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  }
  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.context && this.master) this.master.gain.setTargetAtTime(muted ? 0 : 0.13, this.context.currentTime, 0.01);
  }
  private voice(event: MusicEvent, start: number, duration: number) {
    if (event.type === 'rest' || !this.context || !this.master) return;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const end = start + duration;
    const soundEnd = Math.max(start + 0.01, end - Math.min(0.025, duration * 0.1));
    oscillator.type = 'square';
    oscillator.frequency.value = frequency(event);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(1, start + Math.min(0.005, duration / 4));
    gain.gain.setValueAtTime(1, Math.max(start + 0.006, soundEnd - 0.008));
    gain.gain.linearRampToValueAtTime(0, soundEnd);
    oscillator.connect(gain); gain.connect(this.master);
    const voice = { oscillator, gain, end };
    this.voices.add(voice);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    oscillator.start(start); oscillator.stop(end);
  }
  async previewNote(event: MusicEvent, bpm: number) {
    this.stop();
    const generation = this.generation;
    await this.unlock();
    if (generation !== this.generation) return;
    this.voice(event, this.context!.currentTime + 0.012, eventSeconds(event, bpm));
  }
  async playMelody(melody: Melody) {
    this.stop();
    const generation = this.generation;
    await this.unlock();
    if (generation !== this.generation || !melody.events.length) return;
    const entries = timeline(melody.events, melody.tempoBpm);
    const start = this.context!.currentTime + 0.04;
    const last = entries.at(-1)!;
    const total = last.offset + last.duration;
    let next = 0;
    let shown: number | null = null;
    this.isPlaying = true;
    const schedule = () => {
      if (!this.context || generation !== this.generation) return;
      const now = this.context.currentTime;
      while (next < entries.length && start + entries[next].offset < now + 0.15) {
        const entry = entries[next++];
        // A stalled browser must not play a backlog of notes simultaneously.
        if (start + entry.offset + entry.duration > now) {
          const at = Math.max(start + entry.offset, now);
          this.voice(entry.event, at, start + entry.offset + entry.duration - at);
        }
      }
    };
    const update = () => {
      if (!this.context || generation !== this.generation) return;
      const elapsed = this.context.currentTime - start;
      this.onProgress(Math.max(0,Math.min(total,elapsed)),total);
      if (elapsed >= total) { this.stop(); return; }
      const position = entries.findIndex(e => elapsed >= e.offset && elapsed < e.offset + e.duration);
      const current = position < 0 ? null : position;
      if (shown !== current) { shown = current; this.onPosition(current); }
      this.frame = requestAnimationFrame(update);
    };
    schedule(); this.timer = setInterval(schedule, 25); update();
  }
  stop() {
    this.generation++;
    if (this.timer) clearInterval(this.timer);
    if (this.frame) cancelAnimationFrame(this.frame);
    this.timer = undefined; this.frame = undefined;
    const now = this.context?.currentTime ?? 0;
    for (const { oscillator, gain } of this.voices) {
      gain.gain.cancelAndHoldAtTime(now);
      gain.gain.linearRampToValueAtTime(0, now + 0.006);
      try { oscillator.stop(now + 0.008); } catch { /* Already ended. */ }
    }
    this.voices.clear();
    const wasPlaying = this.isPlaying;
    this.isPlaying = false;
    this.onPosition(null);
    this.onProgress(null,0);
    if (wasPlaying) this.onEnd();
  }
}
