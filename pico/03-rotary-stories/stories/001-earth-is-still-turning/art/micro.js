// Reflected-light micrographs of a living Avicennia marina leaf (adaxial surface).
//
// Each objective has a few focal planes drawn separately (z: 0 = deepest, 1 = highest) and
// pre-blurred at several strengths; the view mixes them by distance from the focus plane.
//   5×  leaf: midrib, secondary veins, waxy sheen, scattered salt crystals (glints)
//   20× epidermal cells; salt glands sit in small pits, each with a crystal
//   50× one salt gland: a rosette of secretory cells in a pit; above it a cubic NaCl crystal
// Biology checked: Avicennia excretes salt through multicellular glands sunk in epidermal
// depressions; the crystals are mostly sodium chloride and grow as cubes.
import { mulberry32 } from '../../../src/audio/dsp.js';

const LEVELS = 7;

function canvas(n) {
  const c = document.createElement('canvas');
  c.width = n;
  c.height = n;
  return c;
}

// Blur by repeated half-scaling (works in every browser, unlike ctx.filter).
function blurLevels(src) {
  const out = [src];
  let cur = src;
  for (let i = 1; i < LEVELS; i++) {
    const s = Math.max(4, Math.round(src.width / Math.pow(1.75, i)));
    const small = canvas(s);
    const g = small.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(cur, 0, 0, s, s);
    const back = canvas(src.width);
    const b = back.getContext('2d');
    b.imageSmoothingQuality = 'high';
    b.drawImage(small, 0, 0, src.width, src.width);
    out.push(back);
    cur = small;
  }
  return out;
}

function voronoiCells(g, N, rand, count, stroke, fill) {
  const pts = Array.from({ length: count }, () => [rand() * N, rand() * N]);
  // Cheap cell walls: for every pixel row step, mark where the nearest site changes.
  const step = Math.max(2, Math.round(N / 260));
  const nearest = (x, y) => {
    let best = 0;
    let bd = 1e12;
    for (let i = 0; i < pts.length; i++) {
      const dx = pts[i][0] - x;
      const dy = pts[i][1] - y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    return best;
  };
  const grid = [];
  for (let y = 0; y < N; y += step) {
    const row = [];
    for (let x = 0; x < N; x += step) row.push(nearest(x, y));
    grid.push(row);
  }
  if (fill) {
    for (let j = 0; j < grid.length; j++)
      for (let i = 0; i < grid[j].length; i++) {
        const k = grid[j][i];
        g.fillStyle = fill(k);
        g.fillRect(i * step, j * step, step, step);
      }
  }
  g.fillStyle = stroke;
  for (let j = 1; j < grid.length; j++)
    for (let i = 1; i < grid[j].length; i++) {
      const k = grid[j][i];
      if (k !== grid[j][i - 1] || k !== grid[j - 1][i]) g.fillRect(i * step - 1, j * step - 1, step + 1, step + 1);
    }
  return pts;
}

function crystal(g, x, y, s, rot, alpha = 1) {
  // A small cube seen from above, lit from upper left: three faces and a hard glint.
  g.save();
  g.translate(x, y);
  g.rotate(rot);
  g.globalAlpha = alpha;
  g.fillStyle = 'rgba(236,240,238,0.92)';
  g.fillRect(-s / 2, -s / 2, s, s);
  g.fillStyle = 'rgba(200,210,208,0.9)';
  g.beginPath();
  g.moveTo(s / 2, -s / 2);
  g.lineTo(s / 2 + s * 0.22, -s / 2 + s * 0.18);
  g.lineTo(s / 2 + s * 0.22, s / 2 + s * 0.18);
  g.lineTo(s / 2, s / 2);
  g.fill();
  g.fillStyle = 'rgba(170,182,180,0.9)';
  g.beginPath();
  g.moveTo(-s / 2, s / 2);
  g.lineTo(s / 2, s / 2);
  g.lineTo(s / 2 + s * 0.22, s / 2 + s * 0.18);
  g.lineTo(-s / 2 + s * 0.22, s / 2 + s * 0.18);
  g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)';
  g.lineWidth = Math.max(1, s * 0.05);
  g.beginPath();
  g.moveTo(-s / 2, s / 2);
  g.lineTo(-s / 2, -s / 2);
  g.lineTo(s / 2, -s / 2);
  g.stroke();
  // Terraced growth lines on the face, as real salt cubes show.
  g.strokeStyle = 'rgba(160,170,168,0.45)';
  g.lineWidth = Math.max(0.6, s * 0.02);
  for (let k = 1; k < 4; k++) {
    const q = (s / 2) * (k / 4);
    g.strokeRect(-q, -q, q * 2, q * 2);
  }
  g.restore();
}

function leafBase(g, N, rand, tint) {
  const bg = g.createRadialGradient(N * 0.4, N * 0.35, N * 0.05, N / 2, N / 2, N * 0.75);
  bg.addColorStop(0, `rgb(${120 + tint},${142 + tint},${108 + tint})`);
  bg.addColorStop(1, `rgb(${60 + tint},${82 + tint},${60 + tint})`);
  g.fillStyle = bg;
  g.fillRect(0, 0, N, N);
}

function make5x(N) {
  const r = mulberry32(5005);
  const surf = canvas(N);
  const g = surf.getContext('2d');
  leafBase(g, N, r, 0);
  // Midrib and secondary veins.
  g.strokeStyle = 'rgba(196,206,170,0.75)';
  g.lineWidth = N * 0.045;
  g.lineCap = 'round';
  g.beginPath();
  g.moveTo(-N * 0.1, N * 1.05);
  g.quadraticCurveTo(N * 0.45, N * 0.6, N * 1.1, -N * 0.05);
  g.stroke();
  g.strokeStyle = 'rgba(176,190,150,0.5)';
  for (let k = 0; k < 9; k++) {
    const t = k / 9;
    const x = -N * 0.1 + t * N * 1.2;
    const y = N * 1.05 - t * N * 1.1;
    for (const side of [-1, 1]) {
      g.lineWidth = N * 0.012;
      g.beginPath();
      g.moveTo(x, y);
      g.quadraticCurveTo(x + side * N * 0.18, y + side * N * 0.05, x + side * N * 0.3, y + side * N * 0.25);
      g.stroke();
    }
  }
  // Fine reticulate veins.
  g.strokeStyle = 'rgba(150,170,128,0.35)';
  g.lineWidth = 1.2;
  for (let k = 0; k < 140; k++) {
    const x = r() * N;
    const y = r() * N;
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + (r() - 0.5) * N * 0.12, y + (r() - 0.5) * N * 0.12);
    g.stroke();
  }
  // Waxy sheen.
  const sh = g.createLinearGradient(0, 0, N, N);
  sh.addColorStop(0.2, 'rgba(255,255,255,0)');
  sh.addColorStop(0.45, 'rgba(255,255,255,0.14)');
  sh.addColorStop(0.6, 'rgba(255,255,255,0)');
  g.fillStyle = sh;
  g.fillRect(0, 0, N, N);
  const cry = canvas(N);
  const c = cry.getContext('2d');
  for (let k = 0; k < 220; k++) {
    const s = N * (0.003 + r() * 0.005);
    c.fillStyle = `rgba(255,255,255,${0.5 + r() * 0.5})`;
    c.fillRect(r() * N, r() * N, s, s);
  }
  return { layers: [{ z: 0.5, levels: blurLevels(surf) }, { z: 0.53, levels: blurLevels(cry), over: true }], sharp: 0.5, sens: 7 };
}

function make20x(N) {
  const r = mulberry32(2020);
  const surf = canvas(N);
  const g = surf.getContext('2d');
  leafBase(g, N, r, 8);
  voronoiCells(g, N, r, 120, 'rgba(70,92,64,0.45)', (k) => `rgba(${130 + (k % 7) * 3},${150 + (k % 5) * 3},${112},0.35)`);
  const glands = Array.from({ length: 16 }, () => [N * (0.08 + r() * 0.84), N * (0.08 + r() * 0.84)]);
  for (const [x, y] of glands) {
    const pr = N * 0.035;
    const pit = g.createRadialGradient(x - pr * 0.2, y - pr * 0.2, pr * 0.1, x, y, pr);
    pit.addColorStop(0, 'rgba(60,78,52,0.95)');
    pit.addColorStop(0.75, 'rgba(84,104,72,0.85)');
    pit.addColorStop(1, 'rgba(160,178,140,0.6)');
    g.fillStyle = pit;
    g.beginPath();
    g.arc(x, y, pr, 0, Math.PI * 2);
    g.fill();
  }
  const cry = canvas(N);
  const c = cry.getContext('2d');
  for (const [x, y] of glands) crystal(c, x + N * 0.006, y - N * 0.008, N * (0.022 + r() * 0.014), (r() - 0.5) * 0.8);
  return { layers: [{ z: 0.42, levels: blurLevels(surf) }, { z: 0.64, levels: blurLevels(cry), over: true }], sharp: 0.42, sens: 12 };
}

function make50x(N) {
  const r = mulberry32(5050);
  const deep = canvas(N);
  const g = deep.getContext('2d');
  leafBase(g, N, r, 14);
  voronoiCells(g, N, r, 22, 'rgba(66,88,60,0.55)', (k) => `rgba(${140 + (k % 5) * 4},${160 + (k % 3) * 4},${120},0.4)`);
  // The pit.
  const cx = N / 2;
  const cy = N / 2;
  const pr = N * 0.26;
  const pit = g.createRadialGradient(cx, cy, pr * 0.2, cx, cy, pr);
  pit.addColorStop(0, 'rgba(48,64,44,1)');
  pit.addColorStop(0.8, 'rgba(70,92,62,0.9)');
  pit.addColorStop(1, 'rgba(140,160,120,0)');
  g.fillStyle = pit;
  g.beginPath();
  g.arc(cx, cy, pr, 0, Math.PI * 2);
  g.fill();
  // Secretory cells: a rosette of eight in the bottom of the pit.
  const mid = canvas(N);
  const m = mid.getContext('2d');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = cx + Math.cos(a) * N * 0.065;
    const y = cy + Math.sin(a) * N * 0.065;
    const cell = m.createRadialGradient(x - N * 0.01, y - N * 0.012, 1, x, y, N * 0.06);
    cell.addColorStop(0, 'rgba(206,214,170,0.95)');
    cell.addColorStop(0.7, 'rgba(146,164,116,0.95)');
    cell.addColorStop(1, 'rgba(84,104,72,0.9)');
    m.fillStyle = cell;
    m.beginPath();
    m.ellipse(x, y, N * 0.05, N * 0.036, a, 0, Math.PI * 2);
    m.fill();
    m.strokeStyle = 'rgba(56,72,48,0.8)';
    m.lineWidth = Math.max(1, N * 0.003);
    m.stroke();
  }
  m.fillStyle = 'rgba(80,98,66,1)';
  m.beginPath();
  m.arc(cx, cy, N * 0.02, 0, Math.PI * 2);
  m.fill();
  const top = canvas(N);
  const t = top.getContext('2d');
  crystal(t, cx + N * 0.05, cy - N * 0.06, N * 0.2, 0.32);
  return { layers: [{ z: 0.22, levels: blurLevels(deep) }, { z: 0.42, levels: blurLevels(mid), over: true }, { z: 0.78, levels: blurLevels(top), over: true }], sharp: 0.42, sens: 18 };
}

export const OBJECTIVES = [
  { mag: '5×', make: make5x, degPerRange: 540 },
  { mag: '20×', make: make20x, degPerRange: 1080 },
  { mag: '50×', make: make50x, degPerRange: 2160 },
];

// Draw one objective's view at focus f (0..1) into g (square N×N).
export function drawMicro(g, N, view, f) {
  for (const L of view.layers) {
    const blur = Math.min(LEVELS - 1, Math.abs(f - L.z) * view.sens);
    const i = Math.floor(blur);
    const t = blur - i;
    const a = L.levels[i];
    const b = L.levels[Math.min(LEVELS - 1, i + 1)];
    g.globalAlpha = 1;
    g.drawImage(a, 0, 0, N, N);
    if (t > 0.02 && b !== a) {
      g.globalAlpha = t;
      g.drawImage(b, 0, 0, N, N);
    }
  }
  g.globalAlpha = 1;
}

export function sharpness(view, f) {
  return Math.max(0, 1 - Math.abs(f - view.sharp) * view.sens);
}
