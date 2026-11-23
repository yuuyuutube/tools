import { mixInk, styleMotion } from './style-motion.js';

const TAU = Math.PI * 2;

function circle(ctx, radius) {
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, TAU);
}

function polygon(ctx, points, color) {
  ctx.beginPath();
  for (let index = 0; index < points.length; index += 2) {
    ctx.lineTo(points[index], points[index + 1]);
  }
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function roundedPetal(ctx, root, shoulder, tip, width, color) {
  ctx.beginPath();
  ctx.moveTo(root, 0);
  ctx.bezierCurveTo(root + 0.07, -width * 0.36, shoulder - 0.06, -width, shoulder, -width);
  ctx.bezierCurveTo(tip - 0.035, -width, tip, -width * 0.48, tip, 0);
  ctx.bezierCurveTo(tip, width * 0.48, tip - 0.035, width, shoulder, width);
  ctx.bezierCurveTo(shoulder - 0.06, width, root + 0.07, width * 0.36, root, 0);
  ctx.fillStyle = color;
  ctx.fill();
}

function enamelWindow(ctx, ax, ay, state, { colors }, seed) {
  const [ground, porcelain, enamel, glass, brass] = colors;
  const { position } = state;
  const turn = position * 0.124 + state.phase * 0.026;
  const opening = styleMotion(position, state.seed, 12, 1);
  const alternating = styleMotion(position, state.seed, 36, 2);
  const colorShift = styleMotion(position, state.seed, 23, 3);
  const zoom = 0.71 + 0.37 * styleMotion(position, state.seed, 29, 4);
  const leaves = seed[0] < 0.68 ? 8 : 10;
  const spread = Math.tan(Math.PI / leaves) * (0.19 + 0.13 * opening);
  const reach = 0.346 + 0.06 * opening;
  const lead = mixInk(enamel, ground, 0.32 + 0.22 * colorShift);
  const opal = mixInk(porcelain, glass, 0.84 * colorShift);
  const inner = mixInk(glass, enamel, 0.95 * colorShift);
  const counter = mixInk(glass, brass, 0.2 + 0.76 * colorShift);
  const warmGlass = ctx.createRadialGradient(0, 0, 0.09, 0, 0, 0.82);
  warmGlass.addColorStop(0, ground);
  warmGlass.addColorStop(1, glass);
  ctx.fillStyle = ground;
  ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = warmGlass;
  ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
  ctx.globalAlpha = 1;

  const drift = Math.max(0, Math.min(0.24, ax - 0.50));
  ctx.translate(drift * (2 * alternating - 1), 0.035 * (2 * colorShift - 1));
  ctx.scale(zoom, zoom);
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.0014;
  const frameRadius = 0.423 + opening * 0.026;
  for (const radius of [frameRadius, frameRadius + 0.016]) {
    circle(ctx, radius);
    ctx.stroke();
  }

  ctx.rotate(turn + seed[1] * 0.8);
  for (let sector = 0; sector < leaves; sector++) {
    const primary = sector % 2 === 0;
    const offset = (alternating - 0.5) * (primary ? 0.080 : -0.158);
    const tip = Math.min(reach + offset, frameRadius - 0.018);
    const shoulder = tip - 0.074 - 0.027 * opening;
    const hood = spread * (primary ? 0.74 + 0.26 * alternating : 1 - 0.32 * alternating);
    roundedPetal(ctx, 0.083, shoulder, tip, hood, lead);
    roundedPetal(ctx, 0.135, shoulder + 0.011, tip - 0.017, hood * 0.76, brass);
    roundedPetal(ctx, 0.151, shoulder + 0.012, tip - 0.034, hood * 0.61, primary ? porcelain : opal);
    roundedPetal(ctx, 0.176, shoulder + 0.010, tip - 0.048, hood * 0.41, primary ? inner : counter);

    ctx.save();
    ctx.translate(frameRadius + 0.008, 0);
    circle(ctx, primary ? 0.007 : 0.002 + alternating * 0.006);
    ctx.fillStyle = porcelain;
    ctx.fill();
    ctx.restore();
    ctx.rotate(TAU / leaves);
  }

  circle(ctx, 0.081);
  ctx.fillStyle = ground;
  ctx.fill();
  ctx.strokeStyle = brass;
  ctx.lineWidth = 0.004;
  ctx.stroke();
  circle(ctx, 0.055);
  ctx.strokeStyle = glass;
  ctx.lineWidth = 0.0015;
  ctx.stroke();
}

function foldedStar(ctx, ax, ay, state, { colors }, seed) {
  const [ink, paper, pigment, shadow, highlight] = colors;
  const pairs = seed[1] < 0.67 ? 6 : 8;
  const { position } = state;
  const turn = -position * 0.103 + state.phase * 0.019;
  const spread = Math.tan(Math.PI / (pairs * 2)) * (0.137 + 0.108 * styleMotion(position, state.seed, 18, 5));
  const long = 0.32 + 0.145 * styleMotion(position, state.seed, 15, 6);
  const short = 0.146 + 0.20 * styleMotion(position, state.seed, 21, 7);
  const sweep = (styleMotion(position, state.seed, 31, 8) - 0.5) * 0.18;
  const balance = styleMotion(position, state.seed, 27, 9);
  const pigmentFold = mixInk(pigment, shadow, balance * 0.82);
  const shadowFold = mixInk(ink, pigment, (1 - balance) * 0.70);
  const goldFold = mixInk(highlight, paper, balance * 0.62);
  ctx.fillStyle = paper;
  ctx.fillRect(-ax, -ay, 2 * ax, 2 * ay);

  ctx.globalAlpha = 0.24;
  ctx.strokeStyle = ink;
  ctx.lineWidth = 0.0015;
  circle(ctx, 0.462);
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.rotate(turn + seed[0]);
  for (let sector = 0; sector < pairs * 2; sector++) {
    const main = sector % 2 === 0;
    const tip = main ? long : short;
    const crease = tip * (main ? 0.39 + 0.16 * balance : 0.46);
    const width = spread * (main ? 1.18 : 0.78);
    const lean = sweep * (main ? 1 : -0.38);
    polygon(ctx, [0, 0, crease, -width, tip, lean, crease, width], main ? pigmentFold : shadow);
    polygon(ctx, [0, 0, crease, width, tip, lean, crease * 0.83, lean * 0.40], main ? shadowFold : pigment);
    polygon(ctx, [0, 0, crease, -width, tip, lean, crease * 0.88, -width * 0.34], main ? goldFold : shadow);
    ctx.rotate(Math.PI / pairs);
  }
  const seal = new Array(pairs * 2);
  for (let index = 0; index < pairs; index++) {
    const angle = index * TAU / pairs;
    seal[index * 2] = 0.052 * Math.cos(angle);
    seal[index * 2 + 1] = 0.052 * Math.sin(angle);
  }
  polygon(ctx, seal, ink);
  circle(ctx, 0.017);
  ctx.fillStyle = highlight;
  ctx.fill();
}

export const kaleidoStyles = { 'enamel-window': enamelWindow, 'paper-star': foldedStar };
