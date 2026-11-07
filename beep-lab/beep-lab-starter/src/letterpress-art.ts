import { pitches, type Melody } from './music-core/model';
export function buildLetterpress(melody:Melody) {
  const lengths=melody.events.map(event=>4/event.duration*(event.dotted?1.5:1));
  const total=lengths.reduce((a,b)=>a+b,0)||1;
  const rows=Math.min(6,Math.max(1,Math.ceil(Math.sqrt(melody.events.length/1.5))));
  const height=488/rows;let time=0;
  return melody.events.flatMap((event,index)=>{
    const midpoint=(time+lengths[index]/2)/total*rows;time+=lengths[index];
    if(event.type==='rest')return [];
    const size=Math.min(82,height*.66,488*lengths[index]/total*rows*.66);
    const x=Math.max(56+size/2,Math.min(544-size/2,56+(midpoint%1)*488));
    return [{index,x,y:56+(Math.min(rows-1,Math.floor(midpoint))+.5)*height,size,
      glyph:pitches.indexOf(event.pitch),rotation:(event.octave-1)*90+(event.sharp?8:0),dotted:event.dotted}];
  });
}
const glyphs=[
  'M-38 36V0a38 38 0 0 1 76 0v36H18V0a18 18 0 0 0-36 0v36Z',
  'M-36-38h23v76h-23ZM13-38h23v76H13Z',
  'M0-38a38 38 0 1 1 0 76 38 38 0 1 1 0-76ZM0-17a17 17 0 1 0 0 34 17 17 0 1 0 0-34Z',
  'M-38 38V-38h76Z',
  'M-38-36h76v17h-76ZM-38-8h76V9h-76ZM-38 20h76v17h-76Z',
  'M-38-38h76v76A76 76 0 0 1-38-38Z',
  'M-12-38h24v26h26v24H12v26h-24V12h-26v-24h26Z',
];
export function createLetterpressArt(melody:Melody) {
  const ns='http://www.w3.org/2000/svg';
  function node(tag:string,attrs:Record<string,string|number>) {const element=document.createElementNS(ns,tag);for(const[key,value]of Object.entries(attrs))element.setAttribute(key,String(value));return element;}
  const svg=node('svg',{viewBox:'0 0 600 600',role:'img','aria-label':'根據這首旋律生成的旋律活版',class:'melody-art letterpress-art'});
  const paper='#f3eadb';svg.append(node('rect',{width:600,height:600,fill:paper}));
  // Fine paper flecks are fixed geometry, so prints remain identical across devices.
  const grain=node('g',{fill:'#84765e',opacity:.13,'aria-hidden':'true'});
  for(let i=0;i<180;i++){const x=24+(i*137%552),y=24+(i*83%552);grain.append(node('circle',{cx:x,cy:y,r:i%3===0?.65:.35}));}
  svg.append(grain);
  const palette=['#b85945','#3c7e7a','#c4a34d','#566b9b','#af7584','#3f6b54','#bd7741'];
  const groups:Element[][]=melody.events.map(()=>[]);
  buildLetterpress(melody).forEach(stamp=>{
    const group=node('g',{'data-art-note':stamp.index,class:'letterpress-note',transform:`translate(${stamp.x} ${stamp.y}) rotate(${stamp.rotation}) scale(${stamp.size/80})`});
    group.append(node('path',{d:glyphs[stamp.glyph],fill:palette[stamp.glyph],opacity:.88,'fill-rule':'evenodd',class:'ink-plate'}));
    group.append(node('path',{d:glyphs[stamp.glyph],fill:palette[(stamp.glyph+2)%7],opacity:.4,transform:'translate(3 -3)','fill-rule':'evenodd',class:'ink-plate'}));
    if(stamp.dotted)group.append(node('circle',{cx:23,cy:24,r:12,fill:'#c65d45',opacity:.65,class:'ink-plate'}));
    svg.append(group);groups[stamp.index].push(group);
  });
  return {element:svg,position(index:number|null){groups.forEach((items,i)=>items.forEach(group=>group.classList.toggle('art-playing',i===index)));}};
}
