import type { Melody } from './music-core/model';
import { noteStep } from './music-core/studio';
export const weavePalettes = [
  {paper:'#f5efe3',thread:'#b5a78c',colors:['#264c49','#c35e45','#d5ad56','#547598','#d9a398']},
  {paper:'#f2eee5',thread:'#b0a99c',colors:['#354d9b','#dc795e','#829a86','#d8bb69','#78576c']},
  {paper:'#f3ecdf',thread:'#b3a58e',colors:['#365849','#ce7748','#86a4b1','#af7589','#d0ae59']},
  {paper:'#f5eee8',thread:'#b8a899',colors:['#654b73','#b95848','#d4ac64','#537b7b','#d8a7a0']},
] as const;
export function buildWeave(melody: Melody) {
  const signature=JSON.stringify([melody.tempoBpm,melody.events.map(event=>[noteStep(event),event.duration,event.dotted])]);
  let seed=2166136261;
  for(let i=0;i<signature.length;i++)seed=Math.imul(seed^signature.charCodeAt(i),16777619)>>>0;
  const palette=weavePalettes[seed%weavePalettes.length];
  const lengths=melody.events.map(event=>4/event.duration*(event.dotted?1.5:1));
  const total=lengths.reduce((a,b)=>a+b,0)||1;
  const tiles:{index:number;x:number;y:number;width:number;height:number;color:string;notch:boolean}[]=[];
  for(let row=0;row<6;row++) {
    let time=0;
    melody.events.forEach((event,index)=>{
      const width=504*lengths[index]/total;
      const step=noteStep(event);
      if(step!==null) {
        const height=30+Math.floor(step/12)*8;
        tiles.push({index,x:48+(row%2?504-504*time/total-width:504*time/total),y:74+row*88-(step%12-5.5)*1.5-height/2,
          width:Math.max(.15,width-Math.min(4,width*.12)),height,color:palette.colors[(step+row%3)%palette.colors.length],notch:width>34});
      }
      time+=lengths[index];
    });
  }
  return {palette,spacing:20-Math.floor((melody.tempoBpm-40)/25),tiles};
}
export function createMelodyArt(melody: Melody) {
  const art=buildWeave(melody);
  const ns='http://www.w3.org/2000/svg';
  function element<K extends keyof SVGElementTagNameMap>(tag:K,attributes:Record<string,string|number>) {
    const node=document.createElementNS(ns,tag);
    for(const [key,value] of Object.entries(attributes))node.setAttribute(key,String(value));
    return node;
  }
  const svg=element('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的幾何織紋',class:'melody-art'});
  svg.append(element('rect',{width:600,height:600,fill:art.palette.paper}));
  const threads=element('g',{stroke:art.palette.thread,'stroke-width':.65,opacity:.36});
  for(let x=48;x<=552;x+=art.spacing)threads.append(element('path',{d:`M${x} 42V558`}));
  svg.append(threads);
  const groups=melody.events.map(()=>[] as SVGGElement[]);
  art.tiles.forEach(tile=>{
    const group=element('g',{'data-art-note':tile.index,class:'weave-note'});
    group.append(element('rect',{x:tile.x,y:tile.y,width:tile.width,height:tile.height,rx:Math.min(tile.height/2,tile.width/2),fill:tile.color}));
    if(tile.notch)group.append(element('circle',{cx:tile.x+tile.width/2,cy:tile.y+tile.height/2,r:tile.height*.16,fill:art.palette.paper}));
    svg.append(group);groups[tile.index].push(group);
  });
  // A quiet overprint ties the horizontal ribbons into vertical warp threads.
  const overprint=threads.cloneNode(true) as SVGGElement;overprint.setAttribute('opacity','.12');svg.append(overprint);
  return {element:svg,position(index:number|null) {groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
