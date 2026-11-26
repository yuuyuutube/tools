// The sky from C-2. Stars are pre-drawn once into a disc centred on the ship's axis; each
// frame the disc is rotated (the habitat ring turns once every 40 s), which is cheap and keeps
// every star exactly where it belongs. No twinkle: there is no air out there.
import { mulberry32 } from '../../../src/audio/dsp.js';

export const AXIS_PERIOD = 40; // seconds per revolution of the habitat ring

export function makeStarLayer({ scale, radiusDeg = 80, seed = 1, count = 2200 }) {
  const size = Math.ceil(radiusDeg * scale * 2);
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const g = canvas.getContext('2d');
  const r = mulberry32(seed);
  const c = size / 2;
  // A faint band of the Milky Way crossing the field.
  g.save();
  g.translate(c, c);
  g.rotate(0.7);
  for (let i = 0; i < 900; i++) {
    const x = (r() * 2 - 1) * size * 0.5;
    const y = (r() + r() + r() - 1.5) * size * 0.09 + size * 0.12;
    const rad = 10 + r() * 50;
    const grd = g.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, 'rgba(190,196,210,0.022)');
    grd.addColorStop(1, 'rgba(190,196,210,0)');
    g.fillStyle = grd;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  g.restore();
  for (let i = 0; i < count; i++) {
    const rho = Math.sqrt(r()) * radiusDeg * scale;
    const th = r() * Math.PI * 2;
    const x = c + Math.cos(th) * rho;
    const y = c + Math.sin(th) * rho;
    const mag = Math.pow(r(), 3.2); // most stars faint, a few bright
    const tint = r();
    const col = tint < 0.15 ? [255, 214, 180] : tint < 0.3 ? [200, 216, 255] : [240, 240, 236];
    const a = 0.25 + mag * 0.75;
    const rad = 0.45 + mag * 1.3;
    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${a})`;
    g.beginPath();
    g.arc(x, y, rad, 0, Math.PI * 2);
    g.fill();
    if (mag > 0.75) {
      const grd = g.createRadialGradient(x, y, 0, x, y, rad * 5);
      grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0.18)`);
      grd.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grd;
      g.fillRect(x - rad * 5, y - rad * 5, rad * 10, rad * 10);
    }
  }
  return { canvas, size, scale };
}

// A star far brighter than anything in Earth's night sky: a hard core, a wide soft glare,
// and a faint cross from the eye's own optics.
export function drawBrightStar(g, p, { core = 3, glow = 120, color = [255, 255, 255], power = 1 }) {
  const [R, G, B] = color;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const grd = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, glow);
  grd.addColorStop(0, `rgba(${R},${G},${B},${0.55 * power})`);
  grd.addColorStop(0.05, `rgba(${R},${G},${B},${0.22 * power})`);
  grd.addColorStop(0.25, `rgba(${R},${G},${B},${0.05 * power})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(p.x - glow, p.y - glow, glow * 2, glow * 2);
  g.strokeStyle = `rgba(${R},${G},${B},${0.12 * power})`;
  g.lineWidth = 1;
  for (const a of [0.35, 0.35 + Math.PI / 2]) {
    g.beginPath();
    g.moveTo(p.x - Math.cos(a) * glow * 0.55, p.y - Math.sin(a) * glow * 0.55);
    g.lineTo(p.x + Math.cos(a) * glow * 0.55, p.y + Math.sin(a) * glow * 0.55);
    g.stroke();
  }
  g.fillStyle = `rgba(255,255,255,${power})`;
  g.beginPath();
  g.arc(p.x, p.y, core, 0, Math.PI * 2);
  g.fill();
  g.restore();
}
