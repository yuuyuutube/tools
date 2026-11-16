import { MicrophoneBreath, rmsLevel } from './microphone.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export function analyseLiquidAudio(samples,bins,sampleRate=48000){
  const rms=rmsLevel(samples);let sum=0,weighted=0,peak=0,max=0;
  for(let i=1;i<bins.length;i++){const hz=i*sampleRate/(bins.length*2);if(hz<60||hz>6000)continue;const power=(bins[i]/255)**2;sum+=power;weighted+=power*hz;if(power>max){max=power;peak=hz;}}
  return {level:clamp((rms-.003)*9,0,1),brightness:sum>.001?clamp(Math.log2(Math.max(100,weighted/sum)/100)/6,0,1):0,peak:rms>.006?peak:0};
}

export class LiquidAudio {
  constructor(onChange=()=>{},options={}){
    this.onChange=onChange;this.mode='none';this.pending=false;this.reason='';this.version=0;this.muted=false;
    this.makeContext=options.createAudioContext||(()=>{const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw Error('Web Audio unavailable');return new C();});
    this.microphone=new MicrophoneBreath({...options,onChange:()=>{
      if(this.mode!=='mic')return;
      this.pending=this.microphone.state==='requesting';
      if(this.microphone.state==='fallback'){this.reason='無法收音，可播放示範音或直接撥動液面';this.mode='none';}
      this.onChange();
    }});
  }
  async start(mode){
    this.stop();const token=++this.version;this.mode=mode;this.reason='';this.pending=true;this.onChange();
    if(mode==='mic'){
      const ok=await this.microphone.enable();if(token!==this.version)return false;
      this.pending=false;if(!ok){this.mode='none';this.reason='無法收音，可播放示範音或直接撥動液面';}this.onChange();return ok;
    }
    try{
      const context=this.makeContext();this.context=context;await context.resume();
      if(token!==this.version){if(context.state!=='closed')await context.close();return false;}
      if(context.state!=='running')throw Error('Audio unavailable');
      this.analyser=context.createAnalyser();this.analyser.fftSize=2048;this.analyser.smoothingTimeConstant=.65;
      this.master=context.createGain();this.master.gain.value=this.muted?0:.65;
      this.analyser.connect(this.master);this.master.connect(context.destination);
      this.oscillators=[];this.voices=[];
      for(const ratio of [1,2.002,3.005]){const osc=context.createOscillator(),gain=context.createGain();osc.type='sine';gain.gain.value=0;osc.connect(gain);gain.connect(this.analyser);osc.start();this.oscillators.push(osc);this.voices.push(gain);}
      this.note=-1;this.startTime=context.currentTime;this.pending=false;
      this.stateListener=()=>{if(this.context===context&&context.state!=='running'){this.stop();this.reason='聲音已中斷，點選示範音重新播放';this.onChange();}};
      context.addEventListener('statechange',this.stateListener);this.onChange();return true;
    }catch{if(token===this.version){this.stop();this.reason='無法播放聲音，仍可直接撥動液面';this.onChange();}return false;}
  }
  sample(){
    const mic=this.mode==='mic',analyser=mic?this.microphone.analyser:this.analyser,context=mic?this.microphone.context:this.context;
    if(!analyser||!context||this.pending)return {level:0,brightness:0,peak:0};
    try{
      if(!mic){
        const elapsed=context.currentTime-this.startTime,index=Math.floor(elapsed/.48);
        if(index!==this.note){
          this.note=index;const notes=this.mode==='bass'?[110,110,146.83,110,164.81,146.83,98,98]:[261.63,329.63,392,523.25,440,392,329.63,293.66];
          const hz=notes[index%notes.length],now=context.currentTime;
          this.oscillators.forEach((osc,i)=>{osc.frequency.setTargetAtTime(hz*[1,2.002,3.005][i],now,.015);const g=this.voices[i].gain;g.cancelScheduledValues(now);g.setValueAtTime(0,now);g.linearRampToValueAtTime(.13/(i+1)**2,now+.025);g.exponentialRampToValueAtTime(.0001,now+.44);});
        }
      }
      if(this.samples?.length!==analyser.fftSize){this.samples=new Float32Array(analyser.fftSize);this.bins=new Uint8Array(analyser.frequencyBinCount);}
      analyser.getFloatTimeDomainData(this.samples);analyser.getByteFrequencyData(this.bins);
      return analyseLiquidAudio(this.samples,this.bins,context.sampleRate);
    }catch{this.stop();this.reason='收音已中斷，可改用示範音';this.onChange();return {level:0,brightness:0,peak:0};}
  }
  toggleMute(){this.muted=!this.muted;if(this.master)this.master.gain.setTargetAtTime(this.muted?0:.65,this.context.currentTime,.03);this.onChange();}
  stop(){
    this.version++;this.mode='none';this.pending=false;this.microphone.stop();
    if(this.context&&this.stateListener)this.context.removeEventListener('statechange',this.stateListener);
    this.oscillators?.forEach(osc=>{try{osc.stop();osc.disconnect();}catch{}});this.voices?.forEach(g=>g.disconnect());
    this.analyser?.disconnect();this.master?.disconnect();if(this.context&&this.context.state!=='closed')this.context.close().catch(()=>{});
    this.context=null;this.analyser=null;this.master=null;this.oscillators=[];this.voices=[];this.samples=null;this.bins=null;this.onChange();
  }
  dispose(){this.stop();this.microphone.dispose();}
}
