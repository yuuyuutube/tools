import {printCard,plateSVG,INKS} from '../press.js';
import {WINDOW,shiftMap,shiftAreas} from './layout.js';
import {BATCH} from './registry.js';
import {sunburstFrame} from './layout.js';
import {illustrationAsset} from './illustration-asset.js';
import {cardById} from '../../data/cards.js';

const ROOT=new URL('../../../docs/tarot-sunburst/light-paint/',import.meta.url);
const PALETTE={...INKS,Y:{...INKS.Y,rgb:[232,183,77]},O:{...INKS.O,rgb:[222,83,43]},B:{...INKS.B,rgb:[62,112,150]}};
const SETTINGS={scale:3,tune:{jitter:.28,jitterFine:.1,bleed:.12,speckle:.94,misregister:.55,period:1.55}};
const QUIET=[{x:147,y:155,rx:17,ry:23},{x:104,y:204,rx:18,ry:18},{x:159,y:192,rx:19,ry:20},{x:104,y:176,rx:17,ry:17}];
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error(`無法載入 ${src}`));img.src=src});
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
let manifestPromise;
const manifest=()=>manifestPromise ||= fetch(new URL('manifest.json',ROOT)).then(r=>{if(!r.ok)throw Error('無法載入 Photoshop 色稿清單');return r.json()});
const nextFrame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
let buildQueue=Promise.resolve();

// Convert the Photoshop flat-colour raster into Y/O/B coverage masks. The
// alpha-only Photoshop ink remains a separate N plate and is printed last.
export function buildLightPaintReveal(number){
 const task=buildQueue.then(()=>buildLightPaintRevealNow(number));
 buildQueue=task.catch(()=>{});
 return task;
}
async function buildLightPaintRevealNow(number){
 const item=(await manifest()).cards.find(c=>c.number===number);
 if(!item)throw Error(`找不到 ${number} 號牌的平塗稿`);
 const [colour,inkImage]=await Promise.all([load(new URL(item.colour,ROOT)),load(new URL(item.ink,ROOT))]);
 const w=1024,h=1536,map=shiftMap({width:w,height:h,...BATCH[number].map},number);
 const flat=make(w,h),fc=flat.getContext('2d',{willReadFrequently:true});fc.drawImage(colour,0,0,w,h);
 const ink=make(w,h),ic=ink.getContext('2d',{willReadFrequently:true});ic.drawImage(inkImage,0,0,w,h);
 const cd=fc.getImageData(0,0,w,h).data,id=ic.getImageData(0,0,w,h).data;
 const paper=[246,239,224],keys=['Y','O','B'],channels=Object.fromEntries(keys.map(k=>[k,make(w,h)]));
 const images=Object.fromEntries(keys.map(k=>[k,channels[k].getContext('2d').createImageData(w,h)]));
 const nImage=make(w,h),nd=nImage.getContext('2d').createImageData(w,h);
 const rgb=keys.map(k=>PALETTE[k].rgb),dens=[0,0,0];
 for(let y=0;y<h;y++){
  for(let x=0;x<w;x++){
  const i=y*w+x,p=i*4,target0=cd[p],target1=cd[p+1],target2=cd[p+2];dens[0]=dens[1]=dens[2]=0;
  // Coordinate descent fits the three ink densities to each Photoshop pixel.
  for(let pass=0;pass<3;pass++)for(let k=0;k<3;k++){
   let numerator=0,denominator=0;
   for(let ch=0;ch<3;ch++){
    let base=paper[ch];for(let j=0;j<3;j++)if(j!==k)base*=1-dens[j]+dens[j]*rgb[j][ch]/paper[ch];
    const slope=base*(rgb[k][ch]/paper[ch]-1),target=ch===0?target0:ch===1?target1:target2;numerator+=slope*(target-base);denominator+=slope*slope;
   }
   if(denominator>1e-8)dens[k]=Math.max(0,Math.min(1,dens[k]+numerator/denominator));
  }
  for(let k=0;k<3;k++){const d=images[keys[k]].data;d[p+1]=Math.round(dens[k]*255);d[p+3]=255;}
  nd.data[p+1]=id[p+3];nd.data[p+3]=255;
  }
  if(y%24===23)await nextFrame();
 }
 for(const k of keys)channels[k].getContext('2d').putImageData(images[k],0,0);
 nImage.getContext('2d').putImageData(nd,0,0);
 const plate=(source)=>plateSVG({art:`<image href="${source.toDataURL()}" x="${map.x-26}" y="${map.y-58}" width="${w*map.scale}" height="${h*map.scale}"/>`,window:WINDOW});
 const plates={};for(const k of keys)plates[k]=plate(channels[k]);plates.N=plate(nImage);
 const frame=sunburstFrame(cardById(item.id));plates.FO=plateSVG({frame:frame.O,window:WINDOW});plates.FN=plateSVG({frame:frame.N,window:WINDOW});
 const inks={...PALETTE,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}},reveals={};let illustration;
 const printed=await printCard(plates,{...SETTINGS,seed:20261117+number,inks,quietAreas:shiftAreas(BATCH[number].quiet||QUIET,number),onInkPlate:(key,canvas)=>{if(['paper',...keys,'N'].includes(key))reveals[key]=illustrationAsset(canvas)},onIllustration:canvas=>{illustration=illustrationAsset(canvas)}});
 return {illustration:illustration||illustrationAsset(printed),revealPlates:reveals,map};
}
