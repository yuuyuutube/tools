// The dial, painted on a canvas. Three cached layers:
//   bezel (static machined steel) · face (enamel, numerals, knurled knob — this one rotates)
//   gloss (static highlights that stay put while the face turns beneath them, which is what
//   makes it read as a physical object).
// Each frame only composites them; nothing is re-rasterised while turning.

const TAU = Math.PI * 2;

export class DialRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.look = null;
    this.size = 100;
    this.px = 0;
    this.angle = 0; // radians, clockwise
    this.prevAngle = 0;
    this.lamp = 0; // index lamp glow 0..1
    this.lampColor = '#E8B04A';
    this.jitter = 0;
  }

  configure({ look, size, px, dpr }) {
    const key = `${look.name}|${size}|${Math.round(px)}|${dpr}`;
    if (key === this.key) return;
    this.key = key;
    this.look = look;
    this.size = size;
    this.px = px;
    this.dpr = dpr;
    const side = Math.round(px * dpr);
    this.canvas.width = side;
    this.canvas.height = side;
    this.canvas.style.width = `${px}px`;
    this.canvas.style.height = `${px}px`;
    this.bezel = layer(side, (c, R) => paintBezel(c, R, look));
    this.face = layer(side, (c, R) => paintFace(c, R, look, size));
    this.gloss = layer(side, (c, R) => paintGloss(c, R, look));
    this.dirty = true;
  }

  // angle in radians; returns true when something was drawn
  draw(angle, { force = false } = {}) {
    if (!this.look) return false;
    const moving = Math.abs(angle - this.angle) > 1e-5;
    if (!moving && !force && !this.dirty && this.lamp < 0.01 && this.jitter < 0.01) return false;
    this.dirty = false;
    const c = this.ctx;
    const side = this.canvas.width;
    const R = side / 2;
    const prev = this.angle;
    this.angle = angle;
    c.clearRect(0, 0, side, side);
    c.drawImage(this.bezel, 0, 0);

    // Fast spins smear into a few translucent copies, so the eye still reads continuous motion.
    const delta = angle - prev;
    const copies = Math.min(4, Math.floor(Math.abs(delta) / 0.09));
    c.save();
    c.beginPath();
    c.arc(R, R, R * 0.872, 0, TAU);
    c.clip();
    if (copies > 0) {
      for (let i = copies; i >= 1; i--) {
        c.globalAlpha = 0.22 / i;
        drawRotated(c, this.face, R, prev + (delta * (copies - i + 1)) / (copies + 1));
      }
      c.globalAlpha = 1;
    }
    drawRotated(c, this.face, R, angle);
    if (this.marker) this.drawMarker(c, R, angle);
    c.restore();
    c.drawImage(this.gloss, 0, 0);
    this.drawIndex(c, R);
    return true;
  }

  // Trainee aid: a small red arrowhead on the face, pointing at the target numeral.
  drawMarker(c, R, angle) {
    const { pos, size } = this.marker;
    const a = -(pos / size) * TAU + angle - Math.PI / 2;
    const r = R * 0.575;
    c.save();
    c.translate(R + Math.cos(a) * r, R + Math.sin(a) * r);
    c.rotate(a + Math.PI / 2);
    c.beginPath();
    c.moveTo(0, -R * 0.03);
    c.lineTo(R * 0.026, R * 0.016);
    c.lineTo(-R * 0.026, R * 0.016);
    c.closePath();
    c.fillStyle = '#E0533C';
    c.fill();
    c.restore();
  }

  drawIndex(c, R) {
    const look = this.look;
    const j = this.jitter > 0.01 ? (Math.random() - 0.5) * this.jitter * R * 0.012 : 0;
    this.jitter *= 0.82;
    c.save();
    c.translate(R + j, 0);
    // Red enamel index, set into the bezel and pointing down at the reading.
    const w = R * 0.07;
    const top = R * 0.035;
    const tip = R * 0.165;
    c.beginPath();
    c.moveTo(-w, top);
    c.lineTo(w, top);
    c.lineTo(0, tip);
    c.closePath();
    c.fillStyle = look.blank ? '#3A0F0B' : '#B2321F';
    c.fill();
    c.lineWidth = R * 0.008;
    c.strokeStyle = 'rgba(20,10,8,0.65)';
    c.stroke();
    c.beginPath();
    c.moveTo(-w * 0.55, top + R * 0.012);
    c.lineTo(-w * 0.1, top + R * 0.012);
    c.lineTo(-w * 0.05, top + R * 0.05);
    c.closePath();
    c.fillStyle = 'rgba(255,240,220,0.35)';
    c.fill();
    if (this.lamp > 0.01) {
      // Index lamp: the visual twin of the resonance sound.
      const g = c.createRadialGradient(0, tip * 0.55, 0, 0, tip * 0.55, R * 0.16);
      g.addColorStop(0, hexA(this.lampColor, 0.95 * this.lamp));
      g.addColorStop(0.35, hexA(this.lampColor, 0.35 * this.lamp));
      g.addColorStop(1, hexA(this.lampColor, 0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(0, tip * 0.55, R * 0.16, 0, TAU);
      c.fill();
      this.lamp *= 0.9;
    }
    c.restore();
  }

  flash(color = '#E8B04A', strength = 1) {
    this.lampColor = color;
    this.lamp = Math.max(this.lamp, strength);
    this.jitter = Math.max(this.jitter, strength);
  }
}

function layer(side, paint) {
  const cv = document.createElement('canvas');
  cv.width = side;
  cv.height = side;
  const c = cv.getContext('2d');
  c.translate(side / 2, side / 2);
  paint(c, side / 2);
  return cv;
}

function drawRotated(c, img, R, angle) {
  c.save();
  c.translate(R, R);
  c.rotate(angle);
  c.drawImage(img, -R, -R);
  c.restore();
}

function conic(c, start, stops) {
  if (c.createConicGradient) {
    const g = c.createConicGradient(start, 0, 0);
    stops.forEach(([o, col]) => g.addColorStop(o, col));
    return g;
  }
  return stops[0][1];
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))));
  return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function paintBezel(c, R, look) {
  // Drop shadow on the door.
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = R * 0.08;
  c.shadowOffsetY = R * 0.04;
  c.beginPath();
  c.arc(0, 0, R * 0.985, 0, TAU);
  c.fillStyle = '#5e6466';
  c.fill();
  c.restore();
  // Machined steel: anisotropic highlights come from a conic sweep.
  const steel = look.blank
    ? [[0, '#1b1d1c'], [0.15, '#2b2e2c'], [0.4, '#121413'], [0.65, '#262927'], [0.9, '#151716'], [1, '#1b1d1c']]
    : [[0, '#8f9597'], [0.08, '#eef0ec'], [0.2, '#7a8083'], [0.38, '#c5c9c6'], [0.55, '#5f6568'], [0.7, '#d9dcd8'], [0.86, '#71777a'], [1, '#8f9597']];
  c.beginPath();
  c.arc(0, 0, R * 0.98, 0, TAU);
  c.fillStyle = conic(c, -Math.PI / 2 - 0.6, steel);
  c.fill();
  // Fine concentric lathe lines.
  c.lineWidth = Math.max(0.5, R * 0.0025);
  for (let r = R * 0.885; r < R * 0.975; r += R * 0.0065) {
    c.beginPath();
    c.arc(0, 0, r, 0, TAU);
    c.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${0.04 + Math.random() * 0.05})`;
    c.stroke();
  }
  // Bevels.
  ring(c, R * 0.978, R * 0.008, 'rgba(0,0,0,0.5)');
  ring(c, R * 0.968, R * 0.006, 'rgba(255,255,255,0.35)');
  ring(c, R * 0.878, R * 0.012, 'rgba(0,0,0,0.55)');
  // Face well.
  c.beginPath();
  c.arc(0, 0, R * 0.872, 0, TAU);
  c.fillStyle = '#111';
  c.fill();
}

function ring(c, r, w, col) {
  c.beginPath();
  c.arc(0, 0, r, 0, TAU);
  c.lineWidth = w;
  c.strokeStyle = col;
  c.stroke();
}

function paintFace(c, R, look, size) {
  const outer = R * 0.87;
  const band = R * 0.6;
  // Enamel band, slightly darker toward the rim for curvature.
  const g = c.createRadialGradient(0, 0, band, 0, 0, outer);
  g.addColorStop(0, shade(look.face, 0.04));
  g.addColorStop(0.75, look.face);
  g.addColorStop(1, shade(look.face, -0.12));
  c.beginPath();
  c.arc(0, 0, outer, 0, TAU);
  c.fillStyle = g;
  c.fill();

  if (!look.blank) {
    const every = size >= 60 ? 10 : size >= 24 ? 5 : 1;
    const mid = size >= 60 ? 5 : 0;
    c.strokeStyle = look.faceInk;
    c.lineCap = 'butt';
    for (let i = 0; i < size; i++) {
      // Numerals increase counter-clockwise, so turning clockwise raises the reading.
      const a = -(i / size) * TAU - Math.PI / 2;
      const major = i % every === 0;
      const isMid = mid && i % mid === 0 && !major;
      const r1 = outer - R * 0.012;
      const len = major ? R * 0.115 : isMid ? R * 0.085 : R * 0.055;
      c.lineWidth = major ? R * 0.013 : isMid ? R * 0.009 : R * 0.0055;
      c.beginPath();
      c.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      c.lineTo(Math.cos(a) * (r1 - len), Math.sin(a) * (r1 - len));
      c.stroke();
    }
    c.fillStyle = look.faceInk;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const fs = R * (size >= 60 ? 0.095 : size >= 24 ? 0.088 : 0.11);
    c.font = `600 ${fs}px "DIN Condensed", "Avenir Next Condensed", "Helvetica Neue", Arial, sans-serif`;
    for (let i = 0; i < size; i += every) {
      const a = -(i / size) * TAU;
      c.save();
      c.rotate(a);
      c.fillText(String(i), 0, -(R * 0.665));
      c.restore();
    }
  }

  // Recessed enamel ring with circular micro-lettering.
  c.beginPath();
  c.arc(0, 0, band, 0, TAU);
  c.fillStyle = look.ring;
  c.fill();
  ring(c, band - R * 0.004, R * 0.008, 'rgba(0,0,0,0.45)');
  ring(c, band - R * 0.03, R * 0.0045, look.ringInk);
  ring(c, R * 0.445, R * 0.0045, look.ringInk);
  const text = look.blank ? '' : 'THE BUREAU OF UNNECESSARY PROTECTION · PROTEGO QUOD NEMO PETIT · ';
  if (text) {
    c.fillStyle = look.ringInk;
    c.font = `500 ${R * 0.043}px "Helvetica Neue", Arial, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const chars = [...text];
    const rr = R * 0.505;
    const step = TAU / chars.length;
    chars.forEach((ch, i) => {
      c.save();
      c.rotate(i * step);
      c.fillText(ch, 0, -rr);
      c.restore();
    });
  }

  // Knurled knob.
  const kr = R * 0.43;
  c.save();
  c.shadowColor = 'rgba(0,0,0,0.6)';
  c.shadowBlur = R * 0.05;
  c.beginPath();
  c.arc(0, 0, kr, 0, TAU);
  c.fillStyle = look.knob;
  c.fill();
  c.restore();
  const ridges = 64;
  for (let i = 0; i < ridges; i++) {
    const a0 = (i / ridges) * TAU;
    const a1 = ((i + 0.5) / ridges) * TAU;
    c.beginPath();
    c.moveTo(0, 0);
    c.arc(0, 0, kr, a0, a1);
    c.closePath();
    c.fillStyle = 'rgba(255,255,255,0.09)';
    c.fill();
  }
  ring(c, kr - R * 0.002, R * 0.006, 'rgba(255,255,255,0.18)');
  // Cap.
  const cap = R * 0.33;
  c.beginPath();
  c.arc(0, 0, cap, 0, TAU);
  c.fillStyle = conic(c, 0, [
    [0, shade(look.knob, 0.25)], [0.25, shade(look.knob, -0.2)], [0.5, shade(look.knob, 0.18)],
    [0.75, shade(look.knob, -0.25)], [1, shade(look.knob, 0.25)],
  ]);
  c.fill();
  ring(c, cap, R * 0.008, 'rgba(0,0,0,0.5)');
  for (let r = cap * 0.25; r < cap; r += R * 0.014) ring(c, r, R * 0.002, 'rgba(255,255,255,0.05)');
  // Emblem: a keyhole, the Bureau's mark.
  if (!look.blank) {
    c.fillStyle = look.ringInk;
    c.globalAlpha = 0.9;
    c.beginPath();
    c.arc(0, -cap * 0.16, cap * 0.16, 0, TAU);
    c.fill();
    c.beginPath();
    c.moveTo(-cap * 0.09, -cap * 0.1);
    c.lineTo(cap * 0.09, -cap * 0.1);
    c.lineTo(cap * 0.14, cap * 0.32);
    c.lineTo(-cap * 0.14, cap * 0.32);
    c.closePath();
    c.fill();
    c.globalAlpha = 1;
    ring(c, cap * 0.62, R * 0.004, hexA(look.ringInk.startsWith('#') ? look.ringInk : '#C9AA6B', 0.6));
  }
}

function paintGloss(c, R, look) {
  // Inner shadow cast by the bezel onto the face.
  const s = c.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 0.872);
  s.addColorStop(0, 'rgba(0,0,0,0)');
  s.addColorStop(1, 'rgba(0,0,0,0.35)');
  c.beginPath();
  c.arc(0, 0, R * 0.872, 0, TAU);
  c.fillStyle = s;
  c.fill();
  // A long soft sheen on the enamel, lit from the upper left.
  c.save();
  c.beginPath();
  c.arc(0, 0, R * 0.87, 0, TAU);
  c.arc(0, 0, R * 0.6, 0, TAU, true);
  c.clip();
  const sheen = c.createLinearGradient(-R, -R, R * 0.4, R * 0.4);
  sheen.addColorStop(0, `rgba(255,255,255,${look.blank ? 0.05 : 0.22})`);
  sheen.addColorStop(0.45, 'rgba(255,255,255,0)');
  sheen.addColorStop(1, 'rgba(0,0,0,0.1)');
  c.fillStyle = sheen;
  c.fillRect(-R, -R, 2 * R, 2 * R);
  c.restore();
  // Knob highlight.
  const k = c.createRadialGradient(-R * 0.14, -R * 0.18, 0, -R * 0.1, -R * 0.12, R * 0.42);
  k.addColorStop(0, `rgba(255,255,255,${look.blank ? 0.08 : 0.28})`);
  k.addColorStop(0.5, 'rgba(255,255,255,0.05)');
  k.addColorStop(1, 'rgba(255,255,255,0)');
  c.beginPath();
  c.arc(0, 0, R * 0.43, 0, TAU);
  c.fillStyle = k;
  c.fill();
  // Specular glint on the bezel.
  c.save();
  c.beginPath();
  c.arc(0, 0, R * 0.975, -2.55, -1.9);
  c.lineWidth = R * 0.03;
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineCap = 'round';
  c.stroke();
  c.restore();
}
