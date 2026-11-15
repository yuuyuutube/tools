// 最初版本，保留作 Before 對照，不參與正式牌背選擇。
import {P,N,O,Y,burst,rays} from '../art/kit.js';
const CARD_W=300,CARD_H=500;
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
