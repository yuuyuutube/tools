// Sunburst card layout, in card units (300 × 500; exported × 3 = 900 × 1500).
// The illustrations carry bleed, so the window is narrowed from the original
// 26–274 × 58–400 by top 38, bottom 14, sides 15 (218 × 290, art unscaled).
// Window and art then move up together by 20 so the numeral, window and titles
// sit evenly between the inner border lines; older print pages keep press.js WINDOW.
import {SOLID,line} from '../press.js';
import {burst} from '../../art/kit.js';
const SERIF='&quot;Songti TC&quot;,&quot;Noto Serif TC&quot;,&quot;Source Han Serif TC&quot;,&quot;PMingLiU&quot;,Georgia,serif';

export const WINDOW='M41 366V116a40 40 0 0 1 40 -40h138a40 40 0 0 1 40 40v250z';
export const WINDOW_BOUNDS={x:41,y:76,width:218,height:290};
export const ART_SHIFT={x:0,y:-20};
// Per-card vertical nudge of the art inside the window (card units, + moves the art down).
// Set with window-editor.html; card number → offset, missing means 0.
export const ART_OFFSET={0:-6,1:6,2:2,3:2,5:-4,7:.5,8:6.5,9:10,20:-2};
export const shiftMap=(m,number)=>({...m,x:m.x+ART_SHIFT.x,y:m.y+ART_SHIFT.y+(ART_OFFSET[number]||0)});
export const shiftAreas=(areas,number)=>areas.map(a=>({...a,x:a.x+ART_SHIFT.x,y:a.y+ART_SHIFT.y+(ART_OFFSET[number]||0)}));

// The same independent web layers serve live cards and raster review exports.
export function sunburstFrameLayers(card){
 const t=`font-family="${SERIF}" text-anchor="middle"`;
 return {
  borderN:`<rect x="10" y="10" width="280" height="480" rx="9" ${line(2.6)}/>`,
  window:`<path d="${WINDOW}" ${line(2.8)}/>`,
  number:`<text x="152.5" y="53" ${t} font-size="20" font-weight="700" letter-spacing="5" ${SOLID}>${card.romanNumeral}</text>`,
  rule:`<path d="M54 382h192" ${line(1)}/>`,
  title:`<text x="156" y="430" ${t} font-size="31" font-weight="900" letter-spacing="12" ${SOLID}>${card.nameZh}</text>`,
  subtitle:`<text x="152" y="456" ${t} font-size="11.500" font-weight="900" letter-spacing="3.600" ${SOLID}>${card.nameEn.toUpperCase()}</text>`,
  borderO:`<rect x="16.500" y="16.500" width="267" height="467" rx="5" ${line(1.3)}/>`,
  ornaments:`${burst(64,46,6,2,4)} ${SOLID}/>${burst(236,46,6,2,4)} ${SOLID}/>${burst(52,424,4.5,1.6,4)} ${SOLID}/>${burst(248,424,4.5,1.6,4)} ${SOLID}/>`
 };
}
export function sunburstFrame(card){
 const f=sunburstFrameLayers(card);
 return {N:f.borderN+f.window+f.number+f.rule+f.title+f.subtitle,O:f.borderO+f.ornaments};
}
