import { MirrorGeometry, MIRROR_STEP, clamp, wrapAngle } from './mirror-geometry.js';
import { MirrorRenderer } from './mirror-renderer.js';

export class FourthDimensionMirror {
  constructor(root) {
    this.root=root; this.model=new MirrorGeometry(); this.canvas=root.querySelector('#mirror-canvas');
    this.renderer=new MirrorRenderer(this.canvas,this.model); this.abort=new AbortController();
    this.reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.paused=this.reducedMotion;this.active=true;this.frame=0;this.last=0;this.accumulator=0;this.lastUI=0;
    this.pointers=new Map();this.gesture=null;this.tick=this.tick.bind(this);
  }
  $(id) { return this.root.querySelector('#'+id); }
  on(element,type,fn,options={}) { element.addEventListener(type,fn,{...options,signal:this.abort.signal}); }
  mount() {
    this.on(this.$('pause'),'click',()=>this.togglePause());
    this.on(this.$('reset'),'click',()=>this.reset());
    this.on(this.$('mirror-flip'),'click',()=>this.flip());
    for(const mode of ['3d','4d']) this.on(this.$('dimension-'+mode),'click',()=>{
      this.model.mode=mode;this.cancelPointers();this.updateUI();this.paint();
    });
    this.on(this.$('fourth-angle'),'input',()=>{
      this.model.setAngle(Number(this.$('fourth-angle').value)*Math.PI/180);this.pauseForInput();this.updateUI();this.paint();
    });
    this.on(this.$('mirror-depth'),'input',()=>{
      this.model.depth=clamp(Number(this.$('mirror-depth').value),2.7,6);this.pauseForInput();this.updateUI();this.paint();
    });
    this.on(this.canvas,'pointerdown',e=>{
      if(e.button!==0||!this.active||this.pointers.size>=2)return;
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});this.canvas.setPointerCapture(e.pointerId);
      this.gesture=this.gestureState();this.canvas.focus({preventScroll:true});this.pauseForInput();e.preventDefault();
    });
    this.on(this.canvas,'pointermove',e=>{
      if(!this.pointers.has(e.pointerId))return;
      this.pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
      const next=this.gestureState(),previous=this.gesture;
      if(previous&&next.count===previous.count) {
        if(next.count===2) {
          this.model.rotate((next.x-previous.x)*.008,(next.y-previous.y)*.008);
          this.model.twist(wrapAngle(next.angle-previous.angle));
          if(previous.span>20&&next.span>20)this.model.depth=clamp(this.model.depth*previous.span/next.span,2.7,6);
        } else if(e.shiftKey) this.model.twist((next.x-previous.x-next.y+previous.y)*.008);
        else this.model.rotate((next.x-previous.x)*.008,(next.y-previous.y)*.008);
      }
      this.gesture=next;this.updateUI();this.paint();
    });
    for(const event of ['pointerup','pointercancel','lostpointercapture'])this.on(this.canvas,event,e=>{
      this.pointers.delete(e.pointerId);this.gesture=this.gestureState();
    });
    this.on(this.canvas,'wheel',e=>{
      if(!this.active||e.ctrlKey||e.metaKey)return;
      e.preventDefault();this.model.depth=clamp(this.model.depth+e.deltaY*.003,2.7,6);
      this.pauseForInput();this.updateUI();this.paint();
    },{passive:false});
    this.on(this.canvas,'keydown',e=>{
      if(['BracketLeft','BracketRight'].includes(e.code)) {
        e.preventDefault();this.model.twist((e.code==='BracketLeft'?-1:1)*Math.PI/36);this.pauseForInput();this.paint();return;
      }
      if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;
      e.preventDefault();const amount=(e.shiftKey?15:5)*Math.PI/180;
      const dx=e.key==='ArrowLeft'?-amount:e.key==='ArrowRight'?amount:0;
      const dy=e.key==='ArrowUp'?-amount:e.key==='ArrowDown'?amount:0;
      this.model.rotate(dx,dy);this.pauseForInput();this.updateUI();this.paint();
    });
    this.on(document,'keydown',e=>{
      if(!this.active||e.repeat||e.altKey||e.metaKey||e.ctrlKey||e.target.closest('input,button,a,dialog'))return;
      if(e.code==='Space'){e.preventDefault();this.togglePause();}
      if(e.key.toLowerCase()==='f'){e.preventDefault();this.flip();}
      if(e.key==='Home'){e.preventDefault();this.reset();}
    });
    this.on(document,'visibilitychange',()=>{if(document.hidden)this.cancelPointers();this.schedule();});
    this.on(window,'blur',()=>this.cancelPointers());
    this.resizeObserver=new ResizeObserver(([entry])=>{
      const {width,height}=entry.contentRect;
      if(width>0&&height>0){this.renderer.resize(width,height);this.paint();}
    });
    this.resizeObserver.observe(this.canvas);this.updateUI();this.schedule();
  }
  gestureState() {
    const points=[...this.pointers.values()];
    if(!points.length)return null;
    if(points.length===1)return {...points[0],count:1};
    const [a,b]=points;return {x:(a.x+b.x)/2,y:(a.y+b.y)/2,span:Math.hypot(a.x-b.x,a.y-b.y),angle:Math.atan2(b.y-a.y,b.x-a.x),count:2};
  }
  cancelPointers() {
    const ids=[...this.pointers.keys()];this.pointers.clear();this.gesture=null;
    for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);
  }
  pauseForInput() { this.paused=true;this.model.transition=null;this.schedule();this.updateUI(); }
  flip() { this.cancelPointers();this.paused=true;this.model.flip(!this.reducedMotion);this.updateUI();this.paint();this.schedule(); }
  togglePause() {
    this.paused=!this.paused;if(this.paused)this.model.transition=null;this.updateUI();this.schedule();
  }
  reset() {
    this.cancelPointers();this.model.reset();this.last=0;this.accumulator=0;
    this.updateUI();this.paint();this.schedule();this.announce('鏡子已重置');
  }
  updateUI() {
    const degrees=Math.round(this.model.angles.xw*180/Math.PI);
    this.$('fourth-angle').value=degrees;this.$('fourth-angle-value').textContent=(degrees<0?'−'+Math.abs(degrees):degrees)+'°';
    this.$('fourth-angle').style.setProperty('--fill',(degrees+180)/3.6+'%');
    this.$('mirror-depth').value=this.model.depth;this.$('mirror-depth-value').textContent=this.model.depth.toFixed(2);
    this.$('mirror-depth').style.setProperty('--fill',(this.model.depth-2.7)/3.3*100+'%');
    for(const mode of ['3d','4d'])this.$('dimension-'+mode).setAttribute('aria-pressed',this.model.mode===mode);
    this.$('mirror-hint').textContent=this.model.mode==='4d'?'拖曳，看看鏡中的自己':'拖曳，轉個視角';
    const pause=this.$('pause');pause.setAttribute('aria-pressed',this.paused);pause.setAttribute('aria-label',this.paused?'播放':'暫停');
    pause.querySelector('use').setAttribute('href',this.paused?'#i-play':'#i-pause');
    this.$('flow-state').textContent=this.model.transition?'內外翻轉':this.paused?'已暫停':this.model.mode==='4d'?'四維旋轉':'三維視角';
    this.$('live-dot').classList.toggle('paused',this.paused&&!this.model.transition);
  }
  announce(text) {
    clearTimeout(this.statusTimer);this.$('status').textContent=text;
    this.statusTimer=setTimeout(()=>{this.$('status').textContent='';},1800);
  }
  setActive(active) {
    this.active=active;if(!active){this.cancelPointers();this.model.transition=null;this.updateUI();}this.schedule();
  }
  paint() { if(this.renderer.width)this.renderer.render(); }
  schedule() {
    cancelAnimationFrame(this.frame);this.frame=0;this.last=0;this.accumulator=0;
    if(this.active&&!document.hidden&&(!this.paused||this.model.transition))this.frame=requestAnimationFrame(this.tick);
  }
  tick(now) {
    if(!this.active||document.hidden||(this.paused&&!this.model.transition)){this.frame=0;return;}
    if(this.last)this.accumulator+=Math.min((now-this.last)/1000,.05);this.last=now;
    let steps=0;while(this.accumulator>=MIRROR_STEP&&steps<6){this.model.step(MIRROR_STEP,!this.paused);this.accumulator-=MIRROR_STEP;steps++;}
    this.paint();if(now-this.lastUI>80){this.updateUI();this.lastUI=now;}
    if(this.paused&&!this.model.transition){this.frame=0;this.updateUI();return;}
    this.frame=requestAnimationFrame(this.tick);
  }
  dispose() {
    this.active=false;this.cancelPointers();this.model.transition=null;cancelAnimationFrame(this.frame);this.frame=0;
    clearTimeout(this.statusTimer);this.resizeObserver?.disconnect();this.abort.abort();
  }
}
