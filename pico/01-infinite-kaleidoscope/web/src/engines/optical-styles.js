import { mixInk, styleMotion } from './style-motion.js';

const TAU = Math.PI * 2;

function tidalRelief(ctx, ax, ay, state, { colors }, seed) {
  const [ground, paper, pigment, shadow, accent] = colors;
  const turn = state.position * 0.043;
  const drift = 0.16 * Math.sin(turn + seed[2] * TAU + state.phase * 0.041);
  const extent = Math.hypot(ax, ay);
  const pitch = Math.max(0.049, extent / 37);
  const width = pitch * 0.49;

  function wave(x, y) {
    const left = x + 0.32 - drift;
    const right = x - 0.34 - drift;
    const ridge = 0.29 * Math.exp(-7 * left * left) - 0.24 * Math.exp(-8 * right * right);
    return y + ridge * Math.exp(-1.1 * y * y) + 0.052 * Math.sin(x * 4.3 + y * 2.2 + turn * 0.5);
  }

  ctx.fillStyle = ground;
  ctx.fillRect(-ax, -ay, 2 * ax, 2 * ay);
  ctx.rotate(0.29 * Math.sin(seed[0] * TAU + turn * 0.58));
  const count = Math.ceil((extent + 0.4) / pitch);
  const segments = 100;
  for (let row = -count; row <= count; row++) {
    const center = row * pitch;
    ctx.beginPath();
    for (let column = 0; column <= segments; column++) {
      const x = extent * (2 * column / segments - 1);
      ctx.lineTo(x, wave(x, center - width / 2));
    }
    for (let column = segments; column >= 0; column--) {
      const x = extent * (2 * column / segments - 1);
      ctx.lineTo(x, wave(x, center + width / 2));
    }
    ctx.closePath();
    ctx.fillStyle = row === -3 ? pigment : row === 3 ? accent : row % 5 === 0 ? shadow : paper;
    ctx.fill();
  }
}

function dotScreen(ctx, ax, ay, pitch, shiftX, shiftY, direction, color, alpha, phase, fullness) {
  const c = Math.abs(Math.cos(direction));
  const s = Math.abs(Math.sin(direction));
  const columns = Math.ceil((ax * c + ay * s + Math.abs(shiftX)) / pitch) + 1;
  const rows = Math.ceil((ax * s + ay * c + Math.abs(shiftY)) / pitch) + 1;
  ctx.save();
  ctx.rotate(direction);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let row = -rows; row <= rows; row++) {
    for (let column = -columns; column <= columns; column++) {
      const x = column * pitch + shiftX;
      const y = row * pitch + shiftY;
      const r = Math.hypot(x * 0.76 + shiftY, y - shiftX);
      const radius = pitch * (fullness + 0.066 * Math.cos(10.5 * r + phase));
      const weft = y + 0.027 * Math.sin(x * 5.2 + phase);
      ctx.moveTo(x + radius, weft);
      ctx.ellipse(x, weft, radius, radius * 0.80, 0, 0, TAU);
    }
  }
  ctx.fill();
  ctx.restore();
}

function moireWeave(ctx, ax, ay, state, { colors }, seed) {
  const [ground, paper, ink, shadow, highlight] = colors;
  const { position } = state;
  const turn = position * 0.085 + state.phase * 0.047;
  const extent = Math.hypot(ax, ay);
  const density = styleMotion(position, state.seed, 23, 19);
  const pitch = Math.max(0.042 + density * 0.036, extent / 30);
  const angle = 0.075 + 0.195 * styleMotion(position, state.seed, 15, 20);
  const driftX = pitch * (styleMotion(position, state.seed, 13, 21) - 0.5) * 2.6;
  const driftY = pitch * (styleMotion(position, state.seed, 28, 22) - 0.5) * 3.1;
  const dye = styleMotion(position, state.seed, 32, 23);
  const accent = mixInk(ink === paper ? highlight : ink, shadow, dye * 0.94);

  ctx.fillStyle = ground;
  ctx.fillRect(-ax, -ay, ax * 2, ay * 2);
  const bearing = seed[2] * 0.57 + turn * 0.40;
  const ratio = 1.018 + 0.088 * styleMotion(position, state.seed, 37, 24);
  dotScreen(ctx, ax, ay, pitch, -driftX * 0.41, -driftY * 0.34,
    bearing - angle / 2, paper, 0.82, turn * 0.69, 0.18 + 0.06 * density);
  dotScreen(ctx, ax, ay, pitch * ratio, driftX, driftY,
    bearing + angle / 2, accent, 0.79, -turn * 0.57 + 1, 0.21 + 0.04 * dye);
}

export const opticalStyles = { 'tidal-relief': tidalRelief, 'moire-weave': moireWeave };
