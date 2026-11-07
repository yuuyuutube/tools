import { createLetterpressArt } from './letterpress-art';
import { createTerrainArt } from './terrain-art';
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

export function buildStars(melody: Melody) {
  const weights=melody.events.map(event=>4/event.duration*(event.dotted?1.5:1));
  const total=weights.reduce((a,b)=>a+b,0)||1;
  let time=0;
  return melody.events.flatMap((event,index)=>{
    const step=noteStep(event);const x=62+(time+weights[index]/2)/total*476;time+=weights[index];
    return step===null?[]:[{index,x,y:466-step/35*330,radius:3+Math.sqrt(weights[index])*3,octave:Math.floor(step/12),duration:weights[index],connected:index>0&&melody.events[index-1].type==='note'}];
  });
}
export function createStarArt(melody: Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的聲音星圖',class:'melody-art star-art'});
  svg.append(node('rect',{width:600,height:600,fill:'#202d43'}));
  const orbit=node('g',{fill:'none',stroke:'#bec7cb','stroke-width':.7,opacity:.22});
  for(const radius of [100,180,260,340])orbit.append(node('circle',{cx:300,cy:300,r:radius}));
  orbit.append(node('path',{d:'M40 300H560M300 40V560','stroke-dasharray':'2 8'}));svg.append(orbit);
  const points=buildStars(melody);const palette=['#e9be78','#a8c9cd','#deaaa0'];
  const groups:Element[][]=melody.events.map(()=>[]);
  points.forEach((point,i)=>{
    const previous=points[i-1];
    if(previous&&point.connected)svg.append(node('path',{d:`M${previous.x} ${previous.y}L${point.x} ${point.y}`,fill:'none',stroke:'#aebdcb','stroke-width':1,opacity:.45}));
  });
  points.forEach(point=>{
    const group=node('g',{'data-art-note':point.index,class:'star-note'});
    const color=palette[point.octave];
    if(point.duration>=1)group.append(node('circle',{cx:point.x,cy:point.y,r:point.radius+8,fill:'none',stroke:color,'stroke-width':.8,opacity:.5}));
    group.append(node('circle',{cx:point.x,cy:point.y,r:point.radius,fill:color}));
    group.append(node('path',{d:`M${point.x-2} ${point.y}h4M${point.x} ${point.y-2}v4`,stroke:'#f7f0df','stroke-width':1}));
    svg.append(group);groups[point.index].push(group);
  });
  return {element:svg,position(index:number|null){groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
export type CardArtStyle='weave'|'stars'|'rhythm'|'terrain'|'letterpress';
export function resolveArtStyle(value:string|null,random=Math.random):CardArtStyle {
  const styles:CardArtStyle[]=['weave','stars','rhythm','terrain','letterpress'];
  return value==='random'?styles[Math.min(styles.length-1,Math.max(0,Math.floor(random()*styles.length)))]:value==='stars'||value==='rhythm'||value==='terrain'||value==='letterpress'?value:'weave';
}

export function buildRhythm(melody: Melody) {
  const lengths=melody.events.map(event=>4/event.duration*(event.dotted?1.5:1));
  const total=lengths.reduce((a,b)=>a+b,0)||1;
  const colors=['#cc563d','#355a9d','#dab34f','#315c4f','#b57889'];
  let time=0;
  return melody.events.flatMap((event,index)=>{
    const width=488*lengths[index]/total;const x=56+488*time/total;time+=lengths[index];
    const step=noteStep(event);
    if(step===null)return [];
    const height=100+step/35*250;
    return [{index,x,y:468-height,width:width-Math.min(7,width*.14),height,color:colors[(step+Math.floor(step/12))%5],dotted:event.dotted,beats:lengths[index]}];
  });
}
export function createRhythmArt(melody: Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的節奏構成',class:'melody-art rhythm-art'});
  const paper='#f4eee2';svg.append(node('rect',{width:600,height:600,fill:paper}));
  svg.append(node('path',{d:'M56 64H544M56 484H544',stroke:'#30372f','stroke-width':1,fill:'none'}));
  const groups:Element[][]=melody.events.map(()=>[]);
  buildRhythm(melody).forEach(block=>{
    const group=node('g',{'data-art-note':block.index,class:'rhythm-note'});
    const centre=block.x+block.width/2;
    group.append(node('path',{d:`M${centre} 84V${block.y}`,stroke:'#30372f','stroke-width':.8,opacity:.6}));
    group.append(node('rect',{x:block.x,y:block.y,width:block.width,height:block.height,fill:block.color}));
    if(block.width>24) {
      const radius=Math.min(block.width*.32,block.height*.32,54);
      group.append(node('circle',{cx:centre,cy:block.y+block.height*.52,r:radius,fill:paper}));
      group.append(node('path',{d:`M${block.x} ${block.y+block.height*.52}H${block.x+block.width}`,stroke:block.color,'stroke-width':Math.min(9,block.height*.05)}));
    }
    group.append(node('rect',{x:block.x,y:506,width:block.width,height:Math.min(28,7+block.beats*7),fill:'#30372f'}));
    if(block.dotted)group.append(node('circle',{cx:centre,cy:552,r:3,fill:block.color}));
    svg.append(group);groups[block.index].push(group);
  });
  return {element:svg,position(index:number|null){groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
export function createCardArt(melody:Melody,style:CardArtStyle) {
  return style==='letterpress'?createLetterpressArt(melody):style==='terrain'?createTerrainArt(melody):style==='stars'?createStarArt(melody):style==='rhythm'?createRhythmArt(melody):createMelodyArt(melody);
}
