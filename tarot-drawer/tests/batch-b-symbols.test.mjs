import test from 'node:test';
import assert from 'node:assert/strict';
import {PRINTS} from '../src/print/registry.js';
import {cardById} from '../src/data/cards.js';
import {INKS} from '../src/print/press.js';
const ids=['high-priestess','empress','emperor','hierophant','justice'];
const plates=Object.fromEntries(ids.map(id=>[id,PRINTS[id].plates(cardById(id))]));
const count=(svg,id)=>[...svg.matchAll(new RegExp(`data-symbol="${id}"`,'g'))].length;
test('批次 B：五張均可生成六版、固定牌框色，沒有無效座標或未定義遮罩',()=>{
 for(const id of ids){
  const e=PRINTS[id],p=plates[id];
  assert.deepEqual(Object.keys(p),['Y','O','B','N','FO','FN']);
  assert.deepEqual(e.inks.FO,INKS.O);assert.deepEqual(e.inks.FN.rgb,INKS.N.rgb);
  assert.ok(p.FN.includes(cardById(id).nameEn.toUpperCase()));
  for(const svg of Object.values(p)){
   assert.ok(!/NaN|undefined|Infinity/.test(svg),id);
   const defs=new Set([...svg.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));
   for(const [,ref] of svg.matchAll(/url\(#([^\)]+)\)/g))assert.ok(defs.has(ref),`${id}: ${ref}`);
  }
 }
});
test('女祭司：B/J 柱向正確，保留半遮卷軸及上下月形、胸十字、植物幕',()=>{
 const p=plates['high-priestess'];
 assert.match(p.N,/data-symbol="black-pillar-B"/);assert.match(p.N,/data-symbol="white-pillar-J"/);
 assert.match(p.N,/>B<\/text>/);assert.match(p.N,/>J<\/text>/);assert.match(p.N,/>TORA<\/text>/);
 for(const id of ['TORA-scroll','horned-diadem','solar-cross','foot-crescent','veil'])assert.ok(count(p.N,id)>0,id);
 assert.ok(count(p.O,'veil-pomegranate')>=6);
});
test('皇后：十二顆星與金星心盾、球杖、瀑布、麥穗、石榴袍紋',()=>{
 const p=plates.empress;
 assert.equal(count(p.N,'crown-star'),12);
 for(const id of ['venus-shield','globe-sceptre','waterfall'])assert.ok(count(p.N,id)>0,id);
 assert.equal(count(p.Y,'wheat'),16);assert.equal(count(p.O,'robe-pomegranate'),6);
});
test('皇帝：四個羊頭、安卡杖、寶球、兩腿甲冑與遠河',()=>{
 const p=plates.emperor;assert.equal(count(p.N,'ram-head'),4);
 for(const id of ['ankh-sceptre','orb','crown','distant-river'])assert.ok(count(p.N,id)>0,id);
 assert.equal(count(p.N,'armoured-leg'),2);
});
test('教皇：三層冠、三橫杖、祝福手、交叉鑰匙與兩門徒花紋',()=>{
 const p=plates.hierophant;assert.equal(count(p.N,'crown-tier'),3);assert.equal(count(p.N,'kneeling-minister'),2);
 for(const id of ['triple-cross','blessing-hand','crossed-keys','minister-lilies'])assert.ok(count(p.N,id)>0,id);
 assert.equal(count(p.O,'minister-roses'),1);
});
test('正義：直視雙眼、雙刃劍、兩秤盤、方形冠飾與露鞋',()=>{
 const p=plates.justice;assert.equal(count(p.N,'scale-pan'),2);
 for(const id of ['open-eyes','sword','scales','square-crown','visible-shoe','veil'])assert.ok(count(p.N,id)>0,id);
});
