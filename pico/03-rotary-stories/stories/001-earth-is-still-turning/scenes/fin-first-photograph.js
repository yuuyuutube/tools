// 終章　第一張照片 — the same handwheel as chapter one, then the mast camera.
//
// Window: Handwheel (same model and sounds as C-2), daylight instead of starlight.
// Camera: three steps on one knob — bearing (endless, CyclicDial), focal length (BoundedDial,
// logarithmic 24–200 mm), focus (BoundedDial over 1/distance). Short press = next step; at the
// focus step it releases the shutter. Long press = one step back.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { Handwheel, CyclicDial, BoundedDial } from '../../../src/interactions/models.js';
import { attachKnobSurface } from '../../../src/interactions/knob-surface.js';
import { shipSound } from '../audio/ship-sounds.js';
import { drawCameraView } from '../art/planet.js';
import { handwheelSVG, plateHTML } from '../art/ship-parts.js';
import { ROLE } from '../narrative/text.js';
import { MenuOverlay } from '../../../src/engine/ui.js';

const MM_MIN = 24;
const MM_MAX = 200;
const mmOf = (v) => Math.round(MM_MIN * Math.pow(MM_MAX / MM_MIN, v));
// Focus dial v ∈ [0,1]: 0 = 2 m, 1 = ∞ (linear in 1/distance, as lens focus scales are).
const focusDist = (v) => (v >= 0.999 ? Infinity : 1 / (0.5 * (1 - v)));
const focusLabel = (v) => {
  const d = focusDist(v);
  if (!Number.isFinite(d)) return '∞';
  return d < 10 ? `${d.toFixed(1)} m` : `${Math.round(d)} m`;
};

export default class FirstPhotograph extends Scene {
  async enter() {
    this.T = this.ctx.text.fin;
    this.mode = 'window';
    this.wheel = new Handwheel({ turns: 4, toothDeg: 15, stiffness: 9, damping: 6.2, position: this.state.open || 0 });
    this.az = new CyclicDial({ angle: this.state.az ?? 205, ratio: 0.25, detentDeg: 15, accel: (s) => (s > 900 ? 4 : s > 450 ? 2 : 1) });
    this.zoom = new BoundedDial({ value: this.state.zoom ?? 0.18, degPerRange: 540, tickDeg: 9 });
    this.focus = new BoundedDial({ value: this.state.focus ?? 0.6, degPerRange: 720, tickDeg: 4 });
    this.step = 0;
    this.time = 0;
    this.started = performance.now();
    this.toothFlip = 0;
    this.motor = 0;

    const root = this.root;
    root.classList.add('station');
    this.canvas = h('canvas', { class: 'st-canvas', 'aria-hidden': 'true' });
    this.wheelEl = h('div', { class: 'handwheel', role: 'slider', 'aria-label': '遮光板手輪', html: handwheelSVG() });
    this.wheelRot = this.wheelEl.querySelector('.hw-rotor');
    this.pawl = this.wheelEl.querySelector('.hw-pawl');
    this.plate = h('div', { class: 'ship-plate new' }, h('div', { html: plateHTML(this.T.plate) }), h('div', { class: 'washi' }, this.T.tape));
    this.standby = h('pre', { class: 'st-standby' }, this.T.standby);
    // Camera console.
    this.vf = h('canvas', { class: 'vf-canvas', 'aria-label': '取景畫面' });
    this.vfRead = h('div', { class: 'vf-read' });
    this.vfSteps = h('div', { class: 'vf-steps' }, ...this.T.steps.map((s) => h('span', {}, s)));
    this.vfFlash = h('div', { class: 'vf-flash' });
    this.photo = h('canvas', { class: 'ph-canvas' });
    this.record = h('pre', { class: 'ph-record' });
    this.after = h('div', { class: 'ph-after' });
    this.console = h('div', { class: 'st-console' }, h('div', { class: 'vf' }, this.vf, h('div', { class: 'vf-frame' }), this.vfRead, this.vfFlash), this.vfSteps);
    this.result = h('div', { class: 'st-result' }, this.photo, h('div', { class: 'ph-side' }, this.record, this.after));
    root.append(this.canvas, this.plate, this.wheelEl, this.standby, this.console, this.result);
    this.d.add(attachKnobSurface(this.wheelEl, this.ctx.knob, { pressRadius: 0.22 }));
    this.d.add(attachKnobSurface(this.console, this.ctx.knob, { hub: this.vf, pressRadius: 0 , press: false }));
    this.d.on(this.standby, 'click', () => this.press('short'));
    this.layout();
    this.startAudio();
    this.setMode('window');
  }

  startAudio() {
    const core = this.ctx.core;
    if (!core.ctx) {
      const off = core.onState((ok) => {
        if (ok && !this.vent) {
          off();
          this.startAudio();
        }
      });
      this.d.add(off);
      return;
    }
    this.vent = this.audio.loop(shipSound(core, 'ventStation'), { bus: 'room', gain: 0.32, fadeIn: 2.5 });
    this.wind = this.audio.loop(shipSound(core, 'windOutside'), { bus: 'room', gain: 0.12, fadeIn: 3 });
    this.windOpen = this.audio.loop(shipSound(core, 'windOutsideOpen'), { bus: 'room', gain: 0, fadeIn: 0 });
    this.rumble = this.audio.loop(shipSound(core, 'shutterRumble'), { bus: 'device', gain: 0, fadeIn: 0 });
    this.motorV = this.audio.loop(shipSound(core, 'panMotor'), { bus: 'device', gain: 0, fadeIn: 0 });
    this.caption(this.T.cap.vent, 3000);
    this.caption(this.T.cap.wind, 3000);
  }

  setMode(mode) {
    this.mode = mode;
    this.root.dataset.mode = mode;
    if (mode === 'window') this.hint(null);
    if (mode === 'camera') this.updateCameraUI();
  }

  layout() {
    fitCanvas(this.canvas);
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const portrait = H > W * 1.05;
    let win;
    if (portrait) {
      const w = W * 0.84;
      win = { x: (W - w) / 2, y: H * 0.1, w, h: w * 0.8 };
    } else {
      const hh = Math.min(H * 0.6, W * 0.42);
      const w = hh * 1.35;
      win = { x: W * 0.45 - w / 2, y: H * 0.4 - hh / 2, w, h: hh };
    }
    this.win = win;
    const wd = portrait ? Math.min(W * 0.46, H * 0.26) : clamp(H * 0.25, 140, 260);
    const wx = portrait ? W * 0.3 : Math.min(W - wd * 0.6, win.x + win.w + wd * 0.72);
    const wy = portrait ? win.y + win.h + wd * 0.75 : win.y + win.h - wd * 0.1;
    Object.assign(this.wheelEl.style, { width: `${wd}px`, height: `${wd}px`, left: `${wx - wd / 2}px`, top: `${wy - wd / 2}px` });
    Object.assign(this.plate.style, portrait ? { left: `${W * 0.56}px`, top: `${win.y + win.h + 16}px`, width: `${W * 0.4}px` } : { left: `${wx - 110}px`, top: `${win.y + win.h * 0.06}px`, width: '220px' });
    Object.assign(this.standby.style, portrait ? { left: `${W * 0.56}px`, top: `${win.y + win.h + 140}px` } : { left: `${Math.max(16, win.x - 250)}px`, top: `${win.y + win.h * 0.55}px` });
    this.view = null;
  }

  resize() {
    this.layout();
  }

  // ---- input ----------------------------------------------------------------------------------

  rotate(deg, info) {
    const core = this.ctx.core;
    if (this.mode === 'window') {
      for (const e of this.wheel.turn(deg)) {
        if (e.type === 'tooth') {
          const up = e.dir > 0;
          this.audio.play(shipSound(core, up ? `ratchet${e.index % 3}` : `ratchetSoft${e.index % 2}`), { gain: up ? 0.55 : 0.4, rate: 0.95 + Math.random() * 0.1, pan: 0.35 });
          this.toothFlip = 1;
          this.caption(this.T.cap.ratchet);
        } else if (e.type === 'limit') this.audio.play(shipSound(core, e.end === 'open' ? 'endOpen' : 'endClosed'), { gain: 0.4 + e.force * 0.5 });
      }
      return;
    }
    if (this.mode !== 'camera') {
      if (this.mode === 'done' && this.menu) this.menu.rotate(deg);
      return;
    }
    let events = [];
    if (this.step === 0) {
      events = this.az.turn(deg, info);
      for (const e of events) if (e.type === 'detent') this.audio.play(shipSound(core, 'panDetent'), { gain: 0.25 });
      this.caption(this.T.cap.pan, 1200);
    } else if (this.step === 1) {
      events = this.zoom.turn(deg, info);
      this.caption(this.T.cap.zoom, 1200);
    } else {
      events = this.focus.turn(deg, info);
      this.caption(this.T.cap.focus, 1200);
    }
    for (const e of events) if (e.type === 'limit' && e.fresh) this.audio.play(shipSound(core, 'focusTick'), { gain: 0.4, rate: 0.5 });
    this.motor = Math.min(1, this.motor + Math.abs(deg) / 60);
    this.viewDirty = true;
    this.updateCameraUI();
  }

  press(kind) {
    const core = this.ctx.core;
    if (this.mode === 'window') {
      if (kind !== 'short') return false;
      this.setMode('camera');
      this.audio.play(shipSound(core, 'relay'), { gain: 0.4 });
      return true;
    }
    if (this.mode === 'camera') {
      if (kind === 'long') {
        if (this.step === 0) this.setMode('window');
        else {
          this.step -= 1;
          this.updateCameraUI();
        }
        return true;
      }
      if (this.step < 2) {
        this.step += 1;
        this.audio.play(shipSound(core, 'panDetent'), { gain: 0.3, rate: 1.4 });
        this.updateCameraUI();
        return true;
      }
      this.takePhoto();
      return true;
    }
    if (this.mode === 'review') {
      if (kind === 'long') {
        this.result.classList.remove('on');
        this.setMode('camera');
        return true;
      }
      this.file();
      return true;
    }
    if (this.mode === 'filed') {
      this.showAfter();
      return true;
    }
    if (this.mode === 'done') {
      if (kind === 'long') {
        this.ctx.toLibrary();
        return true;
      }
      this.menu.press('short');
      return true;
    }
    return true;
  }

  updateCameraUI() {
    const s = this.step;
    [...this.vfSteps.children].forEach((el, i) => el.classList.toggle('on', i === s));
    this.vfRead.textContent = this.T.readout(Math.round(this.az.angle) % 360, mmOf(this.zoom.value), focusLabel(this.focus.value));
    this.hint(this.T.hints[s]);
  }

  params() {
    const el = Math.round((performance.now() - this.started) / 60000);
    const mins = 12 + el;
    const time = `${10 + Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
    const f = focusDist(this.focus.value);
    return { az: Math.round(this.az.angle) % 360, mm: mmOf(this.zoom.value), focus: Number.isFinite(f) ? Math.round(f * 10) / 10 : null, time };
  }

  takePhoto() {
    const core = this.ctx.core;
    this.audio.play(shipSound(core, 'shutter'), { gain: 0.8 });
    this.caption(this.T.cap.shutter);
    this.vfFlash.classList.remove('on');
    void this.vfFlash.offsetWidth;
    this.vfFlash.classList.add('on');
    this.shot = this.params();
    this.mode = 'shutter';
    this.hint(null);
    setTimeout(() => {
      if (this.d.done) return;
      const c = this.photo;
      const W = 1500;
      c.width = W;
      c.height = W / 1.5;
      drawCameraView(c.getContext('2d'), W, W / 1.5, { az: this.shot.az, mm: this.shot.mm, focus: this.shot.focus ?? Infinity });
      this.record.textContent = `${this.T.record({ name: this.ctx.settings.name || ROLE, ...this.shot })}\n\n${this.T.fileOrRetake}`;
      this.result.classList.add('on');
      this.setMode('review');
      this.root.dataset.mode = 'review';
    }, 1000);
  }

  async file() {
    const core = this.ctx.core;
    this.audio.play(shipSound(core, 'stamp'), { gain: 0.5 });
    this.record.textContent = `${this.T.record({ name: this.ctx.settings.name || ROLE, ...this.shot })}\n\n${this.T.sent}`;
    this.mode = 'filed';
    this.root.dataset.mode = 'filed';
    this.ctx.finish({ keepsake: this.shot });
    this.ctx.player.m.keepsake.store(this.shot).catch(() => {});
    this.afterTimer = setTimeout(() => !this.d.done && this.showAfter(), 10000);
    this.d.add(() => clearTimeout(this.afterTimer));
  }

  showAfter() {
    if (this.mode === 'done') return;
    clearTimeout(this.afterTimer);
    this.mode = 'done';
    const ks = this.ctx.player.m.keepsake;
    const settings = this.ctx.settings;
    const items = [
      { label: this.T.after[0], action: () => ks.download(this.shot, settings, 'photo') },
      { label: this.T.after[1], action: () => ks.download(this.shot, settings, 'card') },
      { label: this.T.after[2], action: () => this.ctx.toLibrary() },
    ];
    this.menu = new MenuOverlay({ items });
    this.after.innerHTML = '';
    this.after.append(this.menu.list);
    this.after.classList.add('on');
  }

  saveState() {
    return { open: this.wheel.target, az: this.az.angle, zoom: this.zoom.value, focus: this.focus.value };
  }

  // ---- frame ----------------------------------------------------------------------------------

  frame(dt) {
    this.time += dt;
    this.wheel.update(dt);
    this.wheelRot.setAttribute('transform', `rotate(${this.wheel.wheelAngle.toFixed(2)} 100 100)`);
    this.toothFlip = Math.max(0, this.toothFlip - dt * 14);
    this.pawl.setAttribute('transform', `rotate(${(-this.toothFlip * 9).toFixed(2)} 148 46)`);
    const sp = this.wheel.loadSpeed;
    if (this.rumble) this.rumble.setGain(Math.min(0.55, sp * 3.2), 0.06);
    if (sp > 0.02) this.caption(this.T.cap.rising, 1200);
    if (this.windOpen) this.windOpen.setGain(this.wheel.open * 0.35, 0.3);
    this.motor = Math.max(0, this.motor - dt * 3);
    if (this.motorV) {
      this.motorV.setGain(this.motor * 0.22, 0.05);
      this.motorV.setRate([1, 1.6, 2.4][this.step] || 1, 0.05);
    }
    this.drawRoom();
    if (this.mode === 'camera' && (this.viewDirty || !this.vfDrawn)) this.drawViewfinder();
  }

  drawViewfinder() {
    this.viewDirty = false;
    this.vfDrawn = true;
    const c = this.vf;
    fitCanvas(c, 1.5);
    const p = this.params();
    drawCameraView(c.getContext('2d'), c.width, c.height, { az: p.az, mm: p.mm, focus: p.focus ?? Infinity }, { grain: false });
  }

  drawRoom() {
    const c = this.canvas;
    if (fitCanvas(c)) this.layout();
    const g = c.getContext('2d');
    const dpr = c.width / c.clientWidth;
    const W = c.clientWidth;
    const H = c.clientHeight;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const open = this.wheel.open;
    // New, unmarked walls: pale grey panels; the daylight floods in as the shutter rises.
    const day = open;
    const wall = g.createLinearGradient(0, 0, 0, H);
    wall.addColorStop(0, `rgb(${92 + day * 90},${96 + day * 90},${98 + day * 86})`);
    wall.addColorStop(1, `rgb(${52 + day * 60},${54 + day * 60},${56 + day * 56})`);
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.12)';
    for (let i = 1; i < 5; i++) {
      g.beginPath();
      g.moveTo((W * i) / 5, 0);
      g.lineTo((W * i) / 5, H * 0.88);
      g.stroke();
    }
    // Protective film still on a panel edge.
    g.fillStyle = 'rgba(180,210,230,0.18)';
    g.fillRect(W * 0.2 - 6, H * 0.1, 12, H * 0.6);
    g.fillStyle = `rgba(30,32,34,${0.85 - day * 0.4})`;
    g.fillRect(0, H * 0.88, W, H * 0.12);
    const win = this.win;
    const r = win.w * 0.07;
    // The view: rendered once per layout, the window does not move.
    if (!this.view) {
      const vc = document.createElement('canvas');
      vc.width = Math.round(win.w * dpr);
      vc.height = Math.round(win.h * dpr);
      drawCameraView(vc.getContext('2d'), vc.width, vc.height, { az: 205, mm: 18, focus: Infinity }, { grain: false });
      this.view = vc;
    }
    g.save();
    rr(g, win.x, win.y, win.w, win.h, r);
    g.clip();
    g.drawImage(this.view, win.x, win.y, win.w, win.h);
    const slats = 12;
    const sh = win.h / slats;
    const lift = open * win.h;
    for (let i = 0; i < slats; i++) {
      const y = win.y + i * sh - lift;
      if (y + sh < win.y) continue;
      const grad = g.createLinearGradient(0, y, 0, y + sh);
      grad.addColorStop(0, '#5a5d58');
      grad.addColorStop(0.5, '#464944');
      grad.addColorStop(1, '#353733');
      g.fillStyle = grad;
      g.fillRect(win.x, y, win.w, sh);
      g.fillStyle = 'rgba(255,255,255,0.1)';
      g.fillRect(win.x, y, win.w, 1);
    }
    if (open > 0.001 && open < 0.999) {
      const yb = win.y + win.h - lift;
      g.fillStyle = 'rgba(255,252,240,0.35)';
      g.fillRect(win.x, yb - 3, win.w, 3);
    }
    g.restore();
    g.lineWidth = win.w * 0.04;
    g.strokeStyle = '#6c6f6a';
    rr(g, win.x - g.lineWidth / 2, win.y - g.lineWidth / 2, win.w + g.lineWidth, win.h + g.lineWidth, r + g.lineWidth / 2);
    g.stroke();
    g.fillStyle = '#5d605b';
    g.fillRect(win.x - win.w * 0.05, win.y - win.w * 0.11, win.w * 1.1, win.w * 0.06);
    // Daylight on the floor.
    if (open > 0.01) {
      const floorY = H * 0.88;
      const grd = g.createLinearGradient(0, floorY, 0, H);
      grd.addColorStop(0, `rgba(255,250,236,${0.25 * open})`);
      grd.addColorStop(1, `rgba(255,250,236,${0.4 * open})`);
      g.fillStyle = grd;
      g.beginPath();
      g.moveTo(win.x + win.w * 0.05, floorY);
      g.lineTo(win.x + win.w * 0.95, floorY);
      g.lineTo(win.x + win.w * 1.15, H);
      g.lineTo(win.x - win.w * 0.15, H);
      g.fill();
    }
  }
}

function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
