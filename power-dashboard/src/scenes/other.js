// 06 其他能源工坊：桌上一排能源罐（儲能、汽電共生、燃油、地熱與生質、核能）、管線、會轉的飛輪、吊燈、儀表。
// 運動語言：小東西各自「冒泡、跳針、亮燈」。每罐液面高度＝該項目占工坊發電的相對份量；
// 冒泡速度跟該項目的發電；飛輪、吊燈、儀表跟整個工坊的 level。
// 核能罐只在官方資料出現核能機組時才擺上桌。儲能在充電（負值）時畫成往罐子裡流，不算發電。
import { g, path, rect, circle, line, tf, el, clamp } from '../util.js';
import { makeNpc, nightMix, id, INK } from './kit.js';

const C = { wall: '#efe4c9', wallN: '#4a4256', stripe: '#e5d6b4', floor: '#4a3a30', plank: '#5e4a3c', table: '#6b5444', mustard: '#d6a93a', mustardD: '#b88a22', purple: '#7d6f8e', purpleL: '#a99bb8', glass: '#fbf7ec', cream: '#fbf7ec', bulbOff: '#d9cfb8', bulb: '#ffd96b' };
const JARS = [
  { k: 'storage', fill: '#8f7fa6', lid: C.purple },
  { k: 'cogen', fill: '#d6a93a', lid: C.mustardD },
  { k: 'oil', fill: '#6b4f3a', lid: '#4a3a30' },
  { k: 'renew', fill: '#8fb58a', lid: '#5e8a5a' },
  { k: 'nuclear', fill: '#e2907e', lid: '#b9675a' },
  { k: 'misc', fill: '#a99bb8', lid: C.purple },
];
// 罐子上的小圖示（線條，不用文字）
const ICON = {
  storage: 'M-5 -4h10v9h-10zM-2 -6h4M-2 1h4M0 -1v4',
  cogen: 'M-5 0a5 5 0 0 1 9 -3M5 0a5 5 0 0 1 -9 3M4 -6v3h-3M-4 6v-3h3',
  oil: 'M0 -7C3 -3 5 0 5 2a5 5 0 0 1 -10 0C-5 0 -3 -3 0 -7Z',
  renew: 'M-5 6C-5 -2 0 -6 6 -6C6 2 1 6 -5 6ZM-5 6L2 -1',
  nuclear: 'M0 0m-1.5 0a1.5 1.5 0 1 0 3 0a1.5 1.5 0 1 0 -3 0M-7 0a7 3 0 1 0 14 0a7 3 0 1 0 -14 0M-3.5 -6a7 3 60 1 0 7 12a7 3 60 1 0 -7 -12',
  misc: 'M-3 -3a3 3 0 1 1 3 3v2M0 5v.5',
};

export function build(svg) {
  const wall = rect(svg, -400, -400, 1200, 636, C.wall);
  for (let x = -400; x < 800; x += 36) rect(svg, x, -400, 14, 636, C.stripe, 0, { opacity: .55 });
  rect(svg, -400, 236, 1200, 400, C.floor);
  for (let x = -400; x < 800; x += 46) line(svg, `M${x} 236V300`, C.plank, 2);

  // 圓窗：看得到外面的天色
  const sky = circle(svg, 330, 64, 24, '#f5e7b8');
  circle(svg, 330, 64, 24, 'none', { stroke: C.table, 'stroke-width': 5 });
  line(svg, 'M306 64H354M330 40V88', C.table, 3);

  // 頂上的總管
  const pipeD = 'M50 104H300V150';
  line(svg, pipeD, C.mustardD, 9);
  line(svg, pipeD, C.mustard, 5.5);
  const flow = line(svg, pipeD, C.cream, 2.6, { 'stroke-dasharray': '4 10' });

  // 吊燈
  const bulbs = [178, 222, 266].map((x, i) => {
    line(svg, `M${x} -40V${30 + i % 2 * 10}`, C.table, 1.6);
    rect(svg, x - 5, 28 + i % 2 * 10, 10, 6, C.table, 2);
    return { b: circle(svg, x, 41 + i % 2 * 10, 8, C.bulbOff), x, y: 41 + i % 2 * 10 };
  });

  // 桌子
  rect(svg, 26, 200, 348, 9, C.table, 3);
  rect(svg, 36, 209, 7, 32, C.table, 2); rect(svg, 357, 209, 7, 32, C.table, 2);

  // 能源罐
  const defs = el('defs', null, svg);
  const jars = [];
  JARS.forEach((j, i) => {
    const grp = g(svg);
    const w = 32, h = i % 2 ? 50 : 60;
    const cid = id('jar');
    const cp = el('clipPath', { id: cid }, defs);
    rect(cp, -w / 2 + 2, -h + 2, w - 4, h - 4, '#000', 7);
    rect(grp, -w / 2, -h, w, h, C.glass, 9);
    const liquid = g(grp, { 'clip-path': `url(#${cid})` });
    const fill = path(liquid, '', j.fill);
    const bubbles = [0, 1, 2].map(k => circle(liquid, 0, 0, 2.2, C.cream, { opacity: 0 }));
    rect(grp, -w / 2, -h, w, h, 'none', 9, { stroke: INK, 'stroke-width': 2.4 });
    rect(grp, -w / 2 - 2, -h - 8, w + 4, 9, j.lid, 3);
    line(grp, `M${-w / 2 + 6} ${-h + 10}V${-h + 24}`, '#ffffff', 2.6, { opacity: .7 });
    const ic = line(grp, ICON[j.k], INK, 1.5, { transform: `translate(0 ${-h / 2 + 4})`, opacity: .75 });
    // 管子接到總管
    jars.push({ ...j, grp, fill, bubbles, w, h, ic, level: 0, target: 0, bub: Math.random() });
  });
  const charge = line(svg, '', C.purpleL, 3, { 'stroke-dasharray': '3 6', opacity: 0 });
  const feeds = [];

  // 機器：飛輪＋儀表
  const mach = g(svg);
  rect(mach, 262, 150, 92, 50, C.mustard, 8);
  rect(mach, 262, 186, 92, 14, C.mustardD, 0, { opacity: .45 });
  const wheel = g(mach, { transform: 'translate(334 166)' });
  circle(wheel, 0, 0, 15, C.purple);
  for (let i = 0; i < 3; i++) rect(wheel, -2, -15, 4, 30, C.purpleL, 2, { transform: `rotate(${i * 60})` });
  circle(wheel, 0, 0, 4, C.cream);
  path(mach, 'M272 182A16 16 0 0 1 304 182Z', C.cream);
  const needle = line(mach, 'M288 182L288 170', INK, 2);
  circle(mach, 288, 182, 2.4, INK);
  const lights = [0, 1, 2].map(i => circle(mach, 276 + i * 10, 160, 3, C.bulbOff));

  const npc = makeNpc(svg, { x: 206, y: 258, s: 1.08, body: C.purple, coat: '#fbf7ec', pants: '#4a3a30', hat: 'goggles', hatColor: '#cfe3e0', skin: '#f2d6b8' });

  let lastKey = '', spin = 0, dash = 0, wob = 0;
  function layout(keys) {
    // 依實際出現的項目重新排罐子，位置固定在桌子左半
    const shown = jars.filter(j => keys.includes(j.k));
    const gap = Math.min(42, 196 / Math.max(1, shown.length));
    feeds.forEach(f => f.remove()); feeds.length = 0;
    jars.forEach(j => j.grp.setAttribute('display', 'none'));
    shown.forEach((j, i) => {
      j.x = 60 + i * gap; j.grp.removeAttribute('display');
      tf(j.grp, `translate(${j.x} 200)`);
      feeds.push(line(svg, `M${j.x} ${200 - j.h - 8}V104`, C.mustardD, 4));
    });
    // 管子畫在罐子後面
    feeds.forEach(f => svg.insertBefore(f, jars[0].grp));
  }

  return {
    npc,
    update(t, dt, a) {
      const run = a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const comps = a.components || {};
      const keys = JARS.map(j => j.k).filter(k => comps[k]);
      if (!keys.length) keys.push('storage', 'cogen', 'oil', 'renew');
      const key = keys.join();
      if (key !== lastKey) { layout(keys); lastKey = key; }
      const max = Math.max(1, ...keys.map(k => comps[k]?.mw || 0));
      const n = a.night;
      wall.setAttribute('fill', nightMix(C.wall, '#e2d4b4', n * .6));
      sky.setAttribute('fill', nightMix('#f5e7b8', '#2e3858', n));
      for (const j of jars) {
        if (!keys.includes(j.k)) continue;
        const mw = comps[j.k]?.mw || 0;
        j.target = mw > 0 ? .1 + .78 * mw / max : .04;
        if (!j.init && comps[j.k]) { j.level = j.target; j.init = true; }   // 第一次拿到資料直接到位
        j.level += (j.target - j.level) * (1 - Math.exp(-dt / 4));
        const top = -4 - (j.h - 6) * j.level, wv = Math.sin(t * 2 + j.x) * 1.2;
        j.fill.setAttribute('d', `M${-j.w / 2} 0V${top + wv}Q0 ${top - wv * 1.6} ${j.w / 2} ${top - wv}V0Z`);
        const rate = mw > 0 ? .25 + .5 * mw / max : 0;
        j.bub = (j.bub + dt * rate * a.speed) % 1;
        j.bubbles.forEach((b, i) => {
          const k = (j.bub + i / 3) % 1;
          b.setAttribute('cx', (Math.sin(k * 9 + i) * 5).toFixed(1));
          b.setAttribute('cy', (-4 - k * (j.h - 8) * j.level).toFixed(1));
          b.setAttribute('opacity', rate ? (Math.sin(k * Math.PI) * .9).toFixed(2) : 0);
        });
      }
      // 儲能充電：往儲能罐流進去的虛線
      const st = jars.find(j => j.k === 'storage');
      if (a.charging && keys.includes('storage')) {
        charge.setAttribute('d', `M${st.x + 22} 104V140Q${st.x + 22} 146 ${st.x + 16} 150`);
        charge.setAttribute('opacity', .9);
        charge.setAttribute('stroke-dashoffset', ((t * 14) % 9).toFixed(1));
      } else charge.setAttribute('opacity', 0);
      spin += dt * (run > 0 ? .3 + run * 3.4 : 0) * a.speed;
      dash += dt * (run > 0 ? 6 + run * 30 : 0) * a.speed;
      wob += dt;
      tf(wheel, `translate(334 166) rotate(${((spin * 57.3) % 360).toFixed(1)})`);
      flow.setAttribute('stroke-dashoffset', (-dash % 14).toFixed(1));
      const ang = -70 + run * 140 + (run > 0 ? Math.sin(wob * 3.1) * 3 : 0);
      tf(needle, `rotate(${ang.toFixed(1)} 288 182)`);
      const lit = Math.round(run * 3);
      bulbs.forEach((b, i) => b.b.setAttribute('fill', i < lit || n > .6 && i === 1 ? C.bulb : C.bulbOff));
      lights.forEach((l, i) => l.setAttribute('fill', i < lit ? (Math.sin(t * 2 + i * 2) > -.6 ? '#ef8c6b' : C.cream) : C.bulbOff));
    },
  };
}
