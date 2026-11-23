import {printCard,plateSVG,INKS} from '../press.js';
import {WINDOW,sunburstFrame,shiftMap,shiftAreas} from './layout.js';
import {BATCH} from './registry.js';
import {SETTINGS} from './batch-pipeline.js';
import {illustrationAsset} from './illustration-asset.js';
import {cardById} from '../../data/cards.js';

// Separations for 1–21 built from the corrected Photoshop flat colour
// (docs/tarot-sunburst/light-paint/*-colour.png) and its transparent ink.
// Baked once by reveal-bake.html into assets/reveal/ and assets/faces/; the
// site only loads those static files, so drawing a card never computes this.
const ROOT=new URL('../../../docs/tarot-sunburst/light-paint/',import.meta.url);
const PALETTE={...INKS,Y:{...INKS.Y,rgb:[232,183,77]},O:{...INKS.O,rgb:[222,83,43]},B:{...INKS.B,rgb:[62,112,150]}};
const QUIET=[{x:147,y:155,rx:17,ry:23},{x:104,y:204,rx:18,ry:18},{x:159,y:192,rx:19,ry:20},{x:104,y:176,rx:17,ry:17}];
const PAPER=[246,239,224],INK_RGB=[PALETTE.Y.rgb,PALETTE.O.rgb,PALETTE.B.rgb,PALETTE.N.rgb];
export const REVEAL_KEYS=['paper','N','Y','O','B'];
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(Error(`無法載入 ${src}`));i.src=src;});
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});

// Same overprint model as the batch pipeline: each ink multiplies by
// (1-d+d*rgb/255). N here is only the dark tone (halftone), not the line work.
function mix(d){const o=[0,0,0];for(let c=0;c<3;c++){let v=PAPER[c];for(let k=0;k<4;k++)v*=1-d[k]+d[k]*INK_RGB[k][c]/255;o[c]=v;}return o;}
// Squared error plus a small preference for less ink and especially less N,
// so ambiguous greys stay in colour plates the way the swatches were painted.
function cost(d,t){const o=mix(d);return (o[0]-t[0])**2+(o[1]-t[1])**2+(o[2]-t[2])**2+4*(d[0]+d[1]+d[2])+30*d[3];}
function refine(d,t){
 let best=cost(d,t);
 for(const step of [.08,.04,.02,.01,.005]){
  for(let moved=true,guard=0;moved&&guard<40;guard++){moved=false;
   for(let k=0;k<4;k++)for(const s of [step,-step]){const v=d[k]+s;if(v<0||v>1)continue;const old=d[k];d[k]=v;const c=cost(d,t);if(c<best){best=c;moved=true;}else d[k]=old;}
  }
 }
 return best;
}
const GRID=(()=>{const S=8,g=[];for(let a=0;a<=S;a++)for(let b=0;b<=S;b++)for(let c=0;c<=S;c++)for(let n=0;n<=S/2;n++){const d=[a/S,b/S,c/S,n/S];g.push([d,mix(d)]);}return g;})();
function solve(t){
 // Global coarse search, then local refinement: flat colours have few unique
 // values, so this runs per colour (cached), not per pixel.
 const starts=GRID.map(([d,o])=>[(o[0]-t[0])**2+(o[1]-t[1])**2+(o[2]-t[2])**2,d]).sort((a,b)=>a[0]-b[0]).slice(0,4);
 let best=null,bc=Infinity;for(const [,d0] of starts){const d=[...d0],c=refine(d,t);if(c<bc){bc=c;best=d;}}
 return best;
}

export async function buildRevealPlates(number,{inkSpread=.5}={}){
 const config=BATCH[number],MAP=shiftMap({width:1024,height:1536,...config.map},number),w=1024,h=1536,n=w*h;
 const manifest=await (await fetch(new URL('manifest.json',ROOT))).json(),item=manifest.cards.find(c=>c.number===number);
 if(!item)throw Error(`找不到 ${number} 號牌的平塗稿`);
 const [colour,inkImage]=await Promise.all([load(new URL(item.colour,ROOT)),load(new URL(item.ink,ROOT))]);
 const read=img=>{const g=make(w,h).getContext('2d',{willReadFrequently:true});g.drawImage(img,0,0,w,h);return g.getImageData(0,0,w,h).data;};
 const cd=read(colour),id=read(inkImage);
 const keys=['Y','O','B','N'],canvases=Object.fromEntries(keys.map(k=>[k,make(w,h)]));
 const data=Object.fromEntries(keys.map(k=>[k,canvases[k].getContext('2d').createImageData(w,h)]));
 const cache=new Map();
 // These four small glyphs are authored in the colour PNG, not the line master.
 // Preserve their contours as solid dark ink rather than four misregistered
 // halftones. The gold backing comes from a blank part of the same wheel.
 const backingPixel=(540*w+508)*4;
 const glyphBacking=number===10?solve([cd[backingPixel],cd[backingPixel+1],cd[backingPixel+2]]):null;
 for(let i=0;i<n;i++){
  const p=i*4,key=(cd[p]<<16)|(cd[p+1]<<8)|cd[p+2];
  let d=cache.get(key);if(!d){d=solve([cd[p],cd[p+1],cd[p+2]]);cache.set(key,d);}
  const x=i%w,y=(i/w)|0;
  const glyph=number===10&&x>=395&&x<=628&&y>=612&&y<=848&&cd[p]<190&&cd[p+1]<160&&cd[p+2]<100;
  const glyphAlpha=glyph?Math.round(255*Math.max(0,Math.min(1,(230-cd[p])/222))):0;
  if(glyph)d=glyphBacking;
  for(let k=0;k<3;k++){const o=data[keys[k]].data;o[p+1]=Math.round(d[k]*255);o[p+3]=255;}
  const N=data.N.data;N[p]=Math.max(id[p+3],glyphAlpha);N[p+1]=Math.round(d[3]*255);N[p+3]=255;
 }
 for(const k of keys)canvases[k].getContext('2d').putImageData(data[k],0,0);
 const plates={};
 for(const k of ['Y','O','B'])plates[k]=plateSVG({art:`<image href="${canvases[k].toDataURL()}" x="${MAP.x-26}" y="${MAP.y-58}" width="${w*MAP.scale}" height="${h*MAP.scale}"/>`,window:WINDOW});
 plates.N=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500"><defs><filter id="ink-spread" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${inkSpread}"/></filter><clipPath id="window"><path d="${WINDOW}"/></clipPath></defs><rect width="300" height="500" fill="black"/><g clip-path="url(#window)"><g filter="url(#ink-spread)"><image href="${canvases.N.toDataURL()}" x="${MAP.x}" y="${MAP.y}" width="${w*MAP.scale}" height="${h*MAP.scale}"/></g></g></svg>`;
 const fr=sunburstFrame(cardById(config.id));plates.FO=plateSVG({frame:fr.O,window:WINDOW});plates.FN=plateSVG({frame:fr.N,window:WINDOW});
 const inks={...PALETTE,...config.palette,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}};
 const layers={};let illustration;
 await printCard(plates,{...SETTINGS,seed:20261117+number,inks,quietAreas:shiftAreas(config.quiet||QUIET,number),
  onInkPlate:(key,cv)=>{if(REVEAL_KEYS.includes(key))layers[key]=illustrationAsset(cv);},
  onIllustration:cv=>{illustration=illustrationAsset(cv);}});
 return {id:config.id,layers,illustration,colours:cache.size};
}
