import { pitches, type Melody } from './music-core/model';
import { noteStep } from './music-core/studio';
export function buildSpecimen(melody:Melody) {
  const phrases:number[][]=[];
  melody.events.forEach((event,index)=>{
    if(event.type==='rest')return;
    if(index===0||melody.events[index-1].type==='rest'||phrases.at(-1)!.length===8)phrases.push([]);
    phrases.at(-1)!.push(index);
  });
  const columns=phrases.length<=4?Math.max(1,phrases.length):Math.min(8,Math.ceil(Math.sqrt(phrases.length*1.3)));
  const rows=Math.max(1,Math.ceil(phrases.length/columns));
  const cellWidth=488/columns,cellHeight=488/rows;
  const scale=Math.min(1,cellWidth/150,cellHeight/400);
  return phrases.map((indices,phrase)=>{
    const x=56+(phrase%columns+.5)*cellWidth;
    const y=56+(Math.floor(phrase/columns)+1)*cellHeight-20*scale;
    const weights=indices.map(index=>4/melody.events[index].duration*(melody.events[index].dotted?1.5:1));
    const total=weights.reduce((sum,value)=>sum+value,0);
    const height=(220+Math.min(128,total*16))*scale;
    let elapsed=0;
    const lean=((noteStep(melody.events[indices[0]])??12)%9-4)*2*scale;
    const leaves=indices.map((index,position)=>{
      const event=melody.events[index];if(event.type!=='note')throw new Error('Expected note');
      const step=noteStep(event)!;const t=.075+.85*(elapsed+weights[position]/2)/total;elapsed+=weights[position];const u=1-t;
      const beats=4/event.duration*(event.dotted?1.5:1);
      return {index,x:x+3*u*u*t*12*scale+3*u*t*t*(lean+8*scale)+t*t*t*lean,y:y-height*(3*u*u*t*.32+3*u*t*t*.7+t*t*t),
        angle:(position%2?1:-1)*(48+step%5*4),length:Math.min(86,46+Math.sqrt(beats)*12+event.octave*4),width:13+step%5*2,
        shape:pitches.indexOf(event.pitch),color:['#526d54','#7b9291','#b18178'][event.octave-1],dotted:event.dotted,scale};
    });
    return {x,y,height,lean,scale,leaves};
  });
}
export function createSpecimenArt(melody:Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的音符標本',class:'melody-art specimen-art'});
  svg.append(node('rect',{width:600,height:600,fill:'#f2eee3'}));
  const groups:Element[][]=melody.events.map(()=>[]);
  buildSpecimen(melody).forEach(sprig=>{
    svg.append(node('path',{d:`M${sprig.x} ${sprig.y}C${sprig.x+12*sprig.scale} ${sprig.y-sprig.height*.32} ${sprig.x+sprig.lean+8*sprig.scale} ${sprig.y-sprig.height*.7} ${sprig.x+sprig.lean} ${sprig.y-sprig.height}`,fill:'none',stroke:'#73765e','stroke-width':1.5*sprig.scale,'stroke-linecap':'round'}));
    sprig.leaves.forEach(leaf=>{
      const group=node('g',{class:'specimen-note','data-art-note':leaf.index,transform:`translate(${leaf.x} ${leaf.y}) rotate(${leaf.angle}) scale(${leaf.scale})`});
      const l=leaf.length,w=leaf.width;
      let d=`M0-12C${-w} ${-l*.38} ${-w} ${-l*.76} 0 ${-l}C${w} ${-l*.76} ${w} ${-l*.38} 0-12Z`;
      if(leaf.shape===1||leaf.shape===5)d=`M0-12C${-w*1.5} ${-l*.28} ${-w*1.4} ${-l*.74} 0 ${-l}C${w*1.4} ${-l*.74} ${w*1.5} ${-l*.28} 0-12Z`;
      if(leaf.shape===3||leaf.shape===6)d=`M0-12Q${-w*1.1} ${-l*.22} ${-w*.65} ${-l*.4}Q${-w*1.4} ${-l*.54} ${-w*.5} ${-l*.7}Q${-w*.7} ${-l*.85} 0 ${-l}Q${w*.7} ${-l*.85} ${w*.5} ${-l*.7}Q${w*1.4} ${-l*.54} ${w*.65} ${-l*.4}Q${w*1.1} ${-l*.22} 0-12Z`;
      if(leaf.shape===2||leaf.shape===4)d=`M0-12C${-w*.5} ${-l*.45} ${-w*.6} ${-l*.8} 0 ${-l}C${w*.6} ${-l*.8} ${w*.5} ${-l*.45} 0-12Z`;
      group.append(node('path',{d,fill:leaf.color,opacity:.9}));
      group.append(node('path',{d:`M0 0V${-l+7}`,fill:'none',stroke:'#67745c','stroke-width':1}));
      for(const t of [.35,.5,.65,.8])group.append(node('path',{d:`M0 ${-l*t}l${-w*.55} ${-l*.12}M0 ${-l*t}l${w*.55} ${-l*.12}`,fill:'none',stroke:'#e7e7cf','stroke-width':.65,opacity:.6}));
      if(leaf.dotted)group.append(node('circle',{cx:0,cy:-l-3,r:3,fill:'#bc786c'}));
      svg.append(group);groups[leaf.index].push(group);
    });
    // Unlabelled mounting strip: a quiet herbarium detail, never a text plaque.
    svg.append(node('rect',{x:sprig.x-9*sprig.scale,y:sprig.y-14*sprig.scale,width:18*sprig.scale,height:6*sprig.scale,fill:'#e4dcc4',opacity:.75,transform:`rotate(-6 ${sprig.x} ${sprig.y})`}));
  });
  return {element:svg,position(index:number|null){groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
