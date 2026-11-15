// 第四款：石榴秘園。酒紅底、杏桃果實、橄欖綠葉與花形宮廷框。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const POMEGRANATE_INKS={
 Y:{rgb:[237,187,146],angle:8,strength:.97},
 O:{rgb:[121,139,70],angle:68,strength:.97},
 B:{rgb:[135,48,67],angle:22,strength:.98},
 N:{rgb:[68,36,45],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const fruit='M133 117C107 103 76 124 79 157C81 185 109 208 150 220C191 208 219 185 221 157C224 124 193 103 167 117Q150 124 133 117Z';
const crown='M137 119L131 98L143 104L150 91L157 104L169 98L163 119Z';
const flesh='M149 133C132 119 100 125 96 150C92 176 120 197 150 207C180 197 208 176 204 150C200 125 168 119 151 133Z';
const stem='M44 223C27 179 52 143 41 111C34 89 55 59 96 51M256 223C273 179 248 143 259 111C266 89 245 59 204 51';
const leaves='M43 146C22 135 19 120 25 108C42 114 50 129 43 146ZM46 113C51 93 69 85 80 91C73 108 60 116 46 113ZM56 77C51 60 58 44 71 40C81 57 73 73 56 77ZM82 58C84 39 101 34 113 39C106 55 96 62 82 58ZM257 146C278 135 281 120 275 108C258 114 250 129 257 146ZM254 113C249 93 231 85 220 91C227 108 240 116 254 113ZM244 77C249 60 242 44 229 40C219 57 227 73 244 77ZM218 58C216 39 199 34 187 39C194 55 204 62 218 58Z';
const veins='M28 115L41 139M72 96L50 109M69 48L58 71M105 42L87 53M272 115L259 139M228 96L250 109M231 48L242 71M195 42L213 53';
const seedPositions=[[113,145],[130,140],[150,147],[170,140],[187,145],[110,161],[129,158],[149,165],[171,158],[190,161],[121,177],[139,182],[160,182],[179,177],[150,196]];
const seeds=a=>seedPositions.map(([x,y])=>p(`M${x} ${y-4}q-7 3 -3 8q4 4 7-1q3-5-4-7Z`,a)).join('');
const frame='M14 250V66Q14 48 29 44Q22 24 43 24H111Q131 24 150 7Q169 24 189 24H257Q278 24 271 44Q286 48 286 66V250';
const inset='M23 234V70Q23 56 40 50Q32 34 48 34H112Q134 34 150 19Q166 34 188 34H252Q268 34 260 50Q277 56 277 70V234';
const curls='M40 227C63 222 60 201 48 206C39 211 48 222 56 216M260 227C237 222 240 201 252 206C261 211 252 222 244 216';
const petals=a=>Array.from({length:6},(_,i)=>`<g transform="rotate(${i*60} 150 250)">${p('M150 250C135 242 140 230 150 228C160 230 165 242 150 250Z',a)}</g>`).join('');
const finial='M150 69Q127 57 133 42Q147 44 150 55Q153 44 167 42Q173 57 150 69ZM150 55Q139 42 150 32Q161 42 150 55Z';
export function pomegranateBackPlates(){
 const Y=twin(p(fruit,SOLID)+p(crown,SOLID)+p(finial,SOLID)+p(frame,line(1.5))+p(inset,line(.8))+p(curls,line(1.3)))+petals(SOLID);
 const O=twin(p(leaves,SOLID)+p(stem,line(2.8)));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
 twin(p(fruit,CUT)+p(crown,CUT)+p(leaves,CUT)+p(stem,cutLine(3.6))+p(finial,CUT)+p(frame,cutLine(2.4))+p(inset,cutLine(1.5))+p(curls,cutLine(2)))+
 petals(CUT)+twin(seeds(SOLID)+p('M150 134V201M102 166Q125 167 140 181M198 166Q175 167 160 181',line(1.3)));
 const N=twin(p(fruit,line(2))+p(crown,line(1.4))+p(flesh,line(1.1))+p(leaves,line(1.1))+p(veins,line(.8))+p(stem,line(1))+seeds(line(.65))+
 p('M89 151C88 174 110 194 131 201M211 151C212 174 190 194 169 201M137 114L140 109M150 114V106M163 114L160 109',line(.8)))+
 petals(line(1))+`<circle cx="150" cy="250" r="4" ${SOLID}/>`;
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printPomegranateBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(pomegranateBackPlates(),{seed,scale,inks:POMEGRANATE_INKS}));
}
