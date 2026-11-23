import { spiroParameters } from '../controllers/parameters.js';

const TAU = Math.PI * 2;

function registration(ctx, x, y, radius) {
  ctx.moveTo(x - radius, y);
  ctx.lineTo(x + radius, y);
  ctx.moveTo(x, y - radius);
  ctx.lineTo(x, y + radius);
}

function plot(ctx, family, param, radius, turns) {
  const count = Math.ceil(turns * 125 / TAU);
  ctx.beginPath();
  for (let i = 0; i <= count; i++) {
    const t = turns * i / count;
    const main = family === 0 ? param.inner : family === 1 ? param.outer : param.inner + 1;
    const reach = family === 2 ? 0.43 + param.reach * 0.24 : param.reach;
    const x = Math.cos(t) * (1 - reach) + Math.cos(t * main) * reach;
    const y = Math.sin(t) * (1 - reach) - Math.sin(t * main) * reach;
    const h = Math.sin(t * 2.0 + param.angle) * param.lift;
    ctx.lineTo(radius * (x + h), radius * (y + h * Math.cos(t)));
  }
  ctx.stroke();
}

export function drawSpiro(ctx, aspectX, aspectY, state, palette, seed) {
  const [ground, paper, red, green] = palette.colors;
  const param = spiroParameters(state.position, state.phase, seed);
  const primaryInk = red === paper ? ground : red;

  ctx.fillStyle = paper;
  ctx.fillRect(-aspectX, -aspectY, aspectX * 2, aspectY * 2);
  ctx.lineWidth = 0.0008;
  ctx.strokeStyle = ground;
  ctx.globalAlpha = 0.11;
  ctx.beginPath();
  for (let x = -Math.floor(aspectX / 0.055) * 0.055; x < aspectX; x += 0.055) {
    ctx.moveTo(x, -aspectY);
    ctx.lineTo(x, aspectY);
  }
  for (let y = -Math.floor(aspectY / 0.055) * 0.055; y < aspectY; y += 0.055) {
    ctx.moveTo(-aspectX, y);
    ctx.lineTo(aspectX, y);
  }
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, 0.407, 0, TAU);
  ctx.moveTo(0.425, 0);
  ctx.arc(0, 0, 0.425, 0, TAU);
  ctx.moveTo(-0.455, 0);
  ctx.lineTo(0.455, 0);
  ctx.moveTo(0, -0.455);
  ctx.lineTo(0, 0.455);
  ctx.stroke();

  ctx.globalAlpha = 0.33;
  ctx.beginPath();
  for (let i = 0; i < 24; i++) {
    const a = i * TAU / 24;
    ctx.moveTo(Math.cos(a) * 0.414, Math.sin(a) * 0.414);
    ctx.lineTo(Math.cos(a) * 0.424, Math.sin(a) * 0.424);
  }
  registration(ctx, -aspectX + 0.04, -aspectY + 0.04, 0.011);
  registration(ctx, aspectX - 0.04, aspectY - 0.04, 0.011);
  ctx.stroke();

  ctx.save();
  ctx.rotate(param.angle);
  ctx.lineWidth = 0.0015;
  ctx.globalAlpha = 0.83;
  ctx.strokeStyle = primaryInk;
  plot(ctx, 0, param, 0.402, TAU * (7.0 + 5.0 * param.growth));
  ctx.rotate(0.64);
  ctx.lineWidth = 0.00105;
  ctx.globalAlpha = 0.76;
  ctx.strokeStyle = ground;
  plot(ctx, 1, param, 0.319, TAU * (7.0 + 2.0 * param.growth));
  ctx.rotate(-0.41);
  ctx.globalAlpha = 0.74;
  ctx.strokeStyle = green;
  plot(ctx, 2, param, 0.193, TAU * (4.0 + param.growth));
  ctx.restore();

  if (aspectX > 0.69 || aspectY > 0.69) {
    const x = aspectX > aspectY ? aspectX * 0.78 : 0.22;
    const y = aspectX > aspectY ? -0.25 : -aspectY * 0.77;
    ctx.lineWidth = 0.0011;
    for (const direction of [-1, 1]) {
      ctx.save();
      ctx.translate(x * direction, y * direction);
      ctx.rotate(param.angle * direction);
      ctx.globalAlpha = 0.43;
      ctx.strokeStyle = direction < 0 ? ground : primaryInk;
      plot(ctx, direction < 0 ? 0 : 1, param, 0.074, TAU * 4.5);
      ctx.restore();
    }
  }
  ctx.globalAlpha = 1;
}
