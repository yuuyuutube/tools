// 02 燃煤廠：鋸齒屋頂的磚紅廠房、兩根粗條紋煙囪、斜斜的輸送帶把煤塊一塊塊送進去、大飛輪。
// 運動語言：一格一格、有重量的「搬運」。輸送帶與飛輪速度跟著 level。不畫煙：煙不是發電資料。
import { g, path, rect, circle, line, tf, el } from '../util.js';
import { backdrop, gearPath, nightMix } from './kit.js';
import { makeCoal } from './cast.js';

const C = { sky: '#f0e4cd', skyN: '#3d3440', far: '#e0cdae', farN: '#55474a', ground: '#c9b391', groundN: '#6b5d4c', groundD: '#b39c7a', brick: '#a8493b', brickD: '#7f3429', taupe: '#8b7b6b', taupeD: '#665a4e', beige: '#f6ecd9', coal: '#3a322e', coalL: '#5a4e47', mustard: '#d9a441' };

export function build(svg) {
  const bg = backdrop(svg, C.sky, C.ground, 236);
  const far = path(svg, 'M-400 236V200H-60V214H20V196H52V214H400V206H800V236Z', C.far);
  rect(svg, -400, 250, 1200, 5, C.groundD, 0, { opacity: .5 });

  // 煙囪（在廠房後面）
  const stacks = g(svg);
  for (const [x, w, top] of [[258, 24, 66], [294, 28, 44]]) {
    rect(stacks, x, top, w, 150 - top, C.taupe, 3);
    rect(stacks, x, top + 14, w, 9, C.beige); rect(stacks, x, top + 32, w, 9, C.beige);
    rect(stacks, x - 3, top - 6, w + 6, 10, C.taupeD, 4);
  }

  // 廠房：鋸齒屋頂
  const hall = g(svg);
  path(hall, 'M176 236V146L176 146L200 118V146L226 118V146L252 118V146L278 118V146H336V236Z', C.brick);
  for (const x of [176, 202, 228, 254]) path(hall, `M${x + 3} 146L${x + 22} 124V146Z`, C.beige, { opacity: .9 });
  rect(hall, 176, 146, 160, 6, C.brickD);
  const winLight = [];
  for (let i = 0; i < 4; i++) {
    const x = 190 + i * 36;
    path(hall, `M${x} 210V180Q${x} 170 ${x + 10} 170Q${x + 20} 170 ${x + 20} 180V210Z`, C.brickD);
    winLight.push(path(hall, `M${x + 3} 207V181Q${x + 3} 173 ${x + 10} 173Q${x + 17} 173 ${x + 17} 181V207Z`, C.beige));
  }
  rect(hall, 176, 222, 160, 14, C.brickD, 0, { opacity: .35 });
  rect(hall, 178, 154, 18, 14, C.coal, 2);

  // 飛輪
  const wheelBase = g(svg);
  rect(wheelBase, 334, 214, 26, 22, C.taupeD, 3);
  const wheel = g(svg, { transform: 'translate(347 206)' });
  path(wheel, gearPath(12, 24, 19.5), C.mustard);
  circle(wheel, 0, 0, 13, C.brickD);
  for (let i = 0; i < 4; i++) rect(wheel, -1.8, -13, 3.6, 26, C.mustard, 1.8, { transform: `rotate(${i * 45})` });
  circle(wheel, 0, 0, 4.5, C.beige);

  // 煤堆
  const pile = g(svg);
  path(pile, 'M18 238L30 214L46 206L58 192L76 196L92 210L110 218L120 238Z', C.coal);
  path(pile, 'M46 206L58 192L66 212Z', C.coalL); path(pile, 'M76 196L92 210L80 214Z', C.coalL); path(pile, 'M30 214L46 206L40 224Z', C.coalL);

  // 輸送帶：從煤堆斜上到廠房入口
  const A = [70, 226], B = [188, 160];
  const ang = Math.atan2(B[1] - A[1], B[0] - A[0]);
  for (const k of [.25, .62, .9]) { const x = A[0] + (B[0] - A[0]) * k, y = A[1] + (B[1] - A[1]) * k; rect(svg, x - 2, y, 4, 238 - y, C.taupeD, 2); }
  const beltG = g(svg);
  line(beltG, `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`, C.taupeD, 13);
  const beltDash = line(beltG, `M${A[0]} ${A[1]}L${B[0]} ${B[1]}`, C.taupe, 9, { 'stroke-dasharray': '3 6', 'stroke-linecap': 'butt' });
  const rollers = [];
  for (let k = 0; k <= 1.001; k += 1 / 6) {
    const x = A[0] + (B[0] - A[0]) * k, y = A[1] + (B[1] - A[1]) * k;
    const r = g(beltG, { transform: `translate(${x} ${y})` });
    circle(r, 0, 0, 4.4, C.beige); rect(r, -.8, -4.4, 1.6, 8.8, C.taupeD);
    rollers.push({ r, x, y });
  }
  // 煤塊
  const lumps = [];
  for (let i = 0; i < 7; i++) {
    const l = g(svg);
    path(l, 'M-5 0L-4 -5L1 -7L5 -4L5 0Z', C.coal);
    lumps.push({ l, u: i / 7 });
  }

  const npc = makeCoal(svg, { x: 152, y: 268, s: .78 });

  let roll = 0, wspin = 0, dash = 0;
  const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const n = a.night;
      bg.sky.setAttribute('fill', nightMix(C.sky, C.skyN, n));
      far.setAttribute('fill', nightMix(C.far, C.farN, n));
      bg.ground.setAttribute('fill', nightMix(C.ground, C.groundN, n * .8));
      winLight.forEach(w => w.setAttribute('fill', n > .5 ? '#f6d68a' : C.beige));
      const v = (run > 0 ? .02 + run * .09 : 0) * a.speed;     // 輸送帶：每秒走全長的比例
      roll += dt * v; wspin += dt * (run > 0 ? .2 + run * 1.4 : 0) * a.speed; dash += dt * v * L;
      beltDash.setAttribute('stroke-dashoffset', (-dash % 9).toFixed(1));
      rollers.forEach(o => tf(o.r, `translate(${o.x} ${o.y}) rotate(${(dash / 4.4 * 57.3) % 360})`));
      tf(wheel, `translate(347 206) rotate(${(wspin * 57.3) % 360})`);
      for (const k of lumps) {
        const u = (k.u + roll) % 1;
        const x = A[0] + (B[0] - A[0]) * u, y = A[1] + (B[1] - A[1]) * u - 6;
        tf(k.l, `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${ang * 57.3})`);
        k.l.setAttribute('opacity', run > 0 ? (u < .05 ? u / .05 : u > .95 ? (1 - u) / .05 : 1).toFixed(2) : .9);
      }
    },
  };
}
