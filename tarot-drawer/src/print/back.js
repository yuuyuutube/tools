// 木刻牌背。上半部旋轉成下半部，印完再對稱紙紋，避免正逆位線索。
import { SOLID, CUT, tint, line, plateSVG, printCard } from './press.js';
import { burst, rays } from '../art/kit.js';

const path = (d, attr) => `<path d="${d}" ${attr}/>`;
const circle = (r, attr) => `<circle cx="150" cy="250" r="${r}" ${attr}/>`;
const twin = art => `<g>${art}</g><g transform="rotate(180 150 250)">${art}</g>`;
const moon = 'M158 73C135 71 120 91 127 110C132 124 147 129 161 121C142 122 132 109 136 95C139 85 148 78 158 73Z';
const eye = 'M108 250Q150 215 192 250Q150 285 108 250Z';
const leaves = 'M63 192Q47 181 51 167Q66 173 63 192ZM66 175Q69 157 83 155Q82 170 66 175ZM71 157Q57 148 62 135Q75 142 71 157ZM228 157Q215 148 219 137Q232 142 228 157ZM234 179Q219 173 219 160Q234 165 234 179ZM238 195Q239 177 250 173Q252 188 238 195Z';
const stem = 'M64 218C59 189 67 160 78 138M237 216C241 192 230 160 223 138';
const stars = attr => [[67,91,6],[229,93,5],[102,143,4],[198,143,4],[150,153,4]].map(([x,y,r]) => `${burst(x,y,r,r*.32,4)} ${attr}/>`).join('');
const dots = attr => [[93,70],[204,70],[47,123],[253,123],[92,183],[208,183]].map(([x,y]) => `<circle cx="${x}" cy="${y}" r="1.2" ${attr}/>`).join('');
const hatch = Array.from({length:14},(_,i) => {
 const a=(192+i*12)*Math.PI/180;
 return `M${150+56*Math.cos(a)} ${250+56*Math.sin(a)}L${150+64*Math.cos(a+.035)} ${250+64*Math.sin(a+.035)}`;
}).join('');

// 花冠拱框與細刻邊飾，自成一套牌背的裝飾語言。
const panel='M26 251V89Q26 55 59 55H106Q126 55 136 44L150 32L164 44Q174 55 194 55H241Q274 55 274 89V251';
const outer='M10 250V47Q10 29 26 26Q29 12 47 12H110Q130 12 150 4Q170 12 190 12H253Q271 12 274 26Q290 29 290 47V250';
const inner='M18 228V51Q18 35 34 34Q35 21 51 21H111Q131 21 150 14Q169 21 189 21H249Q265 21 266 34Q282 35 282 51V228';
const scroll='M36 45Q35 28 49 30Q60 33 54 41Q48 46 44 39M264 45Q265 28 251 30Q240 33 246 41Q252 46 256 39';
const crown='M150 32Q138 27 135 19Q146 18 150 26Q154 18 165 19Q162 27 150 32Z';
const diamonds='M18 235L25 250L18 265L11 250ZM282 235L289 250L282 265L275 250Z';
const edgeHatch=Array.from({length:14},(_,i)=>`M11 ${68+i*11}l7 -4M282 ${68+i*11}l7 4`).join('');
export function backPlates() {
 const Y = twin(path(moon,SOLID)+stars(SOLID)+path(leaves,tint(.7))) +
   `${burst(150,250,76,58,16)} ${SOLID}/>` + path(eye,CUT)+twin(path(crown,SOLID));
 const O = twin(path(inner,line(1.1))+path(scroll,line(1.3))) + path(diamonds,SOLID) +
   twin(path(stem,line(1.8))) + `${burst(150,250,65,51,16)} ${SOLID}/>` + path(eye,CUT) + circle(15,SOLID);
 const B = twin(path(panel+'Z',tint(.72))) +
   twin(path(moon,CUT)+stars(CUT)+dots(CUT)+path(leaves,CUT)) + circle(78,CUT);
 const N = twin(path(outer,line(2.1))+path(panel,line(2.3))+path(edgeHatch,line(.65))+path(crown,line(.85))) + path(diamonds,line(1)) +
   twin(path(moon,line(1.3))+path(stem,line(1.2))+path(leaves,line(1.2))+
     path('M54 174L62 186M77 160L69 171M65 142L71 153M224 143L228 153M224 167L232 175M246 179L240 190',line(.8))) +
   circle(84,line(1.2)) + circle(91,line(.8)) +
   `${rays(150,250,94,99,32)} ${line(1.2)}/>` +
   `${burst(150,250,76,58,16)} ${line(1.3)}/>` + twin(path(hatch,line(.75))) +
   circle(38,line(1.4)) + path(eye,line(2.2)) + circle(15,line(1.4)) + circle(6,SOLID) +
   path('M150 221V227M150 273V279',line(1.2));
 return Object.fromEntries(Object.entries({Y,O,B,N}).map(([key,frame]) => [key,plateSVG({frame})]));
}

export async function printBack({seed=20261115,scale=2.4}={}) {
 return symmetricBack(await printCard(backPlates(),{seed,scale}));
}

export function symmetricBack(printed) {
 // Mirror actual pixels, including paper texture and misregistration.
 const cv=document.createElement('canvas'); cv.width=printed.width; cv.height=printed.height;
 const g=cv.getContext('2d'), half=cv.height/2;
 g.drawImage(printed,0,0,cv.width,half,0,0,cv.width,half);
 g.translate(cv.width,cv.height); g.rotate(Math.PI);
 g.drawImage(printed,0,0,cv.width,half,0,0,cv.width,half);
 return cv;
}
