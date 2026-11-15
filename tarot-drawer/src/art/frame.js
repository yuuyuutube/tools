// 牌框與牌背：所有牌共用同一個比例（300 × 500）、邊框、牌號與牌名的位置
import { P, N, O, Y, B, plate, burst, rays } from './kit.js';
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

// 牌的正面。attrs 會加在最外層 <svg> 上（放進海報時用來指定位置與大小）
export function faceSVG(card, { offsets = DEFAULT_OFFSETS, id = `f${uid++}_`, attrs = '' } = {}) {
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

// 牌背：對中心點 180° 旋轉對稱，上下顛倒看起來完全一樣，不會洩漏正逆位
export function backSVG() {
  // 只描述上半部，下半部由整組旋轉 180° 得到
  const lens = 'M106 250Q150 212 194 250Q150 288 106 250Z';
  let half = '';
  half += `<path d="M150 62a26 26 0 1 0 0 52a20 26 0 1 1 0 -52Z" transform="rotate(-90 150 88)" fill="${Y}"/>`;   // 兩角朝上的月亮
  half += `${burst(62, 62, 12, 4.4, 4)} fill="${O}"/>${burst(238, 62, 12, 4.4, 4)} fill="${P}"/>`;
  half += `${burst(100, 132, 6, 2.2, 4)} fill="${P}"/>${burst(200, 132, 6, 2.2, 4)} fill="${P}"/>`;
  half += `${burst(52, 190, 7, 2.6, 4)} fill="${P}"/>`;
  for (const [x, y] of [[84, 92], [216, 92], [150, 138], [44, 128], [256, 128], [70, 160], [230, 160], [120, 44], [180, 44], [40, 230]]) half += `<circle cx="${x}" cy="${y}" r="2" fill="${P}"/>`;
  half += `<path d="M34 34h40M34 34v40" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`;
  half += `<path d="M266 34h-40M266 34v40" fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<rect width="${CARD_W}" height="${CARD_H}" rx="16" fill="${P}"/>` +
    `<rect x="11" y="11" width="278" height="478" rx="9" fill="${N}"/>` +
    `<rect x="22" y="22" width="256" height="456" rx="4" fill="none" stroke="${P}" stroke-width="1.5"/>` +
    `<g>${half}</g><g transform="rotate(180 150 250)">${half}</g>` +
    `${rays(150, 250, 100, 114, 36)} fill="none" stroke="${P}" stroke-width="1.5" stroke-linecap="round"/>` +
    `<circle cx="150" cy="250" r="92" fill="none" stroke="${P}" stroke-width="1.5"/>` +
    `${burst(150, 250, 82, 60, 16)} fill="${Y}"/>` +
    `<circle cx="150" cy="250" r="54" fill="${N}"/>` +
    `<path d="${lens}" fill="${P}"/>` +
    `<circle cx="150" cy="250" r="17" fill="${O}"/><circle cx="150" cy="250" r="7.5" fill="${N}"/>` +
    `<path d="M150 204v-9M150 296v9M112 226l-7 -6M188 274l7 6M188 226l7 -6M112 274l-7 6" fill="none" stroke="${P}" stroke-width="2" stroke-linecap="round"/>` +
    `</svg>`;
}

export const svgDataURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
