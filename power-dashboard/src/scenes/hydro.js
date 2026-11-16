// 05 水力廠：淡黃天空、深綠山、梯形水壩、從閘門流出的藍綠河、壩腳的小發電屋和渦輪。
// 運動語言：往下、往前的「流」。水流色塊的速度與渦輪轉速跟著 level；水面波紋是固定的環境動態。
// 水流只是發電活躍度的象徵，不代表水庫水位、流量或放水量。
import { g, path, rect, circle, line, tf, clamp } from '../util.js';
import { backdrop, makeNpc, nightMix, stars } from './kit.js';

const C = { sky: '#f5ebc8', skyN: '#28394a', far: '#a3c8b8', farN: '#365a55', mtn: '#2f5d50', mtnL: '#46796a', bank: '#7fae7b', bankN: '#3a5e4c', water: '#6fa7a0', waterL: '#b3d8cf', waterD: '#4f8d85', dam: '#ece3c9', damD: '#d3c8a6', yellow: '#f1d77a', house: '#f4e9c4' };

export function build(svg) {
  const bg = backdrop(svg, C.sky, C.bank, 196);
  const st = stars(svg, [[50, 30, 1.4], [120, 52, 1.1], [190, 20, 1.3], [250, 44, 1.2], [350, 30, 1.5]]);
  const far = path(svg, 'M-400 160L-120 92L40 128L150 70L250 120L340 74L520 140L800 100V200H-400Z', C.far);
  // 山
  path(svg, 'M-400 200L-60 110Q-40 104 -20 112L130 176V200Z', C.mtnL);
  path(svg, 'M-120 200L30 96Q42 88 54 96L170 170V200Z', C.mtn);
  path(svg, 'M240 170L350 90Q362 82 374 90L560 200H240Z', C.mtn);
  path(svg, 'M320 200L430 120L800 200Z', C.mtnL);
  // 水庫
  rect(svg, 96, 112, 210, 14, C.water);
  line(svg, 'M110 118h22M160 116h30M220 119h26M268 116h20', C.waterL, 2);
  // 水壩
  const dam = g(svg);
  path(dam, 'M92 200L114 120H290L312 200Z', C.dam);
  path(dam, 'M108 132H296M103 150H301M98 170H306', 'none', { stroke: C.damD, 'stroke-width': 2 });
  rect(dam, 108, 116, 188, 7, C.damD, 2);
  for (const x of [150, 191, 232]) { rect(dam, x, 176, 22, 24, C.mtn, 3); }
  // 河岸與河
  const bank = path(svg, 'M-400 196H800V300H-400Z', C.bank);
  const river = path(svg, 'M144 196H260Q300 240 340 300H70Q110 240 144 196Z', C.water);
  path(svg, 'M150 198H254Q262 206 268 214H138Q144 206 150 198Z', C.waterD, { opacity: .5 });
  // 流動的水紋：沿著河道往下
  const guides = ['M161 200Q150 250 112 300', 'M184 200Q182 250 168 300', 'M202 200Q206 250 214 300', 'M222 200Q232 252 262 300', 'M243 200Q262 250 312 300'];
  const streams = guides.map((d, i) => line(svg, d, C.waterL, 3.2, { 'stroke-dasharray': `${10 + i % 2 * 6} ${22 + i * 3}`, opacity: .9 }));
  // 閘門出水
  const jets = [161, 202, 243].map(x => path(svg, `M${x - 9} 200Q${x} 210 ${x + 9} 200Z`, C.waterL, { opacity: .9 }));
  // 波紋（環境動態）
  const ripples = [[110, 270], [214, 246], [292, 282], [180, 288], [250, 226]].map(([x, y], i) => ({ p: line(svg, `M${x - 8} ${y}q8 -4 16 0`, C.waterL, 2), x, y, k: i * 1.37 }));
  // 發電屋
  const house = g(svg);
  rect(house, 300, 168, 50, 32, C.house, 3);
  path(house, 'M296 170H354L346 160H304Z', C.mtn);
  circle(house, 325, 184, 11, C.mtn);
  const wheel = g(house, { transform: 'translate(325 184)' });
  for (let i = 0; i < 6; i++) rect(wheel, -1.4, -9, 2.8, 9, C.yellow, 1.4, { transform: `rotate(${i * 60})` });
  circle(wheel, 0, 0, 3, C.house);
  const lamp = circle(house, 342, 176, 2.6, C.yellow);

  const npc = makeNpc(svg, { kind: 'drop', x: 76, y: 258, s: 1.12, body: '#8fcac1', hat: 'helmet', hatColor: C.yellow, hatAccent: '#e3bf4f' });

  let flow = 0, spin = 0;
  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const n = a.night;
      bg.sky.setAttribute('fill', nightMix(C.sky, C.skyN, n));
      far.setAttribute('fill', nightMix(C.far, C.farN, n));
      bank.setAttribute('fill', nightMix(C.bank, C.bankN, n));
      st.setAttribute('opacity', clamp(n * 1.2 - .2, 0, 1).toFixed(2));
      // 河永遠在流（環境），level 讓節奏變快
      flow += dt * (6 + run * 34) * a.speed;
      spin += dt * (run > 0 ? .3 + run * 3 : 0) * a.speed;
      streams.forEach((s, i) => s.setAttribute('stroke-dashoffset', (-(flow * (1 + i * .08)) % 120).toFixed(1)));
      jets.forEach((j, i) => j.setAttribute('opacity', run > 0 ? (.55 + Math.sin(t * 3 + i) * .2 + run * .25).toFixed(2) : 0));
      tf(wheel, `translate(325 184) rotate(${((spin * 57.3) % 360).toFixed(1)})`);
      lamp.setAttribute('fill', run > 0 ? C.yellow : C.damD);
      for (const r of ripples) {
        const k = (t * .16 + r.k) % 1;
        r.p.setAttribute('opacity', (Math.sin(k * Math.PI) * .9).toFixed(2));
        tf(r.p, `translate(${r.x} ${r.y}) scale(${(.6 + k * .8).toFixed(2)}) translate(${-r.x} ${-r.y})`);
      }
    },
  };
}
