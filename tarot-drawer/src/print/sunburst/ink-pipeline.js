import {finishLine} from './line-finishing.js';
import {printCard,plateSVG,INKS} from '../press.js';
import {WINDOW,sunburstFrame as printFrame,shiftMap,shiftAreas} from './layout.js';
import {cardById} from '../../data/cards.js';
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
const WIN=new Path2D(WINDOW);
export async function buildInk(number,config,{inkSpread=.5,sourceMaster}={}){
 const raw=await load(`/docs/tarot-sunburst/line/${number}.png`),master=sourceMaster||finishLine(raw,config.finishing),map=shiftMap(config.map,number);
 const original=make(1024,1536);original.getContext('2d').drawImage(raw,0,0,1024,1536);
 const place=src=>{const cv=make(900,1500),g=cv.getContext('2d');g.fillStyle='#f6efe0';g.fillRect(0,0,900,1500);g.scale(3,3);g.save();g.clip(WIN);g.translate(map.x,map.y);g.scale(map.scale,map.scale);g.drawImage(src,0,0);g.restore();return cv;};
 const plate=make(1024,1536),g=plate.getContext('2d',{willReadFrequently:true}),pixels=master.getContext('2d',{willReadFrequently:true}).getImageData(0,0,1024,1536),data=g.createImageData(1024,1536);
 for(let i=0;i<1024*1536;i++){data.data[i*4]=255-pixels.data[i*4];data.data[i*4+3]=255;}g.putImageData(data,0,0);
 const spread=Math.max(0,Math.min(.5,inkSpread)),fr=printFrame(cardById(config.id));
 const N=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500"><defs><filter id="spread" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${spread}"/></filter><clipPath id="window"><path d="${WINDOW}"/></clipPath></defs><rect width="300" height="500" fill="black"/><g clip-path="url(#window)"><g filter="url(#spread)"><image href="${plate.toDataURL()}" x="${map.x}" y="${map.y}" width="${1024*map.scale}" height="${1536*map.scale}"/></g></g></svg>`;
 const proof=await printCard({N,FO:plateSVG({frame:fr.O,window:WINDOW}),FN:plateSVG({frame:fr.N,window:WINDOW})},{seed:20261117+number,scale:3,inks:{...INKS,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}},tune:{jitter:.28,jitterFine:.1,bleed:.12,speckle:.94,misregister:.55,period:1.55}});
 const smooth=place(original),ink=place(master);
 for(const cv of [smooth,ink])for(const [key,content]of [['O',fr.O],['N',fr.N]]){
  const hex='#'+INKS[key].rgb.map(v=>v.toString(16).padStart(2,'0')).join(''),bitmap=await load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="900" height="1500">${content.replaceAll('#f00',hex).replaceAll('style="mix-blend-mode:lighten"','')}</svg>`));
  const gc=cv.getContext('2d');gc.save();gc.setTransform(1,0,0,1,0,0);gc.drawImage(bitmap,0,0);gc.restore();
 }
 return {smooth,ink,inkMaster:master,proof,sourcePlates:{N:plate},monochrome:true};
}
