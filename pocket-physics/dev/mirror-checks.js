import { FourthDimensionMirror } from '../src/mirror.js';
import { MIRROR_STEP, wrapAngle } from '../src/mirror-geometry.js';

export async function runBrowserChecks(exhibit,navigation) {
  const output=document.createElement('pre');output.id='qa-results';
  output.style.cssText='position:fixed;z-index:100;top:8px;left:8px;max-width:calc(100% - 16px);max-height:95vh;overflow:auto;padding:18px;background:#f4f5f8fa;color:#263462;border:1px solid #8292bf;font:12px/1.8 monospace;white-space:pre-wrap;user-select:text';
  document.body.append(output);const results=[];
  const check=(name,condition)=>{
    results.push({name,passed:!!condition});output.textContent=results.map(r=>`${r.passed?'PASS':'FAIL'}  ${r.name}`).join('\n');
    if(!condition)throw new Error(name);
  };
  const frame=()=>new Promise(resolve=>requestAnimationFrame(resolve));
  const $=id=>document.getElementById(id);
  try {
    await frame();exhibit.paused=true;exhibit.schedule();exhibit.reset();
    const initial=exhibit.model.geometry(),time=exhibit.model.time;await frame();await frame();
    check('Pause stops geometry time and animation scheduling',exhibit.model.time===time&&exhibit.frame===0);
    exhibit.canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true,cancelable:true}));
    check('Keyboard alters actual 4D geometry',JSON.stringify(exhibit.model.geometry().four)!==JSON.stringify(initial.four));
    $('dimension-3d').click();const before3D=exhibit.model.geometry();
    exhibit.canvas.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowUp',bubbles:true,cancelable:true}));
    const after3D=exhibit.model.geometry();
    check('3D mode changes view while retaining the same four-dimensional object',JSON.stringify(before3D.four)===JSON.stringify(after3D.four)&&JSON.stringify(before3D.screen)!==JSON.stringify(after3D.screen));
    check('Rotation-space buttons expose their selected state',$('dimension-3d').getAttribute('aria-pressed')==='true'&&$('dimension-4d').getAttribute('aria-pressed')==='false');
    $('dimension-4d').click();
    const capture=exhibit.canvas.setPointerCapture;exhibit.canvas.setPointerCapture=()=>{};
    const rect=exhibit.canvas.getBoundingClientRect(),cx=rect.left+rect.width/2,cy=rect.top+rect.height/2;
    const pointer=(type,id,x,y)=>exhibit.canvas.dispatchEvent(new PointerEvent(type,{pointerId:id,pointerType:'touch',button:0,buttons:type==='pointerup'?0:1,clientX:x,clientY:y,bubbles:true,cancelable:true}));
    const xw=exhibit.model.angles.xw;
    pointer('pointerdown',11,cx-30,cy);pointer('pointermove',11,cx+40,cy+25);
    check('Touch drag rotates real XW/YW coordinates and pauses automatic motion',Math.abs(exhibit.model.angles.xw-xw)>.3&&exhibit.paused);
    pointer('pointercancel',11,cx+40,cy+25);
    check('Cancelled touch releases captured gesture state',exhibit.pointers.size===0&&exhibit.gesture===null);
    pointer('pointerdown',12,cx-40,cy);pointer('pointerdown',13,cx+40,cy);
    const depth=exhibit.model.depth,zw=exhibit.model.angles.zw;
    pointer('pointermove',13,cx+90,cy+45);
    check('Two-finger pinch changes true projection distance',Math.abs(exhibit.model.depth-depth)>.1);
    check('Two-finger twist rotates the ZW plane',Math.abs(exhibit.model.angles.zw-zw)>.1);
    pointer('pointerup',12,cx-40,cy);pointer('pointerup',13,cx+90,cy+45);
    check('Both touch pointers release cleanly',exhibit.pointers.size===0);
    exhibit.canvas.setPointerCapture=capture;
    $('fourth-angle').value='90';$('fourth-angle').dispatchEvent(new Event('input',{bubbles:true}));
    check('Angle slider sets an exact fourth-dimensional quarter-turn',Math.abs(exhibit.model.angles.xw-Math.PI/2)<1e-9);
    $('mirror-depth').value='2.7';$('mirror-depth').dispatchEvent(new Event('input',{bubbles:true}));
    check('Depth slider updates the mathematical projection',exhibit.model.depth===2.7&&exhibit.model.geometry().screen.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));
    exhibit.canvas.dispatchEvent(new WheelEvent('wheel',{deltaY:5000,bubbles:true,cancelable:true}));
    check('Mouse wheel respects safe perspective bounds',exhibit.model.depth===6);
    const beforeFlip=exhibit.model.angles.xw;$('mirror-flip').click();
    for(let i=0;i<240&&exhibit.model.transition;i++)await frame();
    check('Flip finishes at exactly 90 degrees of XW rotation',!exhibit.model.transition&&Math.abs(wrapAngle(exhibit.model.angles.xw-beforeFlip-Math.PI/2))<1e-8);
    check('A manual flip remains paused afterward',exhibit.paused&&exhibit.frame===0);

    navigation.selectExhibit('hourglass');const hourglass=navigation.getCurrent().controller;
    hourglass.sim.strength=.35;hourglass.updateUI();
    navigation.selectExhibit('bubble');const bubble=navigation.getCurrent().controller;
    $('elasticity').value='.85';$('elasticity').dispatchEvent(new Event('input',{bubbles:true}));
    check('Visiting another room stops mirror rendering and detaches its canvas',!exhibit.active&&exhibit.frame===0&&!exhibit.root.isConnected);
    const frozen=exhibit.model.time;await frame();await frame();
    check('Inactive mirror time remains frozen',exhibit.model.time===frozen);
    check('Bubble navigation never starts a microphone without user input',!bubble.microphone.stream&&!bubble.microphone.context);
    $('next-exhibit').click();
    check('Header advances from bubble to mirror and preserves its pose',navigation.getCurrent().controller===exhibit&&Math.abs(wrapAngle(exhibit.model.angles.xw-beforeFlip-Math.PI/2))<1e-8);
    $('next-exhibit').click();const liquid=navigation.getCurrent().controller;
    check('Header advances from mirror to silent liquid',liquid.audio?.mode==='none');
    $('next-exhibit').click();const first=navigation.getCurrent().controller===hourglass&&hourglass.sim.strength===.35;
    $('next-exhibit').click();const second=navigation.getCurrent().controller===bubble&&bubble.sim.elasticity===.85;
    $('next-exhibit').click();
    check('Header cycles all four exhibits while retaining independent state',first&&second&&navigation.getCurrent().controller===exhibit);
    check('Mirror palette is independent and the collection contains all four pieces',document.documentElement.dataset.exhibit==='mirror'&&document.querySelectorAll('.exhibit-entry').length===4);
    for(let i=0;i<40;i++)navigation.selectExhibit(['hourglass','bubble','mirror','liquid'][i%4]);navigation.selectExhibit('mirror');
    check('Repeated navigation retains exactly four controllers and one attached canvas',navigation.cache.size===4&&document.querySelectorAll('canvas').length===1&&hourglass.frame===0&&bubble.frame===0);
    const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
    check('Active document contains no duplicate IDs',ids.length===new Set(ids).size);
    $('notes-open').click();
    check('Scientific notes suspend rendering and explain projection',!exhibit.active&&$('notes-dialog').open&&document.querySelector('.notes-body').textContent.includes('16 個頂點'));
    $('notes-dialog').close();await frame();
    check('Closing notes restores the exhibit and focus',exhibit.active&&document.activeElement===$('notes-open'));
    const fixture=exhibit.root.cloneNode(true);fixture.style.display='none';document.body.append(fixture);
    const other=new FourthDimensionMirror(fixture);other.active=false;other.paused=true;other.mount();other.dispose();
    fixture.querySelector('#mirror-flip').click();
    check('Dispose removes input listeners, animation and pending transitions',other.abort.signal.aborted&&other.frame===0&&other.model.transition===null);
    fixture.remove();exhibit.reset();
    check('Reset restores default pose, depth and 4D mode',exhibit.model.depth===3.6&&exhibit.model.mode==='4d'&&JSON.stringify(exhibit.model.geometry())===JSON.stringify(initial)&&exhibit.paused);
    const geometrySamples=[],renderSamples=[];
    for(let i=0;i<240;i++){
      let t=performance.now();exhibit.model.step();exhibit.model.geometry();geometrySamples.push(performance.now()-t);
      t=performance.now();exhibit.paint();renderSamples.push(performance.now()-t);
    }
    const stats=values=>{const sorted=[...values].sort((a,b)=>a-b);return {averageMs:+(values.reduce((a,b)=>a+b)/values.length).toFixed(3),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(3)};};
    exhibit.paused=false;exhibit.schedule();exhibit.updateUI();
    const intervals=[];let previous=await frame();
    for(let i=0;i<90;i++){const now=await frame();intervals.push(now-previous);previous=now;}
    check('Automatic rotation advances actual four-dimensional orientation',exhibit.model.time>2);
    check('Layout has no horizontal overflow',document.documentElement.scrollWidth<=innerWidth);
    const performanceResult={geometry:stats(geometrySamples),rendering:stats(renderSamples),frameInterval:stats(intervals),vertices:16,edges:32,faces:24,viewport:`${innerWidth} × ${innerHeight}`};
    hourglass.reset();bubble.reset();exhibit.reset();
    output.textContent+='\n\n'+JSON.stringify(performanceResult,null,2)+'\n\nTouch checks use synthetic Pointer Events; physical touch hardware is not emulated.\nCOMPLETE';output.dataset.state='passed';
  } catch(error) {output.textContent+='\nERROR: '+error.stack;output.dataset.state='failed';console.error(error);}
}
