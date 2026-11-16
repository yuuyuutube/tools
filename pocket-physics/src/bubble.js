import { BubbleSimulation, BUBBLE_STEP } from './bubble-simulation.js';
import { BubbleRenderer } from './bubble-renderer.js';
import { MicrophoneBreath } from './microphone.js';

export class UnbreakableBubble {
  constructor(root) {
    this.root = root; this.sim = new BubbleSimulation();
    this.canvas = root.querySelector('#bubble-canvas');
    this.renderer = new BubbleRenderer(this.canvas, this.sim);
    this.abort = new AbortController();
    this.paused = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.active = true; this.frame = 0; this.last = 0; this.accumulator = 0;
    this.keys = new Set(); this.blowPointers = new Set(); this.blowKeys = new Set();
    this.micLevel = 0;
    this.microphone = new MicrophoneBreath({ onChange: () => this.onMicrophoneChange() });
    this.tick = this.tick.bind(this);
  }
  on(element, type, fn, options = {}) { element.addEventListener(type, fn, { ...options, signal: this.abort.signal }); }
  $(id) { return this.root.querySelector('#' + id); }
  mount() {
    this.on(this.$('pause'), 'click', () => this.togglePause());
    this.on(this.$('reset'), 'click', () => this.reset());
    this.on(this.$('relax'), 'click', () => { this.cancelGestures(); this.paused = false; this.updateUI(); this.schedule(); });
    this.on(this.$('add-bubble'), 'click', () => {
      this.sim.add(); this.updateUI(); this.paint(); this.announce(`${this.sim.bubbles.length} 顆泡泡`);
    });
    this.on(this.$('elasticity'), 'input', () => { this.sim.elasticity = Number(this.$('elasticity').value); this.updateUI(); });
    this.on(this.canvas, 'pointerdown', e => {
      if (e.button !== 0 || !this.active) return;
      const p = this.renderer.point(e.clientX, e.clientY);
      if (!this.sim.grab(e.pointerId, p.x, p.y)) return;
      this.canvas.setPointerCapture(e.pointerId); this.canvas.focus({ preventScroll: true });
      this.$('gesture-hint').style.opacity = '.35'; e.preventDefault(); this.paint();
    });
    this.on(this.canvas, 'pointermove', e => {
      if (!this.sim.grabs.has(e.pointerId)) return;
      const p = this.renderer.point(e.clientX, e.clientY); this.sim.move(e.pointerId, p.x, p.y);
      // A paused object remains directly manipulable, without restarting ambient simulation.
      if (this.paused) { for (let i = 0; i < 8; i++) this.sim.step(); this.paint(); }
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.canvas, event, e => { this.sim.release(e.pointerId); this.paint(); });

    const inflate = this.$('inflate');
    this.on(inflate, 'pointerdown', e => {
      if (e.button !== 0 || !this.active || this.microphone.state !== 'fallback') return;
      this.blowPointers.add(e.pointerId); inflate.setPointerCapture(e.pointerId); this.updateBlowing(); e.preventDefault();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(inflate, type, e => { this.blowPointers.delete(e.pointerId); this.updateBlowing(); });
    this.on(inflate, 'keydown', e => {
      if (this.microphone.state === 'fallback' && ['Space', 'Enter'].includes(e.code)) { e.preventDefault(); this.blowKeys.add(e.code); this.updateBlowing(); }
    });
    this.on(inflate, 'keyup', e => {
      if (['Space', 'Enter'].includes(e.code)) { e.preventDefault(); this.blowKeys.delete(e.code); this.updateBlowing(); }
    });
    this.on(inflate, 'blur', () => { this.blowKeys.clear(); this.updateBlowing(); });
    // Screen-reader/voice-generated clicks have no pointer sequence; provide a finite breath.
    this.on(inflate, 'click', e => {
      if (this.microphone.state !== 'fallback') {
        if (this.microphone.state === 'listening') this.microphone.stop();
        else if (this.microphone.state === 'idle') this.enableMicrophone();
        return;
      }
      if (e.detail !== 0 || this.blowKeys.size) return;
      this.blowKeys.add('assistive'); this.updateBlowing();
      clearTimeout(this.breathTimer);
      this.breathTimer = setTimeout(() => { this.blowKeys.delete('assistive'); this.updateBlowing(); }, 900);
    });
    this.on(this.$('mic-retry'), 'click', () => this.enableMicrophone());
    this.on(this.canvas, 'keydown', e => {
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
      e.preventDefault(); this.keys.add(e.key); this.keyboardPull();
    });
    this.on(this.canvas, 'keyup', e => {
      if (!this.keys.has(e.key)) return;
      e.preventDefault(); this.keys.delete(e.key); this.keyboardPull();
    });
    this.on(this.canvas, 'blur', () => { this.keys.clear(); this.sim.release('keyboard'); });
    this.on(document, 'keydown', e => {
      if (!this.active || e.repeat || e.altKey || e.metaKey || e.ctrlKey || e.target.closest('input,button,a,dialog')) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
      if (e.key === 'Home') { e.preventDefault(); this.reset(); }
    });
    this.on(document, 'visibilitychange', () => { if (document.hidden) { this.cancelGestures(); this.microphone.stop(); } this.schedule(); });
    this.on(window, 'blur', () => { this.cancelGestures(); if (this.microphone.state === 'listening') this.microphone.stop(); });
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) { this.renderer.resize(width, height); this.paint(); }
    });
    this.resizeObserver.observe(this.canvas); this.updateUI(); this.schedule();
  }
  keyboardPull() {
    this.sim.release('keyboard');
    if (!this.keys.size) return;
    const x = (this.keys.has('ArrowRight') ? 1 : 0) - (this.keys.has('ArrowLeft') ? 1 : 0);
    const y = (this.keys.has('ArrowDown') ? 1 : 0) - (this.keys.has('ArrowUp') ? 1 : 0);
    if (!x && !y) return;
    const b = this.sim.bubbles[0], center = b.center(), length = Math.hypot(x,y);
    const nx = x / length, ny = y / length;
    const point = b.nearest(center.x + nx * b.radius, center.y + ny * b.radius);
    this.sim.grabs.set('keyboard', { body: b, index: point.index, x: center.x + nx * b.radius * 1.65, y: center.y + ny * b.radius * 1.65, offsetX: 0, offsetY: 0 });
    if (this.paused) { for (let i = 0; i < 12; i++) this.sim.step(); this.paint(); }
  }
  updateBlowing() {
    const manual = this.microphone.state === 'fallback' && (this.blowPointers.size > 0 || this.blowKeys.size > 0);
    const audio = this.microphone.state === 'listening' && this.micLevel > .025;
    this.sim.blowing = this.active && (manual || audio);
    this.sim.breathStrength = manual ? 1 : this.micLevel;
    if (this.sim.blowing && this.paused) { this.paused = false; this.schedule(); }
    this.updateUI();
  }
  async enableMicrophone() {
    if (!this.active || document.hidden) return false;
    this.cancelGestures();
    return this.microphone.enable();
  }
  onMicrophoneChange() {
    this.micLevel = 0;
    if (this.microphone.state === 'listening' && this.paused && this.active) { this.paused = false; this.schedule(); }
    this.$('inflate').style.setProperty('--breath', '0');
    this.updateBlowing();
  }
  cancelGestures() {
    this.sim.releaseAll(); this.keys.clear(); this.blowPointers.clear(); this.blowKeys.clear(); clearTimeout(this.breathTimer);
    this.updateUI();
  }
  updateUI() {
    this.$('elasticity-value').textContent = this.sim.elasticity.toFixed(2);
    this.$('elasticity').value = this.sim.elasticity;
    this.$('elasticity').style.setProperty('--fill', ((this.sim.elasticity - .15) / .85 * 100) + '%');
    this.$('bubble-count').textContent = `${this.sim.bubbles.length} / 5`;
    this.$('add-bubble').disabled = this.sim.bubbles.length >= 5;
    const pause = this.$('pause');
    pause.setAttribute('aria-pressed', this.paused); pause.setAttribute('aria-label', this.paused ? '播放' : '暫停');
    pause.querySelector('use').setAttribute('href', this.paused ? '#i-play' : '#i-pause');
    const mode = this.microphone.state, inflate = this.$('inflate');
    inflate.dataset.mode = mode;
    inflate.disabled = mode === 'requesting';
    inflate.setAttribute('aria-pressed', mode === 'listening' || (mode === 'fallback' && this.sim.blowing));
    inflate.setAttribute('aria-label', mode === 'listening' ? '麥克風已啟用，點一下停用' : mode === 'requesting' ? '等待麥克風授權' : mode === 'fallback' ? '按住吹氣，也可按住空白鍵或 Enter' : '啟用麥克風吹氣');
    inflate.querySelector('span').textContent = mode === 'listening' ? '對著麥克風吹氣' : mode === 'requesting' ? '等待授權' : mode === 'fallback' ? '按住吹氣' : '啟用麥克風';
    inflate.querySelector('use').setAttribute('href', mode === 'fallback' ? '#i-breathe' : '#i-mic');
    this.$('mic-retry').hidden = mode !== 'fallback';
    this.$('flow-state').textContent = this.paused ? '已暫停' : this.sim.blowing ? '吹氣中' : mode === 'listening' ? '麥克風收音中' : mode === 'requesting' ? '等待麥克風授權' : mode === 'fallback' ? this.microphone.reason : '表面張力';
    this.$('live-dot').classList.toggle('paused', this.paused);
  }
  reset() {
    this.microphone.stop(); this.cancelGestures(); this.sim.reset(); this.last = 0; this.accumulator = 0;
    this.$('gesture-hint').style.opacity = '1'; this.updateUI(); this.paint(); this.announce('泡泡已重置');
  }
  togglePause() { this.paused = !this.paused; if (this.paused) { this.cancelGestures(); this.microphone.stop(); } this.updateUI(); this.schedule(); }
  announce(text) {
    clearTimeout(this.statusTimer); this.$('status').textContent = text;
    this.statusTimer = setTimeout(() => { this.$('status').textContent = ''; }, 1800);
  }
  setActive(active) { this.active = active; if (!active) { this.cancelGestures(); this.microphone.stop(); } this.schedule(); }
  paint() { if (this.renderer.width) this.renderer.render(); }
  schedule() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; this.accumulator = 0;
    if (this.active && !this.paused && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  }
  tick(now) {
    if (!this.active || this.paused || document.hidden) return;
    if (this.microphone.state === 'listening') {
      this.micLevel = this.microphone.sample(this.last ? Math.min((now - this.last) / 1000, .05) : BUBBLE_STEP);
      const wasBlowing = this.sim.blowing;
      this.sim.blowing = this.micLevel > .025; this.sim.breathStrength = this.micLevel;
      this.$('inflate').style.setProperty('--breath', this.micLevel.toFixed(3));
      if (wasBlowing !== this.sim.blowing) this.updateUI();
    }
    if (this.last) this.accumulator += Math.min((now - this.last) / 1000, .05);
    this.last = now;
    let steps = 0;
    while (this.accumulator >= BUBBLE_STEP && steps < 6) { this.sim.step(); this.accumulator -= BUBBLE_STEP; steps++; }
    this.paint(); this.frame = requestAnimationFrame(this.tick);
  }
  dispose() {
    this.active = false; this.microphone.dispose(); this.cancelGestures(); cancelAnimationFrame(this.frame); this.frame = 0;
    clearTimeout(this.statusTimer); this.resizeObserver?.disconnect(); this.abort.abort();
  }
}
