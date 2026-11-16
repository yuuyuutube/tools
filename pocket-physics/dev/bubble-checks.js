import { UnbreakableBubble } from '../src/bubble.js';
import { MicrophoneBreath } from '../src/microphone.js';

class TestAudioContext extends EventTarget {
  state = 'running'; amplitude = 0;
  async resume() {} async close() { this.state = 'closed'; }
  createMediaStreamSource() { return {connect() {},disconnect() {}}; }
  createAnalyser() { return {fftSize:1024,disconnect() {},getFloatTimeDomainData:buffer=>{for(let i=0;i<buffer.length;i++)buffer[i]=Math.sin(i*.2)*this.amplitude;}}; }
}
function installMicrophone(exhibit, denied = false) {
  exhibit.microphone.dispose();
  const tracks = [], contexts = [];
  const createStream = () => {
    const track = new EventTarget(); track.readyState = 'live'; track.muted = false;
    track.stop = () => { track.readyState = 'ended'; }; tracks.push(track);
    return {getTracks:()=>[track],getAudioTracks:()=>[track]};
  };
  exhibit.microphone = new MicrophoneBreath({
    mediaDevices:{getUserMedia:async()=>{if(denied)throw Object.assign(new Error(),{name:'NotAllowedError'});return createStream();}},
    createAudioContext:()=>{const c=new TestAudioContext();contexts.push(c);return c;},
    onChange:()=>exhibit.onMicrophoneChange()
  });
  exhibit.updateUI(); return {tracks,contexts,createStream};
}

export async function runBrowserChecks(exhibit, navigation) {
  const output = document.createElement('pre'); output.id = 'qa-results';
  output.style.cssText = 'position:fixed;z-index:100;top:8px;left:8px;max-width:calc(100% - 16px);max-height:95vh;overflow:auto;padding:18px;border:1px solid #94b4ad;background:#eef8f5fa;color:#244854;font:12px/1.8 monospace;white-space:pre-wrap;user-select:text';
  document.body.append(output);
  const results = [];
  const check = (name, condition) => {
    results.push({ name, passed: !!condition });
    output.textContent = results.map(r => `${r.passed ? 'PASS' : 'FAIL'}  ${r.name}`).join('\n');
    if (!condition) throw new Error(name);
  };
  const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
  const $ = id => document.getElementById(id);
  try {
    await frame();
    const microphone = installMicrophone(exhibit);
    check('Microphone is the primary action before requesting permission', $('inflate').textContent.includes('啟用麥克風') && $('mic-retry').hidden);
    await exhibit.enableMicrophone();
    check('Successful microphone input replaces manual blowing', exhibit.microphone.state === 'listening' && $('inflate').textContent.includes('對著麥克風'));
    $('inflate').dispatchEvent(new PointerEvent('pointerdown',{pointerId:90,pointerType:'touch',button:0,bubbles:true}));
    check('Manual press cannot inflate while microphone is available', exhibit.blowPointers.size === 0 && !exhibit.sim.blowing);
    microphone.contexts[0].amplitude = .16;
    for(let i=0;i<40;i++) await frame();
    check('Analysed microphone samples change actual membrane pressure', exhibit.sim.blowing && exhibit.sim.breathStrength > .8 && exhibit.sim.inflation > 1.05);
    navigation.selectExhibit('hourglass');
    check('Leaving bubble room closes microphone tracks and audio context', microphone.tracks[0].readyState === 'ended' && microphone.contexts[0].state === 'closed' && exhibit.microphone.state === 'idle');
    navigation.selectExhibit('bubble');
    check('Returning does not restart capture without another user action', exhibit.microphone.state === 'idle' && $('inflate').textContent.includes('啟用麥克風'));
    const denied = installMicrophone(exhibit,true);
    await exhibit.enableMicrophone();
    check('Rejected microphone permission alone enables long-press fallback', exhibit.microphone.state === 'fallback' && $('inflate').textContent.includes('按住吹氣') && !$('mic-retry').hidden);
    exhibit.microphone.mediaDevices.getUserMedia = async()=>denied.createStream();
    $('mic-retry').click(); await frame();
    check('Retry restores microphone mode and hides manual fallback', exhibit.microphone.state === 'listening' && $('mic-retry').hidden);
    installMicrophone(exhibit,true); await exhibit.enableMicrophone();
    await frame(); exhibit.paused = true; exhibit.schedule(); exhibit.reset();
    const time = exhibit.sim.time; await frame(); await frame();
    check('Pause stops membrane time and frame scheduling', exhibit.sim.time === time && exhibit.frame === 0);
    const b = exhibit.sim.bubbles[0];
    const rect = exhibit.canvas.getBoundingClientRect(), { center, scale } = exhibit.renderer;
    const screen = (x,y) => [rect.left + center.x + x * scale, rect.top + center.y + y * scale];
    const pointer = (element, type, id, x, y) => element.dispatchEvent(new PointerEvent(type, { pointerId:id, pointerType:'touch', button:0, buttons:type === 'pointerup' ? 0 : 1, clientX:x, clientY:y, bubbles:true, cancelable:true }));
    const originalCapture = exhibit.canvas.setPointerCapture; exhibit.canvas.setPointerCapture = () => {};
    const before = [...b.x];
    pointer(exhibit.canvas,'pointerdown',11,...screen(b.x[28],b.y[28]));
    pointer(exhibit.canvas,'pointerdown',12,...screen(b.x[0],b.y[0]));
    pointer(exhibit.canvas,'pointermove',11,...screen(-235,0));
    pointer(exhibit.canvas,'pointermove',12,...screen(240,-30));
    check('Two simultaneous touch pointers deform actual membrane nodes', exhibit.sim.grabs.size === 2 && b.x.some((x,i) => Math.abs(x-before[i]) > 10));
    pointer(exhibit.canvas,'pointercancel',11,0,0); pointer(exhibit.canvas,'pointerup',12,0,0);
    check('Touch release and cancellation clear both grabs', exhibit.sim.grabs.size === 0);
    exhibit.canvas.setPointerCapture = originalCapture;

    const inflate = $('inflate'), originalInflateCapture = inflate.setPointerCapture;
    inflate.setPointerCapture = () => {};
    pointer(inflate,'pointerdown',13,0,0);
    for (let i = 0; i < 30; i++) await frame();
    check('Held breath increases simulated area and resumes paused toy', exhibit.sim.inflation > 1.03 && !exhibit.paused && inflate.getAttribute('aria-pressed') === 'true');
    pointer(inflate,'pointercancel',13,0,0); inflate.setPointerCapture = originalInflateCapture;
    check('Cancelled breath stops pressure input', !exhibit.sim.blowing && inflate.getAttribute('aria-pressed') === 'false');
    inflate.dispatchEvent(new KeyboardEvent('keydown',{key:' ',code:'Space',bubbles:true,cancelable:true}));
    check('Keyboard can hold a breath', exhibit.sim.blowing);
    inflate.dispatchEvent(new KeyboardEvent('keyup',{key:' ',code:'Space',bubbles:true,cancelable:true}));
    check('Keyboard release stops blowing', !exhibit.sim.blowing);
    $('elasticity').value = '.9'; $('elasticity').dispatchEvent(new Event('input',{bubbles:true}));
    check('Elasticity control changes membrane material', exhibit.sim.elasticity === .9);
    $('add-bubble').click(); $('add-bubble').click();
    check('Add creates independent membranes and enforces five-bubble limit', exhibit.sim.bubbles.length === 5 && $('add-bubble').disabled);
    const bubbleTime = exhibit.sim.time;
    navigation.selectExhibit('hourglass');
    const hourglass = navigation.getCurrent().controller;
    const hourglassRoot = hourglass.root;
    check('Switching removes bubble surface and stops its animation', !exhibit.active && exhibit.frame === 0 && !exhibit.root.isConnected && document.documentElement.dataset.exhibit === 'hourglass');
    await frame(); await frame();
    check('Inactive exhibit simulation time remains frozen', exhibit.sim.time === bubbleTime);
    hourglass.sim.strength = .4; hourglass.updateUI();
    navigation.selectExhibit('bubble');
    check('Returning preserves bubble state and changes room palette', navigation.getCurrent().controller === exhibit && exhibit.sim.bubbles.length === 5 && exhibit.sim.elasticity === .9 && document.documentElement.dataset.exhibit === 'bubble');
    navigation.selectExhibit('hourglass');
    check('Hourglass retains independent state across navigation', navigation.getCurrent().controller === hourglass && hourglass.sim.strength === .4 && hourglass.root === hourglassRoot);
    navigation.selectExhibit('bubble');
    for (let i = 0; i < 30; i++) navigation.selectExhibit(i % 2 ? 'bubble' : 'hourglass');
    check('Repeated switching keeps exactly two cached exhibits and one active canvas', navigation.cache.size === 2 && document.querySelectorAll('.exhibit-surface').length === 1 && document.querySelectorAll('canvas').length === 1 && hourglass.frame === 0);
    const ids = [...document.querySelectorAll('[id]')].map(e => e.id);
    check('Active document has no duplicate IDs', new Set(ids).size === ids.length);
    $('notes-open').click();
    check('Notes suspend simulation and show bubble rules', !exhibit.active && $('notes-dialog').open && document.querySelector('.notes-body').textContent.includes('二維膜模型'));
    $('notes-dialog').close(); await frame();
    check('Closing notes restores active exhibit and focus', exhibit.active && document.activeElement === $('notes-open'));
    const fixture = exhibit.root.cloneNode(true); fixture.style.display = 'none'; document.body.append(fixture);
    const other = new UnbreakableBubble(fixture); other.paused = true; other.active = false; other.mount(); other.dispose();
    fixture.querySelector('#add-bubble').click();
    check('Dispose removes listeners, inputs, animation and observers', other.sim.bubbles.length === 3 && other.frame === 0 && other.sim.grabs.size === 0 && other.abort.signal.aborted);
    fixture.remove(); exhibit.reset();
    check('Reset restores three bubbles and material defaults', exhibit.sim.bubbles.length === 3 && exhibit.sim.elasticity === .6 && exhibit.sim.inflation === 1);

    exhibit.paused = true; exhibit.schedule();
    const simSamples = [], renderSamples = [];
    for (let i = 0; i < 240; i++) {
      let t = performance.now(); exhibit.sim.step(); simSamples.push(performance.now()-t);
      t = performance.now(); exhibit.paint(); renderSamples.push(performance.now()-t);
    }
    const stats = values => {
      const sorted = [...values].sort((a,b) => a-b);
      return {averageMs:+(values.reduce((a,b)=>a+b)/values.length).toFixed(3),p95Ms:+sorted[Math.floor(sorted.length*.95)].toFixed(3)};
    };
    exhibit.paused = false; exhibit.schedule(); exhibit.updateUI();
    const intervals = []; let previous = await frame();
    for (let i = 0; i < 90; i++) { const now = await frame(); intervals.push(now-previous); previous = now; }
    check('Live membrane simulation advances normally', exhibit.sim.time > 2);
    check('No horizontal layout overflow', document.documentElement.scrollWidth <= innerWidth);
    const performanceResult = {simulation:stats(simSamples),rendering:stats(renderSamples),frameInterval:stats(intervals),viewport:`${innerWidth} × ${innerHeight}`,nodesPerBubble:b.count,maxBubbles:5};
    hourglass.reset(); exhibit.reset();
    exhibit.microphone.dispose(); exhibit.microphone = new MicrophoneBreath({onChange:()=>exhibit.onMicrophoneChange()}); exhibit.updateUI();
    output.textContent += '\n\n'+JSON.stringify(performanceResult,null,2)+'\n\nTouch and microphone scenarios use injected test inputs; no hardware capture or permission request occurs in this harness.\nCOMPLETE';
    output.dataset.state = 'passed';
    if (new URLSearchParams(location.search).get('preview') === 'fallback') {
      installMicrophone(exhibit,true); await exhibit.enableMicrophone();
      document.body.dataset.qaState = 'passed'; output.remove();
    }
  } catch (error) {
    output.textContent += '\nERROR: '+error.stack; output.dataset.state = 'failed'; console.error(error);
  }
}
