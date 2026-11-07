export function microphoneError(error) {
  if (['NotAllowedError', 'SecurityError'].includes(error?.name)) return '未取得麥克風權限，請在瀏覽器的網站設定允許後重試。';
  if (error?.name === 'NotFoundError') return '找不到麥克風，請連接裝置後重試。';
  if (error?.name === 'NotReadableError') return '無法讀取麥克風，請關閉占用它的程式後重試。';
  return error?.message || '麥克風啟動失敗，請重試。';
}

export class MicrophoneInput {
  constructor({ onState = () => {}, onFrame = () => {}, workerURL,
    mediaDevices = globalThis.navigator?.mediaDevices,
    Context = globalThis.AudioContext || globalThis.webkitAudioContext,
    WorkerClass = globalThis.Worker, secure = globalThis.isSecureContext,
    schedule = (fn, delay) => globalThis.setTimeout(fn, delay), cancel = id => globalThis.clearTimeout(id),
    now = () => performance.now() } = {}) {
    Object.assign(this, { onState, onFrame, workerURL, mediaDevices, Context, WorkerClass, secure, schedule, cancel, now });
    this.generation = 0; this.state = 'idle'; this.session = null;
  }
  report(state, message) { this.state = state; this.onState(state, message); }
  stop(message = '麥克風已關閉') {
    this.generation++;
    const session = this.session; this.session = null;
    if (session) {
      this.cancel(session.timer); this.cancel(session.watchdog);
      session.worker?.terminate();
      session.stream?.getTracks().forEach(track => track.stop());
      session.source?.disconnect(); session.analyser?.disconnect();
      if (session.context?.state !== 'closed') session.context?.close().catch(() => {});
    }
    this.report('idle', message);
  }
  async start() {
    this.stop();
    const generation = this.generation;
    const current = () => generation === this.generation;
    try {
      if (!this.secure) throw new Error('請用 HTTPS 或 localhost 開啟，才能使用麥克風。');
      if (!this.mediaDevices?.getUserMedia || !this.Context || !this.WorkerClass) throw new Error('此瀏覽器不支援麥克風分析，請使用新版 Safari、Chrome 或 Firefox。');
      this.report('requesting', '請允許麥克風權限');
      const session = { context: new this.Context(), timer: null, watchdog: null }; this.session = session;
      // Both calls originate in the explicit click gesture, including iOS resume.
      const resume = session.context.resume();
      const capture = this.mediaDevices.getUserMedia({ video: false, audio: {
        channelCount: { ideal: 1 }, echoCancellation: false, noiseSuppression: false, autoGainControl: false,
      } }).then(stream => {
        if (!current()) stream.getTracks().forEach(track => track.stop());
        else session.stream = stream;
        return stream;
      });
      await Promise.all([resume, capture]);
      if (!current()) return false;
      if (session.context.state !== 'running') throw new Error('音訊已暫停，請再按一次開啟麥克風。');
      session.worker = new this.WorkerClass(this.workerURL);
      session.analyser = session.context.createAnalyser();
      session.analyser.fftSize = session.context.sampleRate > 60000 ? 8192 : 4096;
      session.source = session.context.createMediaStreamSource(session.stream);
      // Deliberately no destination connection: analysis only, never microphone monitoring.
      session.source.connect(session.analyser);
      const fail = message => { if (current()) { this.stop(message); this.report('error', message); } };
      session.worker.onerror = event => { event.preventDefault?.(); fail('音高分析無法啟動，請重新開啟麥克風。'); };
      session.worker.onmessageerror = () => fail('音高資料讀取失敗，請重試。');
      session.context.addEventListener('statechange', () => {
        if (current() && session.context.state !== 'running') fail('音訊已中斷，請重新開啟麥克風。');
      });
      for (const track of session.stream.getAudioTracks()) {
        track.addEventListener('ended', () => fail('麥克風已中斷，請重新開啟。'));
        track.addEventListener('mute', () => fail('麥克風已暫停，請重新開啟。'));
      }
      const sample = () => {
        if (!current()) return;
        const samples = new Float32Array(session.analyser.fftSize);
        session.analyser.getFloatTimeDomainData(samples);
        session.watchdog = this.schedule(() => fail('音高分析沒有回應，請重新開啟麥克風。'), 3000);
        session.worker.postMessage({ buffer: samples.buffer, sampleRate: session.context.sampleRate, timestampMs: this.now() }, [samples.buffer]);
      };
      session.worker.onmessage = ({ data }) => {
        if (!current()) return;
        this.cancel(session.watchdog);
        this.onFrame(data);
        session.timer = this.schedule(sample, 40); // One in flight; bounded work, about 20–25 Hz.
      };
      this.report('listening', '聆聽中'); sample();
      return true;
    } catch (error) {
      if (current()) { this.stop(); this.report('error', microphoneError(error)); }
      return false;
    }
  }
}
