// 第九款：翠玉迷宮。八角折線、旋轉鑰匙紋與菱形角飾，純幾何構圖。
import { SOLID, CUT, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const GEOMETRY_INKS={
 Y:{rgb:[163,199,164],angle:8,strength:.97},
 O:{rgb:[209,170,88],angle:68,strength:.98},
 B:{rgb:[32,98,77],angle:22,strength:.99},
 N:{rgb:[21,49,41],angle:45,strength:.98},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const radial=(n,art)=>Array.from({length:n},(_,i)=>`<g transform="rotate(${i*360/n} 150 250)">${art}</g>`).join('');
const oct=r=>Array.from({length:8},(_,i)=>{const t=(22.5+i*45)*Math.PI/180;return `${i?'L':'M'}${150+r*Math.cos(t)} ${250+r*Math.sin(t)}`;}).join('')+'Z';
const keys='M142 224V190H160V206H174';
const star='M150 226L157 243L174 250L157 257L150 274L143 257L126 250L143 243Z';
const diamond='M150 61L180 98L150 135L120 98Z';
const diamondIn='M150 76L167 98L150 120L133 98Z';
const topLines='M92 98L112 78M188 98L168 78M92 98L112 118M188 98L168 118M150 44V52';
const frame='M13 250V45L45 13H255L287 45V250';
const inset='M24 232V50L50 24H250L276 50V232';
const corner='M33 93V56L56 33H95M33 77L77 33M223 33L267 77M205 33H244L267 56V93';
const braid=Array.from({length:10},(_,i)=>{const y=76+i*16;return `M13 ${y}l11 8l-11 8M287 ${y}l-11 8l11 8`;}).join('');
const side='M42 218L57 250L42 282L27 250ZM258 218L273 250L258 282L243 250Z';
const dotSquares='M147 151H153V157H147ZM79 138H85V144H79ZM215 138H221V144H215Z';
export function geometryBackPlates(){
 const Y=p(oct(88),line(2.3))+p(oct(78),line(.8))+radial(8,p(keys,line(3.6)))+
 twin(p(diamond,line(2))+p(topLines,line(1.3))+p(frame,line(1.6))+p(corner,line(1.1))+p(braid,line(.75)))+
 p(side,line(1.3));
 const O=p(star,SOLID)+p(oct(96),line(1))+twin(p(diamondIn,SOLID)+p(inset,line(.8))+p(dotSquares,SOLID));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
 p(oct(88),cutLine(3.2))+p(oct(78),cutLine(1.6))+p(oct(96),cutLine(1.6))+radial(8,p(keys,cutLine(4.6)))+p(star,CUT)+
 twin(p(diamond,cutLine(2.9))+p(diamondIn,CUT)+p(topLines,cutLine(2))+p(frame,cutLine(2.4))+p(inset,cutLine(1.4))+p(corner,cutLine(1.8))+p(braid,cutLine(1.4))+p(dotSquares,CUT))+
 p(side,cutLine(2));
 const N=p(star,line(1.1))+p('M150 234L166 250L150 266L134 250Z',line(.75))+
 twin(p(diamondIn,line(1))+p('M150 83L160 98L150 113L140 98Z',line(.8)))+
 `<circle cx="150" cy="250" r="3" ${SOLID}/>`;
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printGeometryBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(geometryBackPlates(),{seed,scale,inks:GEOMETRY_INKS}));
}
