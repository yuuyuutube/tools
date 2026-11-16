import { SandSimulation, STEP, wrap, clamp } from './simulation.js';
import { HourglassRenderer } from './renderer.js';

/** Exhibit adapter: mount(), setActive(), reset(), dispose(). Owns all simulation resources. */
export class ReverseHourglass {
  constructor(root) {
    this.root = root;
    this.sim = new SandSimulation();
    this.canvas = root.querySelector('#hourglass');
    this.renderer = new HourglassRenderer(this.canvas, this.sim);
    this.abort = new AbortController();
    this.paused = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.active = true;
    this.last = 0; this.accumulator = 0; this.frame = 0;
    this.drag = null;
    this.lastStrength = 1;
    this.onVisibility = () => this.schedule();
    this.tick = this.tick.bind(this);
  }

  on(element, event, handler, options = {}) {
    element.addEventListener(event, handler, { ...options, signal: this.abort.signal });
  }

  mount() {
    const $ = (id) => this.root.querySelector('#' + id);
    this.dial = $('gravity-dial');
    this.strength = $('strength');
    this.on($('pause'), 'click', () => this.togglePause());
    this.on($('reverse'), 'click', () => this.reverse());
    this.on($('reset'), 'click', () => this.reset());
    this.on($('float'), 'click', () => {
      if (this.sim.strength === 0) this.sim.strength = this.lastStrength || 1;
      else { this.lastStrength = this.sim.strength; this.sim.strength = 0; }
      this.updateUI(); this.paint();
    });
    this.on(this.strength, 'input', () => {
      this.sim.strength = Number(this.strength.value);
      if (this.sim.strength > 0) this.lastStrength = this.sim.strength;
      this.updateUI(); this.paint();
    });

    this.on(this.canvas, 'pointerdown', (e) => {
      if (e.button !== 0 || this.drag || !this.active) return;
      const p = this.renderer.point(e.clientX, e.clientY);
      if (Math.hypot(p.x, p.y) > 275) return;
      this.drag = { id: e.pointerId, theta: Math.atan2(p.y, p.x), x: p.x, central: Math.hypot(p.x, p.y) < 45 };
      this.canvas.setPointerCapture(e.pointerId);
      this.canvas.focus({ preventScroll: true });
      $('gesture-hint').style.opacity = '.35';
      e.preventDefault();
    });
    this.on(this.canvas, 'pointermove', (e) => {
      if (this.drag?.id !== e.pointerId) return;
      const p = this.renderer.point(e.clientX, e.clientY);
      const theta = Math.atan2(p.y, p.x);
      const delta = this.drag.central ? (p.x - this.drag.x) * .006 : wrap(theta - this.drag.theta);
      // Subdivide large turns so rapidly moving walls cannot tunnel through the grains.
      const steps = Math.max(1, Math.ceil(Math.abs(delta) / .04));
      for (let i = 0; i < steps; i++) this.sim.rotateTo(this.sim.angle + delta / steps);
      this.drag.theta = theta; this.drag.x = p.x;
      this.updateUI(); this.paint();
    });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.canvas, event, (e) => {
      if (this.drag?.id === e.pointerId) this.drag = null;
    });
    this.on(this.canvas, 'keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        const direction = ['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 1;
        this.sim.rotateTo(this.sim.angle + direction * (e.shiftKey ? 15 : 5) * Math.PI / 180);
        this.updateUI(); this.paint();
      } else if (e.key === 'Home') {
        e.preventDefault(); e.stopPropagation(); this.sim.rotateTo(0); this.updateUI(); this.paint();
      }
    });

    let dialPointer = null;
    const pointField = (e) => {
      const b = this.dial.getBoundingClientRect();
      const x = e.clientX - b.left - b.width / 2, y = e.clientY - b.top - b.height / 2;
      if (Math.hypot(x, y) < 9) return;
      this.sim.fieldAngle = Math.atan2(x, -y);
      this.updateUI(); this.paint();
    };
    this.on(this.dial, 'pointerdown', (e) => {
      if (e.button !== 0 || dialPointer !== null) return;
      dialPointer = e.pointerId; this.dial.setPointerCapture(e.pointerId);
      this.dial.focus({ preventScroll: true }); pointField(e); e.preventDefault();
    });
    this.on(this.dial, 'pointermove', (e) => { if (dialPointer === e.pointerId) pointField(e); });
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) this.on(this.dial, event, (e) => { if (dialPointer === e.pointerId) dialPointer = null; });
    this.on(this.dial, 'keydown', (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) {
        e.preventDefault(); e.stopPropagation();
        if (e.key === 'Home') this.sim.fieldAngle = 0;
        else if (e.key === 'End') this.sim.fieldAngle = Math.PI;
        else this.sim.fieldAngle = wrap(this.sim.fieldAngle + (['ArrowLeft', 'ArrowDown'].includes(e.key) ? -1 : 1) * (e.shiftKey ? 15 : 5) * Math.PI / 180);
        this.updateUI(); this.paint();
      }
    });
    this.on(document, 'keydown', (e) => {
      if (!this.active || e.altKey || e.metaKey || e.ctrlKey || e.repeat || e.target.closest('input, button, a, dialog')) return;
      if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
      if (e.key.toLowerCase() === 'r') { e.preventDefault(); this.reverse(); }
      if (e.key === 'Home') { e.preventDefault(); this.reset(); }
    });
    this.on(document, 'visibilitychange', this.onVisibility);
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) { this.renderer.resize(width, height); this.paint(); }
    });
    this.resizeObserver.observe(this.canvas);
    this.updateUI(); this.schedule();
  }

  updateUI() {
    const $ = (id) => this.root.querySelector('#' + id);
    const degrees = Math.round(this.sim.angle * 180 / Math.PI);
    const direction = (Math.round(this.sim.fieldAngle * 180 / Math.PI) % 360 + 360) % 360;
    $('angle-value').textContent = (degrees < 0 ? '−' + Math.abs(degrees) : degrees) + '°';
    this.canvas.setAttribute('aria-valuenow', degrees);
    this.canvas.setAttribute('aria-valuetext', `${degrees} 度`);
    this.dial.setAttribute('aria-valuenow', direction);
    const fieldName = direction < 23 || direction > 337 ? '向上' : direction < 68 ? '右上' : direction < 113 ? '向右' : direction < 158 ? '右下' : direction < 203 ? '向下' : direction < 248 ? '左下' : direction < 293 ? '向左' : '左上';
    this.dial.setAttribute('aria-valuetext', `${fieldName}，${direction} 度`);
    $('dial-needle').style.transform = `rotate(${direction}deg)`;
    $('gravity-value').innerHTML = this.sim.strength.toFixed(2) + '<span> g</span>';
    this.strength.value = this.sim.strength;
    this.strength.style.setProperty('--fill', this.sim.strength * 50 + '%');
    $('float').setAttribute('aria-pressed', this.sim.strength === 0);
    const pause = $('pause');
    pause.setAttribute('aria-pressed', this.paused);
    pause.setAttribute('aria-label', this.paused ? '播放' : '暫停');
    pause.querySelector('use').setAttribute('href', this.paused ? '#i-play' : '#i-pause');
    const flowingUp = Math.cos(this.sim.fieldAngle) > .25;
    $('flow-state').textContent = this.paused ? '已暫停' : this.sim.strength === 0 ? '失重中' : flowingUp ? '反向重力' : Math.cos(this.sim.fieldAngle) < -.25 ? '正向重力' : '側向重力';
    $('live-dot').classList.toggle('paused', this.paused);
  }

  togglePause() { this.paused = !this.paused; this.updateUI(); this.schedule(); }
  reverse() { this.sim.fieldAngle = wrap(this.sim.fieldAngle + Math.PI); this.updateUI(); this.paint(); this.announce('重力已反轉'); }
  reset() {
    this.sim.reset(); this.lastStrength = 1; this.drag = null;
    this.accumulator = 0; this.last = 0;
    this.root.querySelector('#gesture-hint').style.opacity = '1';
    this.updateUI(); this.paint(); this.announce('沙漏已重置');
  }
  announce(text) {
    const status = this.root.querySelector('#status');
    clearTimeout(this.statusTimer); status.textContent = text;
    this.statusTimer = setTimeout(() => { status.textContent = ''; }, 1800);
  }
  paint() { if (this.renderer.width) this.renderer.render(); }
  setActive(active) { this.active = active; if (!active) this.drag = null; this.schedule(); }
  schedule() {
    cancelAnimationFrame(this.frame); this.frame = 0; this.last = 0; this.accumulator = 0;
    if (this.active && !this.paused && !document.hidden) this.frame = requestAnimationFrame(this.tick);
  }
  tick(now) {
    if (!this.active || this.paused || document.hidden) return;
    if (this.last) this.accumulator += Math.min((now - this.last) / 1000, .05);
    this.last = now;
    let steps = 0;
    while (this.accumulator >= STEP && steps < 6) { this.sim.step(); this.accumulator -= STEP; steps++; }
    this.paint();
    this.frame = requestAnimationFrame(this.tick);
  }
  dispose() {
    this.active = false; cancelAnimationFrame(this.frame); this.frame = 0; clearTimeout(this.statusTimer);
    this.resizeObserver?.disconnect(); this.abort.abort(); this.drag = null;
  }
}
