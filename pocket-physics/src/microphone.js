const clamp = (x, min, max) => Math.max(min, Math.min(max, x));

export function rmsLevel(samples) {
  if (!samples.length) return 0;
  let mean = 0, sum = 0;
  for (const x of samples) mean += x;
  mean /= samples.length;
  for (const x of samples) sum += (x - mean) ** 2;
  return Math.sqrt(sum / samples.length);
}

export function breathIntensity(rms, floor = .003) {
  const threshold = Math.max(.008, Math.min(floor, .025) * 2.5);
  return Math.sqrt(clamp((rms - threshold) / Math.max(.11 - threshold, .04), 0, 1));
}

const errorReason = error => {
  if (['NotAllowedError', 'PermissionDeniedError', 'SecurityError'].includes(error?.name)) return '未允許麥克風，改用長按';
  if (['NotFoundError', 'DevicesNotFoundError'].includes(error?.name)) return '沒有麥克風，改用長按';
  return '麥克風無法使用，改用長按';
};

/** Local amplitude analysis only: no recorder, upload, speaker connection, or extra animation loop. */
export class MicrophoneBreath {
  constructor({ mediaDevices = globalThis.navigator?.mediaDevices, createAudioContext, onChange = () => {} } = {}) {
    const Context = globalThis.AudioContext || globalThis.webkitAudioContext;
    this.mediaDevices = mediaDevices;
    this.createAudioContext = createAudioContext || (Context ? () => new Context() : null);
    this.onChange = onChange;
    this.state = mediaDevices?.getUserMedia && this.createAudioContext ? 'idle' : 'fallback';
    this.reason = this.state === 'fallback' ? '不支援麥克風，改用長按' : '';
    this.version = 0; this.level = 0; this.noiseFloor = .003; this.disposed = false;
    this.listeners = [];
  }
  changed() { this.onChange(this.state); }
  releaseResources() {
    for (const [target, event, fn] of this.listeners) target.removeEventListener(event, fn);
    this.listeners.length = 0;
    this.source?.disconnect(); this.analyser?.disconnect();
    this.source = null; this.analyser = null; this.samples = null;
    this.stream?.getTracks().forEach(track => track.stop()); this.stream = null;
    if (this.context && this.context.state !== 'closed') this.context.close().catch(() => {});
    this.context = null; this.level = 0;
  }
  fallback(reason) {
    this.version++; this.releaseResources(); this.state = 'fallback'; this.reason = reason; this.changed();
  }
  async enable() {
    if (this.disposed || this.state === 'requesting' || this.state === 'listening') return false;
    const token = ++this.version;
    this.releaseResources(); this.reason = ''; this.noiseFloor = .003;
    if (!this.mediaDevices?.getUserMedia || !this.createAudioContext) {
      this.fallback('不支援麥克風，改用長按'); return false;
    }
    this.state = 'requesting'; this.changed();
    let stream;
    try {
      // Resume while inside the user's click, before the permission promise resolves.
      const context = this.createAudioContext(); this.context = context;
      const resumed = Promise.resolve(context.resume()).then(() => null, error => error);
      stream = await this.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
      if (this.disposed || token !== this.version) { stream.getTracks().forEach(track => track.stop()); return false; }
      this.stream = stream;
      const resumeError = await resumed;
      if (this.disposed || token !== this.version) return false;
      if (resumeError || context.state !== 'running') throw resumeError || new Error('Audio context did not start');
      const tracks = stream.getAudioTracks();
      if (!tracks.length || tracks.some(track => track.readyState === 'ended')) throw Object.assign(new Error('No live microphone'), { name: 'NotFoundError' });
      if (tracks.some(track => track.muted)) throw Object.assign(new Error('Microphone is muted'), { name: 'NotReadableError' });
      this.source = context.createMediaStreamSource(stream); this.analyser = context.createAnalyser();
      if (typeof this.analyser.getFloatTimeDomainData !== 'function') throw new Error('Audio analysis is unavailable');
      this.analyser.fftSize = 1024;
      this.source.connect(this.analyser); // Deliberately not connected to audio destination.
      this.samples = new Float32Array(this.analyser.fftSize);
      const listen = (target, event, fn) => { target.addEventListener(event, fn); this.listeners.push([target, event, fn]); };
      for (const track of tracks) {
        listen(track, 'ended', () => this.fallback('麥克風已中斷，改用長按'));
        listen(track, 'mute', () => this.fallback('麥克風已靜音，改用長按'));
      }
      listen(context, 'statechange', () => {
        if (this.state === 'listening' && context.state !== 'running') this.fallback('收音已中斷，改用長按');
      });
      this.state = 'listening'; this.changed(); return true;
    } catch (error) {
      if (token === this.version && !this.disposed) this.fallback(errorReason(error));
      else stream?.getTracks().forEach(track => track.stop());
      return false;
    }
  }
  sample(dt) {
    if (this.state !== 'listening' || !this.analyser) return 0;
    try { this.analyser.getFloatTimeDomainData(this.samples); }
    catch { this.fallback('收音已中斷，改用長按'); return 0; }
    const rms = rmsLevel(this.samples);
    // Learn only the quiet background slowly; a breath never becomes the calibration baseline.
    if (rms < .018 && this.level < .05) this.noiseFloor += (rms - this.noiseFloor) * Math.min(dt, .05) * .3;
    const target = breathIntensity(rms, this.noiseFloor);
    const tau = target > this.level ? .045 : .11;
    this.level += (target - this.level) * (1 - Math.exp(-Math.min(dt, .05) / tau));
    if (this.level < .005) this.level = 0;
    return this.level;
  }
  stop() {
    this.version++; this.releaseResources();
    if (this.state !== 'fallback') { this.state = 'idle'; this.reason = ''; }
    this.changed();
  }
  dispose() { this.disposed = true; this.stop(); }
}
