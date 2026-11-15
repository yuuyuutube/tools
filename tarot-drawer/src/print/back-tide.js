// 第三款：潮汐之門。扇貝、珍珠、潮浪與編繩框，各色版獨立套印。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
import { burst } from '../art/kit.js';
export const TIDE_INKS = {
 Y:{rgb:[142,205,185],angle:8,strength:.97},
 O:{rgb:[183,111,79],angle:68,strength:.96},
 B:{rgb:[27,108,120],angle:22,strength:.98},
 N:{rgb:[26,57,62],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const shell='M150 218C138 208 87 186 73 158C64 144 68 130 81 128C77 110 91 101 105 107C109 90 128 88 138 101C145 84 161 84 168 101C183 90 201 98 201 113C218 108 232 120 225 135C241 142 233 161 224 170C200 195 168 209 150 218Z';
const foot='M139 214Q150 207 161 214L165 226Q150 233 135 226Z';
const ribs='M150 214C133 184 95 151 81 130M150 214C139 179 117 127 106 108M150 214C148 174 140 126 138 103M150 214C154 172 164 124 168 103M150 214C166 176 193 134 201 115M150 214C181 178 214 151 224 137';
const stripes=Array.from({length:10},(_,i)=>{
 const x=88+i*13;
 return `M${x} ${143-Math.sin(i/9*Math.PI)*33}Q${(x+150)/2} 167 150 207`;
}).join('');
const waves='M38 204C57 185 30 165 46 149C57 136 61 152 54 158C46 164 41 154 46 150M40 198C48 183 25 172 34 156M262 204C243 185 270 165 254 149C243 136 239 152 246 158C254 164 259 154 254 150M260 198C252 183 275 172 266 156';
const crest='M53 84Q65 70 77 84T101 84M199 84Q211 70 223 84T247 84';
const bubbles=a=>[[53,114,3.5],[246,115,2.5],[47,228,2],[254,228,3],[116,62,2],[186,62,2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`).join('');
const rim='M38 13H262Q287 13 287 38V462Q287 487 262 487H38Q13 487 13 462V38Q13 13 38 13Z';
const inset='M43 28H257V43H272V457H257V472H43V457H28V43H43Z';
const rope=Array.from({length:12},(_,i)=>{
 const y=44+i*16;
 return `M10 ${y}Q23 ${y+7} 10 ${y+14}M290 ${y}Q277 ${y+7} 290 ${y+14}`;
}).join('');
const knot='M42 22Q26 19 25 31Q24 43 37 42Q49 40 42 29Q34 18 28 27M258 22Q274 19 275 31Q276 43 263 42Q251 40 258 29Q266 18 272 27';
const diamond='M150 232Q158 242 168 250Q158 258 150 268Q142 258 132 250Q142 242 150 232Z';
export function tideBackPlates(){
 const Y=twin(p(shell,SOLID)+p(foot,tint(.6)))+p(diamond,SOLID);
 const O=twin(p(ribs,line(2))+p(foot,line(1.4))+`${burst(150,57,13,5,8)} ${SOLID}/>`)+p(inset,line(.9));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
  twin(p(shell,CUT)+p(foot,CUT)+p(waves,cutLine(2.1))+p(crest,cutLine(1.6))+bubbles(cutLine(1.2))+`${burst(150,57,14,5,8)} ${CUT}/>`)+
  p(diamond,CUT)+p(rim,cutLine(2.5))+twin(p(rope,cutLine(.85))+p(knot,cutLine(1.6)))+p(inset,cutLine(1.8));
 const N=twin(p(shell,line(2))+p(foot,line(1.4))+p(stripes,line(.65))+
  p('M139 216L143 224M145 215L147 226M151 215V226M157 216L155 226',line(.8)))+
  p(diamond,line(1.25))+`<circle cx="150" cy="250" r="9" ${CUT}/><circle cx="150" cy="250" r="9" ${line(1.4)}/>`;
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printTideBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(tideBackPlates(),{seed,scale,inks:TIDE_INKS}));
}
