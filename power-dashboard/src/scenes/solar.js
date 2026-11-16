// 03 太陽能廠：奶油黃天空、依真實臺灣時間走動的大太陽、兩排面板、磚粉色小控制室、一排小花。
// 運動語言：光的「掃過」。面板上的反光帶掃動頻率與亮度跟著 level；太陽位置只跟時間有關（純美術），
// 不代表任何地點的日照或雲量。發電歸零的夜晚：面板變暗、窗戶亮燈、小晴睡覺。
import { g, path, rect, circle, line, tf, el, clamp } from '../util.js';
import { backdrop, nightMix, stars, id } from './kit.js';
import { makeSunflower } from './cast.js';

const C = { sky: '#fbefc6', skyN: '#2e3858', hill: '#c9dfa8', hillN: '#3c5a52', ground: '#9cc68f', groundN: '#4d7660', groundD: '#7fb174', sun: '#f4bc3a', ring: '#f8d86f', moon: '#f6efd8', panel: '#3f5d7d', panelN: '#28384f', cell: '#7f9dbb', glint: '#e3f0f7', house: '#e59a8a', houseD: '#c97767', roof: '#b45b4f', cream: '#fbf5e4', lamp: '#f6d76b', petalP: '#ef8f9c', petalY: '#f7d25e', stem: '#5e9a5c' };

export function build(svg) {
  const bg = backdrop(svg, C.sky, C.ground, 222);
  const st = stars(svg, [[40, 40, 1.6], [96, 22, 1.2], [150, 54, 1.4], [212, 18, 1.1], [262, 46, 1.6], [330, 28, 1.3], [372, 64, 1.1], [18, 92, 1.2]]);
  // 太陽與月亮
  const sun = g(svg);
  circle(sun, 0, 0, 36, C.ring, { opacity: .55 });
  circle(sun, 3, 2, 27, '#f29a6a', { opacity: .5 });   // 絹印錯版
  circle(sun, 0, 0, 27, C.sun);
  const moon = g(svg, { opacity: 0 });
  path(moon, 'M8 -16A18 18 0 1 0 14 12A14 14 0 1 1 8 -16Z', C.moon);
  const hill = path(svg, 'M-400 222V198Q-100 176 120 192Q260 202 420 180Q600 168 800 190V222Z', C.hill);
  bg.ground.setAttribute('fill', C.ground);
  rect(svg, -400, 240, 1200, 5, C.groundD, 0, { opacity: .6 });

  // 控制室
  const house = g(svg);
  rect(house, 36, 168, 62, 56, C.house, 4);
  path(house, 'M30 172L67 144L104 172Z', C.roof);
  rect(house, 36, 172, 62, 5, C.houseD, 0, { opacity: .5 });
  const win = rect(house, 46, 184, 22, 18, C.cream, 3);
  line(house, 'M57 184V202', C.houseD, 2);
  path(house, 'M76 224V198Q76 190 84 190Q92 190 92 198V224Z', C.houseD);
  // 小儀表：三格亮度＝level
  const bars = [0, 1, 2].map(i => rect(house, 46 + i * 8, 208, 6, 8, C.houseD, 1.5));

  // 面板
  const clipId = id('pv');
  const defs = el('defs', null, svg);
  const glints = [];
  const panelFills = [];
  function panel(x, y, w, h) {
    const cp = el('clipPath', { id: `${clipId}-${glints.length}` }, defs);
    const d = `M${x + w * .1} ${y}H${x + w * .9}L${x + w} ${y + h}H${x}Z`;
    path(cp, d, '#000');
    rect(svg, x + w * .2, y + h, 4, 10, C.houseD, 1.5); rect(svg, x + w * .8 - 4, y + h, 4, 10, C.houseD, 1.5);
    panelFills.push(path(svg, d, C.panel));
    const grid = g(svg, { 'clip-path': `url(#${cp.id})` });
    for (let i = 1; i < 5; i++) { const fx = i / 5; line(grid, `M${x + w * (.1 + .8 * fx)} ${y}L${x + w * fx} ${y + h}`, C.cell, 1.2); }
    line(grid, `M${x + w * .05} ${y + h / 2}H${x + w * .95}`, C.cell, 1.2);
    const gl = path(grid, `M0 ${y - 4}h12l-16 ${h + 8}h-12Z`, C.glint, { opacity: 0 });
    glints.push({ gl, x, w, phase: glints.length * .37 });
  }
  panel(132, 160, 72, 26); panel(214, 160, 72, 26); panel(296, 160, 72, 26);
  panel(118, 192, 82, 30); panel(212, 192, 82, 30); panel(306, 192, 82, 30);

  // 花
  const flowers = [];
  [[24, 252, C.petalP], [112, 246, C.petalY], [178, 256, C.petalP], [250, 248, C.petalY], [318, 256, C.petalP], [380, 248, C.petalY]].forEach(([x, y, c], i) => {
    const f = g(svg, { transform: `translate(${x} ${y})` });
    line(f, 'M0 0V-14', C.stem, 2);
    const head = g(f, { transform: 'translate(0 -14)' });
    for (let k = 0; k < 5; k++) circle(head, Math.cos(k * 1.2566) * 4, Math.sin(k * 1.2566) * 4, 3.2, c);
    circle(head, 0, 0, 2.4, C.cream);
    flowers.push({ f, x, y, k: i * 1.3 });
  });

  const npc = makeSunflower(svg, { x: 92, y: 260, s: .8 });

  let sweep = 0;
  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const n = a.night;
      bg.sky.setAttribute('fill', nightMix(C.sky, C.skyN, n));
      hill.setAttribute('fill', nightMix(C.hill, C.hillN, n));
      bg.ground.setAttribute('fill', nightMix(C.ground, C.groundN, n * .8));
      st.setAttribute('opacity', clamp(n * 1.2 - .2, 0, 1).toFixed(2));
      // 太陽／月亮：依方位角與高度角放在天空上（純美術）
      const az = a.sun?.azimuth ?? 180, el = a.sun?.elevation ?? 40;
      const sx = 200 + clamp((az - 180) / 110, -1.2, 1.2) * 150;
      const sy = 150 - clamp(el, -20, 70) * 1.7;
      tf(sun, `translate(${sx.toFixed(1)} ${sy.toFixed(1)})`);
      sun.setAttribute('opacity', clamp((el + 4) / 8, 0, 1).toFixed(2));
      moon.setAttribute('opacity', clamp(n * 1.3 - .3, 0, 1).toFixed(2));
      tf(moon, 'translate(318 58)');
      win.setAttribute('fill', n > .45 ? C.lamp : C.cream);
      panelFills.forEach(p => p.setAttribute('fill', nightMix(C.panel, C.panelN, n)));
      // 面板反光：掃動速度與亮度跟著 level
      sweep += dt * (.08 + run * .32) * a.speed;
      for (const o of glints) {
        const k = (sweep + o.phase) % 1;
        tf(o.gl, `translate(${(o.x - 30 + k * (o.w + 70)).toFixed(1)} 0)`);
        o.gl.setAttribute('opacity', (run * .75 * Math.sin(k * Math.PI)).toFixed(2));
      }
      const lit = Math.ceil(run * 3 - .01);
      bars.forEach((b, i) => b.setAttribute('fill', i < lit ? C.lamp : C.houseD));
      for (const f of flowers) tf(f.f, `translate(${f.x} ${f.y}) rotate(${(Math.sin(t * .9 + f.k) * 5).toFixed(2)})`);
    },
  };
}
