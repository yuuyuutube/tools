import {WINDOW as SUNBURST_WINDOW,WINDOW_BOUNDS,sunburstFrameLayers} from '../print/sunburst/layout.js';
// 牌框與牌背：所有牌共用同一個比例（300 × 500）、邊框、牌號與牌名的位置
import { P, N, O, B, plate, burst } from './kit.js';
import { ART } from './index.js';
import { seeded } from '../engine/random.js';
import {readInkBleed,normalizeInkBleed} from './ink-settings.js';

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

// WebP contains only illustration; the entire card interface is live SVG.
// 抽牌畫面與海報用 printed: true 取用；其他頁面仍畫原本的 SVG 插畫。
export const ART_VERSION = 'symbols-20261123';
export const illustrationURL = id => new URL(`../../assets/faces/${id}.webp?v=${ART_VERSION}`, import.meta.url).href;
export const revealAssetURL = (number,key) => new URL(`../../assets/reveal/${number}-${key}.webp?v=${ART_VERSION}`, import.meta.url).href;
const FACE_URL = illustrationURL;
const faceData = new Map();
// 濕式擴散先合回原筆畫；乾式紙齒、乾墨再挖除墨色，毛刺只調整墨層邊緣。
// 使用卡面座標，讓水平細線也有非零濾鏡區域，展框時暈墨厚度不變。
function inkBleedFilter(id, kind, radius, blur, spread, opacity, strength, texture) {
 radius*=strength; blur*=strength; spread*=strength;
 opacity=strength===0?0:Math.min(.85,opacity*(1+(strength-1)*.15));
 const weight=kind==='fine'?.45:kind==='text'?.75:1;
 let input='wetInk',dryMarkup='';
 // 先膨脹再收回：只填住細小空隙，避免整層像暈墨一樣發糊。
 if(texture.stick>0){
  const joinRadius=texture.stick*1.6*weight;
  dryMarkup+=`<feMorphology in="${input}" operator="dilate" radius="${joinRadius}" result="joinedInk"/><feMorphology in="joinedInk" operator="erode" radius="${joinRadius}" result="stuckInk"/>`;
  input='stuckInk';
 }
 if(texture.edge>0){
  dryMarkup+=`<feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="31" result="edgeNoise"/><feDisplacementMap in="${input}" in2="edgeNoise" scale="${texture.edge*1.8*weight}" xChannelSelector="R" yChannelSelector="G" result="roughInk"/>`;
  input='roughInk';
 }
 for(const [name,amount,frequency,seed,threshold] of [['tooth',texture.tooth,'1.45',29,.69-texture.tooth*.12*weight],['dry',texture.dry,'.075 1.35',43,.65-texture.dry*.12*weight]]){
  if(amount<=0)continue;
  const slope=12*(name==='dry'?amount*weight:1);
  dryMarkup+=`<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="2" seed="${seed}" result="${name}Noise"/><feColorMatrix in="${name}Noise" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0"/><feComponentTransfer result="${name}Mask"><feFuncA type="linear" slope="${slope}" intercept="${-slope*threshold}"/></feComponentTransfer><feComposite in="${input}" in2="${name}Mask" operator="out" result="${name}Ink"/>`;
  input=name+'Ink';
 }
 return `<filter id="${id}ink-${kind}" filterUnits="userSpaceOnUse" primitiveUnits="userSpaceOnUse" x="-4" y="-4" width="308" height="508" color-interpolation-filters="sRGB">`+
  `<feMorphology in="SourceGraphic" operator="dilate" radius="${radius}" result="spread"/>`+
  `<feTurbulence type="fractalNoise" baseFrequency=".75" numOctaves="2" seed="17" result="grain"/>`+
  `<feDisplacementMap in="spread" in2="grain" scale="${spread}" xChannelSelector="R" yChannelSelector="G"/>`+
  `<feGaussianBlur stdDeviation="${blur}"/><feComponentTransfer><feFuncA type="linear" slope="${opacity}"/></feComponentTransfer>`+
  `<feMerge result="wetInk"><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>${dryMarkup}</filter>`;
}
// 海報的 SVG 是當成圖片載入的，那時不會去抓外部圖檔，所以先把純插畫轉成 data URL
export async function loadFaces(ids) {
  await Promise.all(ids.filter(id => !faceData.has(id)).map(async id => {
    const res = await fetch(FACE_URL(id));
    if (!res.ok) throw new Error('牌面圖片載入失敗');
    const blob = await res.blob();
    faceData.set(id, await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); }));
  }));
}
function printedFace(card, id, attrs, inkBleed) {
 const b=WINDOW_BOUNDS,f=sunburstFrameLayers(card),ink={N:'#1e284a',O:'#ff542e'};
 const layer=(name,markup,color)=>{
  const kind=['number','subtitle'].includes(name)?'fine':name==='title'?'text':'line';
  return `<g class="kl" data-card-layer="${name}"><g filter="url(#${id}ink-${kind})">${markup.replaceAll('#f00',ink[color]).replaceAll('style="mix-blend-mode:lighten"','')}</g></g>`;
 };
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}" role="img" aria-label="${card.romanNumeral} ${card.nameZh}" ${attrs}>`+
  `<defs><clipPath id="${id}art" data-card-clip="illustration"><path d="${SUNBURST_WINDOW}"/></clipPath><clipPath id="${id}card"><rect width="300" height="500" rx="16"/></clipPath><filter id="${id}paper" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".6" numOctaves="3" seed="${card.number+1}" stitchTiles="stitch"/><feColorMatrix type="saturate" values="0"/></filter>`+
  inkBleedFilter(id,'line',.24,.2,.7,.5,inkBleed.line,inkBleed)+inkBleedFilter(id,'text',.14,.14,.45,.4,inkBleed.text,inkBleed)+inkBleedFilter(id,'fine',.08,.1,.25,.3,inkBleed.fine,inkBleed)+`</defs>`+
  `<g clip-path="url(#${id}card)"><g data-card-layer="paper"><rect width="300" height="500" fill="#f6efe0"/><rect width="300" height="500" filter="url(#${id}paper)" opacity=".045" style="mix-blend-mode:multiply"/></g>`+
  `<g class="kf" data-card-layer="illustration" clip-path="url(#${id}art)"><image href="${faceData.get(card.id) || FACE_URL(card.id)}" x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" preserveAspectRatio="none"/></g>`+
  layer('border',f.borderN,'N')+layer('accent-border',f.borderO,'O')+layer('window',f.window,'N')+layer('number',f.number,'N')+layer('rule',f.rule,'N')+layer('title',f.title,'N')+layer('subtitle',f.subtitle,'N')+layer('ornaments',f.ornaments,'O')+`</g></svg>`;
}

// 牌的正面。attrs 會加在最外層 <svg> 上（放進海報時用來指定位置與大小）
export function faceSVG(card, { offsets = DEFAULT_OFFSETS, id = `f${uid++}_`, attrs = '', printed = false, inkBleed } = {}) {
  if (printed) return printedFace(card, id, attrs, inkBleed===undefined?readInkBleed():normalizeInkBleed(inkBleed));
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
export const BACK_NAMES = ['card-back', 'card-back-moth', 'card-back-tide', 'card-back-pomegranate', 'card-back-serpent', 'card-back-flower', 'card-back-geometry'];
export const BACKS = BACK_NAMES.map(name => new URL(`../../assets/backs/${name}.webp`, import.meta.url).href);
// 設定裡的小圖（240 × 400 JPEG），打開設定才載入
export const BACK_THUMBS = BACK_NAMES.map(name => new URL(`../../assets/backs/thumb/${name}.jpg`, import.meta.url).href);
export function backSVG() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${CARD_W} ${CARD_H}">` +
    `<image href="${BACK_URL}" width="${CARD_W}" height="${CARD_H}"/></svg>`;
}

export const svgDataURL = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
