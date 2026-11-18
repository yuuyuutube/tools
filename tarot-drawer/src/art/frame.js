// 牌框與牌背：所有牌共用同一個比例（300 × 500）、邊框、牌號與牌名的位置
import { P, N, O, B, plate, burst } from './kit.js';
import { ART } from './index.js';
import { seeded } from '../engine/random.js';

export const CARD_W = 300, CARD_H = 500;
export const FONT = '&quot;Helvetica Neue&quot;,Helvetica,&quot;PingFang TC&quot;,&quot;Noto Sans TC&quot;,&quot;Microsoft JhengHei&quot;,Arial,sans-serif';

// 插畫窗格：上緣兩個圓角，像舊式塔羅的拱窗。插畫座標原點在 (26, 58)，大小 248 × 342
const WIN = 'M26 400V98a40 40 0 0 1 40 -40h168a40 40 0 0 1 40 40v302z';

// 各色版的錯位（單位：牌面座標）。沒有指定時用這組固定值
export const DEFAULT_OFFSETS = { O: [1.4, .9], Y: [-1.1, .7], B: [.9, -1.2], K: [-.9, -.9] };

// 同一次抽牌用同一個種子，錯位就固定：畫面上與下載的海報會一模一樣
export function offsetsFromSeed(seed) {
  const rnd = seeded(seed), o = {};
  for (const k of ['O', 'Y', 'B', 'K']) {
    const ang = rnd() * Math.PI * 2, len = .9 + rnd() * 1.1;
    o[k] = [Math.round(Math.cos(ang) * len * 10) / 10, Math.round(Math.sin(ang) * len * 10) / 10];
  }
  return o;
}

const tr = ([x, y]) => `translate(${x} ${y})`;
const halftone = (id, key, color) =>
  `<pattern id="${id}h${key}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="3.5" cy="3.5" r="1.75" fill="${color}"/></pattern>`;

let uid = 0;

// 印好的牌面：Sunburst 成品縮成 600 × 1000（scripts/export-faces.py 輸出）。
// 抽牌畫面與海報用 printed: true 取用；其他頁面仍畫原本的 SVG 插畫。
const FACE_URL = id => new URL(`../../assets/faces/${id}.webp`, import.meta.url).href;
const faceData = new Map();
// 海報的 SVG 是當成圖片載入的，那時不會去抓外部圖檔，所以先把牌面轉成 data URL
export async function loadFaces(ids) {
  await Promise.all(ids.filter(id => !faceData.has(id)).map(async id => {
    const res = await fetch(FACE_URL(id));
    if (!res.ok) throw new Error('牌面圖片載入失敗');
    const blob = await res.blob();
    faceData.set(id, await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); }));
  }));
}
function printedFace(card, id, attrs) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" ${attrs}>` +
    `<defs><clipPath id="${id}c"><rect width="${CARD_W}" height="${CARD_H}" rx="16"/></clipPath></defs>` +
    `<rect width="${CARD_W}" height="${CARD_H}" rx="16" fill="${P}"/>` +
    `<image class="kf" href="${faceData.get(card.id) || FACE_URL(card.id)}" width="${CARD_W}" height="${CARD_H}" preserveAspectRatio="none" clip-path="url(#${id}c)"/></svg>`;
}

// 牌的正面。attrs 會加在最外層 <svg> 上（放進海報時用來指定位置與大小）
export function faceSVG(card, { offsets = DEFAULT_OFFSETS, id = `f${uid++}_`, attrs = '', printed = false } = {}) {
  if (printed) return printedFace(card, id, attrs);
  const art = ART[card.artwork];
  const a = plate();
  art.draw(a);
  const body = a.out.join('').replace(/\{\{(\w+)\}\}/g, (m, k) => k === 'id' ? id : k === '_' ? 'translate(0 0)' : tr(offsets[k]));
  const star = (x, y) => `<g class="kf" transform="${tr(offsets.O)}" style="mix-blend-mode:multiply">${burst(x, y, 6, 2.3, 4)} fill="${O}"/></g>`;
  const text = `font-family="${FONT}" text-anchor="middle"`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" ${attrs}>` +
    `<defs><clipPath id="${id}w"><path d="${WIN}"/></clipPath>${halftone(id, 'N', N)}${halftone(id, 'B', B)}${halftone(id, 'O', O)}</defs>` +
    `<rect width="${CARD_W}" height="${CARD_H}" rx="16" fill="${P}"/>` +
    `<g clip-path="url(#${id}w)"><path class="kf" d="${WIN}" fill="${art.bg}"/><g transform="translate(26 58)">${body}</g></g>` +
    `<g style="isolation:isolate">${star(60, 34)}${star(240, 34)}` +
    `<g class="kf" transform="${tr(offsets.O)}" style="mix-blend-mode:multiply"><text x="155" y="447" ${text} font-size="27" font-weight="700" letter-spacing="10" fill="${O}" opacity=".85" transform="translate(1.6 1.4)">${card.nameZh}</text></g></g>` +
    `<g class="kl">` +
    `<rect x="9.5" y="9.5" width="281" height="481" rx="9" fill="none" stroke="${N}" stroke-width="2"/>` +
    `<path d="${WIN}" fill="none" stroke="${N}" stroke-width="2.5"/>` +
    `<text x="152" y="41" ${text} font-size="17" font-weight="500" letter-spacing="4" fill="${N}">${card.romanNumeral}</text>` +
    `<text x="155" y="447" ${text} font-size="27" font-weight="700" letter-spacing="10" fill="${N}">${card.nameZh}</text>` +
    `<text x="151.7" y="472" ${text} font-size="9.5" font-weight="500" letter-spacing="3.4" fill="${N}">${card.nameEn.toUpperCase()}</text>` +
    `</g></svg>`;
}

// 牌背使用同一套四色印刷引擎預先輸出的成品，載入時不重算。
// print/back.js 保留可編輯的色版；包括紙紋在內皆為 180° 旋轉對稱。
export const BACK_URL = new URL('../../assets/card-back.png', import.meta.url).href;
// 抽牌畫面輪流使用的牌背（scripts/export-backs.py 輸出的 WebP，清單要一致）
export const BACKS = ['card-back', 'card-back-moth', 'card-back-tide', 'card-back-pomegranate', 'card-back-serpent', 'card-back-flower', 'card-back-geometry']
  .map(name => new URL(`../../assets/backs/${name}.webp`, import.meta.url).href);
export function backSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<image href="${BACK_URL}" width="${CARD_W}" height="${CARD_H}"/></svg>`;
}

export const svgDataURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
