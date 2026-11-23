import { kaleidoParameters, opticalParameters } from '../controllers/parameters.js';

const TAU = Math.PI * 2;

function rhombus(ctx, x, y, width, height, skew) {
  ctx.beginPath();
  ctx.moveTo(x - width, y - skew * width);
  ctx.lineTo(x, y - height);
  ctx.lineTo(x + width, y + skew * width);
  ctx.lineTo(x, y + height);
  ctx.closePath();
  ctx.fill();
}

function kaleido(ctx, x, y, state, palette, seed) {
  const [ground, paper, orange, green, gold] = palette.colors;
  const family = kaleidoParameters(state.position, seed);
  const wave = Math.sin(state.phase * 0.074 + state.position * 0.077 + seed[2] * TAU);
  ctx.fillStyle = ground;
  ctx.fillRect(-x, -y, x * 2, y * 2);
  ctx.strokeStyle = green;
  ctx.lineWidth = 0.0013;
  ctx.globalAlpha = 0.27;
  ctx.beginPath();
  for (let h = -y - x * 0.25; h < y + x * 0.25; h += 0.04) {
    ctx.moveTo(-x, h - x * 0.25);
    ctx.lineTo(x, h + x * 0.25);
  }
  ctx.stroke();
  ctx.globalAlpha = 0.62;
  ctx.beginPath();
  ctx.arc(0, 0, 0.422, 0, TAU);
  ctx.stroke();

  function wedges(folds, opacity) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.rotate(0.15 + seed[1] + 0.018 * state.position + 0.023 * state.phase);
    ctx.scale(1 + 0.04 * wave, 1 + 0.04 * wave);
    for (let i = 0; i < folds; i++) {
      ctx.fillStyle = green;
      rhombus(ctx, 0.239, 0.0, 0.143, 0.061, 0.25 * wave);
      ctx.fillStyle = orange;
      rhombus(ctx, 0.275, 0.034, 0.099, 0.046, 0.41);
      ctx.fillStyle = paper;
      rhombus(ctx, 0.282, 0.035, 0.065, 0.021, 0.54);
      ctx.fillStyle = paper;
      rhombus(ctx, 0.144, 0, 0.064, 0.042, -0.2);
      ctx.fillStyle = gold;
      rhombus(ctx, 0.094, 0, 0.059, 0.022, 0.2);
      rhombus(ctx, 0.422, 0, 0.025, 0.006, 0.3);
      ctx.rotate(TAU / folds);
    }
    ctx.restore();
  }

  wedges(family.first, 1 - family.mix);
  if (family.mix > 0) wedges(family.second, family.mix);
  ctx.fillStyle = ground;
  rhombus(ctx, 0, 0, 0.041, 0.041, 0.12);
  ctx.fillStyle = orange;
  rhombus(ctx, 0, 0, 0.02, 0.013, 0);
  ctx.globalAlpha = 1;
}

function optical(ctx, x, y, state, palette, seed) {
  const [ground, paper, accent] = palette.colors;
  const family = opticalParameters(state.position, seed);
  const p = state.position * 0.052;
  const swell = Math.sin(state.phase * 0.064 + p);
  const bounds = Math.hypot(x, y);
  ctx.fillStyle = ground;
  ctx.fillRect(-x, -y, x * 2, y * 2);
  ctx.save();
  ctx.rotate(0.16 + 0.28 * Math.sin(p * 0.64 + seed[0] * 5));

  function field(variant, opacity) {
    ctx.globalAlpha = opacity;
    const pitch = 1 / (22 + 4 * Math.sin(p));
    if (variant === 0) {
      for (let i = -Math.ceil(bounds / pitch); i <= bounds / pitch; i++) {
        const origin = i * pitch;
        ctx.beginPath();
        for (let h = -bounds; h <= bounds + 0.02; h += 0.02) {
          const displacement = 0.22 * Math.exp(-6.5 * ((origin + 0.18) ** 2 + (h - 0.12) ** 2));
          ctx.lineTo(origin - displacement * (1 + 0.25 * swell), h);
        }
        ctx.lineWidth = pitch * 0.48;
        ctx.strokeStyle = Math.abs(origin - 0.14) < 0.06 ? accent : paper;
        ctx.stroke();
      }
    } else if (variant === 1) {
      const columns = Math.ceil(bounds / pitch);
      for (let i = -columns; i <= columns; i++) {
        for (let j = -columns; j <= columns; j++) {
          const ox = i * pitch;
          const oy = j * pitch;
          const wx = ox + 0.09 * Math.sin(5.0 * oy + swell);
          const wy = oy + 0.08 * Math.sin(5.0 * ox - swell);
          const r = pitch * (0.22 + 0.13 * Math.sin(16 * Math.hypot(wx, wy) + swell));
          ctx.fillStyle = Math.hypot(ox - 0.15, oy) < 0.21 ? accent : paper;
          ctx.beginPath();
          ctx.arc(wx, wy, r, 0, TAU);
          ctx.fill();
        }
      }
    } else {
      for (const side of [-1, 1]) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(side * bounds, -bounds);
        for (let h = -bounds; h <= bounds + 0.02; h += 0.02) {
          ctx.lineTo(0.12 * Math.sin(h * 6.0 + swell), h);
        }
        ctx.lineTo(side * bounds, bounds);
        ctx.closePath();
        ctx.clip();
        ctx.scale(0.8, 1);
        for (let radius = pitch * 0.65; radius < bounds * 2.2; radius += pitch * 0.76) {
          ctx.strokeStyle = radius > 0.27 && radius < 0.34 ? accent : paper;
          ctx.lineWidth = pitch * 0.29;
          ctx.beginPath();
          ctx.arc(side * 0.43, side * 0.17, radius, 0, TAU);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
  }

  field(family.first, 1 - family.mix);
  if (family.mix > 0) field(family.second, family.mix);
  ctx.restore();
}

export const fallbackEngines = { kaleido, optical };
