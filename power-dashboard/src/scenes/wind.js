// 04 風力廠：淡紫遠山、鼠尾草綠丘陵、三座圓潤的大風車、小小維修站、會被風吹的草。
// 運動語言：慢慢的「轉」。三座風車速度略有差異，整體活躍度跟著 level（發電功率，不是風速）。
import { g, path, rect, circle, line, tf, clamp } from '../util.js';
import { backdrop, nightMix, stars } from './kit.js';
import { makeWindsock } from './cast.js';

const C = { sky: '#f4efe3', skyN: '#33355a', far: '#c5b8da', farN: '#4a4774', mid: '#a9c09d', midN: '#3f5c55', ground: '#8fab84', groundN: '#3a5149', grass: '#78966d', tower: '#fbf8f0', towerS: '#e2dacb', hub: '#b9a9cf', hut: '#b9a9cf', hutD: '#8d7cab', door: '#6b5e8c' };

function turbine(parent, x, base, h, r) {
  const grp = g(parent);
  path(grp, `M${x - r * .07} ${base}L${x - r * .035} ${base - h}H${x + r * .035}L${x + r * .07} ${base}Z`, C.tower);
  path(grp, `M${x + r * .01} ${base}L${x + r * .02} ${base - h}H${x + r * .035}L${x + r * .07} ${base}Z`, C.towerS);
  rect(grp, x - r * .12, base - h - r * .1, r * .3, r * .17, C.towerS, r * .08);
  const rot = g(grp, { transform: `translate(${x} ${base - h})` });
  for (let i = 0; i < 3; i++) path(rot, `M-${r * .07} 0Q-${r * .12} -${r * .55} 0 -${r}Q${r * .1} -${r * .55} ${r * .07} 0Z`, C.tower, { transform: `rotate(${i * 120})`, stroke: C.towerS, 'stroke-width': .8 });
  circle(rot, 0, 0, r * .1, C.hub);
  return { rot, x, y: base - h };
}

export function build(svg) {
  const bg = backdrop(svg, C.sky, C.ground, 236);
  const st = stars(svg, [[30, 36, 1.4], [86, 60, 1.1], [150, 24, 1.3], [300, 30, 1.5], [360, 74, 1.1]]);
  const far = path(svg, 'M-400 236V190Q-200 150 40 172Q200 120 330 138Q450 150 800 128V236Z', C.far);
  const tFar = turbine(svg, 336, 150, 44, 19);
  const mid = path(svg, 'M-400 236V206Q-160 168 60 186Q180 196 300 184Q460 170 800 196V236Z', C.mid);
  const tMid = turbine(svg, 104, 190, 92, 36);
  // 維修站
  const hut = g(svg);
  rect(hut, 318, 210, 40, 28, C.hut, 3);
  path(hut, 'M312 213L338 194L364 213Z', C.hutD);
  path(hut, 'M332 238V226Q332 220 338 220Q344 220 344 226V238Z', C.door);
  const hutWin = circle(hut, 350, 222, 4, C.tower);
  const near = path(svg, 'M-400 300V244Q-100 226 160 238Q300 244 420 232Q600 222 800 240V300Z', C.ground);
  const tBig = turbine(svg, 236, 240, 172, 62);
  // 草
  const tufts = [];
  [[30, 250], [72, 262], [140, 248], [186, 266], [270, 254], [306, 270], [372, 256], [400, 266]].forEach(([x, y], i) => {
    const t = g(svg, { transform: `translate(${x} ${y})` });
    line(t, 'M0 0Q-2 -8 -5 -12M0 0Q0 -9 1 -14M0 0Q3 -7 6 -10', C.grass, 2.2);
    tufts.push({ t, x, y, k: i * .9 });
  });

  const npc = makeWindsock(svg, { x: 272, y: 266, s: .88 });

  const fans = [[tBig, 1], [tMid, 1.18], [tFar, .86]].map(([o, f], i) => ({ ...o, f, ang: i * 37, w: 0 }));
  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const n = a.night;
      bg.sky.setAttribute('fill', nightMix(C.sky, C.skyN, n));
      far.setAttribute('fill', nightMix(C.far, C.farN, n));
      mid.setAttribute('fill', nightMix(C.mid, C.midN, n));
      near.setAttribute('fill', nightMix(C.ground, C.groundN, n));
      bg.ground.setAttribute('fill', nightMix(C.ground, C.groundN, n));
      st.setAttribute('opacity', clamp(n * 1.2 - .2, 0, 1).toFixed(2));
      hutWin.setAttribute('fill', n > .45 ? '#f6d68a' : C.tower);
      // 角速度（rad/s）上限約 15 rpm，不會瘋狂旋轉；目標速度本身也已平滑
      for (const fan of fans) {
        const target = (run > 0 ? .12 + run * 1.45 : 0) * fan.f * a.speed;
        fan.w += (target - fan.w) * (1 - Math.exp(-dt / 2.5));
        fan.ang += fan.w * dt * 57.3;
        tf(fan.rot, `translate(${fan.x} ${fan.y}) rotate(${(fan.ang % 360).toFixed(2)})`);
      }
      const sway = .6 + run * 1.2;
      for (const tu of tufts) tf(tu.t, `translate(${tu.x} ${tu.y}) skewX(${(Math.sin(t * 1.3 + tu.k) * 6 * sway).toFixed(2)})`);
    },
  };
}
