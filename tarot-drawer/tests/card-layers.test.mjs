import test from 'node:test';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {CARDS} from '../src/data/cards.js';
import {faceSVG} from '../src/art/frame.js';
import {WINDOW} from '../src/print/sunburst/layout.js';
test('正式牌面：只嵌入一張插畫，所有介面元素由獨立 SVG 圖層生成',()=>{
 for(const card of CARDS){
  const svg=faceSVG(card,{printed:true,id:`test${card.number}_`});
  assert.equal((svg.match(/<image /g)||[]).length,1);
  assert.match(svg,/<image[^>]*x="41" y="76" width="218" height="290"/);
  for(const name of ['paper','illustration','border','accent-border','window','number','rule','title','subtitle','ornaments'])assert.ok(svg.includes(`data-card-layer="${name}"`));
  assert.ok(svg.includes(WINDOW));assert.ok(svg.includes(`>${card.nameZh}</text>`));assert.ok(svg.includes(`>${card.nameEn.toUpperCase()}</text>`));
  assert.ok(!svg.includes('undefined')&&!svg.includes('NaN'));
 }
});
test('分享海報可指定牌面位置，且多張卡片的裁切與紙紋 ID 不衝突',()=>{
 const first=faceSVG(CARDS[0],{printed:true,id:'poster0_',attrs:'x="72" y="110" width="240" height="400"'}),second=faceSVG(CARDS[1],{printed:true,id:'poster1_'});
 assert.match(first,/role="img"[^>]*x="72" y="110" width="240" height="400"/);
 assert.ok(first.includes('url(#poster0_art)')&&first.includes('id="poster0_paper"'));
 assert.ok(second.includes('url(#poster1_art)')&&!second.includes('poster0_'));
});

test('22 張正式 WebP 全部為圖窗尺寸，沒有遺留整張牌面的舊資產',()=>{
 for(const card of CARDS){const b=readFileSync(new URL(`../assets/faces/${card.id}.webp`,import.meta.url));assert.equal(b.toString('ascii',0,4),'RIFF');const k=b.indexOf(Buffer.from([0x9d,1,0x2a]));assert.ok(k>=0);assert.equal(b.readUInt16LE(k+3)&16383,654,card.id);assert.equal(b.readUInt16LE(k+5)&16383,870,card.id);}
});

test('暈墨保留原始筆畫，只套在 Web 框字，且各張卡片的濾鏡不衝突',()=>{
 for(const card of CARDS){
  const id=`bleed${card.number}_`,svg=faceSVG(card,{printed:true,id});
  for(const kind of ['line','text','fine']){
   assert.ok(svg.includes(`id="${id}ink-${kind}"`));
   assert.ok(svg.includes(`filter="url(#${id}ink-${kind})"`));
  }
  assert.equal((svg.match(/<feMergeNode in="SourceGraphic"\/>/g)||[]).length,3);
  assert.equal((svg.match(/seed="17" result="grain"/g)||[]).length,3);
  const illustration=svg.match(/<g class="kf" data-card-layer="illustration"[^>]*>.*?<\/g>/)[0];
  assert.ok(!illustration.includes('filter=')&&!illustration.includes('transform='));
  assert.match(svg,/data-card-layer="window"><g filter="[^"]+"><path[^>]*stroke-width="2.8"/);
 }
});
