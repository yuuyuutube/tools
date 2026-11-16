import { LiquidSimulation, LIQUID_STEP } from './liquid-simulation.js';
import { LiquidRenderer } from './liquid-renderer.js';
import { LiquidAudio } from './liquid-audio.js';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export class SingingLiquid {
  constructor(root){
    this.root=root;this.canvas=root.querySelector('#liquid-canvas');this.sim=new LiquidSimulation();this.renderer=new LiquidRenderer(this.canvas,this.sim);
    this.abort=new AbortController();this.active=true;this.paused=matchMedia('(prefers-reduced-motion: reduce)').matches;this.frame=0;this.last=0;this.accumulator=0;this.lastUI=0;this.pointers=new Map();this.keyPoint={x:0,y:0};
    this.audio=new LiquidAudio(()=>{if(this.mounted)this.updateUI();});this.tick=this.tick.bind(this);
  }
  $(id){return this.root.querySelector('#'+id);}
  on(el,event,fn,options={}){el.addEventListener(event,fn,{...options,signal:this.abort.signal});}
  mount(){
    this.mounted=true;
    for(const mode of ['mic','bass','melody'])this.on(this.$('liquid-'+mode),'click',()=>{
      if(!this.active)return;if(this.audio.mode===mode){this.audio.stop();return;}
      this.paused=false;this.audio.start(mode);this.updateUI();this.schedule();
    });
    this.on(this.$('liquid-mute'),'click',()=>this.audio.toggleMute());
    this.on(this.$('pause'),'click',()=>this.togglePause());this.on(this.$('reset'),'click',()=>this.reset());
    for(const name of ['sensitivity','persistence'])this.on(this.$('liquid-'+name),'input',()=>{this.sim[name]=Number(this.$('liquid-'+name).value);this.updateUI();});
    this.on(this.canvas,'pointerdown',e=>{
      if(e.button!==0||!this.active||this.pointers.size>=2)return;
      const p=this.renderer.pointFromClient(e.clientX,e.clientY);if(Math.hypot(p.x,p.y)>.94)return;
      this.pointers.set(e.pointerId,p);this.canvas.setPointerCapture(e.pointerId);this.canvas.focus({preventScroll:true});this.renderer.cursor=p;this.sim.poke(p.x,p.y,.9);this.wake();e.preventDefault();
    });
    this.on(this.canvas,'pointermove',e=>{
      if(!this.pointers.has(e.pointerId))return;const p=this.renderer.pointFromClient(e.clientX,e.clientY),old=this.pointers.get(e.pointerId);
      if(Math.hypot(p.x,p.y)>.94)return;
      this.sim.poke(p.x,p.y,Math.min(.12,Math.hypot(p.x-old.x,p.y-old.y)*.9));this.pointers.set(e.pointerId,p);this.renderer.cursor=p;this.paint();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.on(this.canvas,event,e=>{this.pointers.delete(e.pointerId);if(!this.pointers.size)this.renderer.cursor=null;this.paint();});
    this.on(this.canvas,'keydown',e=>{
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter'].includes(e.key))return;e.preventDefault();
      if(e.key==='Enter'){this.sim.poke(this.keyPoint.x,this.keyPoint.y,1);this.wake();return;}
      this.keyPoint.x+=e.key==='ArrowLeft'?-.12:e.key==='ArrowRight'?.12:0;this.keyPoint.y+=e.key==='ArrowUp'?-.12:e.key==='ArrowDown'?.12:0;
      const r=Math.hypot(this.keyPoint.x,this.keyPoint.y);if(r>.85){this.keyPoint.x*=.85/r;this.keyPoint.y*=.85/r;}this.renderer.cursor={...this.keyPoint};this.paint();
    });
    this.on(this.canvas,'blur',()=>{this.renderer.cursor=null;this.paint();});
    this.on(document,'keydown',e=>{if(!this.active||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target.closest('input,button,a,dialog'))return;if(e.code==='Space'){e.preventDefault();this.togglePause();}if(e.key==='Home'){e.preventDefault();this.reset();}});
    this.on(document,'visibilitychange',()=>{if(document.hidden){this.cancelPointers();this.audio.stop();}this.schedule();});
    this.on(window,'blur',()=>{this.cancelPointers();this.audio.stop();});
    this.resizeObserver=new ResizeObserver(([entry])=>{const {width,height}=entry.contentRect;if(width>0&&height>0){this.renderer.resize(width,height);this.paint();}});this.resizeObserver.observe(this.canvas);
    this.updateUI();this.schedule();
  }
  wake(){this.paused=false;if(!this.frame)this.schedule();this.updateUI();this.paint();}
  cancelPointers(){const ids=[...this.pointers.keys()];this.pointers.clear();this.renderer.cursor=null;for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);}
  togglePause(){this.paused=!this.paused;if(this.paused){this.cancelPointers();this.audio.stop();}this.updateUI();this.schedule();}
  reset(){this.cancelPointers();this.audio.stop();this.audio.reason='';this.sim.reset();this.keyPoint={x:0,y:0};this.accumulator=0;this.updateUI();this.paint();this.schedule();}
  updateUI(signal){
    for(const name of ['sensitivity','persistence']){const value=this.sim[name];this.$('liquid-'+name).value=value;this.$('liquid-'+name+'-value').textContent=value.toFixed(name==='sensitivity'?1:2);this.$('liquid-'+name).style.setProperty('--fill',(name==='sensitivity'?(value-.3)/1.7:value)*100+'%');}
    for(const mode of ['mic','bass','melody']){const button=this.$('liquid-'+mode);button.setAttribute('aria-pressed',this.audio.mode===mode);button.setAttribute('aria-busy',this.audio.mode===mode&&this.audio.pending);}
    const label=this.audio.pending?'等待麥克風或音訊啟動':this.audio.reason||'';this.$('liquid-audio-status').textContent=label;
    this.$('liquid-mute').setAttribute('aria-pressed',this.audio.muted);this.$('liquid-mute').setAttribute('aria-label',this.audio.muted?'開啟示範音聲音':'關閉示範音聲音');this.$('liquid-mute').querySelector('use').setAttribute('href',this.audio.muted?'#i-muted':'#i-sound');
    const level=signal?.level||0;this.$('liquid-level').style.transform=`scaleX(${level})`;this.$('liquid-level').parentElement.setAttribute('aria-valuenow',Math.round(level*100));
    const pause=this.$('pause');pause.setAttribute('aria-pressed',this.paused);pause.setAttribute('aria-label',this.paused?'播放':'暫停');pause.querySelector('use').setAttribute('href',this.paused?'#i-play':'#i-pause');
    this.$('flow-state').textContent=this.paused?'已暫停':this.audio.mode==='mic'?'正在聆聽':this.audio.mode!=='none'?'示範音播放中':'等待聲音';this.$('live-dot').classList.toggle('paused',this.paused);
  }
  paint(){this.renderer.render();}
  setActive(active){this.active=active;if(!active){this.cancelPointers();this.audio.stop();}this.schedule();}
  schedule(){cancelAnimationFrame(this.frame);this.frame=0;this.last=0;this.accumulator=0;if(this.active&&!document.hidden&&!this.paused)this.frame=requestAnimationFrame(this.tick);}
  tick(now){
    if(!this.active||document.hidden||this.paused){this.frame=0;return;}
    if(this.last)this.accumulator+=Math.min((now-this.last)/1000,.05);this.last=now;const signal=this.audio.sample();
    let steps=0;while(this.accumulator>=LIQUID_STEP&&steps<6){this.sim.step(LIQUID_STEP,signal);this.accumulator-=LIQUID_STEP;steps++;}
    this.paint();if(now-this.lastUI>100){this.updateUI(signal);this.lastUI=now;}this.frame=requestAnimationFrame(this.tick);
  }
  dispose(){this.active=false;this.cancelPointers();cancelAnimationFrame(this.frame);this.frame=0;this.audio.dispose();this.resizeObserver?.disconnect();this.renderer.dispose?.();this.abort.abort();this.mounted=false;}
}
