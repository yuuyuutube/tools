import test from 'node:test';
import assert from 'node:assert/strict';
import {cardById} from '../src/data/cards.js';
import {hermitPlates} from '../src/print/hermit.js';
import {moonPlates,MOON_INKS} from '../src/print/moon.js';
import {INKS} from '../src/print/press.js';

const moon=moonPlates(cardById('moon'));
const hermit=hermitPlates(cardById('hermit'));
test('月亮保留 16 主芒與 16 副芒，而非合併為等長放射線',()=>{
 for(const symbol of ['major-rays','minor-rays']){
  const group=moon.Y.match(new RegExp(`<g data-symbol="${symbol}">([\\s\\S]*?)</g>`));
  assert.ok(group,symbol);
  assert.equal((group[1].match(/<path /g)||[]).length,16,symbol);
 }
});
test('月亮十五露滴在每一插畫色版均有對應印版或挖空',()=>{
 for(const ink of ['Y','B','N']){
  // 墨版同一位置先挖空再描邊；計數實際位置，避免把兩層誤算成兩滴。
  const positions=[...moon[ink].matchAll(/data-symbol="moon-dew" transform="([^"]+)"/g)].map(m=>m[1]);
  assert.equal(new Set(positions).size,15,ink);
 }
});
test('隱者提燈內有六芒星，而非火焰或四角星',()=>{
 const star=hermit.Y.match(/<g data-symbol="lantern-star"><polygon points="([^"]+)"/);
 assert.ok(star);
 const points=star[1].trim().split(/\s+/).map(p=>p.split(',').map(Number));
 assert.equal(points.length,12);
 const radii=points.map(([x,y])=>Math.hypot(x-80,y-202));
 assert.equal(radii.filter(r=>r>7).length,6);
 assert.equal(radii.filter(r=>r<7).length,6);
});
test('月亮框與文字獨立印製，採隱者固定的朱橘與墨藍',()=>{
 assert.deepEqual(MOON_INKS.FO,INKS.O);
 assert.deepEqual(MOON_INKS.FN.rgb,INKS.N.rgb);
 assert.equal(MOON_INKS.FN.fixedRegistration,true);
 assert.ok(moon.FO.includes('<rect'));
 assert.ok(moon.FN.includes('THE MOON'));
 for(const ink of ['Y','O','B','N']) assert.ok(!moon[ink].includes('<text'));
});

import {hangedManPlates,HANGED_MAN_INKS} from '../src/print/hanged-man.js';
const hanged=hangedManPlates(cardById('hanged-man'));
test('倒吊人：活木上長著葉子、頭上有光環，牌框用固定墨色',()=>{
 const leaves=new Set([...hanged.N.matchAll(/data-symbol="living-leaf" transform="([^"]+)"/g)].map(m=>m[1]));
 assert.ok(leaves.size>=10,`葉子 ${leaves.size}`);
 assert.ok(hanged.Y.includes('data-symbol="halo"'));
 assert.ok(hanged.N.includes('data-symbol="halo"'));
 assert.deepEqual(HANGED_MAN_INKS.FO,INKS.O);
 assert.deepEqual(HANGED_MAN_INKS.FN.rgb,INKS.N.rgb);
 assert.ok(hanged.FN.includes('THE HANGED MAN'));
 for(const ink of ['Y','O','B','N']) assert.ok(!hanged[ink].includes('<text'));
});

import {foolPlates,FOOL_INKS} from '../src/print/fool.js';
const fool=foolPlates(cardById('fool'));
test('愚者：手中白玫瑰、牌框用固定墨色、色版沒有文字',()=>{
 assert.ok(fool.N.includes('data-symbol="white-rose"'));
 assert.deepEqual(FOOL_INKS.FO,INKS.O);
 assert.deepEqual(FOOL_INKS.FN.rgb,INKS.N.rgb);
 assert.ok(fool.FN.includes('THE FOOL'));
 for(const ink of ['Y','O','B','N']) assert.ok(!fool[ink].includes('<text'));
});

import {magicianPlates,MAGICIAN_INKS} from '../src/print/magician.js';
const magician=magicianPlates(cardById('magician'));
test('魔術師：桌上四器、無限符號、銜尾蛇、百合都在墨版上',()=>{
 for(const sym of ['wand','cup','sword','pentacle','infinity','ouroboros','lily']) assert.ok(magician.N.includes(`data-symbol="${sym}"`),sym);
 assert.deepEqual(MAGICIAN_INKS.FO,INKS.O);
 assert.deepEqual(MAGICIAN_INKS.FN.rgb,INKS.N.rgb);
 assert.ok(magician.FN.includes('THE MAGICIAN'));
 for(const ink of ['Y','O','B','N']) assert.ok(!magician[ink].includes('<text'));
});

import {strengthPlates,STRENGTH_INKS} from '../src/print/strength.js';
const strength=strengthPlates(cardById('strength'));
test('力量：無限符號、花鏈都在墨版上，牌框用固定墨色',()=>{
 for(const sym of ['infinity','flower-chain']) assert.ok(strength.N.includes(`data-symbol="${sym}"`),sym);
 assert.deepEqual(STRENGTH_INKS.FO,INKS.O);
 assert.deepEqual(STRENGTH_INKS.FN.rgb,INKS.N.rgb);
 assert.ok(strength.FN.includes('STRENGTH'));
 for(const ink of ['Y','O','B','N']) assert.ok(!strength[ink].includes('<text'));
});
