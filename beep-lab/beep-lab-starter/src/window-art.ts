import type { Melody } from './music-core/model';
import { noteStep } from './music-core/studio';
export function buildWindows(melody:Melody) {
  if(!melody.events.length)return [];
  const columns=Math.min(3,Math.ceil(melody.events.length/6));
  const count=Math.ceil(melody.events.length/columns);
  const width=(448-(columns-1)*18)/columns;
  const palette=['#98ada2','#d8b16a','#8daebc','#cf9d92','#b0a0b2','#a6b38d','#6f999a'];
  return Array.from({length:columns},(_,column)=>{
    const start=column*count,events=melody.events.slice(start,start+count);
    const x=76+column*(width+18),y=columns===3&&column!==1?104:72,height=520-y;
    const weights=events.map(event=>4/event.duration*(event.dotted?1.5:1));const total=weights.reduce((a,b)=>a+b,0)||1;let time=0;
    const panes=events.map((event,i)=>{
      const step=noteStep(event);const top=y+height*time/total;const paneHeight=height*weights[i]/total;time+=weights[i];
      return {index:start+i,x,y:top,width,height:paneHeight,color:step===null?'#f1eee2':palette[step%palette.length],rest:step===null,dotted:event.dotted};
    });
    return {x,y,width,height,panes};
  });
}
let windowInstance=0;
export function createWindowArt(melody:Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的聲音窗景',class:'melody-art window-art'});
  svg.append(node('rect',{width:600,height:600,fill:'#f4f0e6'}));
  const defs=node('defs',{});svg.append(defs);const instance=++windowInstance;
  const groups:Element[][]=melody.events.map(()=>[]);
  buildWindows(melody).forEach((window,column)=>{
    const {x,y,width:w,height:h}=window;const bottom=y+h,r=w/2;
    const outline=`M${x} ${bottom}V${y+r}A${r} ${r} 0 0 1 ${x+w} ${y+r}V${bottom}Z`;
    const clip=node('clipPath',{id:`melody-window-${instance}-${column}`});clip.append(node('path',{d:outline}));defs.append(clip);
    svg.append(node('path',{d:outline,fill:'#e6ece5'}));
    const glazing=node('g',{'clip-path':`url(#melody-window-${instance}-${column})`});
    window.panes.forEach(pane=>{
      const group=node('g',{'data-art-note':pane.index,class:'window-note'});
      group.append(node('rect',{x:pane.x,y:pane.y,width:pane.width,height:pane.height,fill:pane.color}));
      // One vertical mullion per pane changes position with the note, like leaded glass.
      if(!pane.rest){
        const split=x+w*(.33+(pane.index%3)*.17);
        group.append(node('path',{d:`M${split} ${pane.y}v${pane.height}`,stroke:'#607473','stroke-width':1.2,opacity:.7}));
        if(pane.dotted)group.append(node('circle',{cx:x+w*.5,cy:pane.y+pane.height*.5,r:Math.min(w*.13,pane.height*.25),fill:'#f6e9bf',opacity:.8}));
      }
      group.append(node('path',{d:`M${x} ${pane.y+pane.height}h${w}`,stroke:'#607473','stroke-width':1.3,opacity:.7}));
      glazing.append(group);groups[pane.index].push(group);
    });
    glazing.append(node('path',{d:`M${x-w*.3} ${y}L${x+w*.35} ${y}L${x+w*1.1} ${bottom}L${x+w*.8} ${bottom}Z`,fill:'#fff7dc',opacity:.22}));
    glazing.append(node('path',{d:`M${x+w*.8} ${y}L${x+w} ${y}L${x+w*.24} ${bottom}L${x+w*.14} ${bottom}Z`,fill:'#fffdf1',opacity:.16}));
    svg.append(glazing);
    svg.append(node('path',{d:outline,fill:'none',stroke:'#657b78','stroke-width':2}));
    svg.append(node('path',{d:`M${x-5} ${bottom+7}h${w+10}`,stroke:'#9dada2','stroke-width':2}));
  });
  return {element:svg,position(index:number|null){groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
