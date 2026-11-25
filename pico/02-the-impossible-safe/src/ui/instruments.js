// Instruments of the unlock panel: the resonance meter (a moving-coil gauge) and the
// strip-chart recorder that is the visual twin of every sound the mechanism makes.

const TONE_COLOR = { low: '#2B4C7E', mid: '#1B1C1A', high: '#B2321F' };

export class ResonanceMeter {
  constructor(el) {
    this.el = el;
    this.value = 0;
    this.target = 0;
    this.v = 0;
    this.color = TONE_COLOR.mid;
    el.innerHTML = `<svg viewBox="0 0 200 116" aria-hidden="true">
      <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="currentColor" stroke-width="1.2"/>
      ${ticks()}
      <path d="M140 46 A80 80 0 0 1 180 100" fill="none" stroke="#B2321F" stroke-width="5" opacity=".9"/>
      <text x="100" y="78" text-anchor="middle" font-size="9" letter-spacing="2" fill="currentColor" font-family="IBM Plex Mono, monospace">RESONANCE</text>
      <g class="needle"><path d="M100 100 L100 26" stroke="currentColor" stroke-width="1.6"/><path d="M100 100 L100 26" stroke="var(--tone, #1B1C1A)" stroke-width="1.6" class="tone"/></g>
      <circle cx="100" cy="100" r="6" fill="currentColor"/>
    </svg>`;
    this.needle = el.querySelector('.needle');
    this.toneEl = el.querySelector('.tone');
  }

  kick(strength = 1, tone = 'mid', kind = 'gate') {
    this.color = TONE_COLOR[tone] || TONE_COLOR.mid;
    this.toneEl.setAttribute('stroke', this.color);
    if (kind === 'dead') {
      this.v -= 3.5;
      return;
    }
    this.v += strength * (kind === 'double' ? 4.2 : 13);
  }

  frame(dt) {
    const s = Math.min(dt, 50) / 1000;
    // A moving-coil needle: springy, lightly damped, returns to rest.
    const a = -90 * this.value - 9 * this.v;
    this.v += a * s;
    this.value += this.v * s;
    const clamped = Math.max(-0.12, Math.min(1.05, this.value));
    const deg = -62 + clamped * 124;
    this.needle.setAttribute('transform', `rotate(${deg.toFixed(2)} 100 100)`);
  }
}

function ticks() {
  let out = '';
  for (let i = 0; i <= 20; i++) {
    const a = ((-62 + (i / 20) * 124 - 90) * Math.PI) / 180;
    const r1 = 80;
    const r2 = i % 5 === 0 ? 68 : 73;
    out += `<line x1="${100 + Math.cos(a) * r1}" y1="${100 + Math.sin(a) * r1}" x2="${100 + Math.cos(a) * r2}" y2="${100 + Math.sin(a) * r2}" stroke="currentColor" stroke-width="${i % 5 === 0 ? 1.4 : 0.8}"/>`;
  }
  return out;
}

// Paper scrolls left one notch per graduation; resonance draws a spike.
// With visual assist on, each spike is labelled with the graduation it happened at.
export class StripChart {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cols = []; // { v, tone, label, kind }
    this.max = 180;
    this.assist = false;
    this.dirty = true;
    this.resize();
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    this.w = Math.max(10, r.width);
    this.h = Math.max(10, r.height);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.max = Math.ceil(this.w / 4) + 2;
    this.dirty = true;
  }

  tick(pos) {
    this.cols.push({ v: 0, pos });
    if (this.cols.length > this.max) this.cols.shift();
    this.dirty = true;
  }

  mark(strength, tone, pos, kind) {
    const last = this.cols[this.cols.length - 1];
    if (!last) return;
    last.v = kind === 'dead' ? -0.6 : kind === 'double' ? 0.32 : strength;
    last.tone = tone;
    last.kind = kind;
    last.label = kind === 'gate' || kind === 'dead' ? pos : null;
    this.dirty = true;
  }

  draw() {
    if (!this.dirty) return;
    this.dirty = false;
    const c = this.ctx;
    const { w, h } = this;
    c.clearRect(0, 0, w, h);
    const base = h * 0.66;
    c.strokeStyle = 'rgba(178,50,31,0.22)';
    c.lineWidth = 1;
    for (let y = base; y > 4; y -= h * 0.14) {
      c.beginPath();
      c.moveTo(0, Math.round(y) + 0.5);
      c.lineTo(w, Math.round(y) + 0.5);
      c.stroke();
    }
    const n = this.cols.length;
    const step = 4;
    c.lineWidth = 1.3;
    c.strokeStyle = '#1B1C1A';
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const col = this.cols[i];
      const x = w - (n - 1 - i) * step - 2;
      const y = base - col.v * (base - 8);
      if (i === 0) c.moveTo(x, base);
      c.lineTo(x - 1, base);
      c.lineTo(x, y);
      c.lineTo(x + 1, base);
    }
    c.stroke();
    c.font = '600 10px "IBM Plex Mono", monospace';
    c.textAlign = 'center';
    for (let i = 0; i < n; i++) {
      const col = this.cols[i];
      if (!col.v) continue;
      const x = w - (n - 1 - i) * step - 2;
      const y = base - col.v * (base - 8);
      c.fillStyle = TONE_COLOR[col.tone] || TONE_COLOR.mid;
      c.beginPath();
      c.arc(x, y, col.kind === 'gate' ? 2.6 : 1.6, 0, Math.PI * 2);
      c.fill();
      if (this.assist && col.label !== null && col.label !== undefined) {
        c.fillText(String(col.label).padStart(2, '0'), x, Math.min(h - 3, Math.max(10, col.v < 0 ? base + 14 : y - 6)));
      }
    }
  }
}
