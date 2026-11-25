// The stage on the left: a safe in its niche. Door paint is a cached canvas, the dial is a
// DialRenderer, and the swing is a real CSS 3D rotation about the hinge.

import { DialRenderer } from './dial-renderer.js';
import { lookOf } from './looks.js';
import { mulberry32 } from '../core/prng.js';

const TAU = Math.PI * 2;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LAYOUT = {
  rect: { dial: [0.47, 0.455], dialD: 0.56, handle: [0.845, 0.455], lamps: 0.105, flag: 0.792, plate: 0.885 },
  round: { dial: [0.5, 0.47], dialD: 0.5, handle: [0.82, 0.47], lamps: 0.16, flag: 0.755, plate: 0.835 },
};

export class SafeStage {
  constructor(root) {
    this.root = root;
    this.root.innerHTML = TEMPLATE;
    this.vault = root.querySelector('.vault');
    this.door = root.querySelector('.door');
    this.paint = root.querySelector('.door-paint');
    this.backPaint = root.querySelector('.door-back canvas');
    this.dialCanvas = root.querySelector('.dial');
    this.dialWrap = root.querySelector('.dial-wrap');
    this.handle = root.querySelector('.handle');
    this.lampsEl = root.querySelector('.lamps');
    this.flag = root.querySelector('.flag');
    this.interior = root.querySelector('.interior');
    this.specimen = root.querySelector('.specimen');
    this.tag = root.querySelector('.tag');
    this.vitrineEl = root.querySelector('.vitrine');
    this.dial = new DialRenderer(this.dialCanvas);
    this.lookName = 'standard';
    this.size = 100;
    this.target = 0; // dial position in graduations (float)
    this.shown = 0;
    this.number = '001';
    this.view = 'safe';
    this.dpr = Math.min(2.5, globalThis.devicePixelRatio || 1);
    this.lampState = { total: 3, lit: 0 };
    new ResizeObserver(() => this.layout()).observe(root);
    this.layout();
  }

  get look() {
    return lookOf(this.lookName);
  }

  setLook(name, { number = this.number, size = this.size } = {}) {
    const changed = name !== this.lookName || number !== this.number || size !== this.size;
    this.lookName = name;
    this.number = number;
    if (size !== this.size) {
      // Keep the same visual angle when the graduation count changes (nested safes).
      const angle = this.shown / this.size;
      this.size = size;
      this.shown = this.target = Math.round(angle * size);
    }
    if (changed) this.layout(true);
  }

  layout(force = false) {
    const r = this.root.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const look = this.look;
    const shape = look.shape;
    const L = LAYOUT[shape];
    const avail = Math.min(r.width * 0.8, r.height * (r.width < 860 ? 0.68 : 0.8), 720);
    const S = Math.round(avail * look.scale);
    const key = `${S}|${this.lookName}|${this.number}|${this.size}`;
    if (key === this.layoutKey && !force) return;
    this.layoutKey = key;
    this.S = S;
    const v = this.vault.style;
    v.setProperty('--s', `${S}px`);
    v.setProperty('--door', look.door);
    v.setProperty('--door-dark', look.doorDark);
    v.setProperty('--trim', look.trim);
    this.vault.dataset.shape = shape;
    this.vault.dataset.look = this.lookName;
    const dpr = this.dpr;
    this.paint.width = Math.round(S * dpr);
    this.paint.height = Math.round(S * dpr);
    paintDoor(this.paint.getContext('2d'), S * dpr, look, L, this.number);
    this.backPaint.width = Math.round(S * dpr * 0.5);
    this.backPaint.height = Math.round(S * dpr * 0.5);
    paintDoorBack(this.backPaint.getContext('2d'), S * dpr * 0.5, look);
    const D = S * L.dialD;
    this.dialWrap.style.left = `${L.dial[0] * S - D / 2}px`;
    this.dialWrap.style.top = `${L.dial[1] * S - D / 2}px`;
    this.dial.configure({ look, size: this.size, px: D, dpr });
    this.dial.draw(this.angleOf(this.shown), { force: true });
    const hs = this.handle.style;
    hs.left = `${L.handle[0] * S}px`;
    hs.top = `${L.handle[1] * S}px`;
    hs.setProperty('--h', `${S * 0.2}px`);
    this.handle.innerHTML = handleSVG(look);
    this.lampsEl.style.top = `${L.lamps * S}px`;
    this.lampsEl.style.left = `${L.dial[0] * S}px`;
    this.flag.style.top = `${L.flag * S}px`;
    this.flag.style.left = `${L.dial[0] * S}px`;
    this.setLamps(this.lampState.total, this.lampState.lit);
  }

  angleOf(pos) {
    return (pos / this.size) * TAU;
  }

  // Where the pointer should measure angles from.
  getDialCenter() {
    if (this.view === 'safe' && !this.door.classList.contains('open')) {
      const r = this.dialCanvas.getBoundingClientRect();
      if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: r.width / 2 };
    }
    const r = this.root.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.48, r: Math.min(r.width, r.height) * 0.3 };
  }

  // Logic sets the exact position; the picture follows with a short critically damped glide.
  setDial(pos, { snap = false } = {}) {
    this.target = pos;
    if (snap) this.shown = pos;
  }

  frame(dtMs, reducedMotion) {
    const k = reducedMotion ? 1 : 1 - Math.exp(-dtMs / 38);
    const d = this.target - this.shown;
    this.shown = Math.abs(d) < 0.002 ? this.target : this.shown + d * k;
    this.dial.draw(this.angleOf(this.shown));
  }

  flash(kind = 'gate', tone = 'mid', strength = 1) {
    const color = tone === 'low' ? '#6FA4D8' : tone === 'high' ? '#F0645A' : '#F2B84B';
    this.dial.flash(color, kind === 'near' ? strength * 0.6 : strength);
  }

  setLamps(total, lit, state = '') {
    this.lampState = { total, lit };
    const items = [];
    for (let i = 0; i < total; i++) items.push(`<i class="${i < lit ? 'on' : ''}"></i>`);
    this.lampsEl.innerHTML = items.join('');
    this.lampsEl.dataset.state = state;
    this.lampsEl.hidden = total === 0;
  }

  blinkError() {
    this.lampsEl.classList.remove('error');
    void this.lampsEl.offsetWidth;
    this.lampsEl.classList.add('error');
    this.vault.classList.remove('shake');
    void this.vault.offsetWidth;
    this.vault.classList.add('shake');
  }

  setFlag(state) {
    this.flag.dataset.state = state; // locked | aligned | open
  }

  setView(view) {
    this.view = view;
    this.root.dataset.view = view;
  }

  // ---- the ceremony ------------------------------------------------------------------

  resetDoor() {
    this.door.classList.remove('open', 'opening');
    this.handle.classList.remove('turned');
    this.interior.classList.remove('lit', 'reveal', 'dim');
    this.vault.classList.remove('dolly');
    this.specimen.innerHTML = '';
    this.tag.textContent = '';
    this.setFlag('locked');
  }

  placeSpecimen(svg, tag) {
    this.specimen.innerHTML = svg;
    this.tag.textContent = tag;
  }

  // Long the first time, short on repeats; skip() finishes whatever is left at once.
  async openSequence({ audio, fast = false, reducedMotion = false, onStep = () => {}, openAngle = -108 } = {}) {
    this.skipping = false;
    const speed = fast ? 0.35 : 1;
    const wait = (ms) => (this.skipping ? Promise.resolve() : this.wait(ms * speed));
    this.root.dataset.speed = fast ? 'fast' : 'normal';
    this.door.style.setProperty('--open-angle', `${openAngle}deg`);
    this.setFlag('open');
    onStep('bolts');
    if (!this.skipping) audio.lockReleased(3, 0.34 * speed);
    await wait(1150);
    this.handle.classList.add('turned');
    onStep('handle');
    if (!this.skipping) audio.handleTurn();
    await wait(800);
    this.interior.classList.add('dim');
    this.door.classList.add('opening', 'open');
    onStep('door');
    if (!this.skipping) audio.doorCreak(fast ? 1.1 : 3.1);
    if (!reducedMotion) this.vault.classList.add('dolly');
    await wait(3200);
    // The door is open. Darkness. Then the light comes up.
    await wait(fast ? 200 : 900);
    this.interior.classList.add('lit');
    onStep('light');
    await wait(fast ? 500 : 1700);
    this.interior.classList.add('reveal');
    onStep('reveal');
    audio.reveal();
    await wait(fast ? 600 : 1200);
    this.root.dataset.speed = 'normal';
  }

  wait(ms) {
    this.pending ||= new Set();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        this.pending.delete(done);
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.pending.add(done);
    });
  }

  skip() {
    this.skipping = true;
    this.root.dataset.speed = 'skip';
    for (const done of [...(this.pending || [])]) done();
  }

  // Archive: the vitrine shows one specimen under a museum light.
  showVitrine(html, dir = 0) {
    const el = this.vitrineEl.querySelector('.vitrine-item');
    el.classList.remove('in-left', 'in-right');
    void el.offsetWidth;
    if (dir) el.classList.add(dir > 0 ? 'in-right' : 'in-left');
    el.innerHTML = html;
  }
}

const TEMPLATE = `
<div class="vault">
  <div class="niche">
    <div class="interior">
      <div class="interior-back"></div>
      <div class="beam"></div>
      <div class="cushion"></div>
      <div class="specimen"></div>
      <div class="tag"></div>
    </div>
    <div class="door">
      <div class="door-front">
        <canvas class="door-paint"></canvas>
        <div class="lamps"></div>
        <div class="dial-wrap"><canvas class="dial"></canvas></div>
        <div class="handle"></div>
        <div class="flag"><i></i></div>
      </div>
      <div class="door-edge"></div>
      <div class="door-back"><canvas></canvas></div>
    </div>
  </div>
</div>
<div class="vitrine"><div class="vitrine-light"></div><div class="plinth"></div><div class="vitrine-item"></div></div>
`;

function handleSVG(look) {
  const metal = look.blank ? '#2a2d2b' : '#c9cdca';
  const dark = look.blank ? '#111' : '#5d6366';
  return `<svg viewBox="-50 -50 100 100" aria-hidden="true">
    <circle r="17" fill="rgba(0,0,0,.35)" cx="2" cy="3"/>
    <circle r="16" fill="${dark}"/>
    <circle r="13" fill="${metal}"/>
    <circle r="13" fill="url(#none)" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>
    <g class="lever">
      <path d="M-6 -4 L44 -6 Q49 -6 49 0 Q49 6 44 6 L-6 4 Z" fill="rgba(0,0,0,.3)" transform="translate(2,3)"/>
      <path d="M-6 -4 L44 -6 Q49 -6 49 0 Q49 6 44 6 L-6 4 Z" fill="${metal}" stroke="${dark}" stroke-width="1.4"/>
      <path d="M0 -2.5 L42 -3.5" stroke="rgba(255,255,255,.75)" stroke-width="1.6" stroke-linecap="round"/>
    </g>
    <circle r="6" fill="${dark}"/>
    <circle r="3.5" cx="-1" cy="-1" fill="${metal}"/>
  </svg>`;
}

function paintDoor(c, S, look, L, number) {
  const rnd = mulberry32(0xb0b + number.length * 7 + (look.name.length << 4));
  c.clearRect(0, 0, S, S);
  c.save();
  const round = look.shape === 'round';
  const path = () => {
    c.beginPath();
    if (round) c.arc(S / 2, S / 2, S / 2, 0, TAU);
    else roundRect(c, 0, 0, S, S, S * (look.chunky ? 0.06 : 0.018));
  };
  path();
  c.clip();
  // Enamel with a hammered texture.
  const g = c.createLinearGradient(0, 0, S * 0.3, S);
  g.addColorStop(0, look.doorLight);
  g.addColorStop(0.55, look.door);
  g.addColorStop(1, look.doorDark);
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  for (let i = 0; i < 1400; i++) {
    const x = rnd() * S;
    const y = rnd() * S;
    const r = S * (0.004 + rnd() * 0.012);
    const light = rnd() < 0.5;
    const rg = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    rg.addColorStop(0, light ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.07)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = rg;
    c.fillRect(x - r, y - r, r * 2, r * 2);
  }
  if (look.worn) {
    c.strokeStyle = 'rgba(230,220,190,0.12)';
    c.lineWidth = S * 0.0015;
    for (let i = 0; i < 46; i++) {
      const x = rnd() * S;
      const y = rnd() * S;
      const a = rnd() * TAU;
      const len = S * (0.02 + rnd() * 0.08);
      c.beginPath();
      c.moveTo(x, y);
      c.quadraticCurveTo(x + Math.cos(a) * len * 0.5 + rnd() * 4, y + Math.sin(a) * len * 0.5, x + Math.cos(a) * len, y + Math.sin(a) * len);
      c.stroke();
    }
  }
  // Edge bevel.
  c.lineWidth = S * 0.012;
  path();
  c.strokeStyle = 'rgba(0,0,0,0.45)';
  c.stroke();
  c.lineWidth = S * 0.004;
  c.save();
  c.translate(S * 0.004, S * 0.004);
  c.scale(0.992, 0.992);
  path();
  c.strokeStyle = 'rgba(255,255,255,0.16)';
  c.stroke();
  c.restore();

  if (!look.blank) {
    // Coachline pinstripe with concave corners.
    c.strokeStyle = look.trim;
    if (round) {
      c.lineWidth = S * 0.004;
      ringAt(c, S / 2, S / 2, S * 0.445);
      c.lineWidth = S * 0.0018;
      ringAt(c, S / 2, S / 2, S * 0.432);
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * TAU;
        rivet(c, S / 2 + Math.cos(a) * S * 0.474, S / 2 + Math.sin(a) * S * 0.474, S * 0.011);
      }
    } else {
      const m = S * (look.chunky ? 0.09 : 0.065);
      c.lineWidth = S * (look.chunky ? 0.008 : 0.0045);
      coachline(c, m, m, S - 2 * m, S - 2 * m, S * 0.05);
      c.lineWidth = S * 0.0018;
      coachline(c, m + S * 0.014, m + S * 0.014, S - 2 * m - S * 0.028, S - 2 * m - S * 0.028, S * 0.04);
      const rv = S * 0.032;
      for (const [x, y] of [[rv, rv], [S - rv, rv], [rv, S - rv], [S - rv, S - rv]]) rivet(c, x, y, S * 0.011);
    }
    // Brass nameplate.
    const pw = S * 0.34;
    const ph = S * 0.072;
    const px = L.dial[0] * S - pw / 2;
    const py = L.plate * S - ph / 2;
    c.save();
    c.shadowColor = 'rgba(0,0,0,0.45)';
    c.shadowBlur = S * 0.008;
    c.shadowOffsetY = S * 0.003;
    chamfer(c, px, py, pw, ph, S * 0.012);
    const brass = c.createLinearGradient(px, py, px, py + ph);
    brass.addColorStop(0, '#E2C98F');
    brass.addColorStop(0.5, '#B39256');
    brass.addColorStop(1, '#8A6C38');
    c.fillStyle = brass;
    c.fill();
    c.restore();
    chamfer(c, px + S * 0.006, py + S * 0.006, pw - S * 0.012, ph - S * 0.012, S * 0.008);
    c.lineWidth = S * 0.0015;
    c.strokeStyle = 'rgba(60,40,10,0.55)';
    c.stroke();
    c.fillStyle = 'rgba(48,32,10,0.85)';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.font = `600 ${S * 0.0125}px "Helvetica Neue", Arial, sans-serif`;
    c.fillText('THE BUREAU OF UNNECESSARY PROTECTION', L.dial[0] * S, py + ph * 0.3);
    c.font = `600 ${S * 0.027}px "DIN Condensed", "Avenir Next Condensed", "Helvetica Neue", sans-serif`;
    c.fillText(`No. ${number}`, L.dial[0] * S, py + ph * 0.66);
    rivet(c, px + S * 0.016, py + ph / 2, S * 0.005);
    rivet(c, px + pw - S * 0.016, py + ph / 2, S * 0.005);
    // Bezel for the stage lamps.
    c.fillStyle = 'rgba(0,0,0,0.35)';
    roundRect(c, L.dial[0] * S - S * 0.11, L.lamps * S - S * 0.026, S * 0.22, S * 0.052, S * 0.026);
    c.fill();
  }
  c.restore();
}

function paintDoorBack(c, S, look) {
  c.fillStyle = '#4a4f50';
  c.fillRect(0, 0, S, S);
  const g = c.createLinearGradient(0, 0, S, S);
  g.addColorStop(0, 'rgba(255,255,255,0.12)');
  g.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.fillStyle = g;
  c.fillRect(0, 0, S, S);
  // Linkage bar and three retracted bolts.
  c.fillStyle = '#8e9493';
  c.fillRect(S * 0.62, S * 0.12, S * 0.05, S * 0.76);
  for (const y of [0.22, 0.5, 0.78]) {
    c.fillStyle = '#b9bebb';
    c.fillRect(S * 0.67, S * y - S * 0.035, S * 0.2, S * 0.07);
    c.fillStyle = 'rgba(0,0,0,0.3)';
    c.fillRect(S * 0.67, S * y + S * 0.025, S * 0.2, S * 0.01);
  }
  c.fillStyle = '#6b7171';
  roundRect(c, S * 0.2, S * 0.36, S * 0.3, S * 0.28, S * 0.02);
  c.fill();
  c.strokeStyle = 'rgba(0,0,0,0.4)';
  c.lineWidth = S * 0.006;
  c.stroke();
  c.fillStyle = 'rgba(255,255,255,0.65)';
  c.font = `600 ${S * 0.03}px "Helvetica Neue", Arial, sans-serif`;
  c.textAlign = 'center';
  c.fillText('DO NOT OIL', S * 0.35, S * 0.49);
  c.fillText('WITHOUT FORM 7-B', S * 0.35, S * 0.535);
  for (let i = 0; i < 10; i++) {
    rivet(c, S * 0.05, S * (0.08 + i * 0.093), S * 0.012);
  }
  c.strokeStyle = look.trim;
  c.lineWidth = S * 0.004;
  c.strokeRect(S * 0.03, S * 0.03, S * 0.94, S * 0.94);
}

function roundRect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

function chamfer(c, x, y, w, h, k) {
  c.beginPath();
  c.moveTo(x + k, y);
  c.lineTo(x + w - k, y);
  c.lineTo(x + w, y + k);
  c.lineTo(x + w, y + h - k);
  c.lineTo(x + w - k, y + h);
  c.lineTo(x + k, y + h);
  c.lineTo(x, y + h - k);
  c.lineTo(x, y + k);
  c.closePath();
}

// A rectangle whose corners are cut by quarter circles curving inwards.
function coachline(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.lineTo(x + w - r, y);
  c.arc(x + w, y, r, Math.PI, Math.PI / 2, true);
  c.lineTo(x + w, y + h - r);
  c.arc(x + w, y + h, r, -Math.PI / 2, Math.PI, true);
  c.lineTo(x + r, y + h);
  c.arc(x, y + h, r, 0, -Math.PI / 2, true);
  c.lineTo(x, y + r);
  c.arc(x, y, r, Math.PI / 2, 0, true);
  c.closePath();
  c.stroke();
}

function ringAt(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.stroke();
}

function rivet(c, x, y, r) {
  const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.5, 'rgba(160,160,150,0.45)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fillStyle = g;
  c.fill();
}
