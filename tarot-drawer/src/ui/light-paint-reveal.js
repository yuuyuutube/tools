import {faceSVG} from '../art/frame.js';
import {cardById} from '../data/cards.js';
import {windowFrameAt} from './window-reveal.js';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const cards=JSON.parse(await (await fetch(new URL('../../docs/tarot-sunburst/light-paint/manifest.json',import.meta.url))).text()).cards.filter(c=>c.number>0);
const clamp=v=>Math.max(0,Math.min(1,v)),progress=(t,s,d)=>clamp((t-s)/d),ease=p=>1-(1-p)**3;
let time=0,raf=0,last=0,serial=0,svg,art,original,overlay,windowPath,clipPath,rule,title,subtitle,images={};
cards.forEach(c=>{const o=document.createElement('option');o.value=c.id;o.textContent=`${c.number} · ${c.name}`;$('pick').append(o)});
function apply(t){time=Math.max(0,Math.min(1600,t));$('timeline').value=time;$('time').value=`${(time/1000).toFixed(2)} 秒`;
 const done=progress(time,1260,160);overlay.style.opacity=1-done;original.style.opacity=1;
 images.Y.style.opacity=progress(time,700,230);images.O.style.opacity=progress(time,850,230);images.B.style.opacity=progress(time,1000,260);images.N.style.opacity=1;images.paper.style.opacity=1;
 const {d}=windowFrameAt(ease(progress(time,468,420)));windowPath.setAttribute('d',d);clipPath.setAttribute('d',d);svg.querySelector('[data-card-layer="window"]').style.opacity=1;
 const rp=ease(progress(time,648,220));rule.setAttribute('transform',`translate(150 0) scale(${rp} 1) translate(-150 0)`);for(const n of [title,subtitle]){const p=progress(time,828,280);n.style.opacity=p;n.setAttribute('transform',`translate(0 ${2*(1-p)})`)}
 const c=cards.find(v=>v.id===$('pick').value);$('phase').textContent=time<450?'翻出正面':time<700?'黏墨檢查樣張 · 未上色':time<850?'黃色版 · 圖窗展開':time<1000?'朱橘版 · 牌名浮現':time<1260?'藍色版 · 牌名浮現':time<1420?'套印完成':`${c.number} · ${c.name}`;
}
function stop(){cancelAnimationFrame(raf);raf=0}
function play(){stop();apply(0);last=performance.now();const tick=now=>{apply(time+now-last);last=now;if(time<1600)raf=requestAnimationFrame(tick)};raf=requestAnimationFrame(tick)}
async function setCard(id){stop();time=0;const token=++serial,c=cards.find(v=>v.id===id)||cards[0];$('phase').textContent=`${c.number} · 正在載入印版…`;$('status').textContent='正在載入預先印好的色版。';$('timeline').disabled=true;for(const b of ['play','ink','final'])$(b).disabled=true;
 $('face').innerHTML=faceSVG(cardById(c.id),{printed:true,id:`lp_${c.number}_`});svg=$('face').querySelector('svg');art=svg.querySelector('[data-card-layer="illustration"]');original=art.querySelector('image');overlay=document.createElementNS(NS,'g');overlay.dataset.revealPlates='true';overlay.style.isolation='isolate';art.append(overlay);
 try{
  for(const key of ['paper','N','Y','O','B']){const im=document.createElementNS(NS,'image');im.dataset.plate=key;im.setAttribute('href',`assets/reveal/${c.number}-${key}.webp`);for(const [k,v]of Object.entries({x:41,y:76,width:218,height:290,preserveAspectRatio:'none'}))im.setAttribute(k,v);if(key!=='paper')im.style.mixBlendMode='multiply';overlay.append(im);images[key]=im}
  windowPath=svg.querySelector('[data-card-layer="window"] path');clipPath=svg.querySelector('[data-card-clip="illustration"] path');rule=svg.querySelector('[data-card-layer="rule"]');title=svg.querySelector('[data-card-layer="title"]');subtitle=svg.querySelector('[data-card-layer="subtitle"]');
  await Promise.all([...art.querySelectorAll('image')].map(el=>new Promise((resolve,reject)=>{const img=new Image();img.onload=resolve;img.onerror=reject;img.src=el.getAttribute('href')})));if(token!==serial)return;
  $('status').textContent=`已載入 ${c.number} 號牌印版。可拖動時間軸檢查每個套印階段。`;$('timeline').disabled=false;for(const b of ['play','ink','final'])$(b).disabled=false;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)apply(1600);else play();
 }catch(e){if(token!==serial)return;$('phase').textContent='印版暫時無法載入';$('status').textContent=e.message;console.error(e)}}
$('pick').addEventListener('change',e=>setCard(e.target.value));$('timeline').addEventListener('input',e=>{stop();apply(+e.target.value)});$('play').addEventListener('click',play);$('ink').addEventListener('click',()=>{stop();apply(600)});$('final').addEventListener('click',()=>{stop();apply(1600)});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
await setCard($( 'pick').value||cards[0].id);
