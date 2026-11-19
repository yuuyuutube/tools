import {buildBatch} from './batch-pipeline.js';
import {buildFool} from './fool-pipeline.js';
import {BATCHES} from './registry.js';
import {CARDS} from '../../data/cards.js';
const batch=new URLSearchParams(location.search).get('batch')||'01',numbers=batch==='all'?CARDS.map(c=>c.number):batch==='00'?[0]:BATCHES[batch].numbers,checks=[];
for(const [index,n]of numbers.entries()){
 document.getElementById('status').textContent=`正在產出 ${index+1}/${numbers.length} · ${CARDS[n].nameZh}`;
 const result=n===0?await buildFool():await buildBatch(n),a=document.createElement('article');a.dataset.number=n;a.dataset.id=CARDS[n].id;
 a.innerHTML=`<h2>${n} · ${CARDS[n].nameZh}</h2>`;a.append(result.illustration);
 for(const [ext,mime]of [['webp','image/webp'],['png','image/png']]){const link=document.createElement('a');link.download=`${n}-illustration.${ext}`;link.href=result.illustration.toDataURL(mime,.88);link.textContent='下載純插畫 '+ext.toUpperCase();a.append(link);}
 document.querySelector('main').append(a);
 // Regression: extracting artwork must not alter the existing printed review.
 const old=new Image();old.src=n===0?'docs/tarot-sunburst/fool-pipeline/fool-final-3x5.png':`docs/tarot-sunburst/batch-${String(Math.floor((n-1)/3)+1).padStart(2,'0')}/${n}-final-3x5.png`;
 await old.decode();const cv=document.createElement('canvas');cv.width=900;cv.height=1500;const g=cv.getContext('2d');g.drawImage(old,0,0);const before=g.getImageData(0,0,900,1500).data,after=result.final.getContext('2d').getImageData(0,0,900,1500).data;let different=0,max=0;
 for(let i=0;i<before.length;i++){const d=Math.abs(before[i]-after[i]);if(d)different++;max=Math.max(max,d);}const check={number:n,storedReferenceChangedChannels:different,storedReferenceMaximumDifference:max};
 if(n===0){const baseline=await buildFool({captureIllustration:false}),pixels=baseline.final.getContext('2d').getImageData(0,0,900,1500).data;let changed=0;for(let i=0;i<pixels.length;i++)if(pixels[i]!==after[i])changed++;check.captureCallbackChangedChannels=changed;}
 checks.push(check);
}
const data=document.createElement('script');data.id='regression';data.type='application/json';data.textContent=JSON.stringify(checks);document.body.append(data);document.getElementById('status').textContent=`${numbers.length}/${numbers.length} 張純插畫已完成`;
