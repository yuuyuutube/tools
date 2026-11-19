import {buildFool} from '../print/sunburst/fool-pipeline.js';
import {faceSVG} from '../art/frame.js';
import {cardById} from '../data/cards.js';
import {windowFrameAt} from './window-reveal.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const clamp=v=>Math.max(0,Math.min(1,v)),progress=(t,start,duration)=>clamp((t-start)/duration),ease=p=>1-(1-p)**3;
let frame=0,time=0,previous=0,svg,original,overlay,windowPath,clipPath,rule,title,subtitle,images={};
function stop(){cancelAnimationFrame(frame);frame=0;}
function apply(t){
 time=Math.max(0,Math.min(1600,t));$('timeline').value=time;$('time').value=`${(time/1000).toFixed(2)} 秒`;
 const flip=ease(progress(time,0,780));$('flip').style.transform=`rotateY(${180*flip}deg)`;
 images.Y.style.opacity=progress(time,700,230);images.O.style.opacity=progress(time,850,230);images.B.style.opacity=progress(time,1000,260);
 const settled=progress(time,1260,160);overlay.style.opacity=1-settled;original.style.opacity=1;
 const wp=ease(progress(time,468,420)),{d}=windowFrameAt(wp);windowPath.setAttribute('d',d);clipPath.setAttribute('d',d);
 svg.querySelector('[data-card-layer="window"]').style.opacity=1;
 const rp=ease(progress(time,648,220));rule.setAttribute('transform',`translate(150 0) scale(${rp} 1) translate(-150 0)`);
 for(const node of [title,subtitle]){const p=progress(time,828,280);node.style.opacity=p;node.setAttribute('transform',`translate(0 ${2*(1-p)})`);}
 $('phase').textContent=time<450?'翻出正面':time<700?'黏墨檢查樣張 · 未上色':time<850?'暖黃套印 · 圖窗展開':time<1000?'朱橘套印 · 牌名浮現':time<1260?'靛藍套印 · 牌名浮現':time<1420?'套印完成':'0 · 愚者';
}
function tick(now){const dt=now-previous;previous=now;apply(time+dt*Number($('speed').value));if(time<1600)frame=requestAnimationFrame(tick);else frame=0;}
function play(){stop();apply(0);previous=performance.now();frame=requestAnimationFrame(tick);}
$('timeline').addEventListener('input',()=>{stop();apply(Number($('timeline').value));});
$('play').addEventListener('click',play);
$('ink').addEventListener('click',()=>{stop();apply(600);});
$('final').addEventListener('click',()=>{stop();apply(1600);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
try{
 await new Promise(requestAnimationFrame);
 const result=await buildFool({captureInkLayers:true});
 $('face').innerHTML=faceSVG(cardById('fool'),{printed:true,id:'fool_demo_'});svg=$('face').querySelector('svg');
 const group=svg.querySelector('[data-card-layer="illustration"]');original=group.querySelector('image');
 // Use the pipeline's complete illustration so the final stage is exact, not a
 // reconstruction of quantized alpha separations. All crops share the same map.
 original.setAttribute('href',result.illustration.toDataURL());
 overlay=document.createElementNS(NS,'g');overlay.dataset.revealPlates='true';overlay.style.isolation='isolate';group.append(overlay);
 for(const key of ['paper','Y','O','B','N']){
  const image=document.createElementNS(NS,'image');image.dataset.plate=key;image.setAttribute('href',result.revealPlates[key].toDataURL());
  for(const [k,v]of Object.entries({x:41,y:76,width:218,height:290,preserveAspectRatio:'none'}))image.setAttribute(k,v);
  if(key!=='paper')image.style.mixBlendMode='multiply';overlay.append(image);images[key]=image;
 }
 windowPath=svg.querySelector('[data-card-layer="window"] path');clipPath=svg.querySelector('[data-card-clip="illustration"] path');rule=svg.querySelector('[data-card-layer="rule"]');title=svg.querySelector('[data-card-layer="title"]');subtitle=svg.querySelector('[data-card-layer="subtitle"]');
 await Promise.all([...group.querySelectorAll('image')].map(image=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=image.getAttribute('href');})));
 const composite=document.createElement('canvas');composite.width=654;composite.height=870;const g=composite.getContext('2d');g.drawImage(result.revealPlates.paper,0,0);g.globalCompositeOperation='multiply';for(const key of ['Y','O','B','N'])g.drawImage(result.revealPlates[key],0,0);
 const a=g.getImageData(0,0,654,870).data,b=result.illustration.getContext('2d').getImageData(0,0,654,870).data;let total=0,max=0;for(let i=0;i<a.length;i++){if(i%4===3)continue;const d=Math.abs(a[i]-b[i]);total+=d;max=Math.max(max,d);}
 const validation={size:[654,870],layers:Object.keys(result.revealPlates),compositeMeanChannelError:total/(654*870*3),compositeMaxChannelError:max,finalUsesExactIllustration:true};
 if(new URL(location.href).searchParams.has('verify')){
  const baseline=await buildFool();const other=baseline.illustration.getContext('2d').getImageData(0,0,654,870).data;let changed=0;for(let i=0;i<b.length;i++)if(b[i]!==other[i])changed++;validation.captureChangedChannels=changed;
 }
 $('status').dataset.validation=JSON.stringify(validation);$('status').textContent='已準備好。可以重播，或拖動時間軸比較每個階段。';
 for(const id of ['timeline','play','ink','final'])$(id).disabled=false;
 if(matchMedia('(prefers-reduced-motion: reduce)').matches)apply(1600);else play();
}catch(e){$('phase').textContent='暫時無法載入試作';$('status').textContent=e.message;console.error(e);}
