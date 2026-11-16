// 場景共用：背景、齒輪、NPC 角色。所有角色都由少數色塊組成，表情只換眼睛與嘴巴。
import { el, g, path, rect, circle, line, tf, mix, clamp } from '../util.js';

export const INK = '#2a2622';
let uid = 0;
export const id = p => `${p}${++uid}`;

/** 鋪滿的天空與地面（超出 viewBox，配合 slice 裁切時不露白） */
export function backdrop(svg, sky, ground, gy) {
  const s = rect(svg, -400, -400, 1200, 400 + gy + 2, sky);
  const gr = rect(svg, -400, gy, 1200, 800, ground);
  return { sky: s, ground: gr };
}

/** 齒輪輪廓：n 齒、外徑 R、內徑 r */
export function gearPath(n, R, r) {
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, w = Math.PI / n;
    const pts = [[a - w * .55, r], [a - w * .35, R], [a + w * .35, R], [a + w * .55, r]];
    for (const [ang, rad] of pts) d += (d ? 'L' : 'M') + (Math.cos(ang) * rad).toFixed(2) + ' ' + (Math.sin(ang) * rad).toFixed(2);
  }
  return d + 'Z';
}

/** 依夜晚程度混色 */
export const nightMix = (day, night, n) => n <= 0 ? day : n >= 1 ? night : mix(day, night, n);

/** 夜晚星星（太陽能、水力、風力共用） */
export function stars(svg, pts, fill = '#f6efd8') {
  const grp = g(svg, { opacity: 0 });
  pts.forEach(([x, y, r], i) => circle(grp, x, y, r, fill, { class: `twinkle tw${i % 4}` }));
  return grp;
}

/* ---------------------------------------------------------------- NPC */

const HAIR = { dark: '#3a2f2a', white: '#f4efe4', brown: '#7a4f36' };

/**
 * 角色：原點是兩腳中間。opt：
 *  kind: 'human' | 'drop'
 *  skin, body, pants, hair, hat: 'cap'|'flatcap'|'visor'|'beanie'|'goggles'|'helmet'
 *  mustache, scarf, coat, hatColor, hatAccent
 */
export function makeNpc(parent, opt) {
  const root = g(parent, { class: 'npc', transform: `translate(${opt.x} ${opt.y}) scale(${opt.s || 1})` });
  const bob = g(root);
  const drop = opt.kind === 'drop';
  const fy = drop ? -21 : -41;              // 臉的中心高度
  const skin = opt.skin || '#f4d9bd';

  // 影子
  el('ellipse', { cx: 0, cy: 1, rx: drop ? 15 : 13, ry: 3, fill: INK, opacity: .14 }, root);

  let scarfTail = null, torso, gog = null, cup = null, tube = null, steam = [], bubs = [];
  if (drop) {
    // 小水滴：身體就是水滴
    rect(bob, -8, -6, 6, 6, INK, 3); rect(bob, 2, -6, 6, 6, INK, 3);
    torso = g(bob);
    path(torso, 'M0 -50C7 -40 17 -30 17 -18A17 17 0 0 1 -17 -18C-17 -30 -7 -40 0 -50Z', opt.body);
    path(torso, 'M-11 -24A12 12 0 0 0 -5 -10', 'none', { stroke: '#ffffff', 'stroke-width': 3, 'stroke-linecap': 'round', opacity: .55 });
  } else {
    // 腿與鞋
    rect(bob, -7, -12, 5.5, 11, opt.pants, 2.5); rect(bob, 1.5, -12, 5.5, 11, opt.pants, 2.5);
    el('ellipse', { cx: -4.5, cy: -1.5, rx: 4.6, ry: 2.6, fill: INK }, bob);
    el('ellipse', { cx: 4.5, cy: -1.5, rx: 4.6, ry: 2.6, fill: INK }, bob);
    torso = g(bob);
    if (opt.coat) rect(torso, -12.5, -30, 25, 25, opt.coat, 8);
    rect(torso, -11, -30, 22, 20, opt.body, 8);
    if (opt.coat) { path(torso, 'M-4 -30L0 -20L4 -30', 'none', { stroke: opt.body, 'stroke-width': 0 }); rect(torso, -12.5, -26, 6, 20, opt.coat, 3); rect(torso, 6.5, -26, 6, 20, opt.coat, 3); }
    if (opt.strap) { line(torso, 'M-6 -29V-18M6 -29V-18', opt.strap, 2.4); rect(torso, -7, -20, 14, 8, opt.strap, 2); }
    // 手臂
    line(bob, 'M-10 -25L-14 -15', opt.coat || opt.body, 5.5);
    opt.armR = line(bob, 'M10 -25L14 -15', opt.coat || opt.body, 5.5);
    if (opt.scarf) {
      rect(bob, -10, -31, 20, 5, opt.scarf, 2.5);
      scarfTail = path(bob, '', opt.scarf);
    }
  }

  // 頭
  const head = g(bob, { class: 'npc-head' });
  if (!drop) {
    if (opt.hair && opt.hat !== 'goggles') circle(head, 0, fy - 2, 13.6, opt.hair);
    if (opt.hat === 'goggles') { circle(head, -12, fy - 4, 6.5, HAIR.white); circle(head, 12, fy - 4, 6.5, HAIR.white); circle(head, -9, fy - 11, 6, HAIR.white); circle(head, 9, fy - 11, 6, HAIR.white); }
    circle(head, 0, fy, 13, skin);
  }
  const cheeks = g(head, { opacity: .55 });
  circle(cheeks, -8.4, fy + 4.6, 2.6, '#ef8c8c'); circle(cheeks, 8.4, fy + 4.6, 2.6, '#ef8c8c');

  // 表情零件
  const eyes = g(head, { class: 'eyes' });
  el('ellipse', { cx: -4.6, cy: fy, rx: 1.7, ry: 2.3, fill: INK }, eyes);
  el('ellipse', { cx: 4.6, cy: fy, rx: 1.7, ry: 2.3, fill: INK }, eyes);
  const happy = line(head, `M-7 ${fy + .8}q2.4 -3.6 4.8 0M2.2 ${fy + .8}q2.4 -3.6 4.8 0`, INK, 1.6, { opacity: 0 });
  const closed = line(head, `M-7 ${fy}q2.4 2.4 4.8 0M2.2 ${fy}q2.4 2.4 4.8 0`, INK, 1.6, { opacity: 0 });
  const sleepy = line(head, `M-7 ${fy + .4}h4.6M2.4 ${fy + .4}h4.6`, INK, 1.7, { opacity: 0 });
  const look = g(head, { opacity: 0 });   // 思考：眼睛往上看
  circle(look, -4.2, fy - 1.4, 1.7, INK); circle(look, 5, fy - 1.4, 1.7, INK);
  const smile = line(head, `M-2.6 ${fy + 5.6}q2.6 2.2 5.2 0`, INK, 1.5);
  const open = el('ellipse', { cx: 0, cy: fy + 6.4, rx: 2.4, ry: 2, fill: '#b84a3c', opacity: 0 }, head);
  const hmm = line(head, `M-1.6 ${fy + 6.4}h3.4`, INK, 1.5, { opacity: 0 });

  // 帽子與特徵
  const hc = opt.hatColor, ha = opt.hatAccent;
  if (opt.hat === 'cap') {
    path(head, `M-13.4 ${fy - 3}A13.4 12.5 0 0 1 13.4 ${fy - 3}Z`, hc);
    rect(head, -13.4, fy - 6, 26.8, 3.2, ha, 1.4);
    path(head, `M4 ${fy - 4.4}h14q2.4 .2 .4 3h-14Z`, hc);
  } else if (opt.hat === 'flatcap') {
    path(head, `M-14 ${fy - 3.4}Q-14 ${fy - 16} 0 ${fy - 16}Q14 ${fy - 16} 17 ${fy - 6}Q17 ${fy - 3} 13 ${fy - 3.4}Z`, hc);
    line(head, `M-9 ${fy - 7}Q0 ${fy - 9} 12 ${fy - 6}`, ha, 1.3, { opacity: .6 });
    line(head, `M-7.4 ${fy - 3.8}h4.4M3 ${fy - 3.8}h4.4`, HAIR.white, 2.2);
  } else if (opt.hat === 'visor') {
    path(head, `M-12 ${fy - 7}Q-8 ${fy - 16} 2 ${fy - 14}Q12 ${fy - 14} 12 ${fy - 7}Z`, opt.hair);
    rect(head, -13.6, fy - 7.6, 27.2, 4, hc, 2);
    path(head, `M-2 ${fy - 5}h17q3 1 -1 4h-16Z`, ha);
  } else if (opt.hat === 'beanie') {
    path(head, `M-13.6 ${fy - 3}A13.6 13 0 0 1 13.6 ${fy - 3}Z`, hc);
    rect(head, -14.4, fy - 5.6, 28.8, 4.6, ha, 2.2);
    circle(head, 0, fy - 16.4, 3.6, ha);
  } else if (opt.hat === 'goggles') {
    // 護目鏡：工坊忙的時候拉下來戴上（鏡片半透明，看得到眼睛）
    gog = g(head);
    rect(gog, -13, fy - 9, 26, 3, INK, 1.5, { opacity: .7 });
    circle(gog, -5, fy - 8, 4.6, hc, { stroke: INK, 'stroke-width': 1.6, 'fill-opacity': .55 });
    circle(gog, 5, fy - 8, 4.6, hc, { stroke: INK, 'stroke-width': 1.6, 'fill-opacity': .55 });
    circle(gog, -6.2, fy - 9.2, 1.2, '#ffffff', { opacity: .8 });
    circle(gog, 3.8, fy - 9.2, 1.2, '#ffffff', { opacity: .8 });
    // 手上的東西：沒事喝茶，忙起來拿冒泡的試管
    const hand = g(bob, { transform: 'translate(15 -14)' });
    cup = g(hand);
    rect(cup, -4, -6, 8, 7, '#f4efe4', 2, { stroke: INK, 'stroke-width': 1.2 });
    line(cup, 'M4 -4.5q3 0 3 2.2t-3 2.2', INK, 1.2);
    steam = [-1.6, 1.6].map(x => line(cup, `M${x} -8q-1.6 -2 0 -4q1.6 -2 0 -4`, '#ffffff', 1.3, { opacity: .7 }));
    tube = g(hand, { transform: 'rotate(-14)' });
    rect(tube, -2.6, -15, 5.2, 16, '#fbf7ec', 2.6, { stroke: INK, 'stroke-width': 1.2 });
    rect(tube, -1.6, -8, 3.2, 8, '#8fb58a', 1.6);
    bubs = [0, 1, 2].map(() => circle(tube, 0, 0, 1.1, '#ffffff'));
  } else if (opt.hat === 'helmet') {
    const top = drop ? fy - 16 : fy - 4;
    path(head, `M-12 ${top}A12 10 0 0 1 12 ${top}Z`, hc);
    rect(head, -15, top - 1.4, 30, 3.4, ha, 1.7);
    rect(head, -1.5, top - 10.5, 3, 9, ha, 1.5);
  }
  if (opt.mustache) path(head, `M-6.4 ${fy + 3.6}q3.2 -3 6.4 -1q3.2 -2 6.4 1q-3.2 2.4 -6.4 .6q-3.2 1.8 -6.4 -.6Z`, opt.mustache);

  // 睡覺時飄出的 Z（用線畫，不用文字）
  const zz = g(root, { opacity: 0 });
  const zs = [0, 1, 2].map(i => line(zz, 'M0 0h5l-5 6h5', INK, 1.5, { opacity: 0 }));

  // 點擊區（比角色大一點，手指好點）
  const hit = circle(root, 0, fy + 8, 26, 'transparent', { class: 'npc-hit' });

  let mood = 'calm', talking = false, blinkAt = 2 + Math.random() * 3, blinkT = 0, jumpT = -1, flapT = 0;
  let gogY = -1, squash = -1;
  const show = (n, v) => n.setAttribute('opacity', v ? 1 : 0);
  function face() {
    const sleepingEyes = mood === 'sleep';
    show(eyes, mood === 'calm');
    show(look, mood === 'think');
    show(happy, mood === 'happy');
    show(closed, sleepingEyes);
    show(sleepy, mood === 'sleepy');
    show(hmm, mood === 'think' && !talking);
    show(smile, !(mood === 'think' && !talking));
    zz.setAttribute('opacity', mood === 'sleep' ? 1 : 0);
  }
  face();

  return {
    root, head, hit, fy,
    get mood() { return mood; },
    setMood(m) { if (m !== mood) { mood = m; face(); } },
    talk(v) { talking = v; if (!v) { show(open, false); show(smile, mood !== 'think'); } face(); },
    jump() { jumpT = 0; },
    update(t, dt, still, a) {
      // 發電活躍度：0（未發電／缺值）到 1
      const k = !a || a.state === 'off' || a.state === 'missing' ? 0 : a.level;
      const ease = (cur, target, tau) => cur < -.5 || still ? target : cur + (target - cur) * (1 - Math.exp(-dt / tau));
      // 博士：工坊忙（≥ .55）時戴上護目鏡；手上沒事拿茶杯、有事拿試管
      if (gog) {
        gogY = ease(gogY, k >= .55 ? 8 : 0, .35);
        tf(gog, `translate(0 ${gogY.toFixed(2)})`);
        cup.setAttribute('display', k < .25 ? 'inline' : 'none');
        tube.setAttribute('display', k < .25 ? 'none' : 'inline');
      }
      // 滴滴：未發電時微微扁下來休息，越活躍越飽滿
      if (drop) squash = ease(squash, k > 0 ? 0 : 1, .8);
      const sx = drop ? 1 + squash * .09 : 1, sy = drop ? 1 - squash * .1 + k * .05 : 1;
      if (still) { tf(torso, `translate(0 -2) scale(${sx} ${sy}) translate(0 2)`); return; }
      // 呼吸
      const br = 1 + Math.sin(t * 1.6 + (opt.x || 0)) * .018;
      tf(torso, `translate(0 ${drop ? -2 : -10}) scale(${sx.toFixed(3)} ${(br * sy).toFixed(3)}) translate(0 ${drop ? 2 : 10})`);
      // 跳一下（事件）＋滴滴越活躍彈得越輕快
      let jy = 0;
      if (jumpT >= 0) { jumpT += dt; const j = jumpT / .55; jy = j < 1 ? -Math.sin(j * Math.PI) * 8 : 0; if (j >= 1) jumpT = -1; }
      if (drop && k > 0) jy -= Math.abs(Math.sin(t * (1.4 + k * 2.2))) * (.6 + k * 2.6);
      tf(bob, `translate(0 ${jy.toFixed(2)})`);
      // 茶的熱氣、試管的泡泡
      if (cup) {
        steam.forEach((s, i) => { const p = (t * .5 + i * .5) % 1; tf(s, `translate(0 ${(-p * 4).toFixed(2)})`); s.setAttribute('opacity', (Math.sin(p * Math.PI) * .75).toFixed(2)); });
        bubs.forEach((b, i) => { const p = (t * (.5 + k) + i / 3) % 1; b.setAttribute('cx', (Math.sin(p * 9 + i) * .8).toFixed(2)); b.setAttribute('cy', (-2 - p * 11).toFixed(2)); b.setAttribute('opacity', Math.sin(p * Math.PI).toFixed(2)); });
      }
      // 眨眼
      if (mood === 'calm') {
        blinkAt -= dt;
        if (blinkAt <= 0) { blinkT = .13; blinkAt = 2.4 + Math.random() * 4; }
        if (blinkT > 0) { blinkT -= dt; eyes.setAttribute('transform', `translate(0 ${fy}) scale(1 .12) translate(0 ${-fy})`); }
        else eyes.removeAttribute('transform');
      }
      // 說話：嘴巴開合、頭輕點
      if (talking) {
        flapT += dt;
        const o = Math.sin(flapT * 17) > 0;
        show(open, o); show(smile, !o); show(hmm, false);
        tf(head, `rotate(${Math.sin(flapT * 5) * 2.4} 0 ${fy + 10})`);
      } else head.removeAttribute('transform');
      // 圍巾
      if (scarfTail) {
        const w = Math.sin(t * 3.1) * 2.4, w2 = Math.sin(t * 4.3 + 1) * 3;
        scarfTail.setAttribute('d', `M7 -30C13 ${-31 + w} 18 ${-29 - w} 25 ${-30 + w2}L24 ${-25 + w2}C18 ${-24 - w} 13 ${-26 + w} 7 -26Z`);
      }
      // 睡覺的 Z
      if (mood === 'sleep') zs.forEach((z, i) => {
        const k = ((t * .35 + i / 3) % 1);
        tf(z, `translate(${8 + k * 10} ${fy - 10 - k * 22}) scale(${.6 + k * .6})`);
        z.setAttribute('opacity', clamp(Math.sin(k * Math.PI) * 1.2, 0, 1).toFixed(2));
      });
    },
  };
}
