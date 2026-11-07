import type { Melody } from './music-core/model';
import { noteStep } from './music-core/studio';
export function buildTerrain(melody:Melody) {
  const durations=melody.events.map(event=>4/event.duration*(event.dotted?1.5:1));
  const total=durations.reduce((a,b)=>a+b,0)||1;
  let time=0;
  return melody.events.map((event,index)=>{
    const step=noteStep(event);const x=44+512*time/total;const width=512*durations[index]/total;time+=durations[index];
    return {index,x,width,y:step===null?null:218-step*3.1};
  });
}
export function createTerrainArt(melody:Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的聲音地形',class:'melody-art terrain-art'});
  svg.append(node('rect',{width:600,height:600,fill:'#f3eee4'}));
  const segments=buildTerrain(melody);
  const phrases:typeof segments[]=[];
  segments.forEach(segment=>{
    if(segment.y===null)return;
    if(segment.index===0||segments[segment.index-1].y===null)phrases.push([]);
    phrases.at(-1)!.push(segment);
  });
  const palette=['#a6bcc3','#b9c6b6','#d0aea3','#8fa28b','#4e716c'];
  const highlights:Element[][]=melody.events.map(()=>[]);
  function ridge(segment:typeof segments[number],layer:number) {
    const y=segment.y!+layer*44;
    const previous=segments[segment.index-1];const next=segments[segment.index+1];
    const start=previous?.y!=null?(previous.y+segment.y!)/2+layer*44:y+22;
    const end=next?.y!=null?(next.y+segment.y!)/2+layer*44:y+22;
    const x=segment.x,w=segment.width;
    return {start,end,d:`C${x+w*.12} ${start} ${x+w*.12} ${y} ${x+w*.28} ${y}H${x+w*.72}C${x+w*.88} ${y} ${x+w*.88} ${end} ${x+w} ${end}`};
  }
  palette.forEach((color,layer)=>{
    const group=node('g',{});
    phrases.forEach(phrase=>{
      const first=phrase[0],last=phrase.at(-1)!;
      const path=`M${first.x} ${ridge(first,layer).start}`+phrase.map(segment=>ridge(segment,layer).d).join('');
      group.append(node('path',{d:`${path}L${last.x+last.width} 520H${first.x}Z`,fill:color}));
      group.append(node('path',{d:path,fill:'none',stroke:'#f8f3e9','stroke-width':1.1,opacity:.75}));
      for(const offset of [11,22])group.append(node('path',{d:path,transform:`translate(0 ${offset})`,fill:'none',stroke:'#f8f3e9','stroke-width':.7,opacity:.28}));
    });
    svg.append(group);
  });
  // Playback follows the note's ridge segments rather than illuminating a full mountain.
  segments.forEach(segment=>{
    if(segment.y===null)return;
    const group=node('g',{class:'terrain-note','data-art-note':segment.index});
    palette.forEach((_,layer)=>group.append(node('path',{d:`M${segment.x} ${ridge(segment,layer).start}${ridge(segment,layer).d}`,fill:'none',stroke:'#fff8df','stroke-width':2.5,'stroke-linecap':'round'})));
    svg.append(group);highlights[segment.index].push(group);
  });
  return {element:svg,position(index:number|null){highlights.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
