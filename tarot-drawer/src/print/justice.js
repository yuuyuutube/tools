// XI: an unblindfolded judge; her right sword and left scales remain distinct.
import {engraving,palette,P,C,E,symbol,hatch,SOLID,tint,line,cutLine} from './engraving.js';
export const JUSTICE_INKS=palette([211,176,91],[170,64,70],[121,144,118],[49,36,60]);
export const JUSTICE_QUIET=[{x:151,y:153,rx:23,ry:29},{x:83,y:234,rx:22,ry:25},{x:225,y:227,rx:25,ry:27},{x:167,y:382,rx:23,ry:14}];
export function justicePlates(card){
 const s=engraving(card);
 s.add('Y',P('M-4-4H252V346H-4Z',tint(.22)));
 s.shape('M50 25Q124 34 198 25V263H50Z',{O:.2,B:.22},{width:1.6,shade:P(hatch(54,32,3,221,8,4),line(.85))+P(hatch(169,32,2,221,7,4),line(.85)),details:P('M65 30q-8 105 0 228M183 30q8 105 0 228',line(1.1)),tag:'veil'});
 for(const x of [9,209]){
  s.shape(`M${x} 37h30v13h-4v233h5v13h-32v-13h5V50h-4Z`,{Y:.15,B:.29},{shade:P(`M${x+21} 51h5v231h-5Z`,tint(.4))+P(hatch(x+23,53,3,0,28,0,8),line(.8)),details:P(`M${x+7} 53v226M${x+3} 43h24M${x+3} 289h24`,line(1.2))});
 }
 s.shape('M72 100Q124 85 176 100V271H72Z',{Y:.18,B:.25},{shade:P('M161 101h15v169h-15Z',tint(.4)),details:P('M82 108Q125 97 166 108V243H82Z',line(1.5))});
 s.shape('M45 285H203L217 309H31ZM31 309H217L235 342H12Z',{Y:.18,B:.26},{width:1.8,shade:P('M31 310h186v8H31Z',tint(.4)),details:P('M39 300h171M27 331h197',line(.9))});
 s.shape('M66 190H183L190 211L180 247H68L60 211Z',{Y:.17,B:.25},{width:1.8,shade:P('M62 218h126l-8 29H68Z',tint(.4)),details:P('M63 217h124',line(1.4)),tag:'seat-plane'});
 const robe='M103 120Q124 111 144 120L159 137L164 178Q161 187 151 190C167 193 181 208 181 224Q180 236 168 244L174 282L181 314Q159 323 133 318Q109 323 71 316L80 277L84 245Q72 234 76 218C80 199 91 192 98 189L83 176L88 142Z';
 s.shape(robe,{O:.83,Y:.1},{shade:P('M142 124L158 141L160 178L146 189L129 203L131 225Q152 239 179 223L167 243L178 314L154 319L144 253L127 237L119 210L109 194Z',tint(.43))+P(hatch(148,256,18,58,5,3,0,-5),line(.9))+P(hatch(85,260,-5,54,5,4,0,3),line(.9))+P(hatch(143,231,12,10,4,6,0,-3),line(.9)),details:P('M109 137Q123 150 139 137M102 164L102 183M146 164L143 183M99 188Q124 195 149 189M108 198Q92 202 84 217M108 206Q98 215 97 229M142 199Q161 203 171 217M142 207Q157 216 157 230M82 234Q91 240 100 237M157 238Q167 237 172 232M104 245L94 315M120 241L118 318M145 248L156 318M128 204L127 232',line(1.5)),tag:'seated-robe'});
 s.shape('M112 112v10l12 14l12-14v-11Z',{Y:.2,O:.1},{width:1.3});
 // Shoulder-length hair, a sculpted front face and open eyes.
 s.shape('M104 73Q124 57 144 74L146 111L154 133L135 129L124 119L112 130L96 133L101 107Z',{Y:.63,O:.24},{width:1.9,shade:P(hatch(103,83,-1,46,12,4,0,2),line(.85))});
 s.shape('M107 78Q124 66 140 78L139 99Q136 114 124 118Q111 114 108 101Z',{Y:.22,O:.1},{width:1.9,shade:P('M132 78l8 1l-1 22l-8 11l2-18Z',tint(.2)),details:P('M112 87q5-3 10-1m6 0q6-3 10 0M113 92q4-3 8 0q-4 3-8 0m16 0q4-3 8 0q-4 3-8 0M125 92l-2 11l5 1M119 109q5-2 10 0M121 112h6',line(1.05)),tag:'open-eyes'});
 s.shape('M104 78L102 60L111 64L116 52L125 61L135 52L141 64L148 60L145 78Q124 73 104 78Z',{Y:1},{width:1.8,tag:'square-crown',details:P('M119 64h11v10h-11ZM108 72l7-1m19 0l8 1',line(1.2))});
 // Right arm bends upward at the elbow; sword and fist have separate silhouettes.
 s.shape('M96 135Q83 132 77 147L64 179L60 166L47 169L52 191Q60 207 74 197L96 170Z',{O:.83,Y:.1},{shade:P(hatch(80,147,9,9,5,-2,6),line(.95)),details:P('M59 182l9 8M49 170l13-4M86 149l-10 27',line(1.4))});
 s.shape('M56 79L50 94L51 158H61L62 94Z',{B:.16},{width:1.6,tag:'sword',details:P('M56 85v72',line(.9))});
 s.shape('M44 158h24v4H58v20h-4v-20H44Z',{Y:1},{width:1.2,tag:'sword'});
 s.shape('M50 188L46 180L45 174Q44 171 47 170Q44 166 48 165L57 163Q62 162 65 166L68 172L66 182L61 190Z',{Y:.22,O:.1},{width:1.2,shade:P('M47 179q7 6 16 0l4-5l-1 8l-5 8l-11-2Z',tint(.17)),details:P('M63 169L56 174Q53 177 57 179L62 178M49 168l6 1M48 173l5 1M50 180l5 2',line(.65)),tag:'sword-hand'});
 // Left upper arm and forearm support a small suspension ring.
 s.shape('M151 137Q165 132 171 148L183 176L192 169L201 180L186 193Q176 202 166 189L147 166Z',{O:.83,Y:.1},{shade:P(hatch(159,149,15,23,5,3),line(.95)),details:P('M177 179l7 8M190 171l9 9',line(1.4))});
 // Complete beam, two paired cords and two bowls; nothing passes through fingers.
 s.knockout(C(203,178,4,cutLine(3))+P('M203 182v8M174 191h58M176 192l-10 31h20ZM230 192l-10 31h20Z',cutLine(2.6)));
 s.add('Y',symbol('scales',C(203,178,4,line(1.8))+P('M203 182v8M174 191h58',line(2))));
 s.add('N',symbol('scales',C(203,178,4,line(1))+P('M203 182v8M174 191h58',line(1.3))+P('M176 192l-10 31h20ZM230 192l-10 31h20Z',line(.8))));
 // The enlarged index and thumb overlap the upper suspension ring; the
 // remaining fingers fold back into a full palm connected to the wrist.
 s.shape('M186 171L189 162Q193 156 198 157L207 160Q211 161 211 165L210 169L207 171L209 176Q209 179 207 179Q204 179 203 174L200 172L198 177L193 181L188 179Z',{Y:.22,O:.1},{width:1.15,shade:P('M188 172q7 4 12-3l4 3l-6 5l-5 4l-5-2Z',tint(.15)),details:P('M196 163Q202 160 206 164L204 169M191 166l5 4M191 172l4 2',line(.65)),tag:'scale-hand'});
 s.shape('M164 223q12 17 24 0Z',{Y:.8},{width:1.4,tag:'scale-pan'});
 s.shape('M218 223q12 17 24 0Z',{Y:.8},{width:1.4,tag:'scale-pan'});
 // One visible shoe emerges from beneath the hem and rests on the step.
 s.add('N',E(143,332,20,2,tint(.23)));
 s.shape('M129 311Q136 314 142 312L143 319L149 322Q158 322 160 326Q161 329 157 331L137 332L126 330L125 326L128 319Z',{Y:.5,B:.18},{width:1.5,shade:P('M128 320l5 3l1 5l24-1l-1 4l-20 1l-11-2l-1-4Z',tint(.28))+P('M146 324l2 3m2-2l2 2m2-2l2 2',line(.65)),details:P('M130 315q5 3 11 0M132 318q9 1 13 7M131 319l6 1M131 322l7 1M126 327q14 5 32 1M128 328v2',line(.8)),tag:'visible-shoe'});
 return s.finish();
}
