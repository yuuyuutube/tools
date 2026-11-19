import {STAMP_DESIGNS,standaloneStampSVG} from '../poster/stamps.js';
import {posterBlob,dateText} from '../poster/poster.js';
import {CARDS} from '../data/cards.js';
import {DEFAULT_OFFSETS} from '../art/frame.js';
import {SPREADS} from '../config.js';
const $=id=>document.getElementById(id),pad=n=>String(n).padStart(2,'0');
const today=new Date();$('date').value=`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`;
$('stamp').innerHTML=STAMP_DESIGNS.map(d=>`<option value="${d.id}">${d.name} · ${d.frame}</option>`).join('');
$('card').innerHTML=CARDS.map(c=>`<option value="${c.number}">${c.number} · ${c.nameZh}</option>`).join('');
let revision=0,timer=0,posterURL=null,stampURL=null;
const date=()=>new Date(($('date').value||`${today.getFullYear()}-${pad(today.getMonth()+1)}-${pad(today.getDate())}`)+'T12:00:00');
const selected=()=>STAMP_DESIGNS.find(d=>d.id===$('stamp').value);
const asset=d=>new URL(`../../assets/${d.asset}.png`,import.meta.url).href;
function gallery(){
 $('gallery').innerHTML=STAMP_DESIGNS.map((d,i)=>`<button class="seal-card" data-stamp="${d.id}" aria-pressed="${d.id===$('stamp').value}"><span class="card-head"><span><span class="number">${String(i+1).padStart(2,'0')}</span><span class="name">${d.name}</span><span class="frame-name">${d.frame}</span></span><img class="back-thumb" loading="lazy" src="${asset(d)}" alt="${d.name}牌背"></span><span class="stamp-holder">${standaloneStampSVG(d.id,{date:dateText(date()),id:'gallery_'+i})}</span><span class="card-foot"><span><i style="background:${d.color}"></i>單色藏印</span><span>查看蓋章效果 ↗</span></span></button>`).join('');
}
function smallPreview(){
 const d=selected(),wear=Number($('wear').value)/100;
 $('selected-name').textContent=d.name;$('description').textContent=d.description;$('wear-value').value=`${$('wear').value}%`;
 const svg=standaloneStampSVG(d.id,{date:dateText(date()),wear,id:'selected_stamp'});$('selected-stamp').innerHTML=svg;
 if(stampURL)URL.revokeObjectURL(stampURL);stampURL=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
 $('stamp-download').href=stampURL;$('stamp-download').download=`tarot-stamp-${d.id}.svg`;
 for(const button of $('gallery').querySelectorAll('[data-stamp]'))button.setAttribute('aria-pressed',String(button.dataset.stamp===d.id));
}
async function render(mine){
 const d=selected(),number=Number($('card').value),three=$('layout').value==='three';
 const nums=three?[number,...[9,17,3].filter(n=>n!==number)].slice(0,3):[number];
 const cards=nums.map((n,i)=>({card:CARDS.find(c=>c.number===n),orientation:three&&i===1?'reversed':'upright',label:three?SPREADS.time[i]:null}));
 try{
  const blob=await posterBlob({seed:147926,date:date(),offsets:DEFAULT_OFFSETS,cards,stampId:d.id,stampWear:Number($('wear').value)/100});
  if(mine!==revision)return;
  const url=URL.createObjectURL(blob),img=new Image();img.src=url;await img.decode();
  if(mine!==revision){URL.revokeObjectURL(url);return;}
  const old=posterURL;posterURL=url;$('poster').src=url;$('poster').alt=`${d.name}印章 · ${three?'三張':'單張'}分享圖`;
  $('poster-download').href=url;$('poster-download').download=`tarot-share-${d.id}-${three?'three':'single'}.png`;
  if(old)URL.revokeObjectURL(old);
  $('caption').textContent=`${d.name} · ${d.frame} · ${three?'三張':'單張'}牌分享圖，1080 × 1620。`;
  $('status').textContent='分享圖已更新，可以下載。';
 }catch(e){if(mine===revision)$('status').textContent=e.message;}
}
function update(){
 smallPreview();clearTimeout(timer);const mine=++revision;$('status').textContent='正在更新蓋章效果…';timer=setTimeout(()=>render(mine),160);
}
$('gallery').addEventListener('click',e=>{const button=e.target.closest('[data-stamp]');if(!button)return;$('stamp').value=button.dataset.stamp;update();$('proof').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});
for(const id of ['stamp','layout','card'])$(id).addEventListener('change',update);
$('wear').addEventListener('input',update);
$('date').addEventListener('change',()=>{gallery();update();});
gallery();update();
