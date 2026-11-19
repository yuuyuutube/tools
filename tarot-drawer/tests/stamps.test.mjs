import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {STAMP_DESIGNS,dateStampSVG,standaloneStampSVG} from '../src/poster/stamps.js';
import {posterSVG} from '../src/poster/poster.js';
import {CARDS} from '../src/data/cards.js';
test('九款印章對應原牌背目錄，每款有獨立框形、徽記與有效牌背資產',()=>{
 const catalog=readFileSync(new URL('../src/print/back-catalog.js',import.meta.url),'utf8');
 assert.equal(STAMP_DESIGNS.length,9);assert.equal(new Set(STAMP_DESIGNS.map(d=>d.id)).size,9);
 const shapes=[];
 for(const d of STAMP_DESIGNS){
  assert.ok(catalog.includes(`id:'${d.id}'`));assert.ok(existsSync(new URL(`../assets/${d.asset}.png`,import.meta.url)));
  const svg=standaloneStampSVG(d.id,{date:'2026.11.20',id:d.id});
  assert.ok(svg.includes('2026.11.20')&&svg.includes(`data-stamp-emblem="${d.id}"`));
  assert.ok(!/undefined|NaN|<image|textPath/.test(svg));
  shapes.push(svg.match(/<path d="([^"]+)" stroke-width="3.5"/)[1]);
 }
 assert.equal(new Set(shapes).size,9);
});
test('印章可關閉缺墨，日期安全跳脫，濾鏡 ID 不互相影響',()=>{
 const first=dateStampSVG('moth-garden',{date:'<test & "date">',id:'first'}),second=dateStampSVG('tide-gate',{id:'second',wear:0});
 assert.ok(first.includes('&lt;test &amp; &quot;date&quot;&gt;'));
 assert.ok(first.includes('in2="wearMask" operator="out"')&&first.includes('first_wear'));
 assert.ok(!second.includes('filter=')&&!second.includes('first_wear'));
});
test('分享圖只在指定印章時採用新版；單張與三張均可組版',()=>{
 const base={seed:147926,date:new Date(2026,10,20,12),cards:[{card:CARDS[0],orientation:'upright'}]};
 assert.ok(!posterSVG(base).includes('data-stamp-design='));
 for(const d of STAMP_DESIGNS){
  for(const count of [1,3]){
   const cards=count===1?base.cards:[0,9,17].map((n,i)=>({card:CARDS[n],orientation:i===1?'reversed':'upright',label:{zh:'預覽',en:'PREVIEW'}}));
   const svg=posterSVG({...base,cards,stampId:d.id});
   assert.equal((svg.match(/data-poster-layer="date-stamp"/g)||[]).length,1);
   assert.ok(svg.includes(`data-stamp-design="${d.id}"`));assert.ok(!/undefined|NaN/.test(svg));
  }
 }
});
