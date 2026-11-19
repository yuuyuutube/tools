import {illustrationAsset} from './illustration-asset.js';
import {ROLES,MAP as FOOL_MAP,SUN_RAYS} from './fool-masks.js';
import {printCard,plateSVG,INKS} from '../press.js';
import {WINDOW,sunburstFrame as printFrame,shiftMap,shiftAreas} from './layout.js';
import {cardById} from '../../data/cards.js';
const PALETTE={...INKS,Y:{...INKS.Y,rgb:[232,183,77]},O:{...INKS.O,rgb:[222,83,43]},B:{...INKS.B,rgb:[62,112,150]}};
const ROOT=new URL('../../../docs/tarot-sunburst/',import.meta.url).href;
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
const rgbInk=(base,density,rgb)=>base.map((v,i)=>v*(1-density+density*rgb[i]/255));
const WIN=new Path2D(WINDOW),MAP=shiftMap(FOOL_MAP,0);
export const INK_PATH=ROOT+'fool-pipeline/ink-generated.png';
export const SETTINGS={seed:20261117,scale:3,tune:{jitter:.28,jitterFine:.1,bleed:.12,speckle:.94,misregister:.55,period:1.55}};
export async function buildFool({jitter=true,grain=true,inkSpread=.5,captureIllustration=true,captureInkLayers=false}={}){
 const img=await load(INK_PATH),w=MAP.width,h=MAP.height,n=w*h,source=make(w,h),ctx=source.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(img,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data;
 const labelCanvas=make(w,h),lc=labelCanvas.getContext('2d',{willReadFrequently:true});
 lc.fillStyle='#000';lc.fillRect(0,0,w,h);
 ROLES.forEach((role,id)=>{if(role.path){lc.fillStyle=`rgb(${id},0,0)`;lc.fill(new Path2D(role.path));}});
 const raw=lc.getImageData(0,0,w,h).data,labels=new Uint8Array(n),visited=new Uint8Array(n),ink=new Float32Array(n);
 for(let i=0;i<n;i++){labels[i]=raw[i*4];ink[i]=1-(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)/255;}
 // Flood-fill is used to refine masks, not to invent colours. Large open
 // landscape components keep their explicitly authored spatial masks.
 const queue=new Int32Array(n),votes=new Int32Array(ROLES.length);let snapped=0;
 for(let start=0;start<n;start++){
  if(visited[start]||ink[start]>.22)continue;
  let tail=1,head=0,touch=false;queue[0]=start;visited[start]=1;votes.fill(0);
  while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;votes[labels[i]]++;if(x===0||y===0||x===w-1||y===h-1)touch=true;
   for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!visited[j]&&ink[j]<=.22){visited[j]=1;queue[tail++]=j;}
  }
  if(!touch&&tail<150000){let id=0;for(let k=1;k<votes.length;k++)if(votes[k]>votes[id])id=k;if(votes[id]/tail>.75){for(let k=0;k<tail;k++)labels[queue[k]]=id;snapped++;}}
 }
 const pal=PALETTE,keys=['Y','O','B'];
 const sourcePlates=Object.fromEntries([...keys,'N'].map(k=>[k,make(w,h)]));
 const diagnostic=make(w,h),di=diagnostic.getContext('2d').createImageData(w,h);
 const ids=make(w,h),ii=ids.getContext('2d').createImageData(w,h);
 // Embroidery is pigment only. These masks never touch the raster ink master
 // or N plate, and are clipped by the corrected semantic object labels.
 const gold=make(w,h),coral=make(w,h),petal=make(w,h);
 const gg=gold.getContext('2d');gg.strokeStyle=gg.fillStyle='#fff';gg.lineWidth=4;gg.lineCap='round';
 gg.stroke(new Path2D('M414 739Q505 770 622 746M480 484Q515 509 554 489M369 607Q370 646 384 674'));
 gg.lineWidth=3.8;gg.stroke(new Path2D('M471 580Q486 557 479 536'));
 for(const d of ['M480 549Q463 545 465 555Q473 562 481 554Z','M481 558Q498 546 497 558Q493 567 479 566Z','M475 571Q459 564 461 574Q467 583 472 577Z'])gg.fill(new Path2D(d));
 // Only the rose's existing white centre receives gold; no new black lines.
 gg.beginPath();gg.arc(334,470,6,0,Math.PI*2);gg.fill();
 const cg=coral.getContext('2d');cg.strokeStyle=cg.fillStyle='#fff';cg.lineWidth=5;cg.lineCap='round';
 cg.stroke(new Path2D('M807 574Q815 553 807 540M807 522L816 533L808 543L799 533Z'));
 for(const d of ['M811 548Q795 542 799 552Q802 559 812 555Z','M811 559Q828 548 826 559Q820 568 808 566Z'])cg.fill(new Path2D(d));
 for(const [x,y]of [[786,539],[833,544],[789,570],[831,576]]){cg.beginPath();cg.arc(x,y,2,0,Math.PI*2);cg.fill();}
 const pg=petal.getContext('2d');pg.strokeStyle='#fff';pg.lineWidth=3;pg.lineCap='round';
 pg.stroke(new Path2D('M305 468Q307 480 317 482M324 449Q331 444 338 452M351 456Q363 461 359 470M344 486Q336 493 328 489'));
 const decoration=[gold,coral,petal].map(cv=>cv.getContext('2d').getImageData(0,0,w,h).data);
 const data=Object.fromEntries(Object.keys(sourcePlates).map(k=>[k,sourcePlates[k].getContext('2d').createImageData(w,h)]));
 for(let i=0;i<n;i++){
  const id=labels[i],role=ROLES[id];let color=[246,239,224],density=[...role.ink];
  const blend=(target,a)=>{density=density.map((v,k)=>v*(1-a)+target[k]*a);};
  if(['tunic','rose'].includes(role.id))blend([1,.09,0],decoration[0][i*4+3]/255);
  if(role.id==='bundle')blend([.3,.9,.02],decoration[1][i*4+3]/255);
  if(role.id==='rose')blend([.025,0,.1],decoration[2][i*4+3]/255);
  keys.forEach((key,k)=>{const d=density[k];data[key].data[i*4+1]=Math.round(d*255);data[key].data[i*4+3]=255;color=rgbInk(color,d,pal[key].rgb);});
  data.N.data[i*4]=Math.round(ink[i]*255);data.N.data[i*4+3]=255;
  color.forEach((v,k)=>di.data[i*4+k]=v);di.data[i*4+3]=255;
  const hue=id*2.39996;ii.data[i*4]=128+100*Math.sin(hue);ii.data[i*4+1]=128+100*Math.sin(hue+2);ii.data[i*4+2]=128+100*Math.sin(hue+4);ii.data[i*4+3]=255;
 }
 for(const key of Object.keys(sourcePlates))sourcePlates[key].getContext('2d').putImageData(data[key],0,0);
 diagnostic.getContext('2d').putImageData(di,0,0);ids.getContext('2d').putImageData(ii,0,0);
 for(const key of ['O','B']){const gc=sourcePlates[key].getContext('2d');gc.strokeStyle='#000';gc.lineWidth=10;gc.lineCap='round';gc.stroke(new Path2D(SUN_RAYS));}
 const yc=sourcePlates.Y.getContext('2d');yc.strokeStyle='#f00';yc.lineWidth=10;yc.lineCap='round';yc.stroke(new Path2D(SUN_RAYS));
 // All intermediate stages use exactly the same affine transform and clip.
 const place=(src,background='#f6efe0')=>{const cv=make(900,1500),g=cv.getContext('2d');g.fillStyle=background;g.fillRect(0,0,900,1500);g.scale(3,3);g.save();g.clip(WIN);g.translate(MAP.x,MAP.y);g.scale(MAP.scale,MAP.scale);g.drawImage(src,0,0);g.restore();return cv;};
 const flat=place(diagnostic),fg=flat.getContext('2d');
 const inkAlpha=make(w,h),ai=inkAlpha.getContext('2d').createImageData(w,h);
 for(let i=0;i<n;i++){ai.data[i*4]=INKS.N.rgb[0];ai.data[i*4+1]=INKS.N.rgb[1];ai.data[i*4+2]=INKS.N.rgb[2];ai.data[i*4+3]=ink[i]*255;}
 inkAlpha.getContext('2d').putImageData(ai,0,0);
 // place() leaves its context at the card-unit scale.
 fg.save();fg.clip(WIN);fg.translate(MAP.x,MAP.y);fg.scale(MAP.scale,MAP.scale);fg.drawImage(inkAlpha,0,0);fg.restore();
 const fr=printFrame(cardById('fool')),plates={};
 for(const key of [...keys,'N'])plates[key]=plateSVG({art:`<image href="${sourcePlates[key].toDataURL()}" x="${MAP.x-26}" y="${MAP.y-58}" width="${w*MAP.scale}" height="${h*MAP.scale}"/>`,window:WINDOW});
 plates.N=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500"><defs><filter id="ink-spread" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${Math.max(0,Math.min(.5,inkSpread))}"/></filter><clipPath id="window"><path d="${WINDOW}"/></clipPath></defs><rect width="300" height="500" fill="black"/><g clip-path="url(#window)"><g filter="url(#ink-spread)"><image href="${sourcePlates.N.toDataURL()}" x="${MAP.x}" y="${MAP.y}" width="${w*MAP.scale}" height="${h*MAP.scale}"/></g></g></svg>`;
 plates.FO=plateSVG({frame:fr.O,window:WINDOW});plates.FN=plateSVG({frame:fr.N,window:WINDOW});
 const inks={...PALETTE,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}};
 const quietAreas=[{x:147,y:155,rx:17,ry:23},{x:104,y:204,rx:18,ry:18},{x:159,y:192,rx:19,ry:20},{x:104,y:176,rx:17,ry:17}];
 let illustration;const revealPlates={};
 const final=await printCard(plates,{onInkPlate:captureInkLayers?(key,cv)=>{revealPlates[key]=illustrationAsset(cv);}:undefined,onIllustration:captureIllustration?cv=>{illustration=illustrationAsset(cv);}:undefined,...SETTINGS,inks,quietAreas:shiftAreas(quietAreas,0),tune:{...SETTINGS.tune,...(!jitter?{jitter:0,jitterFine:0,bleed:0,misregister:0}:{}),...(!grain?{speckle:1}: {})}});
 // Raster ink master and masks remain available without any print effect.
 const inkStage=place(source),maskStage=place(ids);
 const smoothImage=await load(ROOT+'line/0-smooth-aligned-rays.png'),smooth=make(1024,1536);smooth.getContext('2d').drawImage(smoothImage,0,0,1024,1536);
 const smoothStage=place(smooth);
 async function addFrame(cv){for(const [key,content]of [['O',fr.O],['N',fr.N]]){
   const hex='#'+INKS[key].rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="900" height="1500">${content.replaceAll('#f00',hex).replaceAll('style="mix-blend-mode:lighten"','')}</svg>`;
   const bitmap=await load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));const g=cv.getContext('2d');g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(bitmap,0,0);g.restore();
  }}
 await addFrame(flat);await addFrame(inkStage);await addFrame(smoothStage);await addFrame(maskStage);
 return {smooth:smoothStage,ink:inkStage,masks:maskStage,flat,final,illustration,sourcePlates,inkAlpha,snapped,labels,revealPlates};
}
