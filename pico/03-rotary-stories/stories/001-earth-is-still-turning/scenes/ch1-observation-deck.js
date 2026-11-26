// 第一章　觀測艙 — open an armoured shutter by hand and see the sky for the first time.
//
// Rendering: one Canvas for the room light, the window and the sky; DOM/SVG for the handwheel
// and the paper on the walls (crisp text, tap to read closer).
// Interaction: Handwheel model — 4 turns, 24-tooth ratchet, a heavy shutter that lags the hand.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { Handwheel } from '../../../src/interactions/models.js';
import { attachKnobSurface } from '../../../src/interactions/knob-surface.js';
import { shipSound } from '../audio/ship-sounds.js';
import { makeStarLayer, drawBrightStar, AXIS_PERIOD } from '../art/sky.js';
import { handwheelSVG, plateHTML, logHTML } from '../art/ship-parts.js';

export default class ObservationDeck extends Scene {
  async enter() {
    const T = this.ctx.text.ch1;
    this.T = T;
    this.wheel = new Handwheel({ turns: 4, toothDeg: 15, stiffness: 9, damping: 6.2, position: this.state.open || 0 });
    this.hasOpened = Boolean(this.state.hasOpened);
    this.idle = 0;
    this.time = 0;
    this.toothFlip = 0;

    const root = this.root;
    root.classList.add('deck');
    this.canvas = h('canvas', { class: 'deck-canvas', 'aria-hidden': 'true' });
    this.wheelEl = h('div', { class: 'handwheel', role: 'slider', 'aria-label': '遮光板手輪', 'aria-valuemin': '0', 'aria-valuemax': '100', html: handwheelSVG() });
    this.wheelRot = this.wheelEl.querySelector('.hw-rotor');
    this.pawl = this.wheelEl.querySelector('.hw-pawl');
    this.plate = h('div', { class: 'ship-plate', html: plateHTML(T.plate) });
    this.notice = h('div', { class: 'ship-notice paper', tabindex: '0' }, h('pre', {}, T.notice), h('i', { class: 'tape t1' }), h('i', { class: 'tape t2' }), h('i', { class: 'tape t3' }));
    this.log = h('div', { class: 'ship-log', tabindex: '0', html: logHTML(T.logTitle, T.logHead, T.logRows) });
    root.append(this.canvas, this.notice, this.log, this.plate, this.wheelEl);
    const papers = [this.notice, this.log, this.plate];
    for (const el of papers) this.d.on(el, 'click', () => papers.forEach((p) => p.classList.toggle('zoom', p === el && !el.classList.contains('zoom'))));
    this.d.add(attachKnobSurface(this.wheelEl, this.ctx.knob, { pressRadius: 0.22 }));

    this.layout();
    this.startAudio();
    this.caption(T.cap.vent, 3000);
  }

  startAudio() {
    const core = this.ctx.core;
    if (!core.ctx) {
      // Audio is locked until the first gesture; try again then.
      const off = core.onState((ready) => {
        if (ready && !this.vent) {
          off();
          this.startAudio();
        }
      });
      this.d.add(off);
      return;
    }
    this.vent = this.audio.loop(shipSound(core, 'ventShip'), { bus: 'room', gain: 0.55, fadeIn: 2.5 });
    this.rumble = this.audio.loop(shipSound(core, 'shutterRumble'), { bus: 'device', gain: 0, fadeIn: 0 });
  }

  layout() {
    fitCanvas(this.canvas);
    const W = this.canvas.clientWidth;
    const H = this.canvas.clientHeight;
    const portrait = H > W * 1.05;
    this.portrait = portrait;
    let win;
    if (portrait) {
      const w = W * 0.86;
      win = { x: (W - w) / 2, y: H * 0.08, w, h: w * 0.78 };
    } else {
      const hgt = Math.min(H * 0.6, W * 0.4);
      const w = hgt * 1.12;
      win = { x: W * 0.47 - w / 2, y: H * 0.42 - hgt / 2, w, h: hgt };
    }
    this.win = win;
    if (portrait) {
      // Papers become a row of small sheets under the window (tap to read); the wheel sits low.
      const wd = Math.min(W * 0.56, H * 0.3);
      const bottom = document.body.classList.contains('with-dock') ? 96 : 24;
      const wx = W / 2;
      const wy = H - bottom - wd / 2;
      Object.assign(this.wheelEl.style, { width: `${wd}px`, height: `${wd}px`, left: `${wx - wd / 2}px`, top: `${wy - wd / 2}px` });
      const row = win.y + win.h + 26;
      const col = (W - 32) / 3;
      Object.assign(this.plate.style, { left: '16px', right: 'auto', top: `${row}px`, width: `${col * 2}px` });
      Object.assign(this.notice.style, { left: `${16 + col}px`, right: 'auto', top: `${row}px`, width: `${col * 2}px` });
      Object.assign(this.log.style, { left: `${16 + col * 2}px`, top: `${row}px`, width: `${col * 2}px` });
      this.root.classList.add('portrait');
    } else {
      const wd = clamp(H * 0.27, 150, 280);
      const wx = Math.min(W - wd * 0.62, win.x + win.w + wd * 0.75);
      const wy = win.y + win.h - wd * 0.15;
      Object.assign(this.wheelEl.style, { width: `${wd}px`, height: `${wd}px`, left: `${wx - wd / 2}px`, top: `${wy - wd / 2}px` });
      this.root.classList.remove('portrait');
      Object.assign(this.plate.style, { left: `${wx - 110}px`, top: `${win.y + win.h * 0.06}px`, width: '220px' });
      const nw = clamp(win.x - 60, 170, 300);
      Object.assign(this.notice.style, { left: `${Math.max(16, win.x - nw - 34)}px`, right: 'auto', top: `${win.y + 6}px`, width: `${nw}px` });
      Object.assign(this.log.style, { left: `${Math.max(16, win.x - nw - 40)}px`, top: `${win.y + win.h * 0.58}px`, width: `${nw + 10}px` });
    }
    const scale = this.win.w / 64; // px per degree of sky
    if (!this.stars || Math.abs(this.stars.scale - scale) > 0.5) this.stars = makeStarLayer({ scale, radiusDeg: 80, seed: 6301 });
  }

  resize() {
    this.layout();
  }

  rotate(deg) {
    const events = this.wheel.turn(deg);
    this.idle = 0;
    const core = this.ctx.core;
    for (const e of events) {
      if (e.type === 'tooth') {
        const up = e.dir > 0;
        const name = up ? `ratchet${e.index % 3}` : `ratchetSoft${e.index % 2}`;
        this.audio.play(shipSound(core, name), { gain: up ? 0.55 : 0.4, rate: 0.95 + Math.random() * 0.1, pan: 0.35 });
        this.toothFlip = 1;
        this.caption(up ? this.T.cap.ratchet : this.T.cap.lowering);
      } else if (e.type === 'limit') {
        this.audio.play(shipSound(core, e.end === 'open' ? 'endOpen' : 'endClosed'), { gain: 0.4 + e.force * 0.5, pan: 0.2 });
        this.caption(e.end === 'open' ? this.T.cap.top : this.T.cap.closed);
      }
    }
  }

  press(kind) {
    if (kind !== 'short') return false;
    if (this.wheel.target > 0.004) {
      if (this.hasOpened) this.flashHint(this.T.closeFirst);
      return true;
    }
    if (this.hasOpened) this.next();
    return true;
  }

  flashHint(text) {
    this.hint(text);
    clearTimeout(this.flashT);
    this.flashT = setTimeout(() => this.updateHint(true), 3000);
    this.d.add(() => clearTimeout(this.flashT));
  }

  updateHint(force) {
    const ready = this.hasOpened && this.wheel.target <= 0.004 && this.wheel.open < 0.01;
    if (ready !== this.readyShown || force) {
      this.readyShown = ready;
      this.hint(ready ? this.T.leave : null);
    }
  }

  async beforeNext() {
    // Leaving with the shutter open: close it, as the notice asks, before walking out.
    if (this.wheel.target <= 0.004 && this.wheel.open < 0.01) return;
    this.ctx.knob.enabled = false;
    try {
      await new Promise((resolve) => {
        const step = () => {
          if (this.d.done) return resolve();
          if (this.wheel.wheel <= 0) {
            if (this.wheel.open < 0.01) return resolve();
          } else this.rotate(-Math.min(this.wheel.wheel, 45));
          setTimeout(step, 50);
        };
        step();
      });
    } finally {
      this.ctx.knob.enabled = true;
    }
  }

  saveState() {
    return { open: this.wheel.target, hasOpened: this.hasOpened };
  }

  frame(dt) {
    this.time += dt;
    this.idle += dt;
    this.wheel.update(dt);
    const open = this.wheel.open;
    if (open > 0.25 && !this.hasOpened) this.hasOpened = true;
    this.updateHint();

    // Handwheel and pawl.
    this.wheelRot.setAttribute('transform', `rotate(${this.wheel.wheelAngle.toFixed(2)} 100 100)`);
    this.toothFlip = Math.max(0, this.toothFlip - dt * 14);
    this.pawl.setAttribute('transform', `rotate(${(-this.toothFlip * 9).toFixed(2)} 148 46)`);
    this.wheelEl.setAttribute('aria-valuenow', String(Math.round(this.wheel.target * 100)));
    this.wheelEl.classList.toggle('beckon', this.idle > 4 && this.wheel.target < 0.01 && !this.hasOpened);

    // Shutter sound follows the load's speed; the vent never changes.
    const sp = this.wheel.loadSpeed;
    if (this.rumble) this.rumble.setGain(Math.min(0.55, sp * 3.2), 0.06);
    if (this.rumble) this.rumble.setRate(0.85 + Math.min(0.4, sp * 2), 0.1);
    if (sp > 0.02) this.caption(this.wheel.loadV > 0 ? this.T.cap.rising : this.T.cap.lowering, 1200);

    this.draw(open);
  }

  draw(open) {
    const c = this.canvas;
    if (fitCanvas(c)) this.layout();
    const g = c.getContext('2d');
    const dpr = c.width / c.clientWidth;
    const W = c.clientWidth;
    const H = c.clientHeight;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Room light: the amber night lamp dims as the window opens (the deck has a light sensor).
    const amber = 1 - open * 0.75;
    const star = open; // starlight + Alpha Centauri A through the opening
    const root = this.root;
    root.style.setProperty('--lux', (0.38 + amber * 0.35 + star * 0.22).toFixed(3));
    root.style.setProperty('--cool', star.toFixed(3));

    // Wall.
    const wall = g.createRadialGradient(W * 0.2, H * 0.05, 10, W * 0.4, H * 0.4, Math.max(W, H));
    wall.addColorStop(0, `rgba(${92 + amber * 60}, ${80 + amber * 40}, ${58 + amber * 10}, 1)`);
    wall.addColorStop(0.55, `rgba(${40 + amber * 20}, ${42 + amber * 12}, ${38 + star * 8}, 1)`);
    wall.addColorStop(1, '#141513');
    g.fillStyle = wall;
    g.fillRect(0, 0, W, H);
    this.drawPanels(g, W, H, amber, star);

    const win = this.win;
    const r = win.w * 0.09;
    // Sky through the window.
    g.save();
    roundRect(g, win.x, win.y, win.w, win.h, r);
    g.clip();
    g.fillStyle = '#020203';
    g.fillRect(win.x, win.y, win.w, win.h);
    const ang = ((this.time % AXIS_PERIOD) / AXIS_PERIOD) * Math.PI * 2;
    const ax = win.x + win.w * 0.32;
    const ay = win.y + win.h * 0.3;
    g.save();
    g.translate(ax, ay);
    g.rotate(ang);
    g.drawImage(this.stars.canvas, -this.stars.size / 2, -this.stars.size / 2);
    g.restore();
    // α Centauri A and B circle the axis point.
    const sc = this.stars.scale;
    const A = { x: ax + Math.cos(ang + 0.6) * 3 * sc, y: ay + Math.sin(ang + 0.6) * 3 * sc };
    const B = { x: ax + Math.cos(ang + 3.1) * 11 * sc, y: ay + Math.sin(ang + 3.1) * 11 * sc };
    drawBrightStar(g, B, { core: 3, glow: win.w * 0.16, color: [255, 196, 140], power: 0.75 });
    drawBrightStar(g, A, { core: 4.2, glow: win.w * 0.3, color: [255, 246, 226], power: 1 });
    this.A = A;

    // Shutter curtain: twelve armoured slats rolling up into the head housing.
    const slats = 12;
    const sh = win.h / slats;
    const lift = open * win.h;
    for (let i = 0; i < slats; i++) {
      const y = win.y + i * sh - lift;
      if (y + sh < win.y) continue;
      const grad = g.createLinearGradient(0, y, 0, y + sh);
      grad.addColorStop(0, '#3b3d38');
      grad.addColorStop(0.5, '#2c2e2a');
      grad.addColorStop(1, '#1d1e1b');
      g.fillStyle = grad;
      g.fillRect(win.x, y, win.w, sh);
      g.fillStyle = 'rgba(255,255,255,0.07)';
      g.fillRect(win.x, y, win.w, 1);
      g.fillStyle = 'rgba(0,0,0,0.5)';
      g.fillRect(win.x, y + sh - 1.5, win.w, 1.5);
      for (const fx of [0.08, 0.92]) {
        g.fillStyle = 'rgba(0,0,0,0.45)';
        g.beginPath();
        g.arc(win.x + win.w * fx, y + sh / 2, 2.2, 0, Math.PI * 2);
        g.fill();
      }
    }
    // The lowest slat edge catches the light coming in.
    if (open > 0.001 && open < 0.999) {
      const yb = win.y + win.h - lift;
      const edge = g.createLinearGradient(0, yb - 6, 0, yb);
      edge.addColorStop(0, 'rgba(255,248,230,0)');
      edge.addColorStop(1, `rgba(255,248,230,${0.12 + Math.min(0.3, open * 0.6)})`);
      g.fillStyle = edge;
      g.fillRect(win.x, yb - 6, win.w, 6);
    }
    g.restore();

    // Window frame.
    g.save();
    g.lineWidth = win.w * 0.045;
    g.strokeStyle = `rgb(${54 + amber * 18}, ${56 + amber * 12}, ${50 + star * 10})`;
    roundRect(g, win.x - g.lineWidth / 2, win.y - g.lineWidth / 2, win.w + g.lineWidth, win.h + g.lineWidth, r + g.lineWidth / 2);
    g.stroke();
    g.lineWidth = 1;
    g.strokeStyle = 'rgba(255,255,255,0.08)';
    roundRect(g, win.x - win.w * 0.045, win.y - win.w * 0.045, win.w * 1.09, win.h + win.w * 0.09, r + win.w * 0.045);
    g.stroke();
    // Bolts around the frame.
    g.fillStyle = 'rgba(20,20,18,0.8)';
    const bolts = 10;
    for (let i = 0; i < bolts; i++) {
      const t = (i + 0.5) / bolts;
      for (const [bx, by] of [[win.x + win.w * t, win.y - win.w * 0.023], [win.x + win.w * t, win.y + win.h + win.w * 0.023]]) {
        g.beginPath();
        g.arc(bx, by, 2.4, 0, Math.PI * 2);
        g.fill();
      }
    }
    // Head housing the slats roll into.
    g.fillStyle = `rgb(${46 + amber * 12}, ${47 + amber * 8}, 43)`;
    g.fillRect(win.x - win.w * 0.06, win.y - win.w * 0.13, win.w * 1.12, win.w * 0.07);
    g.fillStyle = 'rgba(255,255,255,0.06)';
    g.fillRect(win.x - win.w * 0.06, win.y - win.w * 0.13, win.w * 1.12, 1);
    g.restore();

    // Light on the floor: the opening projected by a point source, split by the frame's shadow.
    if (open > 0.002) {
      const floorY = H * (this.portrait ? 0.97 : 0.88);
      const sway = this.A ? (this.A.x - (win.x + win.w * 0.32)) * 0.6 : 0;
      const cx = win.x + win.w / 2 - sway;
      const near = H - floorY;
      const depth = near * Math.min(1, 0.25 + open);
      const span = win.w * 0.9;
      const a = Math.min(0.2, open * 0.24);
      const glow = g.createLinearGradient(0, floorY, 0, floorY + depth);
      glow.addColorStop(0, `rgba(255,244,222,${a * 0.5})`);
      glow.addColorStop(1, `rgba(255,244,222,${a})`);
      g.fillStyle = glow;
      g.beginPath();
      g.moveTo(cx - span * 0.42, floorY);
      g.lineTo(cx + span * 0.42, floorY);
      g.lineTo(cx + span * 0.58, floorY + depth);
      g.lineTo(cx - span * 0.58, floorY + depth);
      g.closePath();
      g.fill();
    }
    // Night lamp in the corner.
    const lamp = g.createRadialGradient(W * 0.06, H * 0.04, 2, W * 0.06, H * 0.04, H * 0.5);
    lamp.addColorStop(0, `rgba(255,186,110,${0.55 * amber})`);
    lamp.addColorStop(1, 'rgba(255,186,110,0)');
    g.fillStyle = lamp;
    g.fillRect(0, 0, W, H);
    // A cool wash when the sky is in the room.
    g.fillStyle = `rgba(200,214,235,${star * 0.05})`;
    g.fillRect(0, 0, W, H);
  }

  drawPanels(g, W, H, amber) {
    // Painted wall panels: seams, worn edges, a non-slip floor strip.
    g.save();
    g.strokeStyle = 'rgba(0,0,0,0.35)';
    g.lineWidth = 1.5;
    const cols = this.portrait ? 3 : 5;
    for (let i = 1; i < cols; i++) {
      const x = (W * i) / cols;
      g.beginPath();
      g.moveTo(x, 0);
      g.lineTo(x, H * 0.88);
      g.stroke();
      g.strokeStyle = 'rgba(255,255,255,0.05)';
      g.beginPath();
      g.moveTo(x + 1.5, 0);
      g.lineTo(x + 1.5, H * 0.88);
      g.stroke();
      g.strokeStyle = 'rgba(0,0,0,0.35)';
    }
    g.fillStyle = `rgba(${20 + amber * 10},${20 + amber * 8},18,0.9)`;
    g.fillRect(0, H * 0.88, W, H * 0.12);
    g.fillStyle = 'rgba(255,255,255,0.04)';
    for (let x = 0; x < W; x += 14) g.fillRect(x, H * 0.885, 7, 2);
    g.fillStyle = 'rgba(125,119,106,0.25)';
    g.fillRect(0, H * 0.878, W, 2);
    g.restore();
  }
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
