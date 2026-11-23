import { mixInk, styleMotion } from './style-motion.js';

const TAU = Math.PI * 2;

function stroke(ctx, path, width, color, alpha = 1) {
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.globalAlpha = alpha;
  ctx.stroke(path);
  ctx.globalAlpha = 1;
}

function ribbonOrbit(ctx, ax, ay, state, { colors }, seed) {
  const [ground, paper, ink, shadow, highlight] = colors;
  const { position } = state;
  const turn = position * 0.11 + state.phase * 0.035;
  const phase = turn * 0.76 + seed[1] * TAU;
  const expansion = styleMotion(position, state.seed, 22, 10);
  const pull = styleMotion(position, state.seed, 13, 11);
  const tilt = styleMotion(position, state.seed, 38, 12);
  const dye = styleMotion(position, state.seed, 26, 13);
  const radius = 0.213 + 0.08 * expansion;
  const bulge = 0.069 + 0.078 * pull;
  const aspect = 0.72 + 0.34 * tilt;
  const shear = (pull - 0.5) * 0.34;
  const depth = 0.81 + 0.37 * expansion;
  const lobe = seed[0] < 0.7 ? 3 : 5;

  ctx.fillStyle = ground;
  ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
  ctx.rotate(turn + seed[3]);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'butt';
  const closed = new Path2D();
  const over = new Path2D();
  let wasOver = false;
  for (let index = 0; index <= 800; index++) {
    const t = index * TAU / 800;
    const section = t * lobe + phase;
    const r = radius + bulge * Math.cos(section) + 0.027 * Math.cos(section * 2 + 3 * tilt);
    const y = r * Math.sin(t * 2) * aspect;
    const x = r * Math.cos(t * 2) + shear * y;
    closed.lineTo(x, y);

    // Positive-depth arcs get a narrow knockout before they cross the lower ribbon.
    const isOver = Math.sin(section) > 0.18;
    if (isOver && wasOver) over.lineTo(x, y);
    else if (isOver) over.moveTo(x, y);
    wasOver = isOver;
  }
  closed.closePath();
  stroke(ctx, closed, 0.054 * depth, shadow);
  stroke(ctx, closed, 0.041 * depth, mixInk(ink, shadow, dye * 0.86));
  stroke(ctx, closed, 0.003, highlight, 0.64);
  stroke(ctx, over, 0.073 * depth, ground);
  stroke(ctx, over, 0.054 * depth, paper);
  stroke(ctx, over, 0.041 * depth, mixInk(highlight, ink, dye * 0.73));
  stroke(ctx, over, 0.003, paper, 0.75);
}

function contour(ctx, side, fraction, form) {
  const { stretch, bend, phase, opening } = form;
  const radius = 0.058 + fraction * (0.174 + 0.077 * opening);
  const centerX = side * (0.012 + stretch * fraction);
  const centerY = -side * (0.008 + 0.063 * fraction);
  const bearing = side * (0.91 - 0.64 * fraction) + bend;
  const c = Math.cos(bearing);
  const s = Math.sin(bearing);

  ctx.beginPath();
  for (let index = 0; index <= 200; index++) {
    const t = index * TAU / 200;
    const theta = t + phase + side * (0.56 + fraction * 1.29);
    const flute = 1 + (0.17 + 0.18 * opening) * Math.cos(3 * theta) +
      (0.032 + 0.084 * fraction) * Math.sin(5 * t + phase * 1.7 - fraction) +
      0.18 * Math.cos(2 * t - phase * 0.61 + side);
    const curl = t + side * 0.34 * Math.sin(t + phase) * fraction;
    const x = radius * (Math.cos(curl) * flute + 0.23 * Math.sin(2 * t + phase));
    const y = radius * (Math.sin(curl) * flute * (0.87 - 0.22 * fraction) +
      side * 0.23 * Math.sin(2 * t + phase - fraction));
    ctx.lineTo(centerX + c * x - s * y, centerY + s * x + c * y);
  }
  ctx.closePath();
}

function etchedField(ctx, side, form, paper, color, ink, dye) {
  const broad = side > 0;
  const veil = ctx.createRadialGradient(0, 0, 0, 0, 0, 0.46);
  veil.addColorStop(0, mixInk(paper, color, broad ? 0.69 : 0.52));
  veil.addColorStop(0.58, mixInk(paper, color, broad ? 0.29 : 0.38));
  veil.addColorStop(1, mixInk(paper, color, 0.09));
  contour(ctx, side, 1, form);
  ctx.fillStyle = veil;
  ctx.globalAlpha = broad ? 0.35 : 0.67;
  ctx.fill();

  const grain = ctx.createRadialGradient(0, 0, 0.035, 0, 0, 0.43);
  grain.addColorStop(0, mixInk(ink, color, 0.31));
  grain.addColorStop(0.47, mixInk(ink, color, (broad ? 0.53 : 0.68) + dye * 0.30));
  grain.addColorStop(1, mixInk(color, paper, 0.31));
  ctx.strokeStyle = grain;
  const density = broad ? 25 : 19;
  for (let index = 0; index < density; index++) {
    const fraction = (index / (density - 1)) ** (broad ? 1.30 : 0.84);
    const strong = index % 6 === 0 || index === density - 1;
    contour(ctx, side, fraction, form);
    ctx.lineWidth = strong ? 0.0027 : 0.00134;
    ctx.globalAlpha = strong ? 0.99 : broad ? 0.75 : 0.68;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function celestialEtching(ctx, ax, ay, state, { colors }, seed) {
  const [ink, paper, pigment, patina, highlight] = colors;
  const { position } = state;
  const turn = position * 0.086 + state.phase * 0.029;
  const opening = styleMotion(position, state.seed, 15, 14);
  const bend = styleMotion(position, state.seed, 26, 15) - 0.5;
  const contrast = styleMotion(position, state.seed, 34, 16);
  const form = {
    opening, bend,
    stretch: 0.054 + 0.101 * styleMotion(position, state.seed, 23, 17),
    phase: seed[2] * TAU + turn * 0.69,
  };
  const glint = highlight === paper ? ink : highlight;
  const zoom = 0.83 + 0.22 * styleMotion(position, state.seed, 38, 18);

  ctx.fillStyle = paper;
  ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
  ctx.rotate(turn * 0.73 + seed[0] * 1.2);
  ctx.scale(zoom, zoom);
  ctx.lineJoin = 'round';
  etchedField(ctx, -1, form, paper, patina, glint, 1 - contrast);
  // The translucent front shell leaves the colored lines below visible.
  etchedField(ctx, 1, form, paper, pigment === paper ? glint : pigment, ink, contrast);

  ctx.rotate(-0.7 + 0.65 * opening);
  ctx.scale(0.78, 0.78);
  ctx.beginPath();
  ctx.moveTo(-0.067, 0.022);
  ctx.bezierCurveTo(-0.039, -0.068, 0.032, -0.062, 0.068, -0.017);
  ctx.bezierCurveTo(0.046, 0.057, -0.029, 0.067, -0.067, 0.022);
  ctx.closePath();
  ctx.fillStyle = mixInk(ink, patina, 0.17 + 0.20 * contrast);
  ctx.fill();
  ctx.strokeStyle = paper;
  ctx.lineWidth = 0.0029;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-0.047, 0.024);
  ctx.quadraticCurveTo(-0.013, -0.044, 0.048, -0.023);
  ctx.quadraticCurveTo(0.007, -0.007, -0.009, 0.038);
  ctx.quadraticCurveTo(-0.036, 0.044, -0.047, 0.024);
  ctx.fillStyle = mixInk(highlight, paper, 0.12 + contrast * 0.78);
  ctx.fill();
}

export const spiroStyles = { 'ribbon-orbit': ribbonOrbit, 'celestial-etching': celestialEtching };
