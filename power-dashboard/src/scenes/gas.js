// 01 燃氣廠：圓頂廠房、大圓窗裡的渦輪、橘色管線裡流動的色塊、兩顆儲氣球。
// 運動語言：連續、穩定的「轉」與「流」。渦輪轉速與管線流速跟著 level；廠房只有極細微的震動。
import { g, path, rect, circle, line, tf, el } from '../util.js';
import { backdrop, nightMix, INK } from './kit.js';
import { makeBall } from './cast.js';

const C = { sky: '#e6dfee', skyN: '#3b3657', far: '#cbc0de', farN: '#4c4670', ground: '#a99bc9', groundN: '#5d5486', groundD: '#9284ba', cream: '#f7f0de', purple: '#8a7bb5', purpleD: '#655692', orange: '#f2a46f', orangeD: '#df8550', glass: '#4f4479', off: '#d9d0e6' };

export function build(svg) {
  const bg = backdrop(svg, C.sky, C.ground, 232);
  const far = path(svg, 'M-400 232V214Q-120 190 60 204T380 196Q560 188 800 206V232Z', C.far);
  path(svg, 'M-400 246H800V252H-400Z', C.groundD, { opacity: .5 });

  // 儲氣球
  const tanks = g(svg);
  for (const [x, y, r] of [[64, 176, 27], [116, 194, 18]]) {
    rect(tanks, x - r * .62, y, 4, 232 - y, C.purpleD, 2); rect(tanks, x + r * .62 - 4, y, 4, 232 - y, C.purpleD, 2);
    circle(tanks, x, y, r, C.orange);
    path(tanks, `M${x - r} ${y}A${r} ${r} 0 0 0 ${x + r} ${y}Z`, C.orangeD, { opacity: .5 });
    rect(tanks, x - r, y - 2.5, r * 2, 5, C.cream);
    path(tanks, `M${x - r * .55} ${y - r * .5}A${r * .7} ${r * .7} 0 0 1 ${x - r * .05} ${y - r * .78}`, 'none', { stroke: C.cream, 'stroke-width': 3.2, 'stroke-linecap': 'round', opacity: .8 });
  }

  // 管線（底色＋流動的奶油色塊）
  const pipeD = 'M64 214V222Q64 226 68 226H136Q142 226 142 220V196Q142 190 148 190H158';
  line(svg, pipeD, C.orangeD, 11);
  line(svg, pipeD, C.orange, 7.5);
  const flow = line(svg, pipeD, C.cream, 3.4, { 'stroke-dasharray': '5 13' });
  line(svg, 'M116 212V226', C.orangeD, 7);

  // 廠房
  const hall = g(svg);
  rect(hall, 262, 46, 17, 70, C.cream, 4); rect(hall, 286, 60, 15, 56, C.cream, 4);
  rect(hall, 262, 62, 17, 7, C.purple); rect(hall, 286, 74, 15, 7, C.purple);
  rect(hall, 259, 41, 23, 9, C.purpleD, 4.5); rect(hall, 283, 55, 21, 9, C.purpleD, 4.5);
  path(hall, 'M150 232V132Q150 116 166 116H306Q320 116 320 132V232Z', C.cream);
  path(hall, 'M156 120A50 46 0 0 1 256 120Z', C.purple);
  path(hall, 'M172 120A34 30 0 0 1 206 92', 'none', { stroke: C.cream, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .5 });
  rect(hall, 150, 116, 170, 8, C.purpleD, 0, { opacity: .25 });
  // 大圓窗與渦輪
  circle(hall, 205, 176, 38, C.purpleD);
  circle(hall, 205, 176, 31, C.glass);
  const rotor = g(hall, { transform: 'translate(205 176)' });
  for (let i = 0; i < 7; i++) path(rotor, 'M0 -5Q9 -16 4 -28Q-1 -24 -3 -6Z', C.orange, { transform: `rotate(${i * 360 / 7})` });
  circle(hall, 205, 176, 7, C.cream); circle(hall, 205, 176, 2.6, C.purpleD);
  path(hall, 'M182 158A30 30 0 0 1 196 148', 'none', { stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .35 });
  // 指示燈（亮幾顆＝level）
  const lamps = [0, 1, 2, 3].map(i => circle(hall, 266 + i * 12, 136, 3.6, C.off));
  // 門與小窗
  path(hall, 'M272 232V212Q272 200 284 200Q296 200 296 212V232Z', C.purpleD);
  rect(hall, 262, 156, 40, 22, C.purple, 5);
  const win = rect(hall, 266, 160, 32, 14, C.sky, 3);
  line(hall, 'M282 160V174', C.purple, 2);

  const npc = makeBall(svg, { x: 236, y: 268, s: .8 });

  let spin = 0, dash = 0;
  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const n = a.night;
      bg.sky.setAttribute('fill', nightMix(C.sky, C.skyN, n));
      far.setAttribute('fill', nightMix(C.far, C.farN, n));
      bg.ground.setAttribute('fill', nightMix(C.ground, C.groundN, n * .8));
      win.setAttribute('fill', n > .5 ? '#f6d68a' : C.sky);
      spin += dt * (.15 + run * 3.2) * a.speed;
      dash += dt * (4 + run * 46) * a.speed;
      tf(rotor, `translate(205 176) rotate(${(spin * 57.3) % 360})`);
      flow.setAttribute('stroke-dashoffset', (-dash % 18).toFixed(1));
      const jit = run > .05 ? Math.sin(t * 37) * .28 * run : 0;
      tf(hall, `translate(${jit.toFixed(2)} 0)`);
      const lit = Math.round(run * 4);
      lamps.forEach((l, i) => l.setAttribute('fill', i < lit ? (i === lit - 1 && Math.sin(t * 2.2) > .6 ? C.orangeD : C.orange) : C.off));
    },
  };
}
