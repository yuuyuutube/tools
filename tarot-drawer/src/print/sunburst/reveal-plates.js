import {printCard,plateSVG,INKS} from '../press.js';
import {WINDOW,sunburstFrame,shiftMap,shiftAreas} from './layout.js';
import {BATCH} from './registry.js';
import {SETTINGS} from './batch-pipeline.js';
import {illustrationAsset} from './illustration-asset.js';
import {cardById} from '../../data/cards.js';

// Flip-reveal separations for 1–21. They reprint the reviewed Y/O/B/N source
// plates with the production seed and settings, so the separations sum to the
// same illustration as assets/faces/*.webp. Baked once by reveal-bake.html into
// assets/reveal/; the site only loads those static files.
const ROOT=new URL('../../../docs/tarot-sunburst/',import.meta.url);
const PALETTE={...INKS,Y:{...INKS.Y,rgb:[232,183,77]},O:{...INKS.O,rgb:[222,83,43]},B:{...INKS.B,rgb:[62,112,150]}};
const QUIET=[{x:147,y:155,rx:17,ry:23},{x:104,y:204,rx:18,ry:18},{x:159,y:192,rx:19,ry:20},{x:104,y:176,rx:17,ry:17}];
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error(`無法載入 ${src}`));i.src=src;});
const dataURL=img=>{const cv=Object.assign(document.createElement('canvas'),{width:img.naturalWidth,height:img.naturalHeight});cv.getContext('2d').drawImage(img,0,0);return cv.toDataURL();};
export const REVEAL_KEYS=['paper','N','Y','O','B'];

export async function buildRevealPlates(number,{inkSpread=.5}={}){
 const config=BATCH[number],MAP=shiftMap({width:1024,height:1536,...config.map},number),w=1024,h=1536;
 const src=Object.fromEntries(await Promise.all(['Y','O','B','N'].map(async k=>[k,dataURL(await load(new URL(`batch-${config.batch}/${number}-${k}-source.png`,ROOT)))])));
 const plates={};
 for(const k of ['Y','O','B'])plates[k]=plateSVG({art:`<image href="${src[k]}" x="${MAP.x-26}" y="${MAP.y-58}" width="${w*MAP.scale}" height="${h*MAP.scale}"/>`,window:WINDOW});
 plates.N=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500"><defs><filter id="ink-spread" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${inkSpread}"/></filter><clipPath id="window"><path d="${WINDOW}"/></clipPath></defs><rect width="300" height="500" fill="black"/><g clip-path="url(#window)"><g filter="url(#ink-spread)"><image href="${src.N}" x="${MAP.x}" y="${MAP.y}" width="${w*MAP.scale}" height="${h*MAP.scale}"/></g></g></svg>`;
 const fr=sunburstFrame(cardById(config.id));plates.FO=plateSVG({frame:fr.O,window:WINDOW});plates.FN=plateSVG({frame:fr.N,window:WINDOW});
 const inks={...PALETTE,...config.palette,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}};
 const layers={};let illustration;
 await printCard(plates,{...SETTINGS,seed:20261117+number,inks,quietAreas:shiftAreas(config.quiet||QUIET,number),
  onInkPlate:(key,cv)=>{if(REVEAL_KEYS.includes(key))layers[key]=illustrationAsset(cv);},
  onIllustration:cv=>{illustration=illustrationAsset(cv);}});
 return {id:config.id,layers,illustration};
}
