// 第四章　植物培育室 — a living leaf under a reflected-light microscope.
//
// One knob, two jobs kept apart: turning is FOCUS (fine, and finer at higher power);
// a short press turns the objective turret (5× → 20× → 50×). Magnification never changes
// by turning, focus never changes by pressing. Holding focus steady on the right plane for
// two seconds captures the reference image for that objective.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { BoundedDial } from '../../../src/interactions/models.js';
import { attachKnobSurface } from '../../../src/interactions/knob-surface.js';
import { shipSound } from '../audio/ship-sounds.js';
import { OBJECTIVES, drawMicro, sharpness } from '../art/micro.js';
import { ROLE } from '../narrative/text.js';

export default class LivingArchive extends Scene {
  async enter() {
    this.T = this.ctx.text.ch4;
    this.obj = this.state.obj || 0;
    this.captured = { ...(this.state.captured || {}) };
    this.views = [];
    this.focus = new BoundedDial({ value: this.state.focus ?? 0.15, degPerRange: OBJECTIVES[this.obj].degPerRange, tickDeg: 3.6 });
    this.steady = 0;
    this.knobAngle = 0;
    this.switching = 0;

    const root = this.root;
    root.classList.add('living');
    this.view = h('canvas', { class: 'mc-view', 'aria-label': '顯微影像' });
    this.mag = h('div', { class: 'mc-mag' });
    this.caps = h('div', { class: 'mc-caps' });
    this.flash = h('div', { class: 'mc-flash' });
    this.knob = h('div', { class: 'mc-knob', role: 'slider', 'aria-label': '微調對焦', html: focusKnobSVG() });
    this.knobRot = this.knob.querySelector('.fk-rotor');
    this.turret = h('div', { class: 'mc-turret' }, ...OBJECTIVES.map((o) => h('span', {}, o.mag)));
    this.recordEl = h('pre', { class: 'mc-record' });
    const scope = h('div', { class: 'mc-scope' }, h('div', { class: 'mc-port' }, this.view, this.flash, this.mag, this.caps), h('div', { class: 'mc-controls' }, this.turret, this.knob));
    const plant = h('div', { class: 'gh-plant', html: plantSVG() });
    const tag = h('pre', { class: 'gh-tag', tabindex: '0' }, this.T.tag);
    const log = h('div', { class: 'gh-log', tabindex: '0' }, h('i', { class: 'clip' }), h('pre', {}, this.T.log));
    root.append(h('div', { class: 'gh-lights' }), h('div', { class: 'gh-left' }, plant, tag, log), h('div', { class: 'gh-right' }, scope, this.recordEl));
    const papers = [tag, log, this.recordEl];
    for (const el of papers) this.d.on(el, 'click', () => papers.forEach((p) => p.classList.toggle('zoom', p === el && !el.classList.contains('zoom'))));
    this.d.add(attachKnobSurface(this.knob, this.ctx.knob, { pressRadius: 0.3 }));

    this.refresh();
    this.prepareView(this.obj);
    this.startAudio();
    this.hint(this.T.hint);
  }

  startAudio() {
    const core = this.ctx.core;
    if (!core.ctx) {
      const off = core.onState((ok) => {
        if (ok && !this.room) {
          off();
          this.startAudio();
        }
      });
      this.d.add(off);
      return;
    }
    this.room = this.audio.loop(shipSound(core, 'greenhouseVent'), { bus: 'room', gain: 0.3, fadeIn: 2 });
    this.pump = this.audio.loop(shipSound(core, 'pump'), { bus: 'room', gain: 0.32, fadeIn: 3, pan: -0.4 });
    this.caption(this.T.cap.vent, 3000);
    this.caption(this.T.cap.pump, 3000);
  }

  prepareView(i) {
    if (this.views[i]) return this.views[i];
    const N = Math.min(900, Math.max(400, Math.round(this.view.getBoundingClientRect().width * Math.min(2, window.devicePixelRatio || 1))));
    this.views[i] = OBJECTIVES[i].make(N);
    return this.views[i];
  }

  refresh() {
    this.mag.textContent = OBJECTIVES[this.obj].mag;
    [...this.turret.children].forEach((s, i) => s.classList.toggle('on', i === this.obj));
    this.caps.innerHTML = '';
    for (const o of OBJECTIVES) if (this.captured[o.mag]) this.caps.append(h('div', {}, this.T.captured(o.mag)));
    const done = OBJECTIVES.every((o) => this.captured[o.mag]);
    if (done) this.caps.append(h('div', { class: 'all' }, this.T.allCaptured));
    const name = this.ctx.settings.name || ROLE;
    this.recordEl.textContent = this.T.record + (done ? `\n${this.T.recordAdd(name)}` : '');
  }

  rotate(deg, info) {
    this.knobAngle += deg;
    for (const e of this.focus.turn(deg, info)) {
      if (e.type === 'tick') this.audio.play(shipSound(this.ctx.core, 'focusTick'), { gain: 0.12, rate: 0.9 + Math.random() * 0.2, pan: 0.4 });
    }
    this.steady = 0;
  }

  press(kind) {
    if (kind !== 'short') return false;
    // Turn the nosepiece to the next objective.
    this.obj = (this.obj + 1) % OBJECTIVES.length;
    this.focus.setSensitivity(OBJECTIVES[this.obj].degPerRange);
    // Parfocal, but not perfectly: the image drifts a little out of focus.
    const view = this.prepareView(this.obj);
    this.focus.value = clamp(view.sharp + (this.obj % 2 ? 0.06 : -0.05) + (this.focus.value - (this.views[(this.obj + 2) % 3] || view).sharp) * 0.3, 0, 1);
    this.switching = 1;
    this.steady = 0;
    this.audio.play(shipSound(this.ctx.core, 'turret'), { gain: 0.55, pan: 0.3 });
    this.caption(this.T.cap.turret);
    this.refresh();
    return true;
  }

  saveState() {
    return { obj: this.obj, captured: this.captured, focus: this.focus.value };
  }

  frame(dt) {
    this.knobRot.setAttribute('transform', `rotate(${this.knobAngle.toFixed(1)} 100 100)`);
    this.switching = Math.max(0, this.switching - dt * 2.2);
    const view = this.prepareView(this.obj);
    const s = sharpness(view, this.focus.value);
    if (s > 0.86 && this.switching === 0) this.steady += dt;
    else this.steady = 0;
    const mag = OBJECTIVES[this.obj].mag;
    if (this.steady > 2 && !this.captured[mag]) {
      this.captured[mag] = true;
      this.ctx.shared.lc212 = { ...this.captured };
      this.ctx.saveShared();
      this.audio.play(shipSound(this.ctx.core, 'capture'), { gain: 0.35 });
      this.caption(this.T.cap.captured);
      this.flash.classList.remove('on');
      void this.flash.offsetWidth;
      this.flash.classList.add('on');
      this.refresh();
    }
    // Occasional drip in the tank.
    if (Math.random() < dt * 0.12) {
      this.audio.play(shipSound(this.ctx.core, 'drip'), { gain: 0.25, rate: 0.8 + Math.random() * 0.5, pan: -0.6 });
      this.caption(this.T.cap.drip, 1500);
    }
    this.draw(view);
  }

  draw(view) {
    const c = this.view;
    fitCanvas(c);
    const g = c.getContext('2d');
    const N = c.width;
    g.fillStyle = '#0b0c0a';
    g.fillRect(0, 0, N, N);
    g.save();
    g.beginPath();
    g.arc(N / 2, N / 2, N / 2, 0, Math.PI * 2);
    g.clip();
    drawMicro(g, N, view, this.focus.value);
    // Optics: vignette, a faint red/cyan fringe toward the edge, the dip while the turret turns.
    const v = g.createRadialGradient(N / 2, N / 2, N * 0.3, N / 2, N / 2, N / 2);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.85, 'rgba(0,0,0,0.25)');
    v.addColorStop(1, 'rgba(0,0,0,0.85)');
    g.fillStyle = v;
    g.fillRect(0, 0, N, N);
    g.strokeStyle = 'rgba(255,60,40,0.08)';
    g.lineWidth = N * 0.01;
    g.beginPath();
    g.arc(N / 2 + N * 0.003, N / 2, N * 0.48, 0, Math.PI * 2);
    g.stroke();
    g.strokeStyle = 'rgba(40,220,255,0.06)';
    g.beginPath();
    g.arc(N / 2 - N * 0.003, N / 2, N * 0.48, 0, Math.PI * 2);
    g.stroke();
    if (this.switching > 0) {
      g.fillStyle = `rgba(0,0,0,${Math.sin(this.switching * Math.PI) * 0.9})`;
      g.fillRect(0, 0, N, N);
    }
    g.restore();
  }
}

function focusKnobSVG() {
  const ticks = Array.from({ length: 100 }, (_, i) => `<line x1="100" y1="${i % 10 ? 10 : 6}" x2="100" y2="18" transform="rotate(${i * 3.6} 100 100)"/>`).join('');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="fk" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#3a3b37"/><stop offset="1" stop-color="#111210"/></radialGradient></defs>
  <circle cx="100" cy="100" r="98" fill="#20211e"/>
  <g class="fk-rotor"><circle cx="100" cy="100" r="92" fill="url(#fk)"/><g stroke="rgba(220,222,210,0.55)" stroke-width="1.3">${ticks}</g>
  <circle cx="100" cy="100" r="60" fill="none" stroke="rgba(255,255,255,0.08)"/><text x="100" y="108" text-anchor="middle" font-family="IBM Plex Mono" font-size="16" fill="rgba(220,222,210,0.6)">FINE</text></g>
  <path d="M100 0 l-5 -9 h10z" fill="#e3c26b" transform="translate(0 4)"/>
</svg>`;
}

function plantSVG() {
  // Avicennia marina in a brackish tank: opposite, elliptic grey-green leaves; pencil roots
  // (pneumatophores) poking up through the sediment; a few green propagules.
  const r = (() => {
    let a = 212;
    return () => ((a = (a * 16807) % 2147483647) / 2147483647);
  })();
  let leaves = '';
  const branches = [
    [150, 250, 92, 120], [150, 250, 210, 110], [150, 210, 120, 70], [150, 210, 186, 60], [150, 170, 150, 40],
  ];
  for (const [x0, y0, x1, y1] of branches) {
    leaves += `<path d="M${x0} ${y0} Q${(x0 + x1) / 2 + 10} ${(y0 + y1) / 2} ${x1} ${y1}" stroke="#6f6252" stroke-width="3.2" fill="none"/>`;
    for (let k = 0; k < 6; k++) {
      const t = 0.3 + k * 0.13;
      const x = x0 + (x1 - x0) * t;
      const y = y0 + (y1 - y0) * t;
      for (const s of [-1, 1]) {
        const a = Math.atan2(y1 - y0, x1 - x0) * 57.3 + s * 55 + (r() - 0.5) * 20;
        const tone = 96 + Math.floor(r() * 30);
        leaves += `<ellipse cx="${x}" cy="${y}" rx="17" ry="6.5" transform="rotate(${a} ${x} ${y}) translate(${s * 0} 0) translate(14 0)" fill="rgb(${tone},${tone + 22},${tone - 8})"/><ellipse cx="${x}" cy="${y}" rx="17" ry="6.5" transform="rotate(${a} ${x} ${y}) translate(14 0)" fill="none" stroke="rgba(230,236,220,0.25)" stroke-width="0.8"/>`;
      }
    }
  }
  const props = [[118, 96], [176, 84], [140, 60]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="7" fill="#8aa46a"/>`).join('');
  const roots = Array.from({ length: 14 }, (_, i) => `<rect x="${60 + i * 13 + (i % 3) * 2}" y="${318 - (i % 4) * 5}" width="2.4" height="${16 + (i % 4) * 5}" fill="#7c6d58"/>`).join('');
  return `<svg viewBox="0 0 300 380" xmlns="http://www.w3.org/2000/svg">
  <rect x="30" y="300" width="240" height="70" fill="rgba(120,140,130,0.25)" stroke="rgba(220,230,226,0.35)"/>
  <rect x="30" y="312" width="240" height="58" fill="rgba(90,110,96,0.35)"/>
  <rect x="30" y="336" width="240" height="34" fill="#4d4233"/>
  ${roots}
  <path d="M150 336 C148 300 152 280 150 250" stroke="#6f6252" stroke-width="6" fill="none"/>
  ${leaves}${props}
  <line x1="30" y1="312" x2="270" y2="312" stroke="rgba(230,240,236,0.5)"/>
</svg>`;
}
