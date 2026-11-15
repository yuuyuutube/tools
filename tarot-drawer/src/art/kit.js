// 插畫工具組：整套牌共用的「印刷語言」
//
// 畫面座標：每張牌的插畫畫在 248 × 342 的窗格裡（由 frame.js 放進牌框）。
// 每個形狀照畫家順序一層一層疊上去，並拆成三種印版：
//   1. 留白（紙色，不位移）——先把底下的顏色挖掉
//   2. 色版（橘／黃／藍／粉，各自有一點點錯位，以相乘疊印）
//   3. 墨線（深藍黑，不位移）
// 色版錯位後，一側會露出細細的紙白、另一側會壓到旁邊的顏色，這就是孔版印刷的套色不準。
// 輸出的字串裡留著 {{O}} {{Y}} {{B}} {{K}} {{id}} 等記號，由 frame.js 換成實際的位移與 id。

export const P = '#f6f0e2';   // 紙
export const N = '#1d2a4d';   // 墨（深藍黑）
export const O = '#FF6B35';   // 朱橘
export const Y = '#FFC629';   // 黃
export const B = '#0078BF';   // 藍
export const K = '#FF48B0';   // 螢光粉
export const O2 = '#ffc0a3';  // 以下是各色的淡版（同一塊色版、較疏的網點）
export const Y2 = '#ffe6a0';
export const B2 = '#a8d0e9';
export const K2 = '#ffc8e3';

const PLATE = { [O]: 'O', [O2]: 'O', [Y]: 'Y', [Y2]: 'Y', [B]: 'B', [B2]: 'B', [K]: 'K', [K2]: 'K' };

const f = v => Math.round(v * 10) / 10;

// ---- 形狀：回傳「還沒收尾的標籤」，由 plate 的方法補上顏色後收尾 ----
export const c = (x, y, r) => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"`;
export const e = (x, y, rx, ry, rot) =>
  `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(ry)}"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}`;
export const r = (x, y, w, h, rx = 0, rot) =>
  `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${rx}"${rot ? ` transform="rotate(${rot} ${f(x + w / 2)} ${f(y + h / 2)})"` : ''}`;
export const p = (d, rot) => `<path d="${d}"${rot ? ` transform="rotate(${rot})"` : ''}`;
export const g = pts => `<polygon points="${pts}"`;

// 放射狀的尖角：k 個尖，外徑 R、內徑 q。四芒星、太陽光芒、鬃毛都用它
export function burst(x, y, R, q, k, rot = -90) {
  const pts = [];
  for (let i = 0; i < k * 2; i++) {
    const a = (rot + i * 180 / k) * Math.PI / 180, rad = i % 2 ? q : R;
    pts.push(`${f(x + rad * Math.cos(a))},${f(y + rad * Math.sin(a))}`);
  }
  return g(pts.join(' '));
}

// 放射狀的短線
export function rays(x, y, r1, r2, k, rot = 0) {
  let d = '';
  for (let i = 0; i < k; i++) {
    const a = (rot + i * 360 / k) * Math.PI / 180, cs = Math.cos(a), sn = Math.sin(a);
    d += `M${f(x + r1 * cs)} ${f(y + r1 * sn)}L${f(x + r2 * cs)} ${f(y + r2 * sn)}`;
  }
  return p(d);
}

// 鐘形：小角色的身體與斗篷。(x, y) 是頂點，w 是底寬，h 是高
export const bell = (x, y, w, h, t = 14) =>
  p(`M${f(x - w / 2)} ${f(y + h)}C${f(x - w / 2)} ${f(y + h * .35)} ${f(x - t)} ${f(y)} ${f(x)} ${f(y)}C${f(x + t)} ${f(y)} ${f(x + w / 2)} ${f(y + h * .35)} ${f(x + w / 2)} ${f(y + h)}Z`);

// 弦月：預設往左鼓，rot 轉方向（-90 = 兩角朝上）
export const crescent = (x, y, R, rot = 0, k = .55) =>
  `<path d="M${f(x)} ${f(y - R)}A${R} ${R} 0 0 0 ${f(x)} ${f(y + R)}A${f(R * k)} ${R} 0 0 1 ${f(x)} ${f(y - R)}Z"${rot ? ` transform="rotate(${rot} ${f(x)} ${f(y)})"` : ''}`;

export const heart = (x, y, s) =>
  p(`M${f(x)} ${f(y + s * .9)}C${f(x - s * 1.4)} ${f(y - s * .1)} ${f(x - s * .7)} ${f(y - s * 1.1)} ${f(x)} ${f(y - s * .35)}C${f(x + s * .7)} ${f(y - s * 1.1)} ${f(x + s * 1.4)} ${f(y - s * .1)} ${f(x)} ${f(y + s * .9)}Z`);

// 雲：三個圓弧，(x, y) 是底邊中點
export const cloud = (x, y, w) =>
  p(`M${f(x - w / 2)} ${f(y)}a${f(w * .18)} ${f(w * .18)} 0 0 1 ${f(w * .2)} ${f(-w * .14)}a${f(w * .24)} ${f(w * .24)} 0 0 1 ${f(w * .44)} ${f(-w * .04)}a${f(w * .17)} ${f(w * .17)} 0 0 1 ${f(w * .36)} ${f(w * .18)}Z`);

// ---- 印版 ----
export function plate() {
  const out = [];
  const LINE = `fill="none" stroke="${N}" stroke-linecap="round" stroke-linejoin="round"`;
  const tint = (s, color, op) => {
    const k = PLATE[color];
    const el = `${s} fill="${color}"${op != null ? ` opacity="${op}"` : ''}/>`;
    out.push(k ? `<g class="kf" transform="{{${k}}}" style="mix-blend-mode:multiply">${el}</g>` : `<g class="kf">${el}</g>`);
  };
  const a = {
    out,
    // 留白：紙色實心
    w(s) { out.push(`${s} fill="${P}"/>`); return a; },
    // 留白 + 上色（沒有外框線）
    k(s, color) { a.w(s); if (color !== P) tint(s, color); return a; },
    // 留白 + 上色 + 墨線外框：最常用
    s(s, color, w = 3) { return a.k(s, color).l(s, w); },
    // 只疊色，不留白：陰影、腮紅這類刻意的疊印
    f(s, color, op) { tint(s, color, op); return a; },
    // 網點疊印：key 是 N／B／O
    h(s, key = 'N') {
      out.push(`<g class="kf" transform="{{${key === 'N' ? '_' : key}}}" style="mix-blend-mode:multiply">${s} fill="url(#{{id}}h${key})"/></g>`);
      return a;
    },
    // 墨線
    l(s, w = 3, extra = '') { out.push(`${s} class="kl" ${LINE} stroke-width="${w}"${extra ? ' ' + extra : ''}/>`); return a; },
    // 墨色實心
    i(s) { out.push(`${s} class="kl" fill="${N}"/>`); return a; },
    // 有顏色的線（不透明）：深色底上的細節
    cl(s, color, w = 3, extra = '') {
      out.push(`${s} class="kf" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${extra ? ' ' + extra : ''}/>`);
      return a;
    },
    // 粗的彩色線加墨線外框：手腳、飄帶
    tube(d, color, w = 9) { a.l(p(d), w + 5); return a.cl(p(d), color, w); },
  };
  return a;
}

// ---- 共用的小圖樣 ----

// 小角色的頭：圓臉、兩顆眼睛。整套牌的角色都長這樣，靠服裝、姿勢和道具區分
export function head(a, x, y, rad = 20, o = {}) {
  const { dx = 0, dy = 0, fill = P, eye = 'dot', mouth = null, cheeks = false } = o;
  a.s(c(x, y, rad), fill, rad < 16 ? 2.5 : 3);
  const gap = rad * .4, ex = x + dx, ey = y + dy - rad * .05, er = Math.max(1.8, rad * .12);
  if (eye === 'dot') a.i(c(ex - gap, ey, er)).i(c(ex + gap, ey, er));
  else if (eye === 'closed') a.l(p(`M${f(ex - gap - 3)} ${f(ey)}q3 3 6 0M${f(ex + gap - 3)} ${f(ey)}q3 3 6 0`), 2);
  else if (eye === 'happy') a.l(p(`M${f(ex - gap - 3)} ${f(ey + 1)}q3 -4 6 0M${f(ex + gap - 3)} ${f(ey + 1)}q3 -4 6 0`), 2);
  const my = ey + rad * .36;
  if (mouth === 'smile') a.l(p(`M${f(ex - 3)} ${f(my)}q3 3 6 0`), 2);
  else if (mouth === 'flat') a.l(p(`M${f(ex - 3)} ${f(my + 1)}h6`), 2);
  else if (mouth === 'o') a.l(c(ex, my + 1.5, 2.2), 2);
  else if (mouth === 'inv') a.l(p(`M${f(ex - 3)} ${f(ey - rad * .36)}q3 -3 6 0`), 2);   // 倒過來的微笑
  if (cheeks) a.f(c(ex - gap - rad * .22, ey + rad * .32, rad * .17), K, .55).f(c(ex + gap + rad * .22, ey + rad * .32, rad * .17), K, .55);
  return a;
}

// 四芒星
export const star = (a, x, y, R, color = Y, w = 2) =>
  w ? a.s(burst(x, y, R, R * .38, 4), color, w) : a.k(burst(x, y, R, R * .38, 4), color);

// 小花：莖、一片葉子、五片花瓣
export function flower(a, x, y, color = K, h = 26) {
  a.l(p(`M${x} ${y}v${-h}`), 2.5);
  a.s(e(x + 6, y - h * .4, 6, 3, -30), B, 2);
  for (let i = 0; i < 5; i++) {
    const t = (i * 72 - 90) * Math.PI / 180;
    a.k(c(x + 6 * Math.cos(t), y - h + 6 * Math.sin(t), 5), color);
  }
  return a.s(c(x, y - h, 3.6), Y, 2);
}

// 發芽的小苗
export function sprout(a, x, y, h = 18) {
  a.l(p(`M${x} ${y}v${-h}`), 2.5);
  return a.s(e(x - 7, y - h - 2, 8, 4, 30), B, 2).s(e(x + 7, y - h - 4, 8, 4, -30), B, 2);
}

// 高腳杯：(x, y) 是杯口中點，全高 20
export function cup(a, x, y, color = Y) {
  a.s(p(`M${x - 10} ${y}H${x + 10}Q${x + 10} ${y + 14} ${x} ${y + 14}Q${x - 10} ${y + 14} ${x - 10} ${y}Z`), color, 2.5);
  return a.l(p(`M${x} ${y + 14}v6M${x - 6} ${y + 20}h12`), 2.5);
}

// 正面坐著的貓（戰車的兩隻、命運之輪頂上那隻）。(x, y) 是身體中心，底邊在 y + 22
export function cat(a, x, y, col, look = 0) {
  a.l(p(`M${x + 16} ${y + 18}q14 -2 10 -18`), 3);
  a.s(bell(x, y - 22, 40, 44, 12), col);
  a.s(g(`${x - 14},${y - 32} ${x - 12},${y - 49} ${x - 2},${y - 39}`), col, 2.5);
  a.s(g(`${x + 14},${y - 32} ${x + 12},${y - 49} ${x + 2},${y - 39}`), col, 2.5);
  a.s(c(x, y - 28, 15), col);
  const eye = s => col === N ? a.w(s) : a.i(s);
  eye(c(x - 5.5 + look * 2, y - 29, 2.4)); eye(c(x + 5.5 + look * 2, y - 29, 2.4));
  if (col === N) a.cl(p(`M${x - 2} ${y - 23}l2 2l2 -2`), P, 1.6); else a.l(p(`M${x - 2} ${y - 23}l2 2l2 -2`), 1.6);
  return a;
}
