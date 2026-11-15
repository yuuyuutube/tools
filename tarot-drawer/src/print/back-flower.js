// 第八款：月白花窗。單朵放射花冠為主體，暖白紙地與花瓣式窗框。
import { SOLID, CUT, tint, line, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const FLOWER_INKS={
 Y:{rgb:[232,174,166],angle:8,strength:.97},
 O:{rgb:[106,143,111],angle:68,strength:.97},
 B:{rgb:[121,112,177],angle:22,strength:.97},
 N:{rgb:[69,57,88],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const radial=(n,rot,art)=>Array.from({length:n},(_,i)=>`<g transform="rotate(${i*360/n+rot} 150 250)">${art}</g>`).join('');
const petal='M150 240C128 226 128 193 150 163C172 193 172 226 150 240Z';
const innerPetal='M150 248C130 238 135 214 150 199C165 214 170 238 150 248Z';
const outerLine='M150 237C142 215 145 189 150 173';
const vine='M150 160C124 143 132 124 150 108C168 124 176 143 150 160ZM150 108V63M150 99Q130 77 111 81M150 99Q170 77 189 81';
const leaves='M150 146C129 143 119 128 124 118C145 119 153 132 150 146ZM150 146C171 143 181 128 176 118C155 119 147 132 150 146ZM135 88C120 90 104 81 103 68C122 66 135 76 135 88ZM165 88C180 90 196 81 197 68C178 66 165 76 165 88Z';
const frame='M14 250V62Q14 39 37 39Q38 17 62 17H110Q130 17 150 5Q170 17 190 17H238Q262 17 263 39Q286 39 286 62V250';
const inset='M24 236V67Q24 49 48 49Q48 27 68 27H111Q132 27 150 16Q168 27 189 27H232Q252 27 252 49Q276 49 276 67V236';
const sideLeaves='M37 196C29 180 34 167 47 164C55 178 49 191 37 196ZM263 196C271 180 266 167 253 164C245 178 251 191 263 196Z';
const corner='M40 88V69Q40 57 55 57Q67 57 65 46M260 88V69Q260 57 245 57Q233 57 235 46';
const pendant='M150 54C138 46 140 32 150 27C160 32 162 46 150 54Z';
export function flowerBackPlates(){
 const Y=radial(12,15,p(petal,tint(.55)))+radial(8,0,p(innerPetal,SOLID))+twin(p(pendant,SOLID));
 const O=twin(p(vine,line(1.4))+p(leaves,SOLID)+p(sideLeaves,tint(.75)));
 const B=radial(12,0,p(petal,tint(.65)))+radial(8,0,p(innerPetal,CUT))+
 twin(p(frame,line(2.1))+p(inset,line(.9))+p(corner,line(1.2))+p(pendant,line(1.1)))+
 `<circle cx="150" cy="250" r="16" ${SOLID}/>`;
 const N=radial(12,0,p(petal,line(1.15))+p(outerLine,line(.65)))+
 radial(8,0,p(innerPetal,line(.9)))+
 twin(p('M127 122L145 140M173 122L155 140M109 72L131 85M191 72L169 85M43 170L38 188M257 170L262 188',line(.65)))+
 radial(12,0,`<circle cx="150" cy="239" r="1.1" ${SOLID}/>`)+
 `<circle cx="150" cy="250" r="16" ${line(1.3)}/><circle cx="150" cy="250" r="5" ${SOLID}/>`;
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printFlowerBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(flowerBackPlates(),{seed,scale,inks:FLOWER_INKS}));
}
