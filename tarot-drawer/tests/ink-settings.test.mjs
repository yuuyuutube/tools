import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeInkBleed,readInkBleed,saveInkBleed,DEFAULT_INK_BLEED,DRY_INK_PRESET,INK_SETTINGS_KEY} from '../src/art/ink-settings.js';
import {faceSVG} from '../src/art/frame.js';
import {CARDS} from '../src/data/cards.js';
test('暈墨設定接受關閉及合法倍率，異常值使用預設，倍率限制在 0 到 6',()=>{
 assert.deepEqual(normalizeInkBleed(null),DEFAULT_INK_BLEED);
 assert.deepEqual(normalizeInkBleed({line:0,text:3.25,fine:6,tooth:0,edge:0,dry:0}),{line:0,text:3.25,fine:6,tooth:0,edge:0,dry:0});
 assert.deepEqual(normalizeInkBleed({line:-2,text:99,fine:NaN}),{...DEFAULT_INK_BLEED,line:0,text:6});
 assert.deepEqual(normalizeInkBleed({line:'3',text:Infinity}),DEFAULT_INK_BLEED);
});
test('瀏覽器儲存的設定可讀回，損壞或無儲存空間時可正常顯示',()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'localStorage');let raw;
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>key===INK_SETTINGS_KEY?raw:null,setItem:(key,value)=>{assert.equal(key,INK_SETTINGS_KEY);raw=value;}}});
  assert.deepEqual(saveInkBleed({line:3,text:2.5,fine:1,tooth:0,edge:0,dry:0}),{line:3,text:2.5,fine:1,tooth:0,edge:0,dry:0});
  assert.deepEqual(readInkBleed(),{line:3,text:2.5,fine:1,tooth:0,edge:0,dry:0});
  raw='broken';assert.deepEqual(readInkBleed(),DEFAULT_INK_BLEED);
  Object.defineProperty(globalThis,'localStorage',{configurable:true,get:()=>{throw Error('blocked');}});
  assert.deepEqual(readInkBleed(),DEFAULT_INK_BLEED);
 }finally{if(descriptor)Object.defineProperty(globalThis,'localStorage',descriptor);else delete globalThis.localStorage;}
});
test('關閉暈墨只取消擴散層，最大倍率仍保留原始主線與固定紙齒',()=>{
 for(const strength of [0,6]){
  const svg=faceSVG(CARDS[0],{printed:true,inkBleed:{line:strength,text:strength,fine:strength}});
  assert.ok(!svg.includes('NaN')&&!svg.includes('undefined'));
  assert.equal((svg.match(/<feMergeNode in="SourceGraphic"\/>/g)||[]).length,3);
  assert.equal((svg.match(/seed="17" result="grain"/g)||[]).length,3);
  assert.match(svg,/stroke-width="2.8"/);
  if(strength===0)assert.equal((svg.match(/<feFuncA type="linear" slope="0"\/>/g)||[]).length,3);
 }
});

test('乾式預設關閉濕式擴散，紙齒與乾墨挖掉墨層，毛刺位移不動插畫',()=>{
 const settings=normalizeInkBleed({...DRY_INK_PRESET,tooth:8,edge:-1});
 assert.equal(settings.tooth,1);assert.equal(settings.edge,0);
 const svg=faceSVG(CARDS[0],{printed:true,inkBleed:DRY_INK_PRESET});
 assert.equal((svg.match(/stdDeviation="0"/g)||[]).length,3);
 for(const name of ['tooth','dry'])assert.equal((svg.match(new RegExp(`in2="${name}Mask" operator="out"`,'g'))||[]).length,3);
 assert.equal((svg.match(/result="edgeNoise"/g)||[]).length,3);
 const original=faceSVG(CARDS[0],{printed:true,inkBleed:{line:0,text:0,fine:0,tooth:0,edge:0,dry:0}});
 assert.ok(!original.includes('operator="out"')&&!original.includes('result="edgeNoise"'));
 assert.match(svg,/data-card-layer="illustration" clip-path="[^"]+"><image/);
});
