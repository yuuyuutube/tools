import { HALF_HEIGHT, RADIUS, widthAt } from './simulation.js';

// Retro-printer's fluorescent pink (#ff48b0) and peach ink (#d64080), with pink tints.
const PALETTE = ['#d64080', '#ff48b0', '#ee3d9b', '#ff75c5', '#ff9ed6'];

function glassPath(ctx, offset = 0) {
  ctx.beginPath();
  ctx.moveTo(-widthAt(-HALF_HEIGHT) - offset, -HALF_HEIGHT);
  for (let y = -HALF_HEIGHT; y <= HALF_HEIGHT; y += 2) ctx.lineTo(-widthAt(y) - offset, y);
  ctx.lineTo(widthAt(HALF_HEIGHT) + offset, HALF_HEIGHT);
  for (let y = HALF_HEIGHT; y >= -HALF_HEIGHT; y -= 2) ctx.lineTo(widthAt(y) + offset, y);
  ctx.closePath();
}

export class HourglassRenderer {
  constructor(canvas, simulation) {
    this.canvas = canvas;
    this.sim = simulation;
    this.ctx = canvas.getContext('2d', { alpha: true });
    if (!this.ctx) throw new Error('Canvas 2D is unavailable');
    this.width = 0;
    this.height = 0;
    this.scale = 1;
    this.center = { x: 0, y: 0 };
  }

  resize(width, height) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = width; this.height = height; this.dpr = dpr;
    this.canvas.width = Math.round(width * dpr);
    this.canvas.height = Math.round(height * dpr);
    this.scale = Math.min((height - 152) / 500, (width - 52) / 490, 1.32);
    this.center = { x: width * .5, y: height * .43 };
    if (window.innerWidth <= 800) {
      this.scale = Math.min((height - 67) / 500, (width - 60) / 420, 1.05);
      this.center.y = height * .46;
    }
  }

  render() {
    const c = this.ctx, { width, height, dpr, scale, center, sim } = this;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, width, height);

    // A broad, matte contact shadow anchors the glass without a decorative pedestal.
    c.save();
    c.translate(center.x, center.y + 267 * scale);
    c.scale(scale, scale);
    const shadow = c.createRadialGradient(0, 0, 0, 0, 0, 154);
    shadow.addColorStop(0, '#26346224'); shadow.addColorStop(.4, '#26346211'); shadow.addColorStop(1, '#26346200');
    c.scale(1, .12); c.fillStyle = shadow; c.beginPath(); c.arc(0, 0, 154, 0, Math.PI * 2); c.fill();
    c.restore();

    c.save(); c.translate(center.x, center.y); c.rotate(sim.angle); c.scale(scale, scale);

    // Rear rim and subtly tinted empty volume.
    glassPath(c, 3);
    const body = c.createLinearGradient(-130, 0, 130, 0);
    body.addColorStop(0, '#0078bf30'); body.addColorStop(.055, '#82d8d51c');
    body.addColorStop(.2, '#ffffff55'); body.addColorStop(.48, '#dce7fa13');
    body.addColorStop(.76, '#e4f4ff28'); body.addColorStop(.95, '#82d8d52e'); body.addColorStop(1, '#3255a447');
    c.fillStyle = body; c.fill();
    c.strokeStyle = '#3255a455'; c.lineWidth = .8; c.stroke();

    c.save(); glassPath(c, 0); c.clip();
    // Batched grain rendering keeps the model's full resolution on mobile.
    for (let tint = 0; tint < PALETTE.length; tint++) {
      c.fillStyle = PALETTE[tint]; c.beginPath();
      for (let i = 0; i < sim.count; i++) if (sim.tint[i] === tint) {
        c.moveTo(sim.x[i] + RADIUS, sim.y[i]);
        c.arc(sim.x[i], sim.y[i], RADIUS, 0, Math.PI * 2);
      }
      c.fill();
    }
    const sandShade = c.createLinearGradient(-125, 0, 125, 0);
    sandShade.addColorStop(0, '#2634621b'); sandShade.addColorStop(.3, '#ffffff00'); sandShade.addColorStop(.8, '#ffffff00'); sandShade.addColorStop(1, '#26346212');
    c.fillStyle = sandShade; c.fillRect(-130, -220, 260, 440);
    c.restore();

    // Thin, curved edge reflections follow the actual collision boundary.
    for (const side of [-1, 1]) {
      c.beginPath();
      for (let y = -HALF_HEIGHT + 3; y <= HALF_HEIGHT - 3; y += 2) {
        const x = side * (widthAt(y) + 1);
        if (y === -HALF_HEIGHT + 3) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.lineWidth = side === -1 ? 2.6 : 1.4;
      c.strokeStyle = side === -1 ? '#ffffffe6' : '#3255a480'; c.stroke();
      c.beginPath();
      for (let y = -198; y <= 198; y += 2) {
        const x = side * (widthAt(y) - 4);
        if (y === -198) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.lineWidth = side === -1 ? 1 : .6; c.strokeStyle = side === -1 ? '#0078bf40' : '#ffffffcc'; c.stroke();
    }

    // Slender blown-glass rims; no opaque frame obscures the sand.
    for (const y of [-HALF_HEIGHT, HALF_HEIGHT]) {
      const rim = c.createLinearGradient(0, y - 5, 0, y + 5);
      rim.addColorStop(0, '#0078bf40'); rim.addColorStop(.45, '#f8fbffe6'); rim.addColorStop(1, '#3255a440');
      c.beginPath(); c.ellipse(0, y, widthAt(y) + 4, 5, 0, 0, Math.PI * 2);
      c.fillStyle = rim; c.fill(); c.strokeStyle = '#3255a45e'; c.lineWidth = .75; c.stroke();
      c.beginPath(); c.ellipse(0, y - 1, widthAt(y), 2, 0, Math.PI, Math.PI * 2);
      c.strokeStyle = '#fffffff2'; c.stroke();
    }

    // A soft front reflection gives the glass a quiet material presence.
    c.save(); glassPath(c, 0); c.clip();
    const reflection = c.createLinearGradient(-100, 0, 0, 0);
    reflection.addColorStop(0, '#ffffff00'); reflection.addColorStop(.35, '#ffffff27'); reflection.addColorStop(.55, '#ffffff06'); reflection.addColorStop(1, '#ffffff00');
    c.fillStyle = reflection; c.fillRect(-100, -218, 100, 436); c.restore();
    c.restore();
  }

  point(clientX, clientY) {
    const bounds = this.canvas.getBoundingClientRect();
    return { x: (clientX - bounds.left - this.center.x) / this.scale, y: (clientY - bounds.top - this.center.y) / this.scale };
  }
}
