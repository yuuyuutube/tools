import test from 'node:test';
import assert from 'node:assert/strict';
import { MicrophoneBreath, rmsLevel, breathIntensity } from '../src/microphone.js';

class Track extends EventTarget {
  readyState = 'live'; muted = false; stops = 0;
  stop() { this.stops++; this.readyState = 'ended'; }
}
class Context extends EventTarget {
  state = 'suspended'; connectedTo = null; amplitude = 0;
  async resume() { this.state = 'running'; }
  async close() { this.state = 'closed'; }
  createMediaStreamSource() { return { connect: node => { this.connectedTo = node; }, disconnect() {} }; }
  createAnalyser() {
    return { fftSize:1024, disconnect() {}, getFloatTimeDomainData: buffer => {
      for (let i=0;i<buffer.length;i++) buffer[i] = Math.sin(i * Math.PI / 16) * this.amplitude;
    } };
  }
}
function fixture(getUserMedia) {
  const tracks = [new Track()];
  const stream = { getTracks:()=>tracks, getAudioTracks:()=>tracks };
  const contexts = [];
  const mic = new MicrophoneBreath({ mediaDevices:{getUserMedia:getUserMedia || (async()=>stream)}, createAudioContext:()=>{const c=new Context();contexts.push(c);return c;} });
  return {mic, tracks, stream, contexts};
}

test('microphone waits for an explicit request, then analyses without speaker output', async () => {
  let requests = 0;
  const f = fixture(async options => { requests++; assert.equal(options.video,false); assert.equal(options.audio.noiseSuppression,false); return f.stream; });
  assert.equal(f.mic.state,'idle'); assert.equal(requests,0);
  assert.equal(await f.mic.enable(),true);
  assert.equal(requests,1); assert.equal(f.mic.state,'listening');
  assert.equal(f.contexts[0].connectedTo,f.mic.analyser);
  f.contexts[0].amplitude = .16;
  for(let i=0;i<60;i++) f.mic.sample(1/120);
  assert.ok(f.mic.level>.9);
  f.contexts[0].amplitude = 0;
  for(let i=0;i<120;i++) f.mic.sample(1/120);
  assert.equal(f.mic.level,0);
  f.mic.stop(); assert.equal(f.tracks[0].stops,1); assert.equal(f.contexts[0].state,'closed'); assert.equal(f.mic.state,'idle');
});

test('denied permission, missing devices and unreadable devices each enable fallback', async () => {
  for(const [name, message] of [['NotAllowedError','未允許'],['NotFoundError','沒有麥克風'],['NotReadableError','無法使用']]) {
    const f=fixture(async()=>{throw Object.assign(new Error(name),{name});});
    assert.equal(await f.mic.enable(),false); assert.equal(f.mic.state,'fallback');
    assert.ok(f.mic.reason.includes(message)); assert.equal(f.contexts[0].state,'closed');
  }
});

test('unsupported microphone APIs choose fallback without asking permission', async () => {
  const mic = new MicrophoneBreath({mediaDevices:{},createAudioContext:()=>{throw new Error('must not create context');}});
  assert.equal(mic.state,'fallback'); assert.equal(await mic.enable(),false);
});

test('a late permission grant after suspension is stopped and cannot restart listening', async () => {
  let resolve;
  const f=fixture(()=>new Promise(r=>{resolve=r;}));
  const pending=f.mic.enable(); assert.equal(f.mic.state,'requesting');
  f.mic.stop(); resolve(f.stream);
  assert.equal(await pending,false); assert.equal(f.mic.state,'idle');
  assert.equal(f.tracks[0].stops,1); assert.equal(f.contexts[0].state,'closed');
});

test('retry can recover after denial and duplicate requests do not open extra streams', async () => {
  let attempts=0;
  const f=fixture(async()=>{if(!attempts++)throw Object.assign(new Error(),{name:'NotAllowedError'});return f.stream;});
  await f.mic.enable(); assert.equal(f.mic.state,'fallback');
  assert.equal(await f.mic.enable(),true); assert.equal(await f.mic.enable(),false);
  assert.equal(attempts,2); f.mic.dispose(); assert.equal(f.tracks[0].stops,1);
  assert.equal(await f.mic.enable(),false);
});

test('device loss and context interruption stop tracks and expose fallback', async () => {
  for(const event of ['ended','mute','context']) {
    const f=fixture(); await f.mic.enable();
    if(event==='context') { f.contexts[0].state='suspended'; f.contexts[0].dispatchEvent(new Event('statechange')); }
    else f.tracks[0].dispatchEvent(new Event(event));
    assert.equal(f.mic.state,'fallback'); assert.equal(f.tracks[0].stops,1);
    assert.equal(f.contexts[0].state,'closed'); assert.equal(f.mic.level,0);
  }
});

test('quiet input and DC offsets are rejected; stronger breaths map monotonically', () => {
  assert.equal(rmsLevel(new Float32Array([.5,.5,.5])),0);
  assert.equal(breathIntensity(.004),0);
  assert.ok(breathIntensity(.02)<breathIntensity(.06));
  assert.equal(breathIntensity(1),1);
});
