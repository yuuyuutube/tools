import test from 'node:test';import assert from 'node:assert/strict';import {BalconyScene} from '../src/scene.js';
class Media {matches=false;listeners=new Set();addEventListener(_,f){this.listeners.add(f);}removeEventListener(_,f){this.listeners.delete(f);}}
class Node {attributes=new Map();fabric=null;setAttribute(k,v){this.attributes.set(k,v);}removeAttribute(k){this.attributes.delete(k);}querySelector(){return this.fabric;}}
test('one simulated hour stays bounded; reduced motion, visibility and cleanup stop frames',async()=>{
 const keys=['fetch','matchMedia','document','requestAnimationFrame','cancelAnimationFrame','ResizeObserver'];const originals=new Map(keys.map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
 const media=[new Media(),new Media()],frames=new Map(),listeners=new Map();let id=0, observed=0;
 class ResizeObserverStub {observe(){observed++;}disconnect(){observed=0;}}
 const clothes=Array.from({length:5},()=>{const n=new Node();n.fabric=new Node();return n;}),svg=new Node();
 const host={innerHTML:'',setAttribute(){},querySelector:()=>svg,querySelectorAll:()=>clothes};
 const document={hidden:false,body:{dataset:{},classList:{toggle(){}}},addEventListener:(e,f)=>listeners.set(e,f),removeEventListener:e=>listeners.delete(e)};
 Object.assign(globalThis,{document,ResizeObserver:ResizeObserverStub,fetch:async()=>({ok:true,text:async()=>'<svg/>'}),matchMedia:q=>q.includes('reduced')?media[0]:media[1],requestAnimationFrame:f=>{frames.set(++id,f);return id;},cancelAnimationFrame:i=>frames.delete(i)});
 const scene=new BalconyScene();
 try {
  await scene.init(host);assert.equal(observed,1);scene.setWeather({windSpeed:99,windDirection:90},{scene:'sunny',sceneLabel:'晴朗'});
  let maximum=0;
  for(let frame=0;frame<216000;frame++){
   const [key,callback]=frames.entries().next().value;frames.delete(key);callback(frame*1000/60);
   if(frame%600===0)maximum=Math.max(maximum,...clothes.map(n=>Math.abs(Number(n.attributes.get('transform')?.match(/rotate\(([-\d.]+)/)?.[1]||0))));
   if(frames.size!==1)assert.fail('unbounded frame queue');
  }
  assert.ok(maximum<8);assert.equal(clothes.length,5);assert.notEqual(clothes[0].attributes.get('transform'),clothes[1].attributes.get('transform'));
  document.hidden=true;listeners.get('visibilitychange')();assert.equal(frames.size,0);
  document.hidden=false;listeners.get('visibilitychange')();assert.equal(frames.size,1);
  media[0].matches=true;scene.motion();assert.equal(frames.size,0);assert.equal(clothes[0].attributes.has('transform'),false);
  media[0].matches=false;scene.motion();assert.equal(frames.size,1);scene.destroy();assert.equal(observed,0);assert.equal(frames.size,0);assert.equal(listeners.size,0);assert.equal(media[0].listeners.size,0);
 } finally {scene.destroy();for(const [key,descriptor] of originals){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});
