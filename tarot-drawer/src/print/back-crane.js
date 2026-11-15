// 第七款：朱砂雙鶴。米白羽翼、松綠枝葉與雲紋框。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const CRANE_INKS={
 Y:{rgb:[241,221,180],angle:8,strength:.97},
 O:{rgb:[92,137,120],angle:68,strength:.98},
 B:{rgb:[191,70,54],angle:22,strength:.98},
 N:{rgb:[53,49,48],angle:45,strength:.98},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const body='M117 162C137 140 175 143 191 159C211 176 194 204 167 210C146 215 122 199 107 186L82 176L100 167L85 158Z';
const neck='M180 166C198 144 192 128 172 114C156 103 153 91 160 80C168 67 187 72 188 84C189 95 174 100 166 92C169 104 187 110 198 124C211 140 206 160 195 174Z';
const beak='M163 84L139 90L163 91Z';
const wing='M119 164C140 153 174 153 186 167C177 192 153 202 132 191L108 181L124 178L110 172L126 172Z';
const blackFeathers='M108 181L124 178L110 172L126 172L119 164C128 160 134 158 141 158C140 173 136 185 132 191Z';
const legs='M167 207L174 219L151 227M158 208L162 219L142 225M151 227L139 227M151 227L143 231M142 225L132 223';
const branch='M40 216C54 183 34 155 48 120C57 99 69 92 73 75M260 216C246 183 266 155 252 120C243 99 231 92 227 75';
const leaf='M46 156Q26 143 28 124Q48 132 46 156ZM49 129Q56 110 73 109Q68 130 49 129ZM61 101Q47 88 53 72Q69 83 61 101ZM254 156Q274 143 272 124Q252 132 254 156ZM251 129Q244 110 227 109Q232 130 251 129ZM239 101Q253 88 247 72Q231 83 239 101Z';
const veins='M31 131L45 149M66 115L52 126M55 79L61 95M269 131L255 149M234 115L248 126M245 79L239 95';
const cloud='M150 37C135 17 116 20 114 34C98 27 88 38 96 49H52C29 49 26 67 36 77C21 85 22 102 36 108V250M150 37C165 17 184 20 186 34C202 27 212 38 204 49H248C271 49 274 67 264 77C279 85 278 102 264 108V250';
const outer='M150 14H48Q13 14 13 49V250M150 14H252Q287 14 287 49V250';
const curls='M43 67Q40 56 52 56Q66 58 58 69Q52 75 48 67M257 67Q260 56 248 56Q234 58 242 69Q248 75 252 67';
const flower=a=>Array.from({length:5},(_,i)=>`<g transform="rotate(${i*72} 150 250)">${p('M150 250C136 246 135 234 143 231C147 229 150 233 150 235C152 231 158 228 163 234C167 242 158 248 150 250Z',a)}</g>`).join('');
const topCloud='M111 63Q118 50 130 57Q134 45 145 48Q157 49 156 60H181M123 68H170';
export function craneBackPlates(){
 const Y=twin(p(body,SOLID)+p(neck,SOLID)+p(beak,SOLID)+p(cloud,line(1.4))+p(outer,line(.9))+p(curls,line(1.1))+p(topCloud,line(1.2))+p(legs,line(1.5)))+flower(SOLID);
 const O=twin(p(leaf,SOLID)+p(branch,line(2.2))+p(wing,tint(.18)));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
 twin(p(body,CUT)+p(neck,CUT)+p(beak,CUT)+p(leaf,CUT)+p(branch,cutLine(3))+p(cloud,cutLine(2.1))+p(outer,cutLine(1.6))+p(curls,cutLine(1.8))+p(topCloud,cutLine(1.9))+p(legs,cutLine(2.1)))+flower(CUT)+
 twin(p('M160 81Q165 72 174 76L175 81Z',SOLID));
 const N=twin(p(branch,line(.8))+p(leaf,line(1))+p(veins,line(.7))+p(body,line(1.7))+p(wing,line(1.2))+p(blackFeathers,SOLID)+
 p(neck,CUT)+p(neck,line(1.5))+p(beak,line(1))+
 `<circle cx="166" cy="85" r="1.2" ${SOLID}/>`+
 p('M168 95C172 110 191 116 195 131M135 180C155 187 171 176 180 165M141 185C159 187 174 177 183 169M147 190C164 188 178 177 186 172',line(.8)))+
 flower(line(.8))+`<circle cx="150" cy="250" r="3" ${SOLID}/>`;
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printCraneBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(craneBackPlates(),{seed,scale,inks:CRANE_INKS}));
}
