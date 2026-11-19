import {WINDOW,WINDOW_BOUNDS} from '../print/sunburst/layout.js';

// Resize the geometry itself around (50%, 100%). Neither the image nor any
// transform/stroke-width is changed. The rounded top corners follow the frame.
export function windowFrameAt(progress,startRatio=.94){
 const p=Math.max(0,Math.min(1,progress)),ratio=startRatio+(1-startRatio)*p;
 const b=WINDOW_BOUNDS,width=b.width*ratio,height=b.height*ratio;
 const centerX=b.x+b.width/2,bottom=b.y+b.height,x=centerX-width/2,y=bottom-height,radius=40*ratio;
 const f=v=>Number(v.toFixed(4));
 const d=p===1?WINDOW:`M${f(x)} ${f(bottom)}V${f(y+radius)}a${f(radius)} ${f(radius)} 0 0 1 ${f(radius)} ${f(-radius)}h${f(width-2*radius)}a${f(radius)} ${f(radius)} 0 0 1 ${f(radius)} ${f(radius)}V${f(bottom)}z`;
 return {x,y,width,height,radius,centerX,bottom,d};
}

export function revealWindow(svg,{delay=0,duration=420,startRatio=.94}={},clock={now:()=>performance.now(),request:cb=>requestAnimationFrame(cb),cancel:id=>cancelAnimationFrame(id)}){
 const outline=svg?.querySelector('[data-card-layer="window"] path');
 const clip=svg?.querySelector('[data-card-clip="illustration"] path');
 if(!outline||!clip)return ()=>{};
 const apply=p=>{const {d}=windowFrameAt(p,startRatio);outline.setAttribute('d',d);clip.setAttribute('d',d);};
 let stopped=false,frame=0;
 const cancel=()=>{stopped=true;clock.cancel(frame);apply(1);};
 if(duration<=0){apply(1);return cancel;}
 apply(0);
 const start=clock.now()+delay;
 const tick=now=>{
  if(stopped)return;
  if(now<start){frame=clock.request(tick);return;}
  const p=Math.min(1,(now-start)/duration),ease=1-Math.pow(1-p,3);
  apply(ease);
  if(p<1)frame=clock.request(tick);
 };
 frame=clock.request(tick);
 return cancel;
}
