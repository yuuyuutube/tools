// XVIII 月亮：歐洲寓言木刻。石塔、坐犬、仰首狼與水際螯蝦。
// 色版先挖去前景物件；墨線按遠山→建築→動物的遮擋次序印。
import {SOLID,CUT,tint,line,cutLine,g255,plateSVG,INKS} from './press.js';
import {printFrame} from './frame.js';
import {burst,rays} from '../art/kit.js';
export const MOON_INKS={
 Y:{rgb:[231,185,142],angle:8,strength:.94},
 O:{rgb:[126,151,125],angle:68,strength:.96},
 B:{rgb:[144,134,175],angle:22,strength:.96},
 N:{rgb:[53,40,66],angle:45,strength:.97},
 FO:INKS.O,
 FN:{...INKS.N,fixedRegistration:true},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const crescent='M124 26A43 43 0 1 0 124 112C108 105 102 95 108 84Q117 90 124 83L119 79Q126 77 122 74L134 71Q137 69 132 66L123 61C119 58 124 54 126 49C127 43 118 35 124 26Z';
const lunar=a=>`<circle cx="124" cy="69" r="43" ${a}/>`;
const ridge='M-5 241V203L18 188L42 200L69 177L94 192L116 181L137 190L161 167L186 185L215 174L253 200V241Z';
const meadow='M-5 348V234C39 213 81 228 118 221C167 208 207 224 253 212V348Z';
const road='M120 224C104 242 125 252 133 266C144 287 106 288 110 305C112 320 143 324 145 346L120 348C126 330 98 324 94 307C87 281 128 283 123 269C119 256 101 247 115 225Z';
const pool='M-5 329C40 301 96 305 128 310C165 302 220 305 253 327V348H-5Z';
const dog='M43 286C35 278 35 267 40 257C44 249 51 244 53 234L56 217C57 211 63 207 70 208L74 205L79 210L85 211L90 217L103 219L102 225L91 228L82 230C80 240 82 251 79 264L78 282L86 284L87 289L71 289L68 266L64 286L68 288L66 292L42 292Z';
const dogTail='M44 276C33 277 28 270 29 260C22 268 24 282 36 286L46 285Z';
const dogEar='M64 214C59 224 61 238 68 242C76 238 78 224 74 216Z';
const wolf='M211 288C224 282 226 267 218 253C212 243 207 234 208 225L211 225L207 217L208 205L199 212L196 201L191 216L185 216L174 211L170 215L171 220L181 225L188 227C182 241 175 250 177 265L178 281L167 285L168 291L188 291L192 268L198 286Z';
const wolfTail='M215 262C231 267 230 282 242 281C239 291 230 297 221 292L209 282Z';
const wolfRuff='M188 229L195 234L190 233L198 239L194 241L202 248L198 251L204 258C191 258 184 250 181 242Z';
const crayBody='M124 308C116 309 114 316 117 322L114 333L124 339L134 333L131 322C134 316 132 309 124 308Z';
const clawL='M111 309C100 310 96 301 101 295L107 300L108 291C118 295 118 304 111 309Z';
const cray=a=>p(crayBody,a)+p(clawL,a)+`<g transform="translate(248 0) scale(-1 1)">${p(clawL,a)}</g>`;
const towers=a=>`<g transform="translate(22 140)">${p('M0 84L3 15H-2V0H6V7H12V0H20V7H27V0H35V15H30L33 84Z',a)}</g>`+
 `<g transform="translate(195 134)">${p('M0 88L2 16H-3V0H5V7H12V0H20V7H27V0H35V16H30L32 88Z',a)}</g>`;
const animals=a=>p(dogTail,a)+p(wolfTail,a)+p(dog,a)+p(wolf,a);
const stars=a=>[[46,50,3],[207,47,3],[34,105,2],[216,105,2.5],[73,130,2]].map(([x,y,r])=>`${burst(x,y,r,r*.34,4)} ${a}/>`).join('');
const towerLines=(x,y)=>`<g transform="translate(${x} ${y})">`+
 p('M-2 15H33M3 21H30M5 35H28M4 53H30M2 71H31M12 21V35M22 35V53M11 53V71M24 71V82',line(0.95))+
 p('M11 57V40Q17 28 23 40V57Z',SOLID)+p('M15 42V53',cutLine(.9))+
 p('M25 18L29 80M27 18L31 80',line(0.9))+'</g>';
const fur=(d,clip)=>`<g clip-path="url(#${clip})">${p(d,line(0.9))}</g>`;
const DOG_FUR='M50 252Q44 266 47 279M54 254Q48 268 51 282M58 257Q53 271 56 282M76 235L73 245M77 242L74 252M77 250L73 260M61 246L59 253M58 239L56 248M58 228L56 236M80 217L84 218M66 248Q70 254 72 262';
const WOLF_FUR='M204 234L209 245M207 243L214 254M210 254Q220 266 215 277M205 257Q215 270 209 282M201 264Q208 275 205 283M188 238L184 249M191 244L186 255M196 249L190 262M198 222L202 229M197 216L200 221M197 221L201 226M218 276L226 286M222 277L232 287';
const hatch=(x,y,dx,dy,n,stepX,stepY)=>Array.from({length:n},(_,i)=>`M${x+i*stepX} ${y+i*stepY}l${dx} ${dy}`).join('');
const terrainHatch=hatch(70,183,14,29,7,2.8,1.6)+hatch(162,174,17,33,8,2.6,1.8)+hatch(217,181,14,26,7,2.7,1.7)+hatch(20,194,12,22,5,3,1.7);
const bankShade='M-5 266C16 252 24 266 39 277L59 292C41 301 19 306-5 310ZM147 288C175 286 205 288 251 278V309C206 302 173 306 147 299Z';
const groundHatch=hatch(6,247,17,-5,11,2,3.7)+hatch(202,292,26,-6,11,-2.6,.6)+hatch(5,303,26,-5,7,6,-1.5)+hatch(142,279,17,-4,8,3,2.6);
// 十五枚露滴：保留月亮牌的傳統圖像意象。
const dewPositions=[
 [92,124,-15],[108,128,-8],[124,130,0],[140,128,8],[156,124,15],
 [83,140,-18],[103,144,-8],[124,146,0],[145,144,8],[165,140,18],
 [93,155,-12],[109,159,-6],[124,161,0],[139,159,6],[155,155,12],
];
const dew=attr=>dewPositions.map(([x,y,angle])=>`<g transform="translate(${x} ${y}) rotate(${angle})">${p('M0-4C3-2 4 1 1 4L-1 6L0 2C-4 2-4-2 0-4Z',attr)}</g>`).join('');
export function moonPlates(card){
 const fr=printFrame(card);
 const Y=plateSVG({art:
  `${rays(124,69,49,55,24)} ${line(1.3)}/>`+p(crescent,tint(.5))+stars(SOLID)+dew(SOLID)+p(road,tint(.25))+
  p(dog,tint(.2))+cray(tint(.65))});
 const O=plateSVG({art:p(meadow,tint(.65))+p(road,CUT)+p(pool,CUT)+towers(CUT)+animals(CUT)+
  p(wolf,tint(.3))+p(wolfRuff,CUT)+p('M-5 284C24 274 46 292 92 285L91 303C49 300 18 311-5 305Z',tint(.8))});
 const B=plateSVG({defs:`<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.85)}"/><stop offset="1" stop-color="${g255(.28)}"/></linearGradient>`,art:
  '<rect x="-3" y="-3" width="254" height="242" fill="url(#sky)"/>'+p(ridge,tint(.65))+p(meadow,CUT)+
  towers(CUT)+lunar(CUT)+stars(CUT)+p(pool,tint(.7))+cray(CUT)+animals(CUT)+
  lunar(tint(.48))+p(crescent,CUT)+dew(CUT)});
 const N=plateSVG({defs:
  `<clipPath id="bank"><path d="${bankShade}"/></clipPath><clipPath id="moonDisk"><circle cx="124" cy="69" r="43"/></clipPath><clipPath id="dog"><path d="${dog}"/></clipPath><clipPath id="wolf"><path d="${wolf}"/><path d="${wolfTail}"/></clipPath>`+
  `<linearGradient id="night" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${g255(.58)}"/><stop offset="1" stop-color="${g255(0)}"/></linearGradient>`,art:
  '<rect x="-3" y="-3" width="254" height="190" fill="url(#night)"/>'+lunar(CUT)+stars(CUT)+dew(CUT)+lunar(line(2.6))+
  // 亮弦月的內緣本身就是側臉：額頭、鼻尖、嘴唇與下巴，不在滿月上另畫臉。
  lunar(tint(.36))+p(crescent,CUT)+p(crescent,line(2.1))+
  `<g clip-path="url(#moonDisk)">${p(hatch(144,33,21,20,13,-1.6,4.8),line(1.3))}${p(crescent,CUT)}</g>`+
  p('M110 55Q116 51 122 55M111 61Q116 64 121 60M113 83Q117 85 121 83',line(1.25))+
  dew(line(.6))+p(terrainHatch,line(1.15))+
  p('M-4 203L18 188L42 200L69 177L94 192L116 181L137 190L161 167L186 185L215 174L252 200',line(1.4))+
  p('M69 177L77 195M161 167L170 191M215 174L226 197M18 188L26 203',line(0.9))+
  towers(CUT)+towers(tint(.3))+towers(line(2.4))+towerLines(22,140)+towerLines(195,134)+
  p('M44 224L54 220L54 158L46 158ZM218 151L224 151L227 220L218 218Z',tint(.55))+
  p(bankShade,tint(.35))+`<g clip-path="url(#bank)">${p(groundHatch,line(1.15))}</g>`+p(road,CUT)+
  p('M-4 234C39 213 81 228 118 221C167 208 207 224 252 212M120 224C104 242 125 252 133 266C144 287 106 288 110 305',line(1.3))+
  // 遠處的草與石塊，先畫好，再讓動物遮住。
  p('M9 263l3-14l5 10M88 271l5-13l4 10M151 244l4-12l4 9M232 253l5-17l6 13M14 292l5-12l6 9M157 298l5-13l5 10',line(1))+
  p(pool,tint(.22))+p(pool,line(1.5))+p('M2 331H36M47 322H77M161 320H198M210 330H244M19 340H70M173 340H218M83 333H102M143 333H158',line(1.15))+
  animals(CUT)+p(dogTail,tint(.3))+p(dogTail,line(1.65))+p(wolfTail,tint(.5))+p(wolfTail,line(1.85))+
  p(dog,tint(.15))+`<g clip-path="url(#dog)">${p('M48 249C37 261 40 278 46 289L60 290C51 279 51 264 57 251Z',tint(.48))}${p(hatch(43,260,12,17,6,2.1,0),line(1.15))}</g>`+p(dog,line(2.4))+p(dogEar,tint(.4))+p(dogEar,line(1.5))+
  fur(DOG_FUR,'dog')+p('M78 218L83 219M100 220L103 221M88 226L95 226',line(1.3))+
  p('M63 287Q58 272 63 259M72 281V286M77 285L78 289M82 285L83 289',line(1.15))+
  p(wolf,tint(.3))+`<g clip-path="url(#wolf)">${p('M205 229C211 246 224 258 218 277L211 288L200 286L198 272C207 261 205 245 202 237Z',tint(.65))}${p(hatch(205,255,10,20,6,2,1),line(1.15))}</g>`+p(wolfRuff,CUT)+p(wolf,line(2.5))+fur(WOLF_FUR,'wolf')+
  p('M196 208L194 217L199 215ZM205 212L203 218L207 219ZM170 215L174 214L174 219Z',SOLID)+
  p('M185 219L189 220M176 221L184 224M185 226L190 232M181 249L182 279M198 258Q207 252 214 267M194 269Q198 278 209 280M173 287L174 291M181 287L182 291',line(1.15))+
  // 螯蝦在水面之前，鉗、觸鬚與分節腹部都保有生物結構。
  cray(CUT)+cray(tint(.2))+cray(line(1.5))+
  p('M117 313L110 306M131 313L138 306M119 315L108 317M119 319L108 323M119 323L109 329M129 315L140 317M129 319L140 323M129 323L139 329M119 327H129M118 331H130M120 335L124 331L128 335M121 309Q114 297 118 292M127 309Q134 297 130 292',line(0.95))+
  '<circle cx="121" cy="312" r=".9" '+SOLID+'/><circle cx="127" cy="312" r=".9" '+SOLID+'/>'});
 return {Y,O,B,N,FO:plateSVG({frame:fr.O}),FN:plateSVG({frame:fr.N})};
}
