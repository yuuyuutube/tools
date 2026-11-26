// Ad, landing day. A 360° shoreline seen from the mast camera at station 001.
//
//   north (330–60°)  a tableland; the landing site on the plain before it
//   east  (60–140°)  rocky coast, distant peaks; α Cen B, a bright orange point by day
//   south (140–260°) tidal flat, white salt crust, stromatolite domes in the shallows; α Cen A high-ish
//   west  (260–330°) open sea, cloud bank
// There are microbes here and nothing else: no plants, no animals.
// The picture is a function of (azimuth, focal length, focus distance) and is deterministic,
// so the reader's photograph can always be re-rendered from its parameters.
import { mulberry32, valueNoise } from '../../../src/audio/dsp.js';

const TAU = Math.PI * 2;
const wrap = (a) => ((a % 360) + 360) % 360;
const angDiff = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const SUN_A = { az: 172, el: 21 };
export const SUN_B = { az: 104, el: 17 };

export function fovFor(mm) {
  return (2 * Math.atan(18 / mm) * 180) / Math.PI; // 36 mm-wide frame
}

// Terrain profiles by azimuth (elevation in degrees above the horizon).
const nM = valueNoise(901, 0.09);
const nM2 = valueNoise(902, 0.35);
function mountains(az) {
  const seaFade = 1 - smooth(255, 275, az) * (1 - smooth(325, 345, az));
  return (0.9 + nM(az) * 2.4 + nM2(az) * 0.6) * seaFade;
}
const nP = valueNoise(903, 0.5);
function plateau(az) {
  // A flat-topped tableland in the north with steep ends.
  const d = Math.abs(angDiff(az, 15));
  if (d > 55) return 0;
  const edge = smooth(55, 40, d);
  return edge * (2.2 + nP(az) * 0.15);
}
function landIsSea(az) {
  const a = wrap(az);
  return a > 262 && a < 350;
}

const rocks = (() => {
  const r = mulberry32(77);
  return Array.from({ length: 90 }, () => {
    const az = r() * 360;
    const sea = landIsSea(az);
    return { az, dist: 4 + Math.pow(r(), 1.6) * 60, size: 0.2 + r() * 0.9, sea, tone: r() };
  }).filter((x) => !x.sea);
})();

const domes = (() => {
  const r = mulberry32(78);
  return Array.from({ length: 70 }, () => ({ az: 150 + r() * 115, dist: 25 + Math.pow(r(), 1.3) * 300, size: 0.6 + r() * 1.6, t: r() }));
})();

const salt = (() => {
  const r = mulberry32(79);
  return Array.from({ length: 70 }, () => ({ az: 130 + r() * 140, dist: 18 + Math.pow(r(), 1.4) * 260, w: 1.5 + r() * 5, t: r() }));
})();

// Layers for depth of field: near (2–12 m), mid (12–600 m), far (beyond).
const LAYERS = [
  { name: 'far', dist: 5000 },
  { name: 'mid', dist: 120 },
  { name: 'near', dist: 6 },
];

function project(az, el, view) {
  const x = view.W / 2 + (angDiff(az, view.az) / view.fov) * view.W;
  const y = view.horizon - (el / view.vfov) * view.H;
  return [x, y];
}

// Elevation (negative = below horizon) of a ground point at distance d for a camera 4 m up.
const groundEl = (d) => -(Math.atan(4 / d) * 180) / Math.PI;

function drawSky(g, view) {
  const { W, H, horizon } = view;
  const grd = g.createLinearGradient(0, 0, 0, horizon);
  grd.addColorStop(0, '#5f8fbd');
  grd.addColorStop(0.55, '#97b8d4');
  grd.addColorStop(1, '#d9e3e6');
  g.fillStyle = grd;
  g.fillRect(0, 0, W, horizon + 1);
  // A cloud bank over the western sea.
  const r = mulberry32(5);
  for (let k = 0; k < 14; k++) {
    const az = 255 + r() * 90;
    const el = 1.2 + r() * 5;
    const [x, y] = project(az, el, view);
    if (x < -W || x > W * 2) continue;
    const w = (5 + r() * 9) / view.fov * W;
    g.fillStyle = `rgba(250,250,248,${0.25 + r() * 0.35})`;
    g.beginPath();
    g.ellipse(x, y, w, w * 0.18, 0, 0, TAU);
    g.fill();
  }
  // Thin high cloud across the south.
  for (let k = 0; k < 10; k++) {
    const az = 120 + r() * 140;
    const [x, y] = project(az, 12 + r() * 14, view);
    g.fillStyle = 'rgba(255,255,255,0.18)';
    g.beginPath();
    g.ellipse(x, y, (14 / view.fov) * W, (0.6 / view.vfov) * H, -0.05, 0, TAU);
    g.fill();
  }
}

function drawStar(g, view, s, { core, glow, color, power }) {
  const [x, y] = project(s.az, s.el, view);
  const reach = glow * (view.W / 900) * (60 / view.fov) ** 0.3;
  if (x < -reach || x > view.W + reach || y < -reach || y > view.H + reach) return;
  g.save();
  g.globalCompositeOperation = 'lighter';
  const grd = g.createRadialGradient(x, y, 0, x, y, reach);
  grd.addColorStop(0, `rgba(${color},${0.95 * power})`);
  grd.addColorStop(0.06, `rgba(${color},${0.45 * power})`);
  grd.addColorStop(0.3, `rgba(${color},${0.1 * power})`);
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(x - reach, y - reach, reach * 2, reach * 2);
  g.fillStyle = '#fff';
  g.beginPath();
  g.arc(x, y, core * (view.W / 900) * Math.max(1, 30 / view.fov), 0, TAU);
  g.fill();
  g.restore();
}

function silhouette(g, view, fn, base, fill, step = 3) {
  g.fillStyle = fill;
  g.beginPath();
  g.moveTo(0, base);
  for (let x = 0; x <= view.W + step; x += step) {
    const az = view.az + ((x - view.W / 2) / view.W) * view.fov;
    const el = fn(wrap(az));
    g.lineTo(x, view.horizon - (el / view.vfov) * view.H);
  }
  g.lineTo(view.W, base);
  g.closePath();
  g.fill();
}

function drawFar(g, view) {
  drawSky(g, view);
  drawStar(g, view, SUN_B, { core: 2.2, glow: 70, color: '255,190,130', power: 0.85 });
  drawStar(g, view, SUN_A, { core: 5, glow: 420, color: '255,248,232', power: 1 });
  const { W, H, horizon } = view;
  silhouette(g, view, (az) => mountains(az), horizon + 2, '#8ea0ad');
  silhouette(g, view, (az) => mountains(az) * 0.55 + 0.2, horizon + 2, '#7b8b8f');
  // Sea to the horizon in the west; land elsewhere.
  g.fillStyle = '#6f8d99';
  for (let x = 0; x < W; x += 2) {
    const az = wrap(view.az + ((x - W / 2) / W) * view.fov);
    if (landIsSea(az)) g.fillRect(x, horizon - 1, 2, H * 0.03);
  }
  {
    const pg = g.createLinearGradient(0, horizon - (2.4 / view.vfov) * H, 0, horizon);
    pg.addColorStop(0, '#8a6f58');
    pg.addColorStop(0.18, '#6f5847');
    pg.addColorStop(1, '#4b4038');
    silhouette(g, view, (az) => plateau(az), horizon + 2, pg);
  }
  // Strata on the tableland face, lit from the south.
  g.strokeStyle = 'rgba(214,190,160,0.22)';
  g.lineWidth = Math.max(0.6, H * 0.0012);
  for (const f of [0.35, 0.6, 0.85]) {
    g.beginPath();
    let on = false;
    for (let x = 0; x <= W; x += 3) {
      const az = wrap(view.az + ((x - W / 2) / W) * view.fov);
      const el = plateau(az) * f;
      if (el <= 0.05) {
        on = false;
        continue;
      }
      const y = horizon - (el / view.vfov) * H;
      if (!on) g.moveTo(x, y);
      else g.lineTo(x, y);
      on = true;
    }
    g.stroke();
  }
  silhouette(g, view, (az) => (plateau(az) > 0.05 ? plateau(az) : -1), horizon + 2, 'rgba(0,0,0,0)');
  // Haze.
  const hz = g.createLinearGradient(0, horizon - H * 0.08, 0, horizon + H * 0.02);
  hz.addColorStop(0, 'rgba(220,228,232,0)');
  hz.addColorStop(1, 'rgba(220,228,232,0.45)');
  g.fillStyle = hz;
  g.fillRect(0, horizon - H * 0.08, W, H * 0.1);
}

function drawMid(g, view) {
  const { W, H, horizon } = view;
  // Ground plane from the horizon down: sea, wet flat, dry basalt sand.
  for (let x = 0; x < W; x += 2) {
    const az = wrap(view.az + ((x - W / 2) / W) * view.fov);
    const sea = landIsSea(az);
    const south = az > 140 && az < 262;
    const top = horizon + (sea ? H * 0.03 : 0);
    const grd = g.createLinearGradient(0, top, 0, H);
    if (sea) {
      grd.addColorStop(0, '#5f7f8c');
      grd.addColorStop(0.5, '#4a6773');
      grd.addColorStop(1, '#3a4f56');
    } else if (south) {
      grd.addColorStop(0, '#9aa6a3');
      grd.addColorStop(0.25, '#78756c');
      grd.addColorStop(1, '#3d3a36');
    } else {
      grd.addColorStop(0, '#6e675d');
      grd.addColorStop(1, '#2f2c29');
    }
    g.fillStyle = grd;
    g.fillRect(x, top, 2, H - top);
  }
  // Shallow water over the flat in the south, catching the sky.
  for (const d of [60, 120, 240]) {
    const [, y] = project(0, groundEl(d), view);
    for (let x = 0; x < W; x += 3) {
      const az = wrap(view.az + ((x - W / 2) / W) * view.fov);
      if (az > 160 && az < 255) {
        g.fillStyle = 'rgba(200,214,222,0.35)';
        g.fillRect(x, y, 3, Math.max(1, H * 0.004));
      }
    }
  }
  // Salt crust patches.
  for (const s of salt) {
    const [x, y] = project(s.az, groundEl(s.dist), view);
    if (x < -W * 0.2 || x > W * 1.2) continue;
    const w = (Math.atan(s.w / s.dist) * 180) / Math.PI / view.fov * W;
    g.fillStyle = `rgba(240,238,228,${0.55 + s.t * 0.35})`;
    g.beginPath();
    g.ellipse(x, y, w, Math.max(0.8, w * Math.min(0.12, 2.5 / s.dist)), 0, 0, TAU);
    g.fill();
  }
  // Stromatolite domes in the shallows: dark, rounded, ringed with growth layers.
  for (const d of [...domes].sort((a, b) => b.dist - a.dist)) {
    const [x, y] = project(d.az, groundEl(d.dist), view);
    if (x < -W * 0.2 || x > W * 1.2) continue;
    const w = (Math.atan(d.size / d.dist) * 180) / Math.PI / view.fov * W;
    if (w < 0.6) continue;
    g.fillStyle = `rgb(${70 + d.t * 20},${54 + d.t * 14},${40 + d.t * 8})`;
    g.beginPath();
    g.ellipse(x, y, w, w * 0.55, 0, Math.PI, 0);
    g.fill();
    g.strokeStyle = 'rgba(160,140,110,0.4)';
    g.lineWidth = Math.max(0.5, w * 0.06);
    for (let k = 1; k < 3; k++) {
      g.beginPath();
      g.ellipse(x, y, w * (1 - k * 0.22), w * 0.55 * (1 - k * 0.22), 0, Math.PI, 0);
      g.stroke();
    }
    g.fillStyle = 'rgba(210,224,230,0.4)';
    g.fillRect(x - w, y, w * 2, Math.max(1, w * 0.06));
  }
  // The landing site, north-north-east, on the plain before the tableland.
  const site = (az, dist, draw) => {
    const [x, y] = project(az, groundEl(dist), view);
    if (x < -W * 0.3 || x > W * 1.3) return;
    const px = W / view.fov * ((Math.atan(1 / dist) * 180) / Math.PI); // pixels per metre
    draw(x, y, px);
  };
  site(28, 420, (x, y, m) => {
    // Two landers: squat cones on legs.
    for (const dx of [0, 34]) {
      const lx = x + dx * m;
      const body = g.createLinearGradient(lx - 6 * m, 0, lx + 6 * m, 0);
      body.addColorStop(0, '#f1eee6');
      body.addColorStop(0.6, '#d6d2c6');
      body.addColorStop(1, '#a9a597');
      g.fillStyle = body;
      g.beginPath();
      g.moveTo(lx - 6 * m, y - 3 * m);
      g.lineTo(lx + 6 * m, y - 3 * m);
      g.lineTo(lx + 3.2 * m, y - 13 * m);
      g.quadraticCurveTo(lx, y - 15.5 * m, lx - 3.2 * m, y - 13 * m);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(60,64,70,0.75)';
      g.fillRect(lx - 1.2 * m, y - 11 * m, 2.4 * m, 1.4 * m);
      g.fillStyle = '#b8432c';
      g.fillRect(lx - 6 * m, y - 4.2 * m, 12 * m, 0.7 * m);
      g.strokeStyle = '#c9c5b8';
      g.lineWidth = Math.max(0.5, m * 0.25);
      g.beginPath();
      g.moveTo(lx + 2 * m, y - 14.5 * m);
      g.lineTo(lx + 2.8 * m, y - 18 * m);
      g.stroke();
      g.strokeStyle = '#8f8b80';
      g.lineWidth = Math.max(0.6, m * 0.6);
      g.beginPath();
      g.moveTo(x + dx * m - 5 * m, y - 3 * m);
      g.lineTo(x + dx * m - 8 * m, y);
      g.moveTo(x + dx * m + 5 * m, y - 3 * m);
      g.lineTo(x + dx * m + 8 * m, y);
      g.stroke();
    }
  });
  site(44, 300, (x, y, m) => {
    // Habitat modules and a track back to the landers.
    for (let k = 0; k < 4; k++) {
      g.fillStyle = k % 2 ? '#e8e6de' : '#cfccc2';
      g.fillRect(x + k * 9 * m, y - 3.4 * m, 8 * m, 3.4 * m);
      g.fillStyle = 'rgba(0,0,0,0.25)';
      g.fillRect(x + k * 9 * m, y - 0.6 * m, 8 * m, 0.6 * m);
    }
    // Two people in suits, setting up a tripod.
    for (const [dx, c] of [[-14, '#efe9dc'], [-11, '#f0d9a6']]) {
      g.fillStyle = c;
      g.fillRect(x + dx * m, y - 1.8 * m, 0.55 * m, 1.8 * m);
      g.beginPath();
      g.arc(x + dx * m + 0.27 * m, y - 2.05 * m, 0.33 * m, 0, TAU);
      g.fill();
    }
  });
  // Tyre tracks fanning back from the modules.
  site(38, 120, (x, y, m) => {
    g.strokeStyle = 'rgba(40,36,32,0.35)';
    g.lineWidth = Math.max(0.6, m * 0.25);
    for (const off of [-1, 1]) {
      g.beginPath();
      g.moveTo(x + off * m, y);
      g.quadraticCurveTo(x + 40 * m, y - 1 * m, x + 120 * m, y - 1.6 * m);
      g.stroke();
    }
  });
}

function drawNear(g, view) {
  const { W, H } = view;
  // Wind ripples and grit in the dark sand right below the mast.
  const rr = mulberry32(81);
  for (let k = 0; k < 220; k++) {
    const az = rr() * 360;
    if (landIsSea(az)) continue;
    const dist = 3 + Math.pow(rr(), 1.2) * 20;
    const [x, y] = project(az, groundEl(dist), view);
    if (x < -20 || x > W + 20 || y > H + 10) continue;
    const w = (Math.atan(0.6 / dist) * 180) / Math.PI / view.fov * W;
    g.fillStyle = rr() < 0.3 ? 'rgba(236,232,220,0.35)' : 'rgba(20,18,16,0.35)';
    g.fillRect(x - w, y, w * 2, Math.max(1, w * 0.12));
  }
  for (const r of rocks) {
    const [x, y] = project(r.az, groundEl(r.dist), view);
    if (x < -W * 0.3 || x > W * 1.3) continue;
    const w = (Math.atan(r.size / r.dist) * 180) / Math.PI / view.fov * W;
    g.fillStyle = `rgb(${40 + r.tone * 20},${37 + r.tone * 18},${34 + r.tone * 14})`;
    g.beginPath();
    g.ellipse(x, y, w, w * 0.5, 0, Math.PI, 0);
    g.fill();
    g.fillStyle = 'rgba(255,248,232,0.12)';
    g.beginPath();
    g.ellipse(x - w * 0.2, y - w * 0.2, w * 0.5, w * 0.18, 0, Math.PI, 0);
    g.fill();
  }
}

function blurred(src, amount) {
  if (amount < 0.35) return src;
  const f = Math.min(24, 1 + amount);
  const w = Math.max(8, Math.round(src.width / f));
  const h = Math.max(8, Math.round(src.height / f));
  const s = document.createElement('canvas');
  s.width = w;
  s.height = h;
  const sg = s.getContext('2d');
  sg.imageSmoothingQuality = 'high';
  sg.drawImage(src, 0, 0, w, h);
  return s;
}

// Main entry: draw the camera view into g (W×H). focus = metres (Infinity for ∞).
export function drawCameraView(g, W, H, { az, mm, focus }, { grain = true } = {}) {
  const fov = fovFor(mm);
  const view = { W, H, az, fov, vfov: fov * (H / W), horizon: H * 0.56 };
  const layers = LAYERS.map((L) => {
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const lg = c.getContext('2d');
    if (L.name === 'far') drawFar(lg, view);
    else if (L.name === 'mid') drawMid(lg, view);
    else drawNear(lg, view);
    return { L, c };
  });
  // Circle of confusion ∝ f² · |1/s − 1/d| (aperture fixed); scaled to pixels.
  const inv = (d) => (Number.isFinite(d) ? 1 / d : 0);
  for (const { L, c } of layers) {
    const coc = (mm * mm) / 900 * Math.abs(inv(focus) - inv(L.dist)) * (W / 160);
    const b = blurred(c, coc);
    g.drawImage(b, 0, 0, W, H);
  }
  // Long lenses see through more air.
  const haze = clamp((mm - 70) / 400, 0, 0.18);
  if (haze > 0) {
    g.fillStyle = `rgba(214,224,230,${haze})`;
    g.fillRect(0, 0, W, H);
  }
  if (grain) {
    const r = mulberry32(Math.round(az * 10 + mm));
    g.fillStyle = 'rgba(255,255,255,0.035)';
    for (let k = 0; k < W * H * 0.0015; k++) g.fillRect(r() * W, r() * H, 1, 1);
  }
}

// The keepsake: the reader's photograph at print size (3:2).
export function renderPlanetPhoto(params, { width = 2400 } = {}) {
  const W = width;
  const H = Math.round(width / 1.5);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  drawCameraView(g, W, H, { az: params.az, mm: params.mm, focus: params.focus === null || params.focus === undefined ? Infinity : params.focus });
  return c;
}
