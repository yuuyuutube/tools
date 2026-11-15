// XVIII 月亮：歐洲寓言木刻。石塔、坐犬、仰首狼與水際螯蝦。
// 色版先挖去前景物件；墨線按遠山→建築→動物的遮擋次序印。
import {SOLID,CUT,tint,line,cutLine,g255,plateSVG} from './press.js';
import {printFrame} from './frame.js';
import {burst,rays} from '../art/kit.js';
export const MOON_INKS={
 Y:{rgb:[231,185,142],angle:8,strength:.94},
 O:{rgb:[126,151,125],angle:68,strength:.96},
 B:{rgb:[144,134,175],angle:22,strength:.96},
 N:{rgb:[61,49,77],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const lunar=a=>`<circle cx="124" cy="69" r="43" ${a}/>`;
const ridge='M-5 241V203L18 188L42 200L69 177L94 192L116 181L137 190L161 167L186 185L215 174L253 200V241Z';
const meadow='M-5 348V234C39 213 81 228 118 221C167 208 207 224 253 212V348Z';
const road='M120 224C104 242 125 252 133 266C144 287 106 288 110 305C112 320 143 324 145 346L120 348C126 330 98 324 94 307C87 281 128 283 123 269C119 256 101 247 115 225Z';
const pool='M-5 329C40 301 96 305 128 310C165 302 220 305 253 327V348H-5Z';
const dog='M43 286C35 278 35 267 40 257C44 249 51 244 53 234L56 217C57 211 63 207 70 208L74 205L79 210L85 211L90 217L103 219L102 225L91 228L82 230C80 240 82 251 79 264L78 282L86 284L87 289L71 289L68 266L64 286L68 288L66 292L42 292Z';
const dogTail='M44 276C33 277 28 270 29 260C22 268 24 282 36 286L46 285Z';
const dogEar='M64 214C59 224 61 238 68 242C76 238 78 224 74 216Z';
const wolf='M203 287C222 285 226 271 220 256L210 237L206 219L206 211L212 201L212 191L204 196L200 192L197 203L185 196L175 182L168 185L175 201L185 212L190 220C181 237 175 250 177 265L178 282L168 286L169 291L187 291L192 272L196 287Z';
const wolfTail='M214 263C229 269 230 281 243 280C238 293 225 299 217 289L208 280Z';
const wolfRuff='M190 213L197 218L195 229L201 226L201 239L206 237L212 252C201 252 193 246 186 238Z';
const crayBody='M124 308C116 309 114 316 117 322L114 333L124 339L134 333L131 322C134 316 132 309 124 308Z';
const clawL='M111 309C100 310 96 301 101 295L107 300L108 291C118 295 118 304 111 309Z';
const cray=a=>p(crayBody,a)+p(clawL,a)+`<g transform="translate(248 0) scale(-1 1)">${p(clawL,a)}</g>`;
const towers=a=>`<g transform="translate(22 140)">${p('M0 84L3 15H-2V0H6V7H12V0H20V7H27V0H35V15H30L33 84Z',a)}</g>`+
 `<g transform="translate(195 134)">${p('M0 88L2 16H-3V0H5V7H12V0H20V7H27V0H35V16H30L32 88Z',a)}</g>`;
const animals=a=>p(dogTail,a)+p(wolfTail,a)+p(dog,a)+p(wolf,a);
const stars=a=>[[46,50,3],[207,47,3],[34,105,2],[216,105,2.5],[73,130,2]].map(([x,y,r])=>`${burst(x,y,r,r*.34,4)} ${a}/>`).join('');
const towerLines=(x,y)=>`<g transform="translate(${x} ${y})">`+
 p('M-2 15H33M3 21H30M5 35H28M4 53H30M2 71H31M12 21V35M22 35V53M11 53V71M24 71V82',line(.7))+
 p('M11 57V40Q17 28 23 40V57Z',SOLID)+p('M15 42V53',cutLine(.9))+
 p('M25 18L29 80M27 18L31 80',line(.65))+'</g>';
const fur=(d,clip)=>`<g clip-path="url(#${clip})">${p(d,line(.65))}</g>`;
const DOG_FUR='M50 252Q44 266 47 279M54 254Q48 268 51 282M58 257Q53 271 56 282M76 235L73 245M77 242L74 252M77 250L73 260M61 246L59 253M58 239L56 248M58 228L56 236M80 217L84 218M66 248Q70 254 72 262';
const WOLF_FUR='M209 248Q222 263 215 278M206 255Q217 269 211 282M203 260Q213 274 207 284M188 235L183 247M191 239L186 252M194 244L189 258M201 222L205 230M199 216L201 224M193 208L197 213M184 199L188 202M216 278L225 286M219 275L230 285M228 282L233 285';
export function moonPlates(card){
 const fr=printFrame(card);
 const Y=plateSVG({frame:fr.O,art:
  `${rays(124,69,49,55,24)} ${line(.95)}/>`+lunar(tint(.34))+stars(SOLID)+p(road,tint(.25))+
  p(dog,tint(.2))+cray(tint(.65))});
 const O=plateSVG({art:p(meadow,tint(.65))+p(road,CUT)+p(pool,CUT)+towers(CUT)+animals(CUT)+
  p(wolf,tint(.3))+p(wolfRuff,CUT)+p('M-5 284C24 274 46 292 92 285L91 303C49 300 18 311-5 305Z',tint(.8))});
 const B=plateSVG({defs:`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.85)}"/><stop offset="1" stop-color="${g255(.28)}"/></linearGradient>`,art:
  '<rect x="-3" y="-3" width="254" height="242" fill="url(#sky)"/>'+p(ridge,tint(.65))+p(meadow,CUT)+
  towers(CUT)+lunar(CUT)+stars(CUT)+p(pool,tint(.7))+cray(CUT)+animals(CUT)+
  p('M137 28A43 43 0 0 1 137 110C156 93 155 48 137 28Z',tint(.35))});
 const N=plateSVG({frame:fr.N,defs:
  `<clipPath id="dog"><path d="${dog}"/></clipPath><clipPath id="wolf"><path d="${wolf}"/><path d="${wolfTail}"/></clipPath>`+
  `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.35)}"/><stop offset="1" stop-color="${g255(0)}"/></linearGradient>`,art:
  '<rect x="-3" y="-3" width="254" height="190" fill="url(#night)"/>'+lunar(CUT)+stars(CUT)+lunar(line(1.8))+
  // 月面的側臉像古老天文版畫，表情安靜而疏離。
  p('M127 29C115 42 129 53 120 62L111 70Q111 74 119 74Q116 78 121 80Q117 88 129 94C134 103 140 107 147 109',line(1.1))+
  p('M127 55Q134 50 141 54M128 60Q134 63 140 59M123 82Q129 85 134 82',line(.85))+
  p('M151 39Q163 56 159 76M155 85L152 93M146 98L143 101',line(.6))+
  p('M-4 203L18 188L42 200L69 177L94 192L116 181L137 190L161 167L186 185L215 174L252 200',line(1))+
  p('M69 177L77 195M161 167L170 191M215 174L226 197M18 188L26 203',line(.65))+
  towers(CUT)+towers(tint(.16))+towers(line(1.65))+towerLines(22,140)+towerLines(195,134)+
  p('M-4 234C39 213 81 228 118 221C167 208 207 224 252 212M120 224C104 242 125 252 133 266C144 287 106 288 110 305',line(.9))+
  // 遠處的草與石塊，先畫好，再讓動物遮住。
  p('M9 263l3-14l5 10M88 271l5-13l4 10M151 244l4-12l4 9M232 253l5-17l6 13M14 292l5-12l6 9M157 298l5-13l5 10',line(.75))+
  p(pool,line(1.1))+p('M2 331H36M47 322H77M161 320H198M210 330H244M19 340H70M173 340H218M83 333H102M143 333H158',line(.85))+
  animals(CUT)+p(dogTail,tint(.3))+p(dogTail,line(1.2))+p(wolfTail,tint(.5))+p(wolfTail,line(1.4))+
  p(dog,tint(.12))+p(dog,line(1.65))+p(dogEar,tint(.4))+p(dogEar,line(1.1))+
  fur(DOG_FUR,'dog')+p('M78 218L83 219M100 220L103 221M88 226L95 226',line(.9))+
  p('M63 287Q58 272 63 259M72 281V286M77 285L78 289M82 285L83 289',line(.85))+
  p(wolf,tint(.4))+p(wolfRuff,CUT)+p(wolf,line(1.7))+fur(WOLF_FUR,'wolf')+
  p('M208 196L205 204L210 201ZM169 184L173 183L172 187Z',SOLID)+
  p('M191 205L195 204M175 196L182 205M188 216L193 221M197 274L200 285M174 287L175 291M181 287L182 291',line(.85))+
  // 螯蝦在水面之前，鉗、觸鬚與分節腹部都保有生物結構。
  cray(CUT)+cray(tint(.2))+cray(line(1.1))+
  p('M117 313L110 306M131 313L138 306M119 315L108 317M119 319L108 323M119 323L109 329M129 315L140 317M129 319L140 323M129 323L139 329M119 327H129M118 331H130M120 335L124 331L128 335M121 309Q114 297 118 292M127 309Q134 297 130 292',line(.7))+
  '<circle cx="121" cy="312" r=".9" '+SOLID+'/><circle cx="127" cy="312" r=".9" '+SOLID+'/>'});
 return {Y,O,B,N};
}
