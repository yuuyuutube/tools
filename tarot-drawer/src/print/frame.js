// 新版正面共用的書頁式牌框，沿用已確認的隱者版式。
import {SOLID,line} from './press.js';
import {burst} from '../art/kit.js';
const SERIF = '&quot;Songti TC&quot;,&quot;Noto Serif TC&quot;,&quot;Source Han Serif TC&quot;,&quot;PMingLiU&quot;,Georgia,serif';
export function printFrame(card) {
  const t = `font-family="${SERIF}" text-anchor="middle"`;
  const N =
    `<rect x="10" y="10" width="280" height="480" rx="9" ${line(2.6)}/>` +
    `<path d="M26 400V98a40 40 0 0 1 40 -40h168a40 40 0 0 1 40 40v302z" ${line(2.8)}/>` +
    `<text x="152.5" y="43" ${t} font-size="20" font-weight="700" letter-spacing="5" ${SOLID}>${card.romanNumeral}</text>` +
    `<text x="156" y="450" ${t} font-size="31" font-weight="900" letter-spacing="12" ${SOLID}>${card.nameZh}</text>` +
    `<text x="152" y="474" ${t} font-size="11.500" font-weight="900" letter-spacing="3.600" ${SOLID}>${card.nameEn.toUpperCase()}</text>` +
    `<path d="M40 412h220" ${line(1)}/>`;
  const O =
    `<rect x="16.500" y="16.500" width="267" height="467" rx="5" ${line(1.3)}/>` +
    `${burst(64, 36, 6, 2, 4)} ${SOLID}/>${burst(236, 36, 6, 2, 4)} ${SOLID}/>` +
    `${burst(52, 444, 4.5, 1.6, 4)} ${SOLID}/>${burst(248, 444, 4.5, 1.6, 4)} ${SOLID}/>`;
  return { N, O };
}
