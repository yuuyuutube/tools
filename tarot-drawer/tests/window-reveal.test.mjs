import test from 'node:test';
import assert from 'node:assert/strict';
import {WINDOW,WINDOW_BOUNDS} from '../src/print/sunburst/layout.js';
import {windowFrameAt,revealWindow} from '../src/ui/window-reveal.js';

function fixture(){
 const mutations=[],outline={d:WINDOW,'stroke-width':'2.8'},clip={d:WINDOW};
 const node=attrs=>({setAttribute:(key,value)=>{mutations.push(key);attrs[key]=value;}});
 const a=node(outline),b=node(clip),svg={querySelector:s=>s.includes('data-card-layer')?a:b};
 let id=0,time=0;const queue=new Map();
 const clock={now:()=>time,request:fn=>{queue.set(++id,fn);return id;},cancel:key=>queue.delete(key)};
 const advance=t=>{time=t;const pending=[...queue.values()];queue.clear();pending.forEach(fn=>fn(t));};
 return {svg,clock,advance,outline,clip,mutations,queue};
}

test('圖窗外框從 94% 到 100%，全程以底部中央為固定點',()=>{
 let previous=0;
 for(const progress of [0,.25,.5,.75,1]){
  const f=windowFrameAt(progress);
  assert.equal(f.centerX,150);assert.equal(f.bottom,366);
  assert.ok(Math.abs(f.x+f.width/2-150)<1e-10);
  assert.ok(Math.abs(f.y+f.height-366)<1e-10);
  assert.ok(f.width>previous);previous=f.width;
 }
 const end=windowFrameAt(1);assert.equal(end.d,WINDOW);
 assert.equal(end.x,WINDOW_BOUNDS.x);assert.equal(end.y,WINDOW_BOUNDS.y);
 assert.equal(windowFrameAt(0).width,204.92);
});

test('動畫只修改框線與裁切的 d：線寬保持 2.8，不寫入 transform 或縮放',()=>{
 const f=fixture();revealWindow(f.svg,{delay:100,duration:420},f.clock);
 assert.notEqual(f.outline.d,WINDOW);
 f.advance(50);f.advance(100);f.advance(310);
 assert.equal(f.outline.d,f.clip.d);assert.notEqual(f.outline.d,WINDOW);
 assert.equal(f.outline['stroke-width'],'2.8');
 f.advance(520);assert.equal(f.outline.d,WINDOW);assert.equal(f.clip.d,WINDOW);
 assert.deepEqual([...new Set(f.mutations)],['d']);assert.equal(f.queue.size,0);
});

test('返回／重抽時取消尚未完成的框線動畫，立即還原完整圖窗',()=>{
 const f=fixture(),cancel=revealWindow(f.svg,{delay:100,duration:420},f.clock);
 cancel();const count=f.mutations.length;f.advance(300);
 assert.equal(f.outline.d,WINDOW);assert.equal(f.clip.d,WINDOW);
 assert.equal(f.mutations.length,count);assert.equal(f.queue.size,0);
});

test('減少動態時直接顯示完整圖窗，不排入動畫影格',()=>{
 const f=fixture();revealWindow(f.svg,{delay:100,duration:0},f.clock);
 assert.equal(f.outline.d,WINDOW);assert.equal(f.clip.d,WINDOW);assert.equal(f.queue.size,0);
});
