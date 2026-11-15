// V: the public teaching institution, with blessing, two ministers and crossed keys.
import {engraving,palette,P,C,G,symbol,hatch,SOLID,tint,line,cutLine} from './engraving.js';
export const HIEROPHANT_INKS=palette([212,174,90],[155,66,79],[114,139,153],[55,38,47]);
export const HIEROPHANT_QUIET=[{x:150,y:150,rx:22,ry:30},{x:102,y:207,rx:20,ry:29},{x:206,y:228,rx:19,ry:22}];
export function hierophantPlates(card){
 const s=engraving(card);
 s.add('B',P('M-4-4H252V346H-4Z',tint(.24)));
 // Distinct architectural pillars: foliage capitals, no B / J letters.
 for(const x of [12,204]){
  s.shape(`M${x} 40h32v11h-5v217h7v15h-36v-15h7V51h-5Z`,{Y:.12,B:.32},{width:2,shade:P(`M${x+23} 51h7v217h-7Z`,tint(.35))+P(hatch(x+25,58,5,0,25,0,8),line(.8)),details:P(`M${x+5} 53v210m8-210v210M${x-1} 43q17-26 35 0M${x+17} 40v-14m0 11l-9-9m9 9l9-9`,line(1.2))});
 }
 s.shape('M62 49Q124 26 186 49V262H62Z',{Y:.19,B:.3},{shade:P('M173 49h13v213h-13Z',tint(.42))+P(hatch(69,61,4,179,6,4),line(.8)),details:P('M73 62Q124 43 175 62V245H73Z',line(1.3))});
 s.shape('M41 270H208L221 288H29ZM29 288H221L239 308H12ZM12 308H239L252 342H-4Z',{Y:.2,B:.22},{width:1.7,shade:P('M30 289h191v7H30ZM12 310h227v8H12Z',tint(.36)),details:P('M38 298h174M25 329h201',line(.9))});
 const robe='M103 118Q124 112 145 119L164 139L169 195L162 235L174 269Q149 279 126 272Q100 280 75 269L88 232L81 185L85 140Z';
 s.shape(robe,{O:.86,Y:.14},{shade:P('M139 122L161 139L166 194L156 233L172 269L151 275L136 231Z',tint(.42))+P(hatch(143,211,10,56,6,3,0,-3),line(.95))+P(hatch(85,229,-4,38,5,4,0,3),line(.9)),details:P('M108 140Q123 151 140 139M102 174L99 237L92 269M146 178L144 232L156 271M112 222L107 271M134 221l3 52',line(1.5))});
 // Pallium/stole lies on the chest, not across either hand.
 s.shape('M110 121L123 135L137 121L144 137L132 148L135 265H114L116 148L103 139Z',{Y:.65},{width:1.35,details:P('M124 151v20m-6-10h12M124 188v20m-6-10h12M124 225v20m-6-10h12',line(1.7))});
 s.shape('M114 108v13l10 10l11-10v-13Z',{Y:.23,O:.13},{width:1.3,shade:P('M127 109h8v12l-8 7Z',tint(.24))});
 s.shape('M106 77Q108 66 125 67Q141 69 143 83L141 100Q137 114 125 117Q113 115 108 101Z',{Y:.24,O:.13},{width:1.9,shade:P('M134 76l9 6l-2 20l-10 10l2-16Z',tint(.22)),details:P('M112 86q5-3 10-1m7 0q5-3 10 1M113 91l7 1m10 0l6-1M125 91l-2 11l5 1M119 108q6-2 12 0M113 98l2 5',line(1.05))});
 // Three explicit crown tiers, with the small upper cross.
 s.shape('M105 79L108 49Q112 39 124 39Q136 39 140 49L144 79Q124 73 105 79Z',{Y:.9},{width:1.7,details:P('M109 55q16-6 30 0',line(1))});
 for(const [y,w] of [[49,22],[61,30],[74,38]]){
   s.add('N',symbol('crown-tier',P(`M${124-w/2} ${y}q${w/2}-5 ${w} 0v4q${-w/2}-5 ${-w} 0Z`,line(1.3))));
   s.add('O',C(124,y,1.6,SOLID));
 }
 s.add('Y',P('M124 30v10m-4-6h8',line(2.1)));
 s.add('N',P('M124 30v10m-4-6h8',line(.85)));
 // Right arm (viewer left) rises from its shoulder to the blessing palm.
 s.shape('M100 133Q86 126 80 139L68 161L62 144L49 148L54 179Q62 194 75 184L94 164Z',{O:.82,Y:.14},{shade:P(hatch(77,147,10,7,5,-2,6),line(.9)),details:P('M56 158l13 14M53 149l10-4M83 148l-10 22',line(1.4))});
 const blessing='M51 147L49 136L43 130Q40 127 42 125Q44 123 48 129L52 132L52 111Q53 107 55 110L57 128L59 111Q61 108 62 112L62 131L65 129Q69 130 67 134L62 145L59 150Z';
 s.shape(blessing,{Y:.24,O:.13},{width:1.25,tag:'blessing-hand',details:P('M53 133q5-3 9 0M56 139l5-3',line(.7))});
 // Left hand holds the three-bar cross. Staff behind the enclosing fingers.
 s.shape('M149 134Q165 133 171 150L179 179L168 190L153 178L141 154Z',{O:.82,Y:.14},{shade:P(hatch(153,149,13,22,5,3),line(.95)),details:P('M160 174l12 8',line(1.4))});
 s.shape('M179.5 87h3v155h-3ZM174 96.5h14v3h-14ZM170 109.5h22v3h-22ZM166 123.5h30v3h-30Z',{Y:1},{width:1,tag:'triple-cross'});
 s.shape('M171 178L177 174L185 175L188 181L186 189L178 191L171 186Z',{Y:.24,O:.13},{width:1.3,details:P('M178 179l6 1m-6 3l6 1',line(.75))});
 // Crossed keys occupy an empty stone step between the kneeling figures.
 const key=(x,y,a,w)=>G(`translate(${x} ${y}) rotate(${a})`,C(0,0,6,line(w))+P('M0 6v32h7v-5H3v-4h4v-5H0',line(w)));
 s.knockout(G('translate(110 285) rotate(-40)',C(0,0,6,cutLine(4))+P('M0 6v32h7v-5H3v-4h4v-5H0',cutLine(4)))+G('translate(139 285) rotate(40)',C(0,0,6,cutLine(4))+P('M0 6v32h7v-5H3v-4h4v-5H0',cutLine(4))));
 s.add('Y',symbol('crossed-keys',key(110,285,-40,3)+key(139,285,40,3)));
 s.add('N',symbol('crossed-keys',key(110,285,-40,1)+key(139,285,40,1)));
 // Ministers seen from behind. Their necks emerge from rounded shoulders;
 // no extra front-facing arms are invented beneath the robes.
 for(const [x,kind] of [[57,'rose'],[190,'lily']]){
   s.shape(`M${x-14} 275Q${x-30} 279 ${x-33} 295L${x-35} 342H${x+35}L${x+29} 296Q${x+22} 280 ${x+12} 275Z`,{B:kind==='rose'?.28:.1,Y:.07},{width:2.1,shade:P(`M${x+11} 279Q${x+26} 291 ${x+27} 341H${x+10}L${x+2} 302Z`,tint(.34))+P(hatch(x-26,300,-4,42,5,5,0,2),line(.9)),details:P(`M${x-14} 280Q${x} 291 ${x+14} 280M${x-17} 297L${x-20} 341M${x+7} 301L${x+12} 341`,line(1.4)),tag:'kneeling-minister'});
   s.shape(`M${x-8} 266v13q8 8 16 0v-13Z`,{Y:.23,O:.12},{width:1.2});
   s.shape(`M${x-13} 253q0-16 13-16q14 0 14 16l-3 14q-11 9-21 0Z`,{Y:.22,O:.1},{width:1.8,shade:P(`M${x+6} 241q13 9 5 25l-8 5Z`,tint(.25)),details:P(`M${x-12} 250q12-12 25 0M${x-10} 253q10-7 21 0`,line(1.2))});
   if(kind==='rose'){
     s.add('O',symbol('minister-roses',[[x-9,306],[x+10,324]].map(([a,b])=>G(`translate(${a} ${b})`,Array.from({length:5},(_,i)=>{const t=i*2*Math.PI/5;return C(Math.cos(t)*2.4,Math.sin(t)*2.4,2.4,SOLID);}).join('')+C(0,0,1.3,SOLID))).join('')));
     s.add('N',[[x-9,306],[x+10,324]].map(([a,b])=>G(`translate(${a} ${b})`,P('M-2 0q1-3 3-1q2 2-1 3q-4 1-4-2M0 5v4',line(.7)))).join(''));
   }else{
     s.add('N',symbol('minister-lilies',[[x-8,306],[x+9,324]].map(([a,b])=>G(`translate(${a} ${b})`,P('M0 8V0M0 2q-9-2-5-7l5 4l5-4q4 5-5 7M0-1v-7',line(1)))).join('')));
   }
 }
 return s.finish();
}
