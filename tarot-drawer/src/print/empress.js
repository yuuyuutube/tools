// III: abundance carried by a reclining, weighted figure, not a second priestess.
import {engraving,palette,P,C,E,G,symbol,hatch,star,pomegranate,SOLID,CUT,tint,line} from './engraving.js';
export const EMPRESS_INKS=palette([228,180,77],[191,87,100],[86,139,133],[47,57,42]);
export const EMPRESS_QUIET=[{x:139,y:160,rx:23,ry:28},{x:79,y:203,rx:15,ry:23},{x:166,y:274,rx:25,ry:19}];
export function empressPlates(card){
 const s=engraving(card);
 s.add('Y',P('M-4-4H252V346H-4Z',tint(.25)));
 // Distant woodland first; nearer trees have separate roots, forked branches,
 // bark, and overlapping leaf crowns rather than a single striped green wall.
 s.shape('M-4 75Q5 53 18 70Q29 46 43 65Q58 45 71 65Q83 60 92 80V242H-4ZM171 76Q188 53 201 69Q213 45 228 63Q242 49 253 65V238H174Z',{B:.26},{width:1.1,details:P('M5 97L8 224M41 84L44 222M73 96L77 224M185 99L182 220M219 86L222 219M248 87L246 223',line(.85))});
 const foliage='M-26 6C-37 4-36-8-28-12C-34-22-23-31-14-27C-10-38 4-36 7-28C18-34 27-25 24-17C38-16 39-2 30 3C36 14 26 25 16 22C10 35-2 31-7 25C-21 32-31 23-26 14C-35 15-37 8-26 6Z';
 const crown=(x,y,rx,ry,dark=.42)=>s.shape(foliage,{B:dark*.8,Y:.24},{transform:`translate(${x} ${y}) scale(${rx/36} ${ry/36})`,width:0,
   overprint:{B:P('M-36 2Q-25-3-17 5Q-8-2 3 4Q13-4 24 0L38-6V38H-36Z',tint(.65))+P('M-32-13Q-22-19-10-10Q0-19 14-11Q25-17 35-8L28 3Q12-1 5 8Q-10 1-16 10L-33 0Z',tint(.48)),Y:P('M-33-16Q-28-34-12-28Q-2-37 8-26Q20-31 26-18Q15-19 10-13Q1-21-8-15Q-22-23-33-16Z',tint(.45))},
   shade:P('M-35 14Q-15 23 1 14Q15 22 34 8V38H-35Z',tint(.12))+P('M-29 13l6 8m-3-11l6 8m-2-10l6 8M-5 23l4 6m0-9l5 7m0-9l5 6M17 14l6 6m-2-11l6 6',line(.8)),
   details:P('M-27-4q7-8 13-4m8-10q7-4 12 1M12-7q6-7 13-4M-16 11q7-8 14-3M10 8q6-7 13-4',line(.75)),tag:'leaf-crown'});
 for(const v of [[9,68,31,35,.38],[52,57,36,32,.4],[76,88,27,32,.35],[185,72,29,35,.38],[222,52,37,33,.4],[250,88,31,36,.4]])crown(...v);
 s.shape('M17 99L21 157Q22 202 14 237L5 247Q20 244 25 237L37 246L47 245L32 234Q28 204 31 173L33 119L48 97L43 92L29 108L29 79L23 77L22 102L11 88L7 93Z',{Y:.3,B:.22},{width:1.8,shade:P('M26 104L29 84L31 118Q26 202 33 234L43 244L33 242L25 234L26 165Z',tint(.43)),details:P('M20 126Q27 173 21 220M26 183l-1 36M20 137l-5-18M24 237l-5 6M29 230l4 8M27 119l14-21M20 154q-5 5 0 13q5-7 0-13Z',line(.85)),tag:'barked-tree'});
 s.shape('M59 91L62 141L59 218L54 232L67 227L72 233L82 232L70 220L69 155L73 122L85 108L81 104L69 116L66 86Z',{Y:.24,B:.24},{width:1.5,shade:P('M65 93l4 30l-3 92l7 14l-8-6Z',tint(.35)),details:P('M64 130l-1 56M66 194l-2 22M69 123l10-11M60 219l-3 9',line(.8))});
 s.shape('M225 87L228 137L227 194L221 220L231 225L239 223L234 211L234 151L239 119L250 104L246 99L233 116L233 83Z',{Y:.25,B:.25},{width:1.7,shade:P('M230 101l4 19l-3 87l5 16l-7-4Z',tint(.38)),details:P('M230 141l1 45M231 191l-3 20M236 120l10-16M229 131q-4 5 0 10q3-5 0-10Z',line(.85)),tag:'barked-tree'});
 crown(5,100,24,25,.49);crown(55,88,27,22,.47);crown(197,96,29,27,.45);crown(248,110,25,25,.49);
 // Two rocky banks enclose a continuous fall. Water stays paper-light and
 // vertical over the ledge, then fans into foam and horizontal pool ripples.
 s.shape('M179 145L195 137L207 146L201 165L202 187L194 210L184 220L173 215L182 192L178 178Z',{Y:.2,B:.42},{width:1.6,shade:P('M193 144l10 3l-6 20l2 20l-10 21l-10 6l8-25l-4-14Z',tint(.34))+P(hatch(181,163,11,9,5,0,7),line(.85)),details:P('M181 151l13-5l4 6M183 177l9 8l-4 15M179 211l12-10',line(1.05)),tag:'water-bank'});
 s.shape('M214 140L230 144L235 161L227 176L230 191L242 208L244 229L229 241L214 228L219 211L208 199L214 178Z',{Y:.22,B:.42},{width:1.6,shade:P('M222 146l8 3l4 13l-10 15l4 16l12 16l1 17l-9 11l-7-9l5-15l-10-17Z',tint(.4))+P(hatch(218,158,9,8,5,0,8),line(.85)),details:P('M216 146l10 7l-3 15M220 180l6 10l-2 11M225 207l13 6l-3 15M217 225l8 7',line(1.05)),tag:'water-bank'});
 s.shape('M203 145Q209 141 216 147L215 170Q210 185 212 196L220 210Q224 216 220 222L212 233L200 233L193 223Q195 214 202 207L200 193Q203 175 201 162Z',{B:.28},{width:0,
   overprint:{B:P('M211 146Q215 157 211 172L209 190Q207 199 213 208L218 218L213 223L209 211Q204 200 206 188L208 168Z',tint(.62))+P('M202 150L204 173L202 193L205 208L198 219L196 221L202 206L200 191L202 171Z',tint(.5))+E(207,226,12,3.6,tint(.56))+E(207,225,9,2.1,CUT)+C(199,221,1.8,CUT)+C(216,219,1.6,CUT)+P('M207 148Q210 169 206 187L205 198L204 185L206 166Z',CUT)},tag:'waterfall'});
 s.shape('M191 227Q202 235 218 230Q234 232 242 242L251 253Q238 258 222 253Q203 251 184 242Z',{B:.28},{width:0,
   overprint:{B:P('M188 237Q204 242 220 237L232 240Q211 247 193 241Z',tint(.35))+P('M203 246Q224 245 241 251L245 254L221 251Z',tint(.48))+E(207,232,14,3,tint(.55))+E(207,231,11,1.8,CUT)+P('M190 235Q204 238 217 234L219 235Q204 240 190 236Z',CUT)+P('M215 245l19 2l-3 1l-17-2Z',CUT)},tag:'woodland-pool'});
 s.shape('M-4 254Q98 238 180 250L199 246Q228 255 253 260V346H-4Z',{B:.3,Y:.28},{width:1.3,shade:P(hatch(-2,292,24,-12,13,21,1),line(.9))});
 for(const [x,y] of [[5,247],[44,241],[185,246],[244,251]])s.add('N',G(`translate(${x} ${y})`,P('M0 7Q1-9-9-18M0 7Q1-9 13-16M0 7L4-20M-5-9l-5 0m6 4l-6 1M7-9l6 0m-8 5l7 1M3-12l-5-4m6 0l5-4',line(.8))));
 // A carved armchair: continuous back frame, inset upholstery, a cushion
 // resting on an apron, and supported scroll arms. The figure overlaps it.
 s.shape('M58 127C58 109 72 101 92 104L125 113C140 116 147 133 148 152L155 211L69 217Z',{Y:.72,O:.25},{width:2.2,shade:P('M130 120Q144 131 146 153L153 210L142 210L135 151Z',tint(.38)),details:P('M63 130Q61 113 83 110L122 120M65 139L76 209',line(1.1)),tag:'chair-back-frame'});
 s.shape('M67 129C66 116 79 112 93 116L120 124Q134 128 137 145L144 204L75 207Z',{O:.58,Y:.08},{width:1.5,shade:P('M70 134L80 141L83 202L75 206Z',tint(.28))+P(hatch(70,149,4,44,4,3,0,2),line(.8)),details:P('M72 130Q71 121 85 121L118 129M74 137l6 59M80 138l-3-3m3 3l5-3m-5 3l-2 5M82 164l-4-3m4 3l5-3m-5 3l-2 5M85 188l-5-3m5 3l4-4',line(.85)),tag:'chair-back-cushion'});
 s.shape('M74 234L85 239L80 280L84 290L77 297H65L62 292L73 280Z',{Y:.72,O:.24},{width:1.8,shade:P('M79 241l5 1l-7 39l4 10l-5 4h-6l5-15Z',tint(.36)),details:P('M78 246l-3 28M66 292h13',line(.9)),tag:'chair-leg'});
 s.shape('M145 229H158L164 279L171 285L169 292L156 290L151 280Z',{Y:.72,O:.24},{width:1.8,shade:P('M153 234l4 2l6 43l6 7l-2 4l-8-4Z',tint(.35)),tag:'chair-leg'});
 s.shape('M54 219L84 233L164 222V233L83 245L54 231Z',{Y:.72,O:.24},{width:1.9,shade:P('M55 226l28 13l81-12v6l-81 12l-29-14Z',tint(.35)),details:P('M59 228l24 11l74-11',line(1)),tag:'chair-seat-apron'});
 s.shape('M69 202Q104 194 140 201L162 219Q129 234 85 231L54 217Q56 207 69 202Z',{O:.62,Y:.07},{width:1.8,shade:P('M55 217Q96 235 162 219L157 225Q117 239 85 232Z',tint(.32)),details:P('M59 216Q99 231 153 218M63 211Q75 207 89 208',line(1.1)),tag:'chair-seat-cushion'});
 s.shape('M72 204L80 207L77 233L68 229Z',{Y:.72,O:.24},{width:1.7,shade:P('M76 208l3 1l-3 23l-3-2Z',tint(.32)),details:P('M73 211l-2 15',line(.85))});
 s.shape('M48 191C42 185 44 177 51 176C61 175 65 191 76 196L88 200L85 208L72 205C59 201 56 185 51 185Q48 185 52 190Z',{Y:.78,O:.2},{width:1.9,shade:P('M51 180Q59 179 64 193L75 200L87 203L85 208L72 205Q60 200 56 187Z',tint(.28)),details:P('M48 183q5-7 10 2M66 197l12 6',line(.9)),tag:'chair-scroll-arm'});
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
 s.shape('M142 145Q154 144 160 156L166 184Q169 192 162 202L155 211L145 204L151 187L140 170Z',{Y:.13,O:.07},{shade:P(hatch(148,161,9,6,4,1,6),line(.9)),details:P('M146 201q5 2 10 8M153 188q5 0 9 4',line(1.3))});
 s.shape('M150 204L157 210L149 216L141 222L137 225Q135 226 133 224L134 222Q131 224 129 222L130 219Q127 221 125 218L126 216Q123 215 125 212L132 207L140 205L144 201Q147 198 149 201L147 205Z',{Y:.24,O:.12},{width:1,shade:P('M148 213l1 2l-10 8l-3-1l6-6Z',tint(.1)),details:P('M139 211q4 0 7-3M128 216l7-5M131 219l7-5M135 222l6-5',line(.6)),tag:'lap-hand'});
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
