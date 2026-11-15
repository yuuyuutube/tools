// II: the still guardian of the threshold, between B / J, with a partly veiled scroll.
import {engraving,palette,P,C,G,symbol,text,hatch,pomegranate,SOLID,CUT,tint,line} from './engraving.js';
export const HIGH_PRIESTESS_INKS=palette([219,201,139],[168,82,112],[89,114,169],[39,38,69]);
export const HIGH_PRIESTESS_QUIET=[{x:150,y:146,rx:23,ry:30},{x:151,y:266,rx:48,ry:25}];
export function highPriestessPlates(card){
 const s=engraving(card);
 const veil='M54 20Q124 8 194 20V253H54Z';
 s.add('B',P('M-4-4H252V346H-4Z',tint(.18)));
 s.add('B',P('M0 233Q60 224 124 233T252 233V342H0Z',tint(.44)));
 s.add('N',P('M0 244Q44 238 72 244M185 245h67M0 254h67M189 255h64M0 266h57M202 268h50',line(.9)));
 s.shape(veil,{O:.16,Y:.12},{shade:P(hatch(57,20,1,230,8,4),line(.85))+P(hatch(174,20,3,230,5,4),line(.85)),details:P('M55 20Q124 8 193 20',line(2)),tag:'veil'});
 for(const x of [77,122,167])for(const y of [48,109,169]){
   if(x===122&&y===48)continue; // clear air around the lunar globe
   s.add('O',symbol('veil-pomegranate',pomegranate(x,y,6,SOLID)));
   s.add('N',P(`M${x} ${y+21}v-11m0 4q-9-13-13-8m13 8q9-13 13-8m-13 12q-12-11-15-5m15 5q12-11 15-5`,line(.9)));
 }
 const col=x=>`M${x} 29h32v11h-4v250h6v13h-36v-13h6V40h-4Z`;
 s.shape(col(12),{N:.86},{shade:P(hatch(33,43,0,241,3,3),line(.8)),details:P('M15 40h26M15 289h26',line(1.4)),tag:'black-pillar-B'});
 s.add('N',text(28,106,'B',21,CUT));
 s.shape(col(204),{Y:.12},{shade:P('M225 41h7v247h-7Z',tint(.38))+P(hatch(223,47,6,0,30,0,8),line(.8)),details:P('M207 40h26M207 289h26',line(1.4)),tag:'white-pillar-J'});
 s.add('N',text(220,106,'J',21));
 s.shape('M76 145L84 127H164L174 147V283H75Z',{Y:.15,B:.2},{shade:P('M158 141h16v142h-16Z',tint(.4)),details:P('M76 267h98M83 275h83',line(1.4))});
 const hair='M104 70C98 77 99 98 96 117L90 145L155 146L148 108C151 81 143 66 124 65C113 65 106 66 104 70Z';
 s.shape(hair,{B:.7},{shade:P(hatch(101,81,-2,61,14,3.5,0,2),line(.85))});
 const robe='M107 118Q124 111 141 118C153 122 161 133 160 152L151 192C159 218 164 233 168 254L185 319C151 330 117 323 91 328L65 322L80 262C82 236 91 217 94 192L86 150C86 132 93 123 107 118Z';
 s.shape(robe,{B:.48},{shade:P('M141 120Q159 128 160 153L150 192Q174 246 184 318L154 323L142 235L130 189Z',tint(.38))+P(hatch(147,218,17,94,6,4,0,-7),line(.9))+P(hatch(90,250,-17,69,5,4,0,3),line(.9)),details:P('M108 130Q121 151 140 129M105 171Q124 184 145 172M108 224Q104 270 94 318M123 230L120 321M137 237Q141 287 151 322M84 285Q91 295 87 320',line(1.5))});
 s.shape('M115 106L114 119Q124 132 135 119L134 105Z',{Y:.19,O:.1},{width:1.5,shade:P('M125 109h10v11l-9 4Z',tint(.2))});
 s.shape('M105 77Q106 64 123 64Q142 65 143 80L140 97Q136 110 125 113Q114 112 108 100Z',{Y:.18,O:.08},{width:1.9,shade:P('M106 78l8 4l1 23l8 7q-15-3-17-20Z',tint(.21)),details:P('M113 83q5-3 9-1m6 0q5-3 10 0M114 87q4 2 7 0m8 0q4 2 7 0M125 87l-2 10l5 1M120 103q5-2 10 0M122 106h5',line(.95))});
 // Headdress: horns frame a central globe, rather than an ordinary crown.
 s.shape('M105 78L100 51Q106 59 115 61Q123 55 133 61Q142 58 149 50L142 78Q123 72 105 78Z',{Y:.55,B:.22},{width:1.7,tag:'horned-diadem',details:C(124,60,9,line(1.5))+P('M107 73q17-6 33 0',line(1))});
 s.add('N',symbol('solar-cross',P('M124 139v31m-11-17h22',line(3.7))));
 // Sleeves precede the lap scroll; fingers rest on it without crossing its text.
 s.shape('M94 136Q83 139 86 157L94 184Q96 193 102 197L112 192L107 180L105 149Z',{B:.36},{shade:P(hatch(89,154,11,6,5,1.5,7),line(.9)),details:P('M99 191q5-2 12-1M99 183l8 4',line(1.3))});
 s.shape('M149 136Q162 143 159 158L153 182Q151 191 146 197L136 192L139 180L138 150Z',{B:.48},{shade:P(hatch(145,153,9,5,5,0,7),line(.9)),details:P('M137 191q5-2 11 1M141 185l8-4',line(1.3))});
 s.shape('M101 207Q125 204 150 207L148 235Q125 232 101 235Z',{Y:.3},{width:1.5,tag:'TORA-scroll',details:P('M101 207q-7 0-7 6t7 6M150 207q7 0 7 6t-7 6M102 232q23-3 46 0',line(1))+text(125,228,'TORA',10)});
 // Four relaxed fingers lie over the upper roll; the thumb curls inward.
 // The wrist extends into the cuff, avoiding detached triangular palms.
 const resting='M0 0L7-1L8 5Q11 6 14 9Q16 11 14 12Q13 13 9 10L10 17Q10 20 8 20Q6 20 6 17L5 13L6 21Q6 23 4 23Q2 23 2 20L1 14L2 20Q2 22 0 22Q-2 22-2 19L-3 13L-2 17Q-2 20-4 19Q-6 18-6 14L-6 10Q-6 5-2 3Z';
 for(const transform of ['translate(103 193)','translate(145 193) scale(-1 1)'])s.shape(resting,{Y:.18,O:.1},{transform,width:1,shade:P('M-5 9Q0 13 4 12L5 18L0 18Z',tint(.13)),details:P('M-2 7Q2 5 7 8',line(.65)),tag:'scroll-hand'});
 // Mantle hides the lower-right end of the scroll, leaving the inscription visible.
 s.shape('M148 227Q155 233 157 250L167 288Q150 277 147 252L139 236Z',{B:.52},{width:1.8,shade:P(hatch(149,242,8,35,3,2),line(.9))});
 s.shape('M164 280C164 302 181 312 197 306C183 326 161 325 153 309C148 299 154 286 164 280Z',{Y:1},{width:1.7,tag:'foot-crescent'});
 s.add('N',P('M58 331Q93 319 117 331T191 330M70 337Q101 328 121 337T180 337',line(1.2)));
 return s.finish();
}
