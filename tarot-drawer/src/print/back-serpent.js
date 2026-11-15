// 第五款：黑金蛇環。盤蛇、晶石與扇形幾何框，霧金覆在炭黑紙面。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const SERPENT_INKS={
 Y:{rgb:[213,179,101],angle:8,strength:.98},
 O:{rgb:[147,167,151],angle:68,strength:.97},
 B:{rgb:[45,49,53],angle:22,strength:.99},
 N:{rgb:[23,28,30],angle:45,strength:.98},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const snake='M204 125C231 95 199 68 156 77C116 85 92 136 116 157C135 174 167 165 180 188C194 212 163 229 141 212';
const tail='M149 214C133 211 125 194 135 187C141 182 149 185 153 190C142 186 139 193 143 199C146 204 154 206 157 208Z';
const head='M208 113C214 118 215 126 208 132L195 141C190 144 185 139 188 135L195 122C198 116 203 112 208 113Z';
const gem='M150 218L173 250L150 282L127 250Z';
const frame='M14 250V54L54 14H246L286 54V250';
const inset='M25 235V59L59 25H241L275 59V235';
const fans=a=>twin(p('M34 96V61L61 34H99M34 82L82 34M34 69L69 34M37 58L58 37M266 96V61L239 34H201M266 82L218 34M266 69L231 34M263 58L242 37',a));
const sideDiamond='M35 219L48 250L35 281L22 250ZM265 219L278 250L265 281L252 250Z';
const crown='M150 36L165 55L150 65L135 55ZM122 51L150 22L178 51M130 57L150 76L170 57';
const rays=Array.from({length:9},(_,i)=>{
 const a=(-158+i*17)*Math.PI/180;
 return `M${150+40*Math.cos(a)} ${250+40*Math.sin(a)}L${150+51*Math.cos(a)} ${250+51*Math.sin(a)}`;
}).join('');
// 沿身體曲線的法線刻鱗，避免刻線落到蛇身之外。
const bodyCurves=[
 [[204,125],[231,95],[199,68],[156,77]],
 [[156,77],[116,85],[92,136],[116,157]],
 [[116,157],[135,174],[167,165],[180,188]],
 [[180,188],[194,212],[163,229],[141,212]],
];
const scales=bodyCurves.map(([a,b,c,d])=>[.15,.34,.53,.72,.91].map(t=>{
 const u=1-t;
 const x=u*u*u*a[0]+3*u*u*t*b[0]+3*u*t*t*c[0]+t*t*t*d[0];
 const y=u*u*u*a[1]+3*u*u*t*b[1]+3*u*t*t*c[1]+t*t*t*d[1];
 const dx=3*u*u*(b[0]-a[0])+6*u*t*(c[0]-b[0])+3*t*t*(d[0]-c[0]);
 const dy=3*u*u*(b[1]-a[1])+6*u*t*(c[1]-b[1])+3*t*t*(d[1]-c[1]);
 const len=Math.hypot(dx,dy),nx=-dy/len*5,ny=dx/len*5;
 return `M${x+nx} ${y+ny}Q${x+dx/len*3} ${y+dy/len*3} ${x-nx} ${y-ny}`;
}).join('')).join('');
const beads=a=>twin([91,110,190,209].map(x=>`<circle cx="${x}" cy="39" r="1.5" ${a}/>`).join('')+p('M58 182V211M66 188V207M242 182V211M234 188V207',a));
const snakeArt=(stroke,fill)=>twin(p(snake,stroke)+p(tail,fill)+p(head,fill));
export function serpentBackPlates(){
 const Y=snakeArt(line(17),SOLID)+twin(p(frame,line(1.8))+p(inset,line(.8))+p(crown,line(1.4))+p(rays,line(1.1)))+fans(line(1.1))+p(sideDiamond,line(1.2))+beads(SOLID);
 const O=p(gem,SOLID)+twin(p('M35 234L41 250L35 266L29 250Z',SOLID));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
  snakeArt(cutLine(19),CUT)+p(gem,CUT)+
  twin(p(frame,cutLine(2.6))+p(inset,cutLine(1.5))+p(crown,cutLine(2))+p(rays,cutLine(1.8)))+fans(cutLine(1.8))+p(sideDiamond,cutLine(1.9))+beads(CUT)+twin(p('M35 234L41 250L35 266L29 250Z',CUT));
 const N=twin(p(snake,line(19))+p(tail,line(1.2))+p(head,line(1.4)))+
  // Hollow out the dark body stroke, retaining only its outer contour.
  snakeArt(cutLine(16),CUT)+twin(p(scales,line(.75))+
  p('M197 130L201 128',line(1.6))+p('M189 139L180 146M183 143L179 141',line(.85)))+
  p(gem,line(1.6))+p('M150 218L144 250L150 282L156 250ZM127 250H173',line(.85));
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printSerpentBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(serpentBackPlates(),{seed,scale,inks:SERPENT_INKS}));
}
