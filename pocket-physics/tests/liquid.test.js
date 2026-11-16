import test from 'node:test';
import assert from 'node:assert/strict';
import { LiquidSimulation, LIQUID_STEP } from '../src/liquid-simulation.js';
import { analyseLiquidAudio, LiquidAudio } from '../src/liquid-audio.js';
const silent={level:0,brightness:0,peak:0};

test('a local touch propagates across the surface and damping removes energy',()=>{
 const sim=new LiquidSimulation();sim.height.fill(0);sim.velocity.fill(0);sim.poke(0,0,1);
 const initial=sim.energy();for(let i=0;i<150;i++)sim.step();
 const n=sim.size;assert.ok(Math.abs(sim.height[Math.floor(n/2)*n+Math.floor(n*.7)])>.0001);
 for(let i=0;i<1500;i++)sim.step();assert.ok(sim.energy()<initial*.02);
});
test('silence cannot invent audio forces and amplitude scales the resulting geometry',()=>{
 const make=()=>{const sim=new LiquidSimulation();sim.height.fill(0);sim.velocity.fill(0);return sim;};
 const zero=make(),low=make(),high=make();
 for(let i=0;i<300;i++){zero.step(LIQUID_STEP,silent);low.step(LIQUID_STEP,{level:.2,brightness:.4});high.step(LIQUID_STEP,{level:.8,brightness:.4});}
 assert.equal(zero.energy(),0);assert.ok(high.energy()>low.energy()*8);
});
test('spectral brightness changes the excitation geometry',()=>{
 const low=new LiquidSimulation(),high=new LiquidSimulation();
 for(let i=0;i<300;i++){low.step(LIQUID_STEP,{level:.8,brightness:.05});high.step(LIQUID_STEP,{level:.8,brightness:.9});}
 assert.notDeepEqual(low.height,high.height);
});
test('extreme touches and sustained audio stay finite and inside a pinned circular boundary',()=>{
 const sim=new LiquidSimulation();sim.persistence=1;sim.sensitivity=2;
 for(let i=0;i<7200;i++){if(i%9===0)sim.poke(Math.sin(i)*.8,Math.cos(i*1.7)*.8,2);sim.step(LIQUID_STEP,{level:1,brightness:(i%120)/120});}
 assert.ok(sim.height.every((h,i)=>Number.isFinite(h)&&Math.abs(h)<=.751&&(sim.mask[i]||h===0)));
 assert.ok(sim.velocity.every(v=>Number.isFinite(v)&&Math.abs(v)<=16));
});
test('reset restores the wave and parameters deterministically',()=>{
 const sim=new LiquidSimulation(),initial=sim.velocity.slice();for(let i=0;i<100;i++)sim.step();sim.sensitivity=2;sim.persistence=1;sim.reset();
 assert.deepEqual(sim.velocity,initial);assert.equal(sim.time,0);assert.equal(sim.persistence,.6);assert.equal(sim.sensitivity,1);
});
test('analysis measures amplitude and spectral energy without claiming fundamental pitch',()=>{
 const samples=Float32Array.from({length:2048},(_,i)=>.06*Math.sin(i/11));const dark=new Uint8Array(1024),bright=new Uint8Array(1024);dark[5]=230;bright[100]=230;
 const a=analyseLiquidAudio(samples,dark),b=analyseLiquidAudio(samples,bright);assert.ok(b.brightness>a.brightness);assert.equal(b.level,a.level);assert.ok(b.peak>a.peak);
 assert.equal(analyseLiquidAudio(new Float32Array(2048),dark).level,0);
});
test('late microphone permission after stop cannot restart liquid capture',async()=>{
 let resolve,stopped=0;const track={stop(){stopped++;}};
 const audio=new LiquidAudio(()=>{},{mediaDevices:{getUserMedia:()=>new Promise(r=>resolve=r)},createAudioContext:()=>({state:'running',resume:async()=>{},close:async()=>{}})});
 const pending=audio.start('mic');audio.stop();resolve({getTracks:()=>[track]});assert.equal(await pending,false);assert.equal(audio.mode,'none');assert.equal(stopped,1);audio.dispose();
});
test('denied capture exposes usable demo/touch fallback and no live resources',async()=>{
 const audio=new LiquidAudio(()=>{},{mediaDevices:{getUserMedia:async()=>{throw {name:'NotAllowedError'};}},createAudioContext:()=>({state:'running',resume:async()=>{},close:async()=>{}})});
 assert.equal(await audio.start('mic'),false);assert.equal(audio.mode,'none');assert.match(audio.reason,/示範音/);assert.equal(audio.microphone.stream,null);audio.dispose();
});
