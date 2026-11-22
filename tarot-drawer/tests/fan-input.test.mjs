import test from 'node:test';
import assert from 'node:assert/strict';
import {swipeCardDelta,fanFocusPosition,wheelCardDelta} from '../src/ui/fan-input.js';
test('手指一個牌距換一張；滑鼠較慢，觸控筆沿用手指速度',()=>{
 assert.equal(swipeCardDelta(80,40,'touch'),-2);
 assert.equal(swipeCardDelta(128,40,'mouse'),-1);
 assert.equal(swipeCardDelta(80,40,'pen'),-2);
 assert.equal(swipeCardDelta(-80,40,'touch'),2);
});
test('移動事件拆成多次時仍有相同的拖曳距離',()=>{
 for(const pointer of ['touch','mouse'])assert.equal(Array.from({length:8},()=>swipeCardDelta(10,40,pointer)).reduce((a,b)=>a+b,0),swipeCardDelta(80,40,pointer));
});
test('窄版面滑鼠連續移過牌背不改變牌扇位置，鍵盤仍會捲到選中的牌',()=>{
 let pos=10.5;
 for(const i of [3,18,5,17,8])pos=fanFocusPosition(pos,i,true,false);
 assert.equal(pos,10.5);
 assert.equal(fanFocusPosition(pos,18,true,true),18);
 assert.equal(fanFocusPosition(pos,18,false,true),10.5);
});
test('橫向捲動與 Shift 滾輪支援左右方向、像素／行／頁單位',()=>{
 assert.equal(wheelCardDelta({deltaX:128},40,384),1);
 assert.equal(wheelCardDelta({deltaX:-128},40,384),-1);
 assert.equal(wheelCardDelta({deltaY:128,shiftKey:true},40,384),1);
 assert.equal(wheelCardDelta({deltaX:8,deltaMode:1},40,384),1);
 assert.equal(wheelCardDelta({deltaX:1,deltaMode:2},40,384),3);
});
test('不攔截垂直捲動、以垂直為主的斜滑或 Ctrl 觸控板縮放',()=>{
 assert.equal(wheelCardDelta({deltaY:128},40,384),0);
 assert.equal(wheelCardDelta({deltaX:3,deltaY:128},40,384),0);
 assert.equal(wheelCardDelta({deltaX:128,ctrlKey:true},40,384),0);
 assert.equal(wheelCardDelta({},40,384),0);
});
