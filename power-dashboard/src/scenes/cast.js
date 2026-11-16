// 不是人類的四位角色：儲氣球「球球」、煤塊「炭伯」、向日葵「小晴」、風向袋「阿颯」。
// 介面與 kit.js 的 makeNpc 相同（root、head、hit、setMood、talk、jump、update），
// 另外 update 會收到該廠的動畫狀態 a，身體姿態跟著發電活躍度變（燈、炭火、花瓣、風向袋）。
// 造型座標沿用 prototype/npc-lineup.html：120 寬的方框、雙腳在 (60, 116)。
import { el, g, path, rect, circle, line, tf, lerp } from '../util.js';
import { INK, id } from './kit.js';

const act = a => !a || a.state === 'off' || a.state === 'missing' ? 0 : a.level;

/** 共用臉：calm／happy／think／sleepy／sleep；說話時嘴巴開合；睡覺飄 Z */
function face(p, x, y, { ink = INK, mouth = '#b84a3c', cheek = '#ef8c8c', s = 1 } = {}) {
  const f = g(p, { transform: `translate(${x} ${y}) scale(${s})` });
  const ch = g(f, { opacity: .55 }); circle(ch, -8.4, 4.6, 2.6, cheek); circle(ch, 8.4, 4.6, 2.6, cheek);
  const eyes = g(f); el('ellipse', { cx: -4.6, cy: 0, rx: 1.7, ry: 2.3, fill: ink }, eyes); el('ellipse', { cx: 4.6, cy: 0, rx: 1.7, ry: 2.3, fill: ink }, eyes);
  const happy = line(f, 'M-7 .8q2.4 -3.6 4.8 0M2.2 .8q2.4 -3.6 4.8 0', ink, 1.6);
  const closed = line(f, 'M-7 0q2.4 2.4 4.8 0M2.2 0q2.4 2.4 4.8 0', ink, 1.6);
  const sleepy = line(f, 'M-7 .4h4.6M2.4 .4h4.6', ink, 1.7);
  const look = g(f); circle(look, -4.2, -1.4, 1.7, ink); circle(look, 5, -1.4, 1.7, ink);
  const smile = line(f, 'M-2.6 5.6q2.6 2.2 5.2 0', ink, 1.5);
  const flat = line(f, 'M-1.6 6.4h3.4', ink, 1.5);
  const open = el('ellipse', { cx: 0, cy: 6.4, rx: 2.4, ry: 2, fill: mouth }, f);
  const zz = g(p); const zs = [0, 1, 2].map(() => line(zz, 'M0 0h5l-5 6h5', INK, 1.5, { opacity: 0 }));
  let blink = 2 + Math.random() * 3, bt = 0;
  const show = (n, v) => n.setAttribute('opacity', v ? 1 : 0);
  return {
    update(t, dt, mood, talking) {
      blink -= dt; if (blink < 0) { bt = .13; blink = 2.5 + Math.random() * 4; } if (bt > 0) bt -= dt;
      show(eyes, mood === 'calm'); if (bt > 0) tf(eyes, 'scale(1 .12)'); else eyes.removeAttribute('transform');
      show(happy, mood === 'happy'); show(closed, mood === 'sleep'); show(sleepy, mood === 'sleepy'); show(look, mood === 'think');
      const o = talking && Math.sin(t * 17) > 0;
      show(open, o); show(smile, !o && mood !== 'think'); show(flat, !o && mood === 'think');
      zz.setAttribute('opacity', mood === 'sleep' ? 1 : 0);
      if (mood === 'sleep') zs.forEach((z, i) => { const k = (t * .35 + i / 3) % 1; tf(z, `translate(${x + 10 + k * 10} ${y - 12 - k * 22}) scale(${.6 + k * .6})`); z.setAttribute('opacity', Math.max(0, Math.sin(k * Math.PI) * 1.2).toFixed(2)); });
    },
  };
}

/** 外框：原點在雙腳中間，和 makeNpc 一樣；內部用 120 寬的造型座標 */
function shell(parent, o, ox = 60) {
  const root = g(parent, { class: 'npc', transform: `translate(${o.x} ${o.y}) scale(${o.s || .64})` });
  const inner = g(root, { transform: `translate(${-ox} -116)` });
  return { root, inner };
}
const shadow = (p, rx = 16, cx = 60) => el('ellipse', { cx, cy: 117, rx, ry: 3.4, fill: INK, opacity: .14 }, p);
const feet = (p, leg, y = 102) => { rect(p, 50, y, 7, 13, leg, 3); rect(p, 63, y, 7, 13, leg, 3); el('ellipse', { cx: 53, cy: 115, rx: 5, ry: 2.8, fill: INK }, p); el('ellipse', { cx: 67, cy: 115, rx: 5, ry: 2.8, fill: INK }, p); };

/** 共同的狀態：心情、說話、跳一下 */
function life(parts, hitAt) {
  let mood = 'calm', talking = false, jumpT = -1;
  const hit = circle(parts.inner, hitAt[0], hitAt[1], hitAt[2] || 34, 'transparent', { class: 'npc-hit' });
  return {
    root: parts.root, hit,
    get mood() { return mood; },
    get talking() { return talking; },
    setMood(m) { mood = m; },
    talk(v) { talking = v; },
    jump() { jumpT = 0; },
    hop(dt) { if (jumpT < 0) return 0; jumpT += dt; const k = jumpT / .55; if (k >= 1) { jumpT = -1; return 0; } return -Math.sin(k * Math.PI) * 12; },
  };
}

/* ---------------- 01 燃氣：儲氣球「球球」 ---------------- */
export function makeBall(parent, o) {
  const O = '#f2a46f', OD = '#df8550', CR = '#f7f0de', P = '#8a7bb5', PD = '#655692';
  const sh = shell(parent, o), p = sh.inner;
  shadow(p, 20); feet(p, PD, 98);
  const bob = g(p);
  line(bob, 'M34 80L26 90', P, 5.5); const armR = line(bob, 'M86 80L94 90', P, 5.5);
  rect(bob, 57, 38, 6, 12, PD, 2);
  const wheel = g(bob); circle(wheel, 0, 0, 7, 'none', { stroke: P, 'stroke-width': 2.6 }); line(wheel, 'M-7 0H7M0 -7V7', P, 2.2);
  const body = g(bob);
  const cid = id('ball'), cp = el('clipPath', { id: cid }, p); circle(cp, 60, 74, 28, '#000');
  circle(body, 60, 74, 28, O);
  path(body, 'M32 74A28 28 0 0 0 88 74Z', OD, { opacity: .4 });
  rect(body, 30, 80, 60, 8, CR, 0, { 'clip-path': `url(#${cid})` });
  const lamps = [48, 60, 72].map(x => circle(body, x, 84, 2.4, '#e8dcc6'));
  line(body, 'M41 62A21 21 0 0 1 52 52', CR, 3.2, { opacity: .8 });
  const f = face(body, 60, 66);
  const L = life(sh, [60, 70]);
  let spin = 0;
  return Object.assign(L, {
    head: body, fy: -50,
    update(t, dt, still, a) {
      const k = act(a);
      lamps.forEach((l, i) => l.setAttribute('fill', i < Math.round(k * 3) ? (!still && i === 2 && Math.sin(t * 3) > .6 ? OD : '#ffd96b') : '#e8dcc6'));
      if (still) { f.update(0, 0, L.mood, false); return; }
      spin += dt * (k > 0 ? .5 + k * 5 : 0);
      tf(wheel, `translate(60 38) rotate(${(spin * 57.3) % 360})`);
      const step = k > 0 ? Math.abs(Math.sin(t * (2 + k * 3))) * (1 + k * 2.5) : 0;
      const puff = L.talking ? 1 + Math.sin(t * 9) * .025 : 1 + Math.sin(t * 1.6) * .015;
      tf(bob, `translate(0 ${(-step + L.hop(dt)).toFixed(2)}) translate(60 102) scale(${puff.toFixed(3)}) translate(-60 -102)`);
      if (L.talking) tf(armR, `rotate(${-40 + Math.sin(t * 8) * 15} 86 80)`); else armR.removeAttribute('transform');
      f.update(t, dt, L.mood, L.talking);
    },
  });
}

/* ---------------- 02 燃煤：煤塊「炭伯」 ---------------- */
export function makeCoal(parent, o) {
  const C = '#3a322e', CL = '#5a4e47', CD = '#2a2420', T = '#8b7b6b', TD = '#665a4e', W = '#f4efe4';
  const sh = shell(parent, o), p = sh.inner;
  shadow(p, 22); feet(p, TD, 98);
  const bob = g(p);
  line(bob, 'M31 82L24 94', TD, 5.5); const armR = line(bob, 'M89 82L96 94', TD, 5.5);
  const body = g(bob);
  path(body, 'M33 102L27 76L37 54L58 46L81 51L93 74L87 102Z', C);
  path(body, 'M37 54L58 46L51 63Z', CL); path(body, 'M81 51L93 74L77 70Z', CL); path(body, 'M33 102L27 76L42 88Z', CD); path(body, 'M87 102L93 74L80 92Z', CD);
  // 炭火般的暖臉頰：發電越活躍越亮（只是表情，不代表燃燒或排放）
  const glow = g(body); circle(glow, 48, 78, 4, '#ff8a4c'); circle(glow, 72, 78, 4, '#ff8a4c');
  path(body, 'M35 56Q37 38 60 36Q83 36 88 52Q88 56 82 55Q60 50 35 58Z', T);
  line(body, 'M44 50Q60 45 80 49', '#a89886', 1.6, { opacity: .7 });
  const brows = line(body, 'M46 61h9M65 61h9', W, 3.2);
  const f = face(body, 60, 69, { ink: '#fbf3df', mouth: '#e8735a', cheek: 'transparent', s: 1.25 });
  path(body, 'M50 76q5 -5 10 -1.5q5 -3.5 10 1.5q-5 4 -10 1q-5 3 -10 -1Z', W);
  const L = life(sh, [60, 72]);
  return Object.assign(L, {
    head: body, fy: -50,
    update(t, dt, still, a) {
      const k = act(a);
      glow.setAttribute('opacity', (k * .75 + (still ? 0 : Math.sin(t * 1.2) * .08)).toFixed(2));
      tf(brows, `translate(0 ${L.mood === 'think' ? -2 : L.mood === 'happy' ? -1 : 0})`);
      if (still) { f.update(0, 0, L.mood, false); return; }
      const nod = L.talking ? Math.sin(t * 4) * 2.5 : Math.sin(t * .9) * .8;
      tf(bob, `translate(0 ${L.hop(dt).toFixed(2)}) rotate(${nod.toFixed(2)} 60 110)`);
      if (L.talking) tf(armR, `rotate(${-30 + Math.sin(t * 5) * 10} 89 82)`); else armR.removeAttribute('transform');
      f.update(t, dt, L.mood, L.talking);
    },
  });
}

/* ---------------- 03 太陽能：向日葵「小晴」 ---------------- */
export function makeSunflower(parent, o) {
  const Y = '#f7c948', Y2 = '#f0b232', G = '#5e9a5c', GL = '#7fb174', BR = '#c98a4b';
  const sh = shell(parent, o), p = sh.inner;
  el('ellipse', { cx: 60, cy: 116, rx: 20, ry: 4.5, fill: GL }, p);
  const stem = line(p, 'M60 116Q58 92 60 66', G, 5);
  const leafL = path(p, 'M59 96Q42 86 36 96Q46 104 59 99Z', G), leafR = path(p, 'M61 88Q78 78 85 88Q74 96 61 91Z', G);
  const head = g(p, { transform: 'translate(60 52)' });
  const petals = Array.from({ length: 14 }, (_, i) => el('ellipse', { cx: 0, cy: -20, rx: 5.2, ry: 11, fill: i % 2 ? Y : Y2 }, head));
  circle(head, 0, 0, 16, BR);
  [[-7, -9], [7, -9], [-10, 4], [10, 4], [0, 11]].forEach(([x, y]) => circle(head, x, y, 1.1, '#a56a35'));
  const f = face(head, 0, 0);
  const L = life(sh, [60, 60, 36]);
  let open = -1;
  return Object.assign(L, {
    head, fy: -64,
    update(t, dt, still, a) {
      const k = act(a), closed = L.mood === 'sleep' || k === 0;
      const target = closed ? .05 : .35 + k * .65;
      open = open < 0 || still ? target : open + (target - open) * (1 - Math.exp(-dt / .8));
      petals.forEach((pt, i) => { const r = 14 + 7 * open; tf(pt, `rotate(${i * 360 / 14 + (1 - open) * 8 * (i % 2 ? 1 : -1)}) translate(0 ${-r + 20})`); pt.setAttribute('ry', (5 + 7 * open).toFixed(1)); });
      // 臉朝向畫面裡的太陽（依太陽方位角），睡覺時垂頭
      const az = a?.sun?.azimuth ?? 180, sunUp = (a?.sun?.elevation ?? 30) > 0;
      const track = closed || !sunUp ? 0 : Math.max(-14, Math.min(14, (az - 180) / 6));
      const droop = closed ? 28 : 0;
      const sway = still ? 0 : Math.sin(t * .6) * 2 + (L.talking ? Math.sin(t * 6) * 4 : 0);
      const lean = droop + track;
      const hx = 60 + Math.sin(lean * Math.PI / 180) * 6, hy = 52 + droop * .2 + (still ? 0 : L.hop(dt) * .5);
      stem.setAttribute('d', `M60 116Q58 92 ${hx.toFixed(1)} ${(hy + 14).toFixed(1)}`);
      tf(head, `translate(${hx.toFixed(1)} ${hy.toFixed(1)}) rotate(${(lean + sway).toFixed(1)})`);
      if (still) { f.update(0, 0, closed ? (a?.night > .5 ? 'sleep' : L.mood) : L.mood, false); return; }
      const wave = L.talking ? Math.sin(t * 8) * 10 : Math.sin(t * 1.1) * 3;
      tf(leafR, `rotate(${(-wave).toFixed(1)} 61 90)`); tf(leafL, `rotate(${(wave * .5).toFixed(1)} 59 97)`);
      f.update(t, dt, L.mood, L.talking);
    },
  });
}

/* ---------------- 04 風力：風向袋「阿颯」 ---------------- */
// 袋子鼓起的程度只跟發電活躍度有關，不是風速。
export function makeWindsock(parent, o) {
  const R = '#e8735a', CR = '#fbf7ec', P = '#8d7cab';
  const sh = shell(parent, o, 40), p = sh.inner;
  el('ellipse', { cx: 40, cy: 116, rx: 14, ry: 3.6, fill: INK, opacity: .14 }, p);
  rect(p, 37, 30, 5, 86, P, 2.5); circle(p, 39.5, 29, 4, '#6b5e8c');
  const sock = g(p);
  const cid = id('sock'), cp = el('clipPath', { id: cid }, p), shape = path(cp, '', '#000');
  const stripes = g(sock, { 'clip-path': `url(#${cid})` });
  [0, 1, 2, 3, 4].forEach(i => rect(stripes, i * 14 - 2, -20, 14, 40, i % 2 ? R : CR));
  const outline = path(sock, '', 'none', { stroke: '#c95c45', 'stroke-width': 1.2, opacity: .5 });
  rect(sock, -2.5, -13, 5, 26, P, 2.5);
  const f = face(sock, 7, -.5, { s: .78 });
  const L = life(sh, [62, 44, 30]);
  let ang = -1;
  function pose(k, t, still) {
    const flutter = still ? 0 : Math.sin(t * (1 + k * 3)) * (2 + k * 5);
    const target = lerp(80, 6, k) + flutter + (L.talking ? Math.sin(t * 7) * 4 : 0);
    return target;
  }
  return Object.assign(L, {
    head: sock, fy: -80,
    update(t, dt, still, a) {
      const k = act(a);
      const target = pose(k, t, still);
      ang = ang < 0 || still ? target : ang + (target - ang) * (1 - Math.exp(-dt / .8));
      const tail = 3 + k * 7, sp = 3 + k * 5;
      const w = still ? 0 : Math.sin(t * sp) * (1 + k * 2.5), w2 = still ? 0 : Math.sin(t * sp + 1.4) * (1.5 + k * 3);
      const len = 52 + k * 10;
      const d = `M0 -12Q${len / 2} ${(-(12 + tail) / 2 + w).toFixed(1)} ${len} ${(-tail + w2).toFixed(1)}L${len} ${(tail + w2).toFixed(1)}Q${len / 2} ${((12 + tail) / 2 + w).toFixed(1)} 0 12Z`;
      shape.setAttribute('d', d); outline.setAttribute('d', d);
      tf(sock, `translate(42 ${36 + (still ? 0 : L.hop(dt) * .4)}) rotate(${ang.toFixed(1)})`);
      f.update(still ? 0 : t, still ? 0 : dt, L.mood, !still && L.talking);
    },
  });
}
