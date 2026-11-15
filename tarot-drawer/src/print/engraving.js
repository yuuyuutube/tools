// Layered engraving helpers. Every opaque shape knocks out all underlying ink
// plates before receiving its own colours; hatch marks stay inside that shape.
import { SOLID, CUT, tint, line, cutLine, plateSVG, INKS } from './press.js';
import { printFrame } from './frame.js';
export { SOLID, CUT, tint, line, cutLine };
export const P = (d, a) => `<path d="${d}" ${a}/>`;
export const C = (x,y,r,a) => `<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`;
export const E = (x,y,rx,ry,a) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" ${a}/>`;
export const G = (t,s) => `<g transform="${t}">${s}</g>`;
export const symbol = (id,s) => `<g data-symbol="${id}">${s}</g>`;
export const text = (x,y,value,size,a=SOLID) => `<text x="${x}" y="${y}" text-anchor="middle" font-family="Georgia,serif" font-weight="700" font-size="${size}" ${a}>${value}</text>`;
export const hatch = (x,y,dx,dy,n,sx,sy=0,bend=0) => Array.from({length:n},(_,i)=>`M${x+i*sx} ${y+i*sy}q${dx/2+bend} ${dy/2} ${dx} ${dy}`).join('');
export const star = (x,y,r,points=5) => Array.from({length:points*2},(_,i)=>{const a=-Math.PI/2+i*Math.PI/points,s=i%2?r*.42:r;return `${i?'L':'M'}${(x+Math.cos(a)*s).toFixed(2)} ${(y+Math.sin(a)*s).toFixed(2)}`;}).join('')+'Z';
export const palette = (y,o,b,n) => ({Y:{rgb:y,angle:8,strength:.94},O:{rgb:o,angle:68,strength:.94},B:{rgb:b,angle:22,strength:.94},N:{rgb:n,angle:45,strength:.97},FO:INKS.O,FN:{...INKS.N,fixedRegistration:true}});
export function engraving(card) {
  const art={Y:'',O:'',B:'',N:''}; let defs='', serial=0;
  return {
    add(key,s){art[key]+=s;},
    knockout(stencil){for(const key of Object.keys(art))art[key]+=stencil;},
    // Fill map: 1 = solid pigment; intermediate values = screened pigment.
    shape(d,fill={}, {width=2.4,shade='',details='',tag='',transform='',overprint={}}={}) {
      const id=`engrave${serial++}`;
      defs+=`<clipPath id="${id}">${P(d,'')}</clipPath>`;
      for(const key of Object.keys(art)) {
        let s=P(d,CUT);
        if(fill[key]) s+=P(d,fill[key]===1?SOLID:tint(fill[key]));
        if(overprint[key])s+=`<g clip-path="url(#${id})">${overprint[key]}</g>`;
        if(key==='N') s+=`<g clip-path="url(#${id})">${shade}</g>`+(width?P(d,line(width)):'')+details;
        if(transform)s=G(transform,s);
        art[key]+=tag?symbol(tag,s):s;
      }
    },
    finish(){const fr=printFrame(card);return Object.fromEntries([...Object.entries(art).map(([k,v])=>[k,plateSVG({defs,art:v})]),['FO',plateSVG({frame:fr.O})],['FN',plateSVG({frame:fr.N})]]);},
  };
}
// Botanical motifs are deliberately small but retain stems, calyx and seeds.
export function pomegranate(x,y,r,a) {
  return G(`translate(${x} ${y})`,P(`M0 ${-r}C${-r*1.5} ${-r} ${-r*1.4} ${r} 0 ${r}C${r*1.4} ${r} ${r*1.5} ${-r} 0 ${-r}Z`,a)+P(`M-2 ${-r}l-1-3l3 1l3-1l-1 3`,line(.7))+C(-1,0,.7,SOLID)+C(2,1,.7,SOLID));
}
