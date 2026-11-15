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
