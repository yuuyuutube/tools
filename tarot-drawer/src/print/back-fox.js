// 第六款：雪境雙狐。霧藍與灰紫套印，白狐、雪晶及尖拱冰紋框。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
export const FOX_INKS={
 Y:{rgb:[193,207,219],angle:8,strength:.97},
 O:{rgb:[151,141,174],angle:68,strength:.96},
 B:{rgb:[83,109,142],angle:22,strength:.98},
 N:{rgb:[48,59,85],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
// 蜷身白狐：尾巴包住後腿，頭部回望尾尖；剪影與刻線各自獨立。
const body='M177 140C206 143 227 163 224 185C221 213 188 226 152 222C120 219 97 207 96 188C96 169 119 151 145 151Z';
const tail='M179 149C221 147 244 177 226 203C212 224 177 231 144 221C114 213 99 191 112 173C118 163 128 159 143 160C125 167 123 183 135 194C149 206 181 211 197 198C209 188 197 169 179 168Z';
const head='M176 152L164 162L146 161L128 150L114 143L124 134L121 108L144 125L162 121L181 100L179 129L187 141Z';
const tailTip='M112 173C118 163 128 159 143 160C125 167 123 183 135 194C141 200 151 204 163 206L154 212L145 206L142 214C121 206 103 189 112 173Z';
const ears='M126 116L139 128L129 135ZM176 109L174 131L165 127Z';
const collar='M145 156L162 157L176 148L172 167L163 163L158 174L151 166L144 171Z';
const snow=(x,y,r,a)=>{
 let d='';
 for(let i=0;i<6;i++){
  const t=i*Math.PI/3,dx=Math.cos(t),dy=Math.sin(t),nx=-dy,ny=dx;
  d+=`M${x} ${y}L${x+dx*r} ${y+dy*r}`;
  for(const side of [-1,1]) d+=`M${x+dx*r*.58+nx*r*.2*side} ${y+dy*r*.58+ny*r*.2*side}L${x+dx*r*.38} ${y+dy*r*.38}`;
 }
 return p(d,a);
};
const frame='M14 250V74Q14 49 39 44H94L150 9L206 44H261Q286 49 286 74V250';
const inset='M24 235V80Q24 59 47 54H97L150 22L203 54H253Q276 59 276 80V235';
const icicles='M36 112V80L58 65H91L150 34L209 65H242L264 80V112M52 76V105L60 93L68 102V76M232 76V102L240 93L248 105V76';
const branches='M45 209L52 154M48 189L34 172M49 179L63 163M255 209L248 154M252 189L266 172M251 179L237 163';
const dots=a=>[[83,114,1.8],[213,124,1.5],[69,187,1.3],[229,220,1.6],[109,86,1.2],[191,87,1.2]].map(([x,y,r])=>`<circle cx="${x}" cy="${y}" r="${r}" ${a}/>`).join('');
const silhouette=a=>p(body,a)+p(tail,a)+p(head,a);
export function foxBackPlates(){
 const Y=twin(silhouette(tint(.12))+p(frame,line(1.5))+p(inset,line(.7))+p(icicles,line(1))+p(branches,line(1.5))+snow(150,76,16,line(1.2))+dots(SOLID))+snow(150,250,20,line(1.5));
 const O=twin(p(tail,tint(.55))+p(tailTip,CUT)+p(ears,SOLID)+p(collar,tint(.5)));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
 twin(silhouette(CUT)+p(frame,cutLine(2.4))+p(inset,cutLine(1.5))+p(icicles,cutLine(1.8))+p(branches,cutLine(2.2))+snow(150,76,17,cutLine(2))+dots(CUT))+snow(150,250,21,cutLine(2.2));
 const N=twin(p(body,line(1.8))+p(tail,line(1.7))+p(head,CUT)+p(head,line(1.8))+
  p('M129 136Q135 141 141 138M158 137Q164 138 169 132M116 143L122 142M129 149Q139 155 146 153',line(1.1))+
  p('M120 142L115 143L120 146Z',SOLID)+p(ears,line(.9))+
  p('M181 157C208 160 222 181 212 197M173 216C194 217 212 207 219 195M182 164C196 170 204 179 203 188M179 213L192 209M169 212L181 207M159 210L169 206',line(.8))+
  p('M149 158L154 163M159 159L161 165M169 156L168 161',line(.7)));
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printFoxBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(foxBackPlates(),{seed,scale,inks:FOX_INKS}));
}
