// III: abundance carried by a reclining, weighted figure, not a second priestess.
import {engraving,palette,P,C,E,G,symbol,hatch,star,pomegranate,SOLID,tint,line} from './engraving.js';
export const EMPRESS_INKS=palette([228,180,77],[191,87,100],[101,135,100],[47,57,42]);
export const EMPRESS_QUIET=[{x:139,y:160,rx:23,ry:28},{x:96,y:214,rx:17,ry:20}];
export function empressPlates(card){
 const s=engraving(card);
 s.add('Y',P('M-4-4H252V346H-4Z',tint(.25)));
 const forest='M-4 43Q13 24 28 47Q37 19 52 41Q70 19 80 45L89 119L84 237H-4ZM182 46Q197 19 211 43Q231 18 253 40V238H180Z';
 s.shape(forest,{B:.62},{width:1.7,shade:P(hatch(4,72,13,159,9,7),line(.85))+P(hatch(191,75,5,156,7,9),line(.9)),details:P('M20 69l7 164m-5-103l-17-22m22 62l22-34M63 54L58 234m2-99l-20-22m20 59l19-28M211 65l-6 168m3-92l23-25M239 61l-7 164',line(1.6))});
 s.shape('M187 141L215 145L210 193L221 212L235 232L211 252L185 237L203 215L189 196Z',{B:.31},{width:1.4,details:P('M196 150l-1 40m7-35l-3 40m6-33l-3 33m1 11l12 10m-17-4l17 10m-12 5l12 3',line(.9)),tag:'waterfall'});
 s.shape('M-4 254Q98 238 180 250L213 239L253 247V346H-4Z',{B:.3,Y:.17},{width:1.3,shade:P(hatch(-2,292,24,-12,13,21,1),line(.9))});
 s.shape('M53 146L77 137L145 149L161 219L163 283L48 287L39 211Z',{O:.6,Y:.12},{shade:P('M50 208l107 11l6 64l-116 4Z',tint(.32))+P(hatch(42,173,11,52,5,4,0,3),line(.9)),details:P('M53 151Q83 141 113 153M46 207Q88 224 158 214M51 224Q93 242 158 229',line(1.5))});
 s.shape('M74 111Q58 128 64 159L67 190Q75 204 98 205L148 194L148 148L120 116Z',{O:.4},{width:2,shade:P(hatch(71,158,2,38,7,6),line(.9)),details:P('M72 135Q98 124 129 141M69 187Q103 198 138 179',line(1.3))});
 // Long back hair, then neckline and face. The visible fringe is restored last.
 s.shape('M101 80Q112 61 132 73Q149 83 146 114L152 143L97 148Q89 118 99 95Z',{Y:.8,O:.2},{shade:P(hatch(99,91,3,54,11,4,0,3),line(.9))});
 const dress='M103 125Q116 117 135 128L154 151L159 190Q150 209 161 220C178 228 184 247 178 266L179 298L188 317Q153 330 121 320Q97 324 66 317L75 285Q88 252 93 224L88 184L86 149Z';
 s.shape(dress,{Y:.13,O:.07},{shade:P('M140 139L157 158L156 202Q143 214 161 224Q181 241 174 264L185 316L160 321L143 258L133 222Z',tint(.33))+P(hatch(153,251,16,63,5,3,0,-5),line(.9))+P(hatch(84,276,-10,39,5,4,0,3),line(.85)),details:P('M108 139Q119 158 139 139M100 181Q121 195 145 186M96 219C115 207 145 212 159 228Q170 238 169 251M104 230Q120 241 145 237M114 245Q112 281 98 315M132 247Q130 282 132 320M159 257Q150 282 164 319M77 306l18-45',line(1.5))});
 // Print the pomegranate embroidery within the robe, away from the hands.
 for(const [x,y] of [[109,169],[126,198],[112,249],[143,269],[88,302],[151,304]]){
   s.add('O',symbol('robe-pomegranate',pomegranate(x,y,4.4,SOLID)));
 }
 s.shape('M111 111L110 126Q119 137 130 128L132 113Z',{Y:.23,O:.12},{width:1.4,shade:P('M123 112h9l-1 14l-7 4Z',tint(.22))});
 s.shape('M104 87Q106 74 121 76Q137 77 140 92L138 108Q134 120 124 123Q113 122 107 111L102 98Z',{Y:.22,O:.12},{width:1.9,shade:P('M103 91l8 1l3 24l11 7q-16-1-20-17Z',tint(.17)),details:P('M111 96q4-3 8-1m6 0q5-2 9 1M112 100q4 2 7 0m7 0q3 2 6 0M122 100l-1 9l5 1M119 115q5-2 10-1',line(1))});
 s.shape('M102 89Q103 73 121 75Q138 75 141 90L134 94Q123 85 117 89L109 103L103 105Z',{Y:.85,O:.17},{width:1.6,details:P('M107 88q8-10 17-7m-14 11l-3 8M126 82l10 6',line(.8))});
 // Twelve stars, spaced around the entire diadem so each can be counted.
 const stars=Array.from({length:12},(_,i)=>{const a=(-179+i*178/11)*Math.PI/180;return star(122+30*Math.cos(a),78+25*Math.sin(a),3.1);});
 s.add('Y',symbol('twelve-star-crown',stars.map(d=>P(d,SOLID)).join('')));
 s.add('N',symbol('twelve-star-crown',P('M93 76Q122 66 151 76',line(1.2))+stars.map(d=>symbol('crown-star',P(d,line(.7)))).join('')));
 // Raised right forearm and closed grip; the sceptre runs through the palm.
 s.shape('M96 141Q84 137 78 151L70 175L57 153L46 158L59 190Q68 201 78 191L95 171Z',{Y:.13,O:.07},{shade:P(hatch(77,159,9,8,4,-3,7),line(.9)),details:P('M70 176l4 9M48 159l11-5',line(1.3))});
 s.shape('M49.5 102h3v44h-3Z',{Y:1},{width:1,tag:'globe-sceptre'});
 s.shape('M60 95a9 9 0 1 1-18 0a9 9 0 1 1 18 0Z',{Y:1},{width:1.7,tag:'globe-sceptre',details:P('M45 92q5-5 10-1M46 103h10',line(.9))});
 s.shape('M48 154L45 146L46 135L51 131L56 135L55 143L59 153L54 159Z',{Y:.24,O:.12},{width:1.3,details:P('M49 138l5 1m-5 3l5 1',line(.75))});
 s.shape('M142 145Q154 144 160 156L167 190L154 210L143 205L151 187L140 170Z',{Y:.13,O:.07},{shade:P(hatch(148,161,9,6,4,1,6),line(.9)),details:P('M151 189l10 5',line(1.3))});
 s.shape('M147 202L154 206L147 214L132 218Q126 215 130 211L140 209Z',{Y:.24,O:.12},{width:1.2,details:P('M137 214l8-3',line(.7))});
 // Heart-shaped Venus shield sits in front of the cushion, not behind the grain.
 s.shape('M45 245C23 225 12 252 25 266L48 287L69 264C81 246 62 231 45 245Z',{Y:.7},{width:2.1,tag:'venus-shield',details:C(46,254,8,line(1.8))+P('M46 262v16m-6-6h12',line(1.8))});
 // Wheat stems and kernels have their own visible topology.
 for(let i=0;i<16;i++){
  const x=8+i*15,y=294+(i%4)*6;
  s.add('Y',symbol('wheat',G(`translate(${x} ${y}) rotate(${(i%3-1)*12})`,P('M0 43V0',line(1.6))+Array.from({length:5},(_,j)=>E(j%2?2:-2,j*3,2.5,4,SOLID)).join(''))));
  s.add('N',G(`translate(${x} ${y}) rotate(${(i%3-1)*12})`,P('M0 42V1M0 11l-5-4m5 9l5-5m-5 12l-5-4',line(.75))));
 }
 return s.finish();
}
