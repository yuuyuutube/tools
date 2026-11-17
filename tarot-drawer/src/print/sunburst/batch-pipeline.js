import {BATCH} from './registry.js';
import {printCard,plateSVG,INKS,WINDOW} from '../press.js';
import {printFrame} from '../frame.js';
import {cardById} from '../../data/cards.js';
import {finishLine} from './line-finishing.js';
const PALETTE={...INKS,Y:{...INKS.Y,rgb:[232,183,77]},O:{...INKS.O,rgb:[222,83,43]},B:{...INKS.B,rgb:[62,112,150]}};
const ROOT='/docs/tarot-sunburst/';
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
const rgbInk=(base,density,rgb)=>base.map((v,i)=>v*(1-density+density*rgb[i]/255));
const starPath=(x,y,r)=>new Path2D(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,v=i%2?r*.43:r;return `${i?'L':'M'}${x+Math.cos(a)*v} ${y+Math.sin(a)*v}`;}).join('')+'Z');
const arcStars=m=>Array.from({length:m.count},(_,i)=>{const a=(m.start+(m.end-m.start)*i/(m.count-1))*Math.PI/180;return starPath(m.cx+m.rx*Math.cos(a),m.cy+m.ry*Math.sin(a),m.r);});
const WIN=new Path2D('M26 400V98a40 40 0 0 1 40-40h168a40 40 0 0 1 40 40v302z');

export const SETTINGS={seed:20261117,scale:3,tune:{jitter:.28,jitterFine:.1,bleed:.12,speckle:.94,misregister:.55,period:1.55}};
export async function buildBatch(number,{jitter=true,grain=true,inkSpread=.5}={}){
 const config=BATCH[number],ROLES=config.roles,MAP={width:1024,height:1536,...config.map},INK_PATH=ROOT+(config.finishing?`line/${number}.png`:`batch-${config.batch}/${number}-ink.png`);
 const img=await load(INK_PATH),w=MAP.width,h=MAP.height,n=w*h,source=make(w,h),ctx=source.getContext('2d',{willReadFrequently:true});
 ctx.drawImage(config.finishing?finishLine(img,config.finishing):img,0,0,w,h);const pixels=ctx.getImageData(0,0,w,h).data;
 const labelCanvas=make(w,h),lc=labelCanvas.getContext('2d',{willReadFrequently:true});
 lc.fillStyle='#000';lc.fillRect(0,0,w,h);
 lc.save();if(config.designSize)lc.scale(w/config.designSize[0],h/config.designSize[1]);
 ROLES.forEach((role,id)=>{if(role.path){lc.fillStyle=`rgb(${id},0,0)`;lc.fill(new Path2D(role.path));}});lc.restore();
 const raw=lc.getImageData(0,0,w,h).data;
 const bc=make(w,h),bg=bc.getContext('2d');bg.fillStyle='#000';bg.fillRect(0,0,w,h);bg.save();if(config.designSize)bg.scale(w/config.designSize[0],h/config.designSize[1]);ROLES.forEach((role,id)=>{if(role.path&&!role.componentOnly){bg.fillStyle=`rgb(${id},0,0)`;bg.fill(new Path2D(role.path));}});bg.restore();const base=bg.getImageData(0,0,w,h).data;
 const labels=new Uint8Array(n),visited=new Uint8Array(n),ink=new Float32Array(n);
 for(let i=0;i<n;i++){labels[i]=base[i*4];ink[i]=1-(pixels[i*4]*.2126+pixels[i*4+1]*.7152+pixels[i*4+2]*.0722)/255;}
 // Flood-fill is used to refine masks, not to invent colours. Large open
 // landscape components keep their explicitly authored spatial masks.
 const queue=new Int32Array(n),votes=new Int32Array(ROLES.length),pins=new Int16Array(n).fill(-1);let snapped=0;
 for(const seed of config.seeds||[]){const id=ROLES.findIndex(r=>r.id===seed.role),x=Math.round(seed.x*w/(config.designSize?.[0]||w)),y=Math.round(seed.y*h/(config.designSize?.[1]||h));if(id>=0)pins[y*w+x]=id;}
 for(let start=0;start<n;start++){
  if(visited[start]||ink[start]>.22)continue;
  let tail=1,head=0,touch=false,pinnedId=-1,preserveSpatial=false;queue[0]=start;visited[start]=1;votes.fill(0);
  while(head<tail){const i=queue[head++],x=i%w,y=(i/w)|0;votes[raw[i*4]]++;if(ROLES[base[i*4]].spatialOnly)preserveSpatial=true;if(pins[i]>=0)pinnedId=pins[i];if(x===0||y===0||x===w-1||y===h-1)touch=true;
   for(const j of [x>0?i-1:-1,x<w-1?i+1:-1,y>0?i-w:-1,y<h-1?i+w:-1])if(j>=0&&!visited[j]&&ink[j]<=.22){visited[j]=1;queue[tail++]=j;}
  }
  if(!touch&&!preserveSpatial&&tail<150000){let id=0;for(let k=1;k<votes.length;k++)if(votes[k]>votes[id])id=k;if(pinnedId>=0)id=pinnedId;if(pinnedId>=0||votes[id]/tail>.55){for(let k=0;k<tail;k++)labels[queue[k]]=id;snapped++;}}
 }
 const pal={...PALETTE,...config.palette},keys=['Y','O','B'];
 const sourcePlates=Object.fromEntries([...keys,'N'].map(k=>[k,make(w,h)]));
 const diagnostic=make(w,h),di=diagnostic.getContext('2d').createImageData(w,h);
 const ids=make(w,h),ii=ids.getContext('2d').createImageData(w,h);
 const data=Object.fromEntries(Object.keys(sourcePlates).map(k=>[k,sourcePlates[k].getContext('2d').createImageData(w,h)]));
 for(let i=0;i<n;i++){
  const id=labels[i],role=ROLES[id];let color=[246,239,224],density=[...role.ink];
  keys.forEach((key,k)=>{const d=density[k];data[key].data[i*4+1]=Math.round(d*255);data[key].data[i*4+3]=255;color=rgbInk(color,d,pal[key].rgb);});
  data.N.data[i*4]=Math.round(ink[i]*255);data.N.data[i*4+3]=255;if(role.dark){data.N.data[i*4+1]=role.dark*255;color=rgbInk(color,role.dark,pal.N.rgb);}
  color.forEach((v,k)=>di.data[i*4+k]=v);di.data[i*4+3]=255;
  const hue=id*2.39996;ii.data[i*4]=128+100*Math.sin(hue);ii.data[i*4+1]=128+100*Math.sin(hue+2);ii.data[i*4+2]=128+100*Math.sin(hue+4);ii.data[i*4+3]=255;
 }
 for(const key of Object.keys(sourcePlates))sourcePlates[key].getContext('2d').putImageData(data[key],0,0);
 diagnostic.getContext('2d').putImageData(di,0,0);ids.getContext('2d').putImageData(ii,0,0);
 for(const mark of config.marks||[]){
  if(mark.type==='star-arc'){for(const key of Object.keys(sourcePlates)){const g=sourcePlates[key].getContext('2d');g.fillStyle=key==='N'?'#000':`rgb(0,${Math.round(config.roles[0].ink[['Y','O','B'].indexOf(key)]*255)},0)`;for(const [x,y]of mark.old){g.beginPath();g.arc(x,y,23,0,Math.PI*2);g.fill();}for(const path of arcStars(mark)){g.fillStyle=key==='Y'?'#f00':'#000';g.fill(path);if(key==='N'){g.strokeStyle='#f00';g.lineWidth=4.5;g.stroke(path);}}}continue;}
  if(mark.type==='crown'){for(const key of Object.keys(sourcePlates)){const g=sourcePlates[key].getContext('2d');g.fillStyle=key==='Y'?'rgb(0,158,0)':'#000';g.fillRect(...mark.rect);g.fillStyle=key==='Y'?'#f00':'#000';g.fill(new Path2D(mark.path));if(key==='N'){g.strokeStyle='#f00';g.lineWidth=5;g.stroke(new Path2D(mark.path));g.stroke(new Path2D('M439 329Q506 309 575 329M443 339Q506 319 572 339'));}}continue;}
  const path=mark.type==='star'?new Path2D(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?mark.r*.43:mark.r;return `${i?'L':'M'}${mark.x+Math.cos(a)*r} ${mark.y+Math.sin(a)*r}`;}).join('')+'Z'):null;
  for(const key of Object.keys(sourcePlates)){const g=sourcePlates[key].getContext('2d');g.fillStyle=mark.inverse?'#000':key==='N'?'#f00':'#000';g.font=`bold ${mark.size||30}px Georgia`;g.textAlign='center';if(path){g.fillStyle=key==='Y'?'#f00':'#000';g.fill(path);if(key==='N'){g.strokeStyle='#f00';g.lineWidth=4;g.stroke(path);}}else g.fillText(mark.text,mark.x,mark.y);}
 }
 // All intermediate stages use exactly the same affine transform and clip.
 const place=(src,background='#f6efe0')=>{const cv=make(900,1500),g=cv.getContext('2d');g.fillStyle=background;g.fillRect(0,0,900,1500);g.scale(3,3);g.save();g.clip(WIN);g.translate(MAP.x,MAP.y);g.scale(MAP.scale,MAP.scale);g.drawImage(src,0,0);g.restore();return cv;};
 const flat=place(diagnostic),fg=flat.getContext('2d');
 const inkAlpha=make(w,h),ai=inkAlpha.getContext('2d').createImageData(w,h);
 for(let i=0;i<n;i++){ai.data[i*4]=INKS.N.rgb[0];ai.data[i*4+1]=INKS.N.rgb[1];ai.data[i*4+2]=INKS.N.rgb[2];ai.data[i*4+3]=ink[i]*255;}
 inkAlpha.getContext('2d').putImageData(ai,0,0);
 // place() leaves its context at the card-unit scale.
 fg.save();fg.clip(WIN);fg.translate(MAP.x,MAP.y);fg.scale(MAP.scale,MAP.scale);fg.drawImage(inkAlpha,0,0);fg.restore();
 const fr=printFrame(cardById(config.id)),plates={};
 for(const key of [...keys,'N'])plates[key]=plateSVG({art:`<image href="${sourcePlates[key].toDataURL()}" x="${MAP.x-26}" y="${MAP.y-58}" width="${w*MAP.scale}" height="${h*MAP.scale}"/>`});
 plates.N=`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="500" viewBox="0 0 300 500"><defs><filter id="ink-spread" x="-2%" y="-2%" width="104%" height="104%"><feGaussianBlur stdDeviation="${Math.max(0,Math.min(.5,inkSpread))}"/></filter><clipPath id="window"><path d="${WINDOW}"/></clipPath></defs><rect width="300" height="500" fill="black"/><g clip-path="url(#window)"><g filter="url(#ink-spread)"><image href="${sourcePlates.N.toDataURL()}" x="${MAP.x}" y="${MAP.y}" width="${w*MAP.scale}" height="${h*MAP.scale}"/></g></g></svg>`;
 plates.FO=plateSVG({frame:fr.O});plates.FN=plateSVG({frame:fr.N});
 const inks={...PALETTE,...config.palette,FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}};
 const quietAreas=[{x:147,y:155,rx:17,ry:23},{x:104,y:204,rx:18,ry:18},{x:159,y:192,rx:19,ry:20},{x:104,y:176,rx:17,ry:17}];
 const final=await printCard(plates,{...SETTINGS,seed:20261117+number,inks,quietAreas:config.quiet||quietAreas,tune:{...SETTINGS.tune,...(!jitter?{jitter:0,jitterFine:0,bleed:0,misregister:0}:{}),...(!grain?{speckle:1}: {})}});
 // Raster ink master and masks remain available without any print effect.
 const inkStage=place(source),maskStage=place(ids);
 const smoothImage=await load(ROOT+`line/${number}.png`),smooth=make(1024,1536);smooth.getContext('2d').drawImage(smoothImage,0,0,1024,1536);
 const smoothStage=place(smooth);
 async function addFrame(cv){for(const [key,content]of [['O',fr.O],['N',fr.N]]){
   const hex='#'+INKS[key].rgb.map(v=>v.toString(16).padStart(2,'0')).join('');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 500" width="900" height="1500">${content.replaceAll('#f00',hex).replaceAll('style="mix-blend-mode:lighten"','')}</svg>`;
   const bitmap=await load('data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg));const g=cv.getContext('2d');g.save();g.setTransform(1,0,0,1,0,0);g.drawImage(bitmap,0,0);g.restore();
  }}
 for(const mark of config.marks||[]){if(mark.type==='star-arc'){let bg=[246,239,224];['Y','O','B'].forEach((k,i)=>bg=rgbInk(bg,config.roles[0].ink[i],pal[k].rgb));for(const [cv,isInk]of [[flat,false],[inkStage,true]]){const g=cv.getContext('2d');g.save();g.translate(MAP.x,MAP.y);g.scale(MAP.scale,MAP.scale);g.fillStyle=isInk?'#fff':`rgb(${bg.join(',')})`;for(const [x,y]of mark.old){g.beginPath();g.arc(x,y,23,0,Math.PI*2);g.fill();}for(const path of arcStars(mark)){g.fillStyle=isInk?'#fff':'#e8b74d';g.fill(path);g.strokeStyle='#1e284a';g.lineWidth=4.5;g.stroke(path);}g.restore();}continue;}if(mark.type==='crown'){for(const [cv,isInk]of [[flat,false],[inkStage,true]]){const cg=cv.getContext('2d');cg.save();cg.translate(MAP.x,MAP.y);cg.scale(MAP.scale,MAP.scale);cg.fillStyle=isInk?'#fff':'#e7c992';cg.fillRect(...mark.rect);cg.fillStyle=isInk?'#fff':'#e8b74d';cg.fill(new Path2D(mark.path));cg.strokeStyle='#1e284a';cg.lineWidth=5;cg.stroke(new Path2D(mark.path));cg.stroke(new Path2D('M439 329Q506 309 575 329M443 339Q506 319 572 339'));cg.restore();}continue;}const g=flat.getContext('2d');g.save();g.translate(MAP.x,MAP.y);g.scale(MAP.scale,MAP.scale);g.font=`bold ${mark.size||30}px Georgia`;g.textAlign='center';g.fillStyle=mark.inverse?'#f6efe0':'#1e284a';if(mark.type==='star'){const p=new Path2D(Array.from({length:10},(_,i)=>{const a=-Math.PI/2+i*Math.PI/5,r=i%2?mark.r*.43:mark.r;return `${i?'L':'M'}${mark.x+Math.cos(a)*r} ${mark.y+Math.sin(a)*r}`;}).join('')+'Z');g.fillStyle='#e8b74d';g.fill(p);g.strokeStyle='#1e284a';g.lineWidth=4;g.stroke(p);}else g.fillText(mark.text,mark.x,mark.y);g.restore();}
 await addFrame(flat);await addFrame(inkStage);await addFrame(smoothStage);await addFrame(maskStage);
 return {smooth:smoothStage,ink:inkStage,inkMaster:source,masks:maskStage,flat,final,sourcePlates,inkAlpha,snapped,labels};
}
