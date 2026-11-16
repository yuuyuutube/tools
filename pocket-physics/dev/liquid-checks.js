import { LiquidCanvasRenderer } from '../src/liquid-canvas-renderer.js';
import { SingingLiquid } from '../src/liquid.js';
import { LiquidAudio } from '../src/liquid-audio.js';
import { LIQUID_STEP } from '../src/liquid-simulation.js';
export async function runBrowserChecks(exhibit,navigation){
 const output=document.createElement('pre');output.id='qa-results';output.style.cssText='position:fixed;z-index:100;top:8px;left:8px;max-width:calc(100% - 16px);max-height:94vh;overflow:auto;padding:18px;background:#edf6fcfa;color:#164662;border:1px solid #85a9c0;font:12px/1.7 monospace;white-space:pre-wrap;user-select:text';
 document.body.append(output);const results=[];
 const check=(name,value)=>{results.push({name,passed:!!value});output.textContent=results.map(r=>`${r.passed?'PASS':'FAIL'} ${r.name}`).join('\n');if(!value)throw Error(name);};
 const frame=()=>new Promise(r=>requestAnimationFrame(r));const $=id=>document.getElementById(id);
 try{
  await frame();exhibit.paused=true;exhibit.schedule();exhibit.reset();const initial=exhibit.sim.velocity.slice(),time=exhibit.sim.time;await frame();await frame();
  check('Pause freezes wave time and RAF',exhibit.sim.time===time&&exhibit.frame===0);
  const capture=exhibit.canvas.setPointerCapture;exhibit.canvas.setPointerCapture=()=>{};
  const r=exhibit.canvas.getBoundingClientRect(),center=exhibit.renderer.center;
  const cx=r.left+center.x,cy=r.top+center.y;
  const pointer=(type,id,x,y)=>exhibit.canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,bubbles:true,cancelable:true}));
  pointer('pointerdown',31,cx-22,cy);pointer('pointerdown',32,cx+22,cy);pointer('pointermove',32,cx+45,cy+15);
  check('Two touches change actual simulated velocity',exhibit.pointers.size===2&&initial.some((v,i)=>v!==exhibit.sim.velocity[i]));
  pointer('pointercancel',31,cx-22,cy);pointer('pointerup',32,cx+45,cy+15);
  check('Touch cancellation and release clear all pointers',exhibit.pointers.size===0&&exhibit.renderer.cursor===null);exhibit.canvas.setPointerCapture=capture;
  exhibit.canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
  check('Keyboard moves the visible contact location',exhibit.renderer.cursor?.x>.1);
  const before=exhibit.sim.velocity.slice();exhibit.canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  check('Keyboard impulse changes actual wave state',before.some((v,i)=>v!==exhibit.sim.velocity[i]));
  $('liquid-sensitivity').value='2';$('liquid-sensitivity').dispatchEvent(new Event('input',{bubbles:true}));
  $('liquid-persistence').value='1';$('liquid-persistence').dispatchEvent(new Event('input',{bubbles:true}));
  check('Custom sliders change sensitivity and damping',exhibit.sim.sensitivity===2&&exhibit.sim.persistence===1);
  $('liquid-mute').click();check('Mute is explicit and accessible',exhibit.audio.muted&&$('liquid-mute').getAttribute('aria-pressed')==='true');
  // Deterministic denied-device path, without opening physical microphone permission.
  const denied=new LiquidAudio(()=>{},{mediaDevices:{getUserMedia:async()=>{throw {name:'NotAllowedError'};}},createAudioContext:()=>({state:'running',resume:async()=>{},close:async()=>{}})});
  check('Denied microphone leaves demo/touch fallback',!await denied.start('mic')&&denied.mode==='none'&&denied.reason.includes('示範音'));denied.dispose();
  const mic=exhibit.audio.microphone,originalDevices=mic.mediaDevices,originalContext=mic.createAudioContext;
  let stopped=0;const listeners=new Map(),track={readyState:'live',muted:false,stop(){stopped++;},addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:(type)=>listeners.delete(type)};
  const stream={getTracks:()=>[track],getAudioTracks:()=>[track]};
  const analyser={fftSize:1024,frequencyBinCount:512,connect(){},disconnect(){},getFloatTimeDomainData(samples){for(let i=0;i<samples.length;i++)samples[i]=Math.sin(i*.15)*.08;},getByteFrequencyData(bins){bins.fill(0);bins[8]=240;}};
  mic.mediaDevices={getUserMedia:async()=>stream};mic.createAudioContext=()=>({state:'running',sampleRate:48000,resume:async()=>{},close:async()=>{},createMediaStreamSource:()=>({connect(){},disconnect(){}}),createAnalyser:()=>analyser,addEventListener(){},removeEventListener(){}});
  await exhibit.audio.start('mic');const signal=exhibit.audio.sample();
  check('Live capture analysis measures amplitude and spectrum',signal.level>.3&&signal.peak>0);
  const energy=exhibit.sim.energy();for(let i=0;i<240;i++)exhibit.sim.step(LIQUID_STEP,signal);
  check('Captured sound excites the numerical wave surface',exhibit.sim.energy()!==energy);
  $('notes-open').click();check('Opening notes stops microphone tracks and RAF',stopped===1&&exhibit.audio.mode==='none'&&exhibit.frame===0);$('notes-dialog').close();
  check('Closing notes never restarts capture',exhibit.audio.mode==='none');
  await exhibit.audio.start('mic');window.dispatchEvent(new Event('blur'));
  check('Window blur releases capture resources',stopped===2&&exhibit.audio.microphone.stream===null);
  await exhibit.audio.start('mic');exhibit.togglePause();
  check('Pausing releases audio and pointers',stopped===3&&exhibit.audio.mode==='none'&&exhibit.frame===0);
  mic.mediaDevices=originalDevices;mic.createAudioContext=originalContext;
  navigation.selectExhibit('hourglass');const sand=navigation.getCurrent().controller;sand.sim.strength=.35;sand.updateUI();
  navigation.selectExhibit('bubble');const bubble=navigation.getCurrent().controller;bubble.sim.elasticity=.85;bubble.updateUI();
  navigation.selectExhibit('mirror');const mirror=navigation.getCurrent().controller;mirror.model.depth=4.2;mirror.updateUI();
  navigation.selectExhibit('liquid');
  check('All four exhibits are reachable with independent retained state',navigation.cache.size===4&&sand.sim.strength===.35&&bubble.sim.elasticity===.85&&mirror.model.depth===4.2&&exhibit.sim.persistence===1);
  check('Inactive rooms stop animation and capture',!sand.active&&!bubble.active&&!mirror.active&&sand.frame===0&&bubble.frame===0&&mirror.frame===0&&bubble.microphone.state!=='listening');
  check('Collection includes the fourth exhibit and selected state',$('liquid-entry').getAttribute('aria-current')==='page'&&document.querySelector('.collection-count').textContent==='4');
  const fixture=exhibit.root.cloneNode(true);fixture.style.display='none';document.body.append(fixture);const other=new SingingLiquid(fixture);other.active=false;other.mount();other.dispose();fixture.querySelector('#liquid-bass').click();
  check('Disposal releases GPU/audio, observers and input handlers',other.abort.signal.aborted&&other.frame===0&&other.audio.mode==='none');fixture.remove();
  exhibit.reset();check('Reset restores parameters and deterministic initial wave',exhibit.sim.time===0&&exhibit.sim.sensitivity===1&&exhibit.sim.persistence===.6&&initial.every((v,i)=>v===exhibit.sim.velocity[i])&&exhibit.audio.mode==='none');
  const samples=[],renders=[];for(let i=0;i<120;i++){let t=performance.now();exhibit.sim.step(LIQUID_STEP,{level:.8,brightness:.5});samples.push(performance.now()-t);t=performance.now();exhibit.paint();if(exhibit.renderer.gl)exhibit.renderer.gl.finish();renders.push(performance.now()-t);}
  check('Extreme audio remains finite',exhibit.sim.height.every(Number.isFinite));
  if(exhibit.renderer.gl){
   const gl=exhibit.renderer.gl,pixel=new Uint8Array(4),r=exhibit.renderer;exhibit.paint();gl.readPixels(Math.round(r.center.x*r.dpr),Math.round((r.height-r.center.y)*r.dpr),1,1,gl.RGBA,gl.UNSIGNED_BYTE,pixel);
   check('GPU rendering produces visible surface pixels without errors',pixel[3]>0&&gl.getError()===gl.NO_ERROR);
  }
  const fallbackCanvas=document.createElement('canvas'),fallback=new LiquidCanvasRenderer(fallbackCanvas,exhibit.sim);fallback.resize(500,500);fallback.render();
  const alpha=fallback.ctx.getImageData(Math.round(fallback.center.x*fallback.dpr),Math.round(fallback.center.y*fallback.dpr),1,1).data[3];
  check('Canvas fallback renders a visible wave surface without WebGL',alpha>0);
  check('Layout has no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
  const stats=arr=>({meanMs:+(arr.reduce((a,b)=>a+b)/arr.length).toFixed(3),p95Ms:+arr.sort((a,b)=>a-b)[Math.floor(arr.length*.95)].toFixed(3)});
  const measurements={simulation:stats(samples),renderAndGPUFinish:stats(renders),grid:exhibit.sim.size,viewport:[innerWidth,innerHeight],renderer:exhibit.renderer.gl?'WebGL':'Canvas2D'};
  sand.reset();bubble.reset();mirror.reset();exhibit.reset();exhibit.paused=true;exhibit.schedule();exhibit.updateUI();
  const demoButton=document.createElement('button');demoButton.textContent='驗證真實示範音';demoButton.id='qa-demo-start';demoButton.style.cssText='position:fixed;z-index:101;right:20px;bottom:20px;background:#ff801e;color:#164662;border-radius:30px;padding:18px';document.body.append(demoButton);
  output.textContent+='\n\n'+JSON.stringify(measurements,null,2)+'\nREADY FOR DEMO';output.dataset.state='ready';
  demoButton.addEventListener('click',async()=>{
   try{
    // This explicit gesture resumes a real Web Audio context; no fake analyser here.
    if(exhibit.audio.muted)exhibit.audio.toggleMute();
    await exhibit.audio.start('bass');check('A user gesture starts real oscillators and analyser',exhibit.audio.mode==='bass'&&exhibit.audio.context?.state==='running');
    let max=0,peak=0,previous=0;const intervals=[];for(let i=0;i<50;i++){const timestamp=await frame();if(previous)intervals.push(timestamp-previous);previous=timestamp;const s=exhibit.audio.sample();max=Math.max(max,s.level);peak=Math.max(peak,s.peak);exhibit.sim.step(LIQUID_STEP,s);exhibit.paint();}
    measurements.frameInterval=stats(intervals);
    check('Generated demo audio traverses the real analysis pipeline',max>.05&&peak>60);
    exhibit.audio.toggleMute();check('Mute silences only the speaker output',exhibit.audio.muted&&exhibit.audio.analyser!==null&&exhibit.audio.mode==='bass');
    const context=exhibit.audio.context;navigation.selectExhibit('mirror');await frame();check('Leaving a room stops oscillators and closes the audio context',exhibit.audio.mode==='none'&&exhibit.audio.oscillators.length===0&&context.state==='closed');navigation.selectExhibit('liquid');
    check('Returning never autoplays sound',exhibit.audio.mode==='none');exhibit.reset();exhibit.paused=true;exhibit.schedule();exhibit.updateUI();demoButton.remove();
    output.textContent+='\n\n'+JSON.stringify(measurements,null,2)+'\nSynthetic touch and injected microphone lifecycle; real demo Web Audio pipeline. Physical microphone unverified.\nCOMPLETE';output.dataset.state='passed';
   }catch(error){output.textContent+='\nERROR: '+error.stack;output.dataset.state='failed';}
  },{once:true});
 }catch(error){output.textContent+='\nERROR: '+error.stack;output.dataset.state='failed';console.error(error);}
}
