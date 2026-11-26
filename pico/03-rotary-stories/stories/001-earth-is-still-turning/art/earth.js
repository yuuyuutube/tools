// Earth observation images for E-017 (頭汕漁港北堤, looking south-east over the village)
// and E-031 (汕尾溪口北岸, looking south-west over the estuary to the sea).
//
// One painter per site, f(entry) → picture. Everything that exists is placed from a fixed seed,
// and what changes is a function of the year, so sixty years stay spatially continuous: the same
// house is in the same place until the year it falls down. Style: flat screen-printed gouache
// with grain — an observation photograph reprinted, not a photograph.
import { mulberry32 } from '../../../src/audio/dsp.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ramp = (y, a, b) => clamp((y - a) / (b - a), 0, 1);
const mix = (c1, c2, t) => c1.map((v, i) => Math.round(lerp(v, c2[i], t)));
const rgb = (c, a = 1) => (a >= 1 ? `rgb(${c[0]},${c[1]},${c[2]})` : `rgba(${c[0]},${c[1]},${c[2]},${a})`);

// ---- light and season -----------------------------------------------------------------------

const SKY = {
  spring: { top: [158, 190, 206], mid: [204, 220, 222], low: [232, 230, 214], sea: [120, 150, 152], land: [118, 140, 96], light: 0.9, haze: 0.35, mountains: 0.4 },
  summer: { top: [72, 132, 184], mid: [148, 192, 216], low: [214, 226, 224], sea: [62, 116, 128], land: [86, 126, 70], light: 1.05, haze: 0.25, mountains: 0.1 },
  autumn: { top: [110, 156, 196], mid: [186, 208, 216], low: [236, 222, 196], sea: [96, 130, 140], land: [128, 132, 84], light: 1, haze: 0.18, mountains: 0.7 },
  winter: { top: [150, 160, 166], mid: [182, 186, 186], low: [206, 204, 196], sea: [112, 124, 126], land: [112, 120, 96], light: 0.78, haze: 0.45, mountains: 0.3 },
};

function lightOf(entry) {
  const s = { ...SKY[entry.season] };
  if (entry.weather === 'rain') {
    Object.assign(s, { top: [118, 124, 126], mid: [146, 150, 150], low: [168, 170, 166], light: 0.62, haze: 0.7, mountains: 0 });
  } else if (entry.weather === 'monsoon') {
    s.light *= 0.95;
  }
  return s;
}

// ---- shared texture -------------------------------------------------------------------------

let grainCache = null;
function grain(w, h) {
  if (grainCache && grainCache.width >= w && grainCache.height >= h) return grainCache;
  const c = document.createElement('canvas');
  c.width = Math.max(w, 64);
  c.height = Math.max(h, 64);
  const g = c.getContext('2d');
  const img = g.createImageData(c.width, c.height);
  const r = mulberry32(99);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 128 + (r() - 0.5) * 90;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  grainCache = c;
  return c;
}

function finish(g, W, H, entry, { strength = 1 } = {}) {
  // Print grain, a little vignette, and the colour of the camera that took it.
  const newCam = entry.camera === 'new';
  g.save();
  g.globalCompositeOperation = 'overlay';
  g.globalAlpha = (newCam ? 0.1 : 0.22) * strength;
  g.drawImage(grain(W, H), 0, 0);
  g.restore();
  const v = g.createRadialGradient(W / 2, H * 0.48, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, `rgba(20,16,10,${newCam ? 0.12 : 0.28})`);
  g.fillStyle = v;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalCompositeOperation = newCam ? 'soft-light' : 'multiply';
  g.fillStyle = newCam ? 'rgba(140,170,200,0.22)' : 'rgba(255,236,206,0.12)';
  g.fillRect(0, 0, W, H);
  g.restore();
}

function sky(g, W, H, horizon, L, seed, season, weather) {
  const grd = g.createLinearGradient(0, 0, 0, horizon);
  grd.addColorStop(0, rgb(L.top));
  grd.addColorStop(0.65, rgb(L.mid));
  grd.addColorStop(1, rgb(L.low));
  g.fillStyle = grd;
  g.fillRect(0, 0, W, horizon + 2);
  // Banding, as in a print with few colour steps.
  for (let i = 1; i < 6; i++) {
    g.fillStyle = `rgba(255,255,255,${0.018})`;
    g.fillRect(0, (horizon * i) / 6, W, horizon / 12);
  }
  const r = mulberry32(seed);
  if (weather === 'rain' || weather === 'monsoon') {
    for (let i = 0; i < 9; i++) {
      const y = horizon * (0.08 + r() * 0.75);
      g.fillStyle = `rgba(${weather === 'rain' ? '120,124,126' : '170,174,174'},${0.25 + r() * 0.25})`;
      g.beginPath();
      g.ellipse(r() * W, y, W * (0.2 + r() * 0.3), horizon * (0.05 + r() * 0.07), 0, 0, Math.PI * 2);
      g.fill();
    }
    return;
  }
  const n = season === 'summer' ? 6 : season === 'autumn' ? 7 : 4;
  for (let i = 0; i < n; i++) {
    const cx = r() * W;
    const cy = horizon * (season === 'summer' ? 0.55 + r() * 0.35 : 0.15 + r() * 0.5);
    if (season === 'summer') {
      // Cumulus: stacked lobes with a flat grey base.
      const s = W * (0.025 + r() * 0.035);
      g.fillStyle = 'rgba(214,222,228,0.95)';
      g.beginPath();
      g.ellipse(cx, cy, s * 1.6, s * 0.28, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(250,250,246,0.94)';
      for (let k = 0; k < 6; k++) {
        g.beginPath();
        g.arc(cx + (r() - 0.5) * s * 2.2, cy - s * 0.2 - r() * s * 0.9, s * (0.35 + r() * 0.45), 0, Math.PI * 2);
        g.fill();
      }
    } else {
      g.fillStyle = `rgba(255,255,255,${0.3 + r() * 0.3})`;
      g.beginPath();
      g.ellipse(cx, cy, W * (0.08 + r() * 0.16), horizon * 0.018, -0.05, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ---- E-017 ----------------------------------------------------------------------------------

// Fixed village layout (x in 0..1, w width, f floors, colour index). Seeded once, forever.
const HOUSES = (() => {
  const r = mulberry32(17017);
  const out = [];
  let x = 0.24;
  let i = 0;
  while (x < 0.83) {
    if (x > 0.335 && x < 0.405) {
      x = 0.405; // the temple
      continue;
    }
    if (x > 0.485 && x < 0.64) {
      x = 0.64; // the school
      continue;
    }
    const w = 0.016 + r() * 0.016;
    out.push({ i: i++, x, w, f: 2 + Math.floor(r() * 3), c: Math.floor(r() * 6), tank: r() < 0.6, back: r() < 0.35, roof: Math.floor(r() * 3) });
    x += w + 0.002 + r() * 0.004;
  }
  return out;
})();

const WALLS = [[222, 214, 196], [206, 200, 186], [214, 190, 176], [192, 202, 190], [226, 222, 208], [196, 184, 170]];
const ROOFS = [[92, 118, 140], [150, 82, 66], [128, 130, 128]];
const NEW_WALLS = [[236, 232, 220], [212, 222, 226], [230, 214, 196]];

export function paintE017(g, W, H, entry) {
  const y = entry.year;
  const L = lightOf(entry);
  const r = mulberry32(y * 131 + entry.month);
  g.save();
  g.fillStyle = '#000';
  g.fillRect(0, 0, W, H);
  // From 2111 the camera sits on a new bracket: a little further along, higher, ~3° turned.
  if (entry.mount === 'new') {
    g.translate(W / 2, H / 2);
    g.rotate((-0.35 * Math.PI) / 180);
    g.scale(1.045, 1.045);
    g.translate(-W / 2 - W * 0.03, -H / 2 + H * 0.025);
  }
  const hz = H * 0.4;
  sky(g, W * 1.1, H, hz, L, y * 3 + entry.month, entry.season, entry.weather);

  // Central Range, faint, on clear days.
  if (L.mountains > 0.05) {
    g.fillStyle = rgb(mix(L.mid, [96, 112, 132], 0.35), L.mountains * 0.65);
    g.beginPath();
    g.moveTo(-10, hz);
    const mr = mulberry32(5);
    for (let x = 0; x <= 1.1; x += 0.02) g.lineTo(x * W, hz - H * (0.025 + mr() * 0.02 + Math.sin(x * 7) * 0.012));
    g.lineTo(W * 1.1, hz);
    g.fill();
  }
  // Far coastal plain, then nearer fields and fishponds up to the village.
  g.fillStyle = rgb(mix(L.land, L.low, 0.55));
  g.fillRect(-W * 0.1, hz - 2, W * 1.3, H * 0.05);
  const fields = g.createLinearGradient(0, hz + H * 0.03, 0, H * 0.64);
  fields.addColorStop(0, rgb(mix(L.land, L.low, 0.4)));
  fields.addColorStop(1, rgb(mix(L.land, [70, 80, 60], 0.2)));
  g.fillStyle = fields;
  g.fillRect(-W * 0.1, hz + H * 0.03, W * 1.3, H * 0.64 - hz - H * 0.03);
  const fr = mulberry32(23);
  for (let k = 0; k < 14; k++) {
    g.fillStyle = rgb(mix(L.sea, L.mid, 0.5), 0.5);
    g.fillRect(fr() * W, hz + H * (0.05 + fr() * 0.06), W * (0.03 + fr() * 0.06), H * 0.008);
  }
  // Onshore turbines along the far coast.
  const turbines = y >= 2126 ? [0.54, 0.6, 0.66, 0.7, 0.78, 0.86, 0.93] : [0.62, 0.7];
  turbines.forEach((tx, k) => {
    const bx = tx * W;
    const top = hz - H * 0.09;
    g.strokeStyle = rgb(mix([240, 240, 236], L.low, 0.4));
    g.lineWidth = Math.max(1, W * 0.0018);
    g.beginPath();
    g.moveTo(bx, hz);
    g.lineTo(bx, top);
    g.stroke();
    const a0 = mulberry32(y * 10 + k)() * Math.PI * 2;
    for (let b = 0; b < 3; b++) {
      const a = a0 + (b * Math.PI * 2) / 3;
      g.beginPath();
      g.moveTo(bx, top);
      g.lineTo(bx + Math.cos(a) * H * 0.034, top + Math.sin(a) * H * 0.034);
      g.stroke();
    }
  });

  // Haze over the distance.
  g.fillStyle = rgb(L.low, L.haze * 0.5);
  g.fillRect(-W * 0.1, hz - H * 0.08, W * 1.3, H * 0.13);

  // Casuarina windbreak behind the village and on the left, growing over the decades.
  const grow = 0.55 + 0.45 * ramp(y, 2073, 2115);
  const tree = mix(L.land, [52, 74, 50], 0.55);
  const lean = entry.weather === 'monsoon' ? 0.6 : 0;
  function windbreak(x0, x1, base, hmax, seed, col) {
    const tr = mulberry32(seed);
    g.fillStyle = rgb(col);
    g.beginPath();
    g.moveTo(x0 * W, base);
    for (let x = x0; x <= x1; x += 0.006) {
      const hh = hmax * grow * (0.75 + tr() * 0.25);
      g.lineTo(x * W + lean * hh * 0.25, base - hh);
    }
    g.lineTo(x1 * W, base);
    g.fill();
  }
  windbreak(0.22, 0.98, H * 0.545, H * 0.07, 7, mix(tree, L.low, 0.35));
  windbreak(-0.02, 0.25, H * 0.62, H * 0.17, 9, tree);

  // Water tower (until March 2101).
  if (y < 2101) {
    const tx = W * 0.745;
    const base = H * 0.6;
    g.fillStyle = rgb(mix([196, 194, 186], L.low, 0.2));
    g.fillRect(tx - W * 0.002, base - H * 0.15, W * 0.005, H * 0.15);
    g.fillRect(tx + W * 0.016, base - H * 0.15, W * 0.005, H * 0.15);
    g.fillRect(tx - W * 0.006, base - H * 0.2, W * 0.032, H * 0.058);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    g.fillRect(tx - W * 0.006, base - H * 0.145, W * 0.032, H * 0.006);
  }

  // Village houses.
  const base = H * 0.62;
  const floorH = H * 0.034;
  const light = L.light;
  for (const h of HOUSES) {
    if (h.back) continue;
    drawHouse(h, false);
  }
  for (const h of HOUSES) if (h.back) drawHouse(h, true);
  function drawHouse(h, back) {
    let f = h.f;
    if (y >= 2078 && (h.i === 5 || h.i === 14)) f += 1;
    const collapsed = y >= 2104 && (h.i === 3 || h.i === 17);
    const x = h.x * W;
    const w = h.w * W;
    const b = back ? base - H * 0.012 : base;
    if (collapsed) {
      g.fillStyle = rgb(mix(WALLS[h.c], [120, 116, 108], 0.4));
      g.fillRect(x, b - floorH * 1.1, w * 0.35, floorH * 1.1);
      g.fillStyle = rgb(mix(L.land, [90, 120, 70], 0.4 + ramp(y, 2104, 2125) * 0.3));
      g.beginPath();
      g.ellipse(x + w * 0.6, b, w * 0.7, floorH * 0.7, 0, Math.PI, 0);
      g.fill();
      return;
    }
    const top = b - f * floorH;
    const wall = mix(WALLS[h.c], [0, 0, 0], back ? 0.12 : 0);
    g.fillStyle = rgb(mix(wall, [255, 255, 255], (light - 0.9) * 0.6));
    g.fillRect(x, top, w, b - top);
    // Shaded side (the morning sun is ahead of the camera).
    g.fillStyle = 'rgba(40,34,30,0.16)';
    g.fillRect(x + w * 0.72, top, w * 0.28, b - top);
    // Windows, floor by floor.
    g.fillStyle = 'rgba(40,44,46,0.55)';
    for (let k = 0; k < f; k++) g.fillRect(x + w * 0.2, top + k * floorH + floorH * 0.3, w * 0.45, floorH * 0.38);
    // Tin roof line and a rooftop water tank.
    g.fillStyle = rgb(ROOFS[h.roof]);
    g.fillRect(x - 1, top - floorH * 0.18, w + 2, floorH * 0.22);
    if (h.tank) {
      g.fillStyle = h.c % 2 ? 'rgb(232,232,226)' : 'rgb(86,128,168)';
      g.fillRect(x + w * 0.2, top - floorH * 0.7, w * 0.36, floorH * 0.5);
    }
    // Rooftop solar from 2100, more each decade.
    if (y >= 2100 && (h.i * 7 + 3) % 10 < Math.floor(ramp(y, 2100, 2130) * 7) + 3) {
      g.fillStyle = 'rgb(46,58,78)';
      g.fillRect(x + w * 0.05, top - floorH * 0.42, w * 0.6, floorH * 0.22);
    }
  }

  // New homes on the right (H21–H26), from 2117.
  if (y >= 2117) {
    for (let k = 0; k < 6; k++) {
      const x = W * (0.835 + k * 0.022);
      const top = base - floorH * 3;
      g.fillStyle = rgb(NEW_WALLS[k % 3]);
      g.fillRect(x, top, W * 0.019, base - top);
      g.fillStyle = 'rgba(40,44,46,0.5)';
      for (let f = 0; f < 3; f++) g.fillRect(x + W * 0.004, top + f * floorH + floorH * 0.3, W * 0.01, floorH * 0.4);
      g.fillStyle = 'rgb(46,58,78)';
      g.fillRect(x, top - floorH * 0.25, W * 0.019, floorH * 0.25);
    }
    if (y >= 2124) {
      for (let k = 0; k < 6; k++) {
        const x = W * (0.84 + k * 0.022);
        g.fillStyle = rgb(NEW_WALLS[(k + 1) % 3]);
        g.fillRect(x, base - floorH * 2 - H * 0.012, W * 0.018, floorH * 2);
      }
    }
  }

  // Temple: red-orange walls, a swallowtail ridge.
  {
    const x0 = W * 0.34;
    const x1 = W * 0.4;
    const top = base - floorH * 1.6;
    g.fillStyle = rgb(mix([196, 92, 62], [230, 120, 80], y >= 2121 ? 0.4 : 0)); // repainted in the 2120s
    g.fillRect(x0, top, x1 - x0, base - top);
    g.fillStyle = 'rgba(60,30,20,0.35)';
    g.fillRect(x0 + (x1 - x0) * 0.4, top + floorH * 0.5, (x1 - x0) * 0.2, base - top - floorH * 0.5);
    g.fillStyle = rgb([118, 62, 44]);
    g.beginPath();
    g.moveTo(x0 - W * 0.006, top);
    g.quadraticCurveTo((x0 + x1) / 2, top - floorH * 0.5, x1 + W * 0.006, top);
    g.quadraticCurveTo(x1 + W * 0.012, top - floorH * 1.3, x1 + W * 0.014, top - floorH * 1.5);
    g.quadraticCurveTo(x1, top - floorH * 0.9, (x0 + x1) / 2, top - floorH * 0.85);
    g.quadraticCurveTo(x0, top - floorH * 0.9, x0 - W * 0.014, top - floorH * 1.5);
    g.quadraticCurveTo(x0 - W * 0.012, top - floorH * 1.3, x0 - W * 0.006, top);
    g.fill();
    g.fillStyle = 'rgb(70,140,120)';
    g.fillRect((x0 + x1) / 2 - W * 0.004, top - floorH * 1.05, W * 0.008, floorH * 0.25);
  }

  // The school (B04): a three-storey block with corridors, a stair tower, the flagpole, the yard.
  const sx0 = W * 0.49;
  const sx1 = W * 0.635;
  const stop = base - floorH * 3.3;
  const closed = y >= 2086 && y < 2088;
  const center = y >= 2088;
  g.fillStyle = rgb(mix([234, 226, 206], [255, 255, 255], (light - 0.9) * 0.5));
  g.fillRect(sx0, stop, sx1 - sx0, base - stop);
  for (let k = 0; k < 3; k++) {
    const fy = stop + k * floorH * 1.1;
    g.fillStyle = 'rgba(70,64,56,0.55)';
    g.fillRect(sx0, fy + floorH * 0.85, sx1 - sx0, floorH * 0.12); // corridor rail
    g.fillStyle = closed ? 'rgba(40,42,44,0.7)' : 'rgba(60,70,76,0.45)';
    for (let wx = sx0 + W * 0.005; wx < sx1 - W * 0.006; wx += W * 0.0115) g.fillRect(wx, fy + floorH * 0.25, W * 0.007, floorH * 0.5);
  }
  g.fillStyle = rgb([206, 196, 176]);
  g.fillRect(sx1 - W * 0.014, stop - floorH * 0.6, W * 0.014, base - stop + floorH * 0.6); // stair tower
  // Name board over the entrance: green for the school, terracotta for the community centre.
  g.fillStyle = center ? 'rgb(168,88,58)' : 'rgb(46,96,70)';
  if (!closed) g.fillRect(sx0 + W * 0.04, stop - floorH * 0.42, W * 0.05, floorH * 0.34);
  // A mural on the end wall from 2124.
  if (y >= 2124) {
    const mx = sx0;
    const mw = W * 0.025;
    [[232, 180, 70], [70, 140, 160], [214, 96, 70], [120, 170, 96]].forEach((c, k) => {
      g.fillStyle = rgb(c, 0.85);
      g.beginPath();
      g.arc(mx + mw * (0.2 + (k % 2) * 0.55), stop + floorH * (0.8 + k * 0.7), floorH * 0.55, 0, Math.PI * 2);
      g.fill();
    });
  }
  // Flagpole — kept.
  g.fillStyle = 'rgb(210,210,206)';
  g.fillRect(W * 0.645, base - floorH * 5.6, Math.max(1, W * 0.0012), floorH * 5.6);
  if (!closed && entry.weather !== 'rain') {
    g.fillStyle = center ? 'rgb(214,214,206)' : 'rgb(190,58,52)';
    g.fillRect(W * 0.6462, base - floorH * 5.5, W * 0.012, floorH * 0.5);
  }

  // Coast road, then the seawall (raised in 2094).
  g.fillStyle = rgb(mix([150, 146, 136], L.low, 0.1));
  g.fillRect(-W * 0.1, base, W * 1.3, H * 0.028);
  // The yard in front of the school: track, then half a vegetable garden.
  const yardTop = base;
  g.fillStyle = closed ? 'rgb(138,150,100)' : 'rgb(176,92,70)';
  g.fillRect(sx0 - W * 0.01, yardTop, sx1 - sx0 + W * 0.02, H * 0.008);
  if (center) {
    const gr = mulberry32(88);
    for (let k = 0; k < 12; k++) {
      g.fillStyle = rgb(mix([84, 128, 64], [140, 160, 80], gr()), y >= 2124 ? 1 : 0.85);
      g.fillRect(sx0 - W * 0.01 + k * W * 0.0065, yardTop, W * 0.004, H * 0.008);
    }
  }
  // Scooters and cars on the road.
  const traffic = 3 + Math.floor(r() * 4);
  for (let k = 0; k < traffic; k++) {
    g.fillStyle = ['rgb(220,220,214)', 'rgb(160,40,36)', 'rgb(60,70,90)', 'rgb(230,200,90)'][k % 4];
    g.fillRect(r() * W, base + H * 0.006, W * (r() < 0.6 ? 0.004 : 0.012), H * 0.008);
  }
  // Bicycles at the community centre from 2124.
  if (y >= 2124) {
    for (let k = 0; k < 5; k++) {
      g.strokeStyle = ['rgb(210,70,60)', 'rgb(60,120,180)', 'rgb(240,200,60)'][k % 3];
      g.lineWidth = 1;
      g.beginPath();
      g.arc(sx0 + W * (0.06 + k * 0.007), base + H * 0.004, H * 0.0035, 0, Math.PI * 2);
      g.stroke();
    }
  }
  const raised = y >= 2094;
  const wallTop = raised ? H * 0.638 : H * 0.648;
  g.fillStyle = rgb(mix(raised ? [196, 196, 190] : [170, 166, 156], L.low, 0.1));
  g.fillRect(-W * 0.1, wallTop, W * 1.3, H * 0.675 - wallTop);
  if (raised) {
    g.fillStyle = rgb([150, 146, 136]);
    g.fillRect(-W * 0.1, H * 0.648, W * 1.3, 1.5);
  }
  g.fillStyle = 'rgba(0,0,0,0.12)';
  g.fillRect(-W * 0.1, H * 0.67, W * 1.3, H * 0.006);

  // River mouth on the right, and the mangroves that arrive in the 2100s.
  g.fillStyle = rgb(mix(L.sea, L.low, 0.3));
  g.fillRect(W * 0.9, H * 0.62, W * 0.25, H * 0.05);
  const mg = ramp(y, 2104, 2133);
  if (mg > 0) {
    const mr = mulberry32(31);
    g.fillStyle = rgb([44, 78, 56]);
    for (let k = 0; k < 40; k++) {
      const t = mr();
      if (t > mg) continue;
      g.beginPath();
      g.ellipse(W * (0.9 + mr() * 0.2), H * (0.628 + mr() * 0.025), W * (0.008 + mg * 0.014), H * (0.008 + mg * 0.01), 0, 0, Math.PI * 2);
      g.fill();
    }
  }

  // Harbour water.
  const seaTop = H * 0.675;
  const sg = g.createLinearGradient(0, seaTop, 0, H);
  sg.addColorStop(0, rgb(mix(L.sea, L.low, 0.25)));
  sg.addColorStop(1, rgb(mix(L.sea, [20, 40, 46], 0.35)));
  g.fillStyle = sg;
  g.fillRect(-W * 0.1, seaTop, W * 1.3, H - seaTop);
  const chop = entry.weather === 'monsoon' ? 1.6 : 1;
  for (let k = 0; k < 140; k++) {
    const yy = seaTop + Math.pow(r(), 1.6) * (H - seaTop);
    const len = W * (0.01 + r() * 0.04) * (0.4 + (yy - seaTop) / (H - seaTop));
    g.fillStyle = `rgba(255,255,255,${0.05 + r() * 0.1 * chop})`;
    g.fillRect(r() * W * 1.1, yy, len, 1 + (yy - seaTop) / H * 2);
  }
  // Moored boats: plastic-pipe rafts with blue canopies; fewer over time; electric boats later.
  const rafts = Math.round(lerp(7, 3, ramp(y, 2073, 2133)));
  const eboats = y >= 2112 ? Math.round(lerp(2, 4, ramp(y, 2112, 2133))) : 0;
  const slots = [0.22, 0.3, 0.38, 0.46, 0.55, 0.63, 0.71, 0.8];
  for (let k = 0; k < rafts + eboats; k++) {
    const bx = W * (slots[k % slots.length] + (r() - 0.5) * 0.015);
    const by = H * (0.73 + (k % 3) * 0.045 + r() * 0.012);
    const s = 1.3 + (by / H - 0.73) * 3;
    if (k < rafts) {
      g.fillStyle = 'rgb(226,226,218)';
      g.fillRect(bx, by, W * 0.05 * s, H * 0.007 * s);
      g.fillStyle = 'rgb(70,116,168)';
      g.fillRect(bx + W * 0.012 * s, by - H * 0.016 * s, W * 0.018 * s, H * 0.012 * s);
      g.fillStyle = 'rgba(30,30,30,0.7)';
      g.fillRect(bx + W * 0.046 * s, by - H * 0.008 * s, W * 0.003 * s, H * 0.012 * s);
    } else {
      g.fillStyle = 'rgb(240,240,236)';
      g.beginPath();
      g.moveTo(bx, by);
      g.lineTo(bx + W * 0.045 * s, by);
      g.lineTo(bx + W * 0.04 * s, by + H * 0.01 * s);
      g.lineTo(bx + W * 0.004 * s, by + H * 0.01 * s);
      g.fill();
      g.fillStyle = 'rgb(52,60,70)';
      g.fillRect(bx + W * 0.012 * s, by - H * 0.012 * s, W * 0.016 * s, H * 0.012 * s);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)';
    g.fillRect(bx, by + H * 0.012 * s, W * 0.05 * s, 1.5);
  }

  // The breakwater the camera stands on, lower left, with tetrapods.
  g.fillStyle = rgb(mix([158, 154, 144], L.low, 0.1));
  g.beginPath();
  g.moveTo(-W * 0.1, H * 0.84);
  g.lineTo(W * 0.16, H * 0.9);
  g.lineTo(W * 0.24, H * 1.02);
  g.lineTo(-W * 0.1, H * 1.02);
  g.fill();
  const tr = mulberry32(4);
  for (let k = 0; k < 18; k++) {
    const tx = W * (0.02 + tr() * 0.2);
    const ty = H * (0.86 + tr() * 0.12);
    const tone = Math.round(132 + tr() * 30);
    g.fillStyle = rgb(mix([tone, tone - 2, tone - 8], L.low, 0.1));
    g.beginPath();
    g.ellipse(tx, ty, W * 0.016, H * 0.016, tr() * 3, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.ellipse(tx + W * 0.004, ty + H * 0.006, W * 0.012, H * 0.008, 0, 0, Math.PI * 2);
    g.fill();
  }

  // Rain.
  if (entry.weather === 'rain') {
    g.strokeStyle = 'rgba(230,234,236,0.22)';
    g.lineWidth = 1;
    const rr = mulberry32(2100);
    for (let k = 0; k < 500; k++) {
      const x = rr() * W;
      const yy = rr() * H;
      g.beginPath();
      g.moveTo(x, yy);
      g.lineTo(x - W * 0.004, yy + H * 0.03);
      g.stroke();
    }
    g.fillStyle = 'rgba(180,186,188,0.18)';
    g.fillRect(0, 0, W, H);
  }
  // People in the 2083 school yard, tiny.
  if (y < 2086 && entry.month >= 2 && entry.month <= 6 || y === 2083) {
    for (let k = 0; k < 9; k++) {
      g.fillStyle = k % 3 ? 'rgb(250,250,246)' : 'rgb(40,60,110)';
      g.fillRect(sx0 + r() * (sx1 - sx0), base + H * 0.001, W * 0.0018, H * 0.006);
    }
  }
  g.restore();
  finish(g, W, H, entry);
  return anchorsE017(entry, W, H);
}

function anchorsE017(entry, W, H) {
  const pts = {
    B04: [0.56, 0.49],
    M01: [0.37, 0.545],
    S01: [0.12, 0.66],
    R01: [0.3, 0.632],
  };
  if (entry.year < 2101) pts.T01 = [0.76, 0.41];
  if (entry.year >= 2117) pts.H21 = [0.9, 0.52];
  // Same transform as the new mount.
  const map = ([x, y]) => {
    if (entry.mount !== 'new') return [x * W, y * H];
    let px = x * W - W / 2 - W * 0.03;
    let py = y * H - H / 2 + H * 0.025;
    px *= 1.045;
    py *= 1.045;
    const a = (-0.35 * Math.PI) / 180;
    return [W / 2 + px * Math.cos(a) - py * Math.sin(a), H / 2 + px * Math.sin(a) + py * Math.cos(a)];
  };
  return Object.fromEntries(Object.entries(pts).map(([k, v]) => [k, map(v)]));
}

// ---- E-031 ----------------------------------------------------------------------------------

export function paintE031(g, W, H, entry) {
  const y = entry.year;
  const L = lightOf(entry);
  const r = mulberry32(y * 977 + entry.month);
  g.save();
  const hz = H * 0.4;
  sky(g, W, H, hz, L, y * 5 + entry.month, entry.season, entry.weather);
  // Open sea to the south-west, a long low horizon.
  g.fillStyle = rgb(mix(L.sea, L.mid, 0.25));
  g.fillRect(0, hz, W, H * 0.06);
  g.fillStyle = 'rgba(255,255,255,0.18)';
  for (let k = 0; k < 40; k++) g.fillRect(r() * W, hz + r() * H * 0.05, W * 0.03 * r(), 1);
  // Sandbar: its shape drifts over the decades.
  const drift = Math.sin((y - 2073) * 0.21) * 0.06;
  g.fillStyle = rgb(mix([214, 204, 176], L.low, 0.2));
  g.beginPath();
  g.moveTo(W * (0.1 + drift), hz + H * 0.06);
  g.quadraticCurveTo(W * (0.45 + drift), hz + H * 0.035, W * (0.85 + drift * 0.5), hz + H * 0.065);
  g.quadraticCurveTo(W * 0.5, hz + H * 0.08, W * (0.1 + drift), hz + H * 0.06);
  g.fill();
  // Estuary and mudflat.
  g.fillStyle = rgb(mix(L.sea, [120, 116, 96], 0.35));
  g.fillRect(0, hz + H * 0.06, W, H * 0.12);
  const flat = g.createLinearGradient(0, hz + H * 0.12, 0, hz + H * 0.24);
  flat.addColorStop(0, rgb([128, 120, 98]));
  flat.addColorStop(1, rgb([108, 100, 82]));
  g.fillStyle = flat;
  g.beginPath();
  g.moveTo(0, hz + H * 0.15);
  g.quadraticCurveTo(W * 0.5, hz + H * 0.11, W, hz + H * 0.16);
  g.lineTo(W, hz + H * 0.26);
  g.lineTo(0, hz + H * 0.26);
  g.fill();
  // Puddles reflecting the sky.
  for (let k = 0; k < 26; k++) {
    g.fillStyle = rgb(mix(L.mid, L.low, 0.4), 0.55);
    g.beginPath();
    g.ellipse(r() * W, hz + H * (0.15 + r() * 0.09), W * (0.01 + r() * 0.04), H * 0.004, 0, 0, Math.PI * 2);
    g.fill();
  }
  // Mangroves (海茄苳): seedlings from 2105, a widening band after 2112.
  const mg = ramp(y, 2104, 2132);
  if (mg > 0) {
    const mr = mulberry32(3131);
    for (let k = 0; k < 160; k++) {
      const t = mr();
      const x = W * (0.48 + mr() * 0.5);
      const yy = hz + H * (0.135 + mr() * 0.07);
      if (t > mg) continue;
      const s = (0.3 + mg) * (0.6 + mr() * 0.6);
      g.fillStyle = rgb(mix([58, 96, 66], [36, 70, 50], mr()));
      g.beginPath();
      g.ellipse(x, yy, W * 0.008 * s, H * 0.012 * s, 0, 0, Math.PI * 2);
      g.fill();
    }
  }
  // Spoonbills and egrets in the shallows.
  const birds = entry.count || 0;
  const br = mulberry32(y * 17 + 1);
  const flockX = W * (0.2 + br() * 0.15);
  for (let k = 0; k < birds; k++) {
    const x = flockX + (br() - 0.5) * W * 0.16;
    const yy = hz + H * (0.175 + (br() - 0.5) * 0.02);
    g.fillStyle = 'rgb(246,246,240)';
    g.beginPath();
    g.ellipse(x, yy, W * 0.0035, H * 0.0035, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = 'rgb(30,30,30)';
    g.fillRect(x + W * 0.003, yy - H * 0.001, W * 0.003, Math.max(1, H * 0.0012));
  }
  for (let k = 0; k < 3 + (y > 2100 ? 6 : 0); k++) {
    g.fillStyle = 'rgb(250,250,246)';
    g.fillRect(W * (0.55 + br() * 0.4), hz + H * (0.17 + br() * 0.05), W * 0.0022, H * 0.008);
  }

  // Near ground: dikes, old salt pans (left), fish ponds (right), the northern ponds with solar.
  const groundTop = hz + H * 0.26;
  g.fillStyle = rgb(mix(L.land, [140, 132, 100], 0.5));
  g.fillRect(0, groundTop, W, H - groundTop);
  // Salt pans: a grid of shallow squares, slowly greening.
  const green = ramp(y, 2073, 2132);
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const x = W * (0.02 + col * 0.075);
      const yy = groundTop + H * [0.02, 0.07, 0.14][row];
      const w = W * 0.066;
      const hh = H * [0.035, 0.05, 0.07][row];
      g.fillStyle = rgb(mix(mix(L.mid, [180, 176, 160], 0.4), [110, 130, 90], green * ((row + col) % 3 === 0 ? 0.8 : 0.4)));
      g.fillRect(x, yy, w, hh);
    }
  }
  // Fish ponds on the right half (north pond = the right-hand one, nearest).
  const solar = y >= 2096 && y < 2126;
  const breached = y >= 2126;
  const ponds = [
    { x: 0.5, y: 0.025, w: 0.22, h: 0.07, north: false },
    { x: 0.74, y: 0.025, w: 0.24, h: 0.07, north: false },
    { x: 0.52, y: 0.12, w: 0.46, h: 0.14, north: true },
  ];
  for (const p of ponds) {
    const x = W * p.x;
    const yy = groundTop + H * p.y;
    const w = W * p.w;
    const hh = H * p.h;
    g.fillStyle = rgb([176, 170, 150]);
    g.fillRect(x - W * 0.006, yy - H * 0.008, w + W * 0.012, hh + H * 0.016);
    if (p.north && breached) {
      // Tidal now: mud and channels, fresh green at the edges.
      g.fillStyle = rgb([118, 110, 90]);
      g.fillRect(x, yy, w, hh);
      g.strokeStyle = rgb(mix(L.mid, L.sea, 0.4));
      g.lineWidth = 2;
      for (let k = 0; k < 5; k++) {
        g.beginPath();
        g.moveTo(x + w * 0.1, yy + hh * (0.2 + k * 0.15));
        g.bezierCurveTo(x + w * 0.4, yy + hh * (0.1 + k * 0.2), x + w * 0.6, yy + hh * (0.3 + k * 0.1), x + w, yy + hh * (0.25 + k * 0.15));
        g.stroke();
      }
      // The gap in the dike.
      g.fillStyle = rgb(mix(L.sea, [120, 116, 96], 0.3));
      g.fillRect(x + w * 0.45, yy - H * 0.01, w * 0.08, H * 0.012);
      g.fillStyle = rgb([84, 120, 72], 0.8);
      g.fillRect(x, yy + hh - H * 0.012, w, H * 0.012);
    } else {
      g.fillStyle = rgb(mix(L.sea, L.mid, 0.3));
      g.fillRect(x, yy, w, hh);
      // Paddlewheel aerators.
      g.fillStyle = 'rgb(240,240,232)';
      g.fillRect(x + w * 0.3, yy + hh * 0.4, w * 0.04, hh * 0.08);
      g.fillRect(x + w * 0.7, yy + hh * 0.6, w * 0.04, hh * 0.08);
      if (p.north && solar) {
        // Raised panels over the pond.
        for (let row = 0; row < 4; row++) {
          g.fillStyle = 'rgb(40,52,72)';
          g.fillRect(x + w * 0.04, yy + hh * (0.08 + row * 0.23), w * 0.92, hh * 0.13);
          g.fillStyle = 'rgba(200,220,240,0.25)';
          g.fillRect(x + w * 0.04, yy + hh * (0.08 + row * 0.23), w * 0.92, 1.5);
        }
      } else if (y < 2096 && p.north && y > 2085) {
        // Some ponds lie idle in the late 2080s and early 2090s.
        g.fillStyle = rgb([128, 140, 96], 0.4);
        g.fillRect(x, yy + hh * 0.6, w, hh * 0.4);
      }
    }
  }
  // Boardwalk and hide from 2119.
  if (y >= 2119) {
    g.strokeStyle = 'rgb(150,112,74)';
    g.lineWidth = Math.max(2, H * 0.006);
    g.beginPath();
    g.moveTo(W * 0.46, H);
    g.lineTo(W * 0.48, groundTop + H * 0.04);
    g.lineTo(W * 0.5, hz + H * 0.19);
    g.stroke();
    g.fillStyle = 'rgb(126,92,62)';
    g.fillRect(W * 0.49, hz + H * 0.165, W * 0.03, H * 0.025);
    g.fillStyle = 'rgb(70,52,36)';
    g.fillRect(W * 0.486, hz + H * 0.16, W * 0.038, H * 0.008);
  }
  // The dike the camera stands on, foreground.
  g.fillStyle = rgb(mix([168, 160, 136], L.low, 0.1));
  g.fillRect(0, H * 0.93, W, H * 0.07);
  g.fillStyle = rgb([110, 130, 80], 0.6);
  for (let k = 0; k < 60; k++) g.fillRect(r() * W, H * (0.925 + r() * 0.01), W * 0.003, H * 0.012);
  g.restore();
  finish(g, W, H, entry);
  return {
    W03: [W * 0.75, groundTop + H * 0.17],
    V07: y >= 2105 ? [W * 0.72, hz + H * 0.14] : null,
    D02: y >= 2119 ? [W * 0.505, hz + H * 0.16] : null,
  };
}

// Render an entry into a fresh canvas.
export function renderEntry(entry, W, H) {
  const c = document.createElement('canvas');
  c.width = Math.round(W);
  c.height = Math.round(H);
  const g = c.getContext('2d');
  const anchors = entry.site === 'E-017' ? paintE017(g, c.width, c.height, entry) : paintE031(g, c.width, c.height, entry);
  c.anchors = anchors;
  return c;
}
