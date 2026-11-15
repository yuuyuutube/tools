// 第二款：夜蛾花園。滿版梅紫、霧粉夜蛾與鼠尾草綠植物。
import { SOLID, CUT, tint, line, cutLine, plateSVG, printCard } from './press.js';
import { symmetricBack } from './back.js';
import { burst } from '../art/kit.js';
export const MOTH_INKS = {
 Y: {rgb:[230,158,186],angle:8,strength:.96},
 O: {rgb:[70,139,116],angle:68,strength:.96},
 B: {rgb:[100,62,94],angle:22,strength:.98},
 N: {rgb:[47,35,49],angle:45,strength:.97},
};
const p=(d,a)=>`<path d="${d}" ${a}/>`;
const twin=a=>`<g>${a}</g><g transform="rotate(180 150 250)">${a}</g>`;
const wings=a=>`<g>${a}</g><g transform="translate(300 0) scale(-1 1)">${a}</g>`;
const upper='M146 164C125 140 88 114 61 124C42 136 54 168 67 181C87 199 119 188 146 177Z';
const lower='M144 177C123 179 103 184 96 199C90 214 102 226 114 220C129 213 140 197 148 183Z';
const body='M149 150C143 153 143 160 145 167C141 176 145 190 150 197C155 190 159 176 155 167C157 160 157 153 151 150Z';
const stem='M-8 239C44 219 27 165 35 108C43 60 83 21 145 8M308 239C261 215 273 166 263 116C251 63 213 31 169 22';
const leafShapes=[
 'M34 121C15 108 11 86 16 73C38 83 46 102 34 121Z',
 'M38 101C47 77 65 67 78 69C71 92 57 103 38 101Z',
 'M57 65C43 51 45 30 53 19C69 36 71 51 57 65Z',
 'M74 46C82 25 104 21 116 26C105 43 91 50 74 46Z',
 'M30 170C8 163 0 145 3 132C22 137 34 151 30 170Z',
 'M262 123C244 109 237 90 242 78C262 87 272 107 262 123Z',
 'M252 93C258 69 274 57 288 59C284 81 269 94 252 93Z',
 'M230 61C211 60 197 47 195 33C217 33 231 43 230 61Z',
 'M270 172C281 152 295 149 306 153C296 170 285 177 270 172Z',
];
const leaves=a=>leafShapes.map(d=>p(d,a)).join('');
const veins='M18 82L33 113M69 76L42 97M54 29L58 57M106 29L80 42M9 140L28 165M246 86L261 116M280 65L255 89M203 38L225 57M298 157L274 169';
const petals=a=>Array.from({length:8},(_,i)=>`<g transform="rotate(${i*45} 150 250)">${p('M150 250C132 237 140 220 150 218C160 220 168 237 150 250Z',a)}</g>`).join('');
const specks=a=>[[99,91,3],[196,101,3],[150,66,5],[53,213,3],[246,209,3],[112,59,1.4],[185,73,1.4]].map(([x,y,r])=>`${burst(x,y,r,r*.35,4)} ${a}/>`).join('');
const moth=a=>wings(p(upper,a)+p(lower,a))+p(body,a);
// 藤蔓式雙線框：頂端花冠、內縮圓弧與側邊菱形節點。
// 邊線與葉片交織，滿版梅紫延伸至裁切邊，沒有紙白外框。
const border='M14 250V51Q14 18 43 18H117Q136 18 150 8Q164 18 183 18H257Q286 18 286 51V250';
const innerBorder='M23 230V53Q23 28 45 28H111M189 28H255Q277 28 277 53V230';
const scrolls='M31 60V48Q31 36 44 36Q55 36 55 43Q55 49 49 49M269 60V48Q269 36 256 36Q245 36 245 43Q245 49 251 49';
const bud='M150 52C137 44 136 33 141 28Q150 31 150 39Q150 31 159 28C164 33 163 44 150 52ZM150 39Q141 29 150 20Q159 29 150 39Z';
const sideBud='M14 232Q3 250 14 268Q25 250 14 232Z';
const borderArt=(stroke,fill)=>twin(p(border,stroke)+p(innerBorder,stroke)+p(scrolls,stroke)+p(bud,fill)+p(sideBud,fill));
export function mothBackPlates(){
 const Y=twin(wings(p(upper,SOLID)+p(lower,tint(.68)))+specks(SOLID))+petals(tint(.85))+borderArt(line(1.25),SOLID);
 const O=twin(leaves(SOLID)+p(stem,line(2.6)));
 const B=`<rect x="-5" y="-5" width="310" height="510" ${SOLID}/>`+
   twin(moth(CUT)+leaves(CUT)+p(stem,'fill="none" stroke="#000" stroke-width="4"')+specks(CUT))+petals(CUT)+borderArt(cutLine(2.1),CUT);
 const N=twin(
   p(stem,line(1.2))+leaves(line(1.25))+p(veins,line(.85))+
   wings(p(upper,line(2))+p(lower,line(1.5))+
    p('M142 167C115 149 85 133 62 135M141 173C115 160 88 150 61 149M140 178C116 177 92 174 73 165M142 182C124 190 113 201 106 214',line(1))+
    p('M83 139C71 145 73 157 85 160C98 161 104 147 94 140C90 137 86 137 83 139Z',line(1.7))+
    p('M86 144C81 146 82 153 87 154C93 153 93 146 86 144Z',SOLID)+
    p('M66 130L70 139M76 126L80 134M87 128L91 138M101 134L104 143M114 141L117 151M123 149L126 158',line(.7)))+
   p(body,SOLID)+p('M147 154Q137 141 132 145M153 154Q163 141 168 145',line(1.3)))+
   petals(line(1.1))+`<circle cx="150" cy="250" r="7" ${SOLID}/>`+borderArt(cutLine(2.1),CUT);
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame])=>[key,plateSVG({frame})]));
}
export async function printMothBack({seed=20261115,scale=2.4}={}){
 return symmetricBack(await printCard(mothBackPlates(),{seed,scale,inks:MOTH_INKS}));
}
