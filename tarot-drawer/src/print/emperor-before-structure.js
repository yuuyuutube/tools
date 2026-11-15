// IV: stone, armour and measured authority; four carved rams belong to the throne.
import {engraving,palette,P,C,G,symbol,hatch,SOLID,CUT,tint,line} from './engraving.js';
export const EMPEROR_INKS=palette([214,168,97],[182,74,52],[111,133,146],[55,39,36]);
export const EMPEROR_QUIET=[{x:151,y:151,rx:24,ry:29},{x:85,y:242,rx:17,ry:23},{x:210,y:245,rx:19,ry:20}];
const ram=(x,y,scale=1)=>G(`translate(${x} ${y}) scale(${scale})`,
 P('M-5-4C-19-16-25 4-15 8C-8 10-7 1-12-2M5-4C19-16 25 4 15 8C8 10 7 1 12-2',line(2.1))+
 P('M-8-4Q0-10 8-4L7 6L3 13H-3L-7 6Z',line(1.7))+P('M-5 1l2 1m8-1l-2 1M0 7v4M-16-3q-6 5 1 8m31-8q6 5-1 8',line(.9)));
export function emperorPlates(card){
 const s=engraving(card);
 s.add('Y',P('M-4-4H252V346H-4Z',tint(.39)));
 s.shape('M-4 203L18 145L39 176L56 138L75 188L106 164L139 195L177 146L192 167L219 133L252 183V295H-4Z',{O:.32,Y:.35},{width:1.8,shade:P(hatch(18,159,14,105,7,5,3),line(.9))+P(hatch(184,169,17,109,8,6,0),line(.9)),details:P('M18 145L29 201L21 236M56 138L57 196L71 228M219 133L222 192L237 217',line(1.2))});
 s.shape('M-3 281Q29 269 56 280Q104 292 148 277Q203 259 253 275V303Q187 287 141 296Q68 311-3 295Z',{B:.34},{width:.9,details:P('M3 287q33-10 64 2m105-5q40-14 80-3',line(.9)),tag:'distant-river'});
 s.shape('M-4 304L40 290L72 303L113 294L154 303L200 292L252 305V346H-4Z',{Y:.27,B:.15},{width:1.5,shade:P(hatch(5,318,20,19,13,20),line(.9))});
 // A single coherent throne with a recessed back and arms in front.
 s.shape('M56 49H192L201 278L193 300H55L48 279Z',{Y:.22,B:.35},{shade:P('M177 52h15l9 226l-16 21Z',tint(.5))+P(hatch(61,67,10,2,22,0,9),line(.9)),details:P('M70 76h109l7 185H63ZM57 285h135M52 294h143',line(1.5))});
 s.add('N',symbol('ram-head',ram(73,69,.85))+symbol('ram-head',ram(175,69,.85)));
 // Armour under the robe: both greaves terminate in substantial grounded boots.
 s.shape('M86 242L115 243L112 301L105 317L78 320L75 310L84 297Z',{B:.5},{width:2,shade:P('M102 250l11-3l-4 52l-9 13l-9 2Z',tint(.4)),details:P('M87 254l24 1m-25 8l24 1m-23 13l21 1M88 284l19 1M87 299l19 2M80 310l23-2',line(1.1)),tag:'armoured-leg'});
 s.shape('M138 243L164 239L170 295L181 309L177 319H149L142 302Z',{B:.5},{width:2,shade:P('M155 246l10-5l5 54l10 15l-4 7h-9l-9-20Z',tint(.4)),details:P('M143 255l21-2m-20 13l21-2m-20 14l21-2M148 288l19-2M151 302l21 1M153 311h23',line(1.1)),tag:'armoured-leg'});
 const robe='M103 119Q124 111 145 121L162 139L169 188L164 230L157 263Q143 270 127 256Q109 271 89 260L81 211L81 151Z';
 s.shape(robe,{O:.85,Y:.18},{shade:P('M139 122Q164 140 164 178L157 216L163 254L150 265L133 239L133 179Z',tint(.43))+P(hatch(140,189,13,64,5,3,0,-3),line(.95))+P(hatch(90,211,7,49,5,3,0,3),line(.9)),details:P('M109 140L99 198L106 243M126 160L121 220L126 253M143 146L137 195M90 211Q122 202 160 215M110 223l-11 34M134 224l17 37',line(1.6))});
 // Broad resting sleeves, with an elbow actually supported by each chair arm.
 s.shape('M95 132Q79 132 72 152L57 182L64 197L84 188L101 159Z',{O:.8,Y:.18},{shade:P(hatch(76,152,-9,30,6,3,2),line(.95)),details:P('M64 181l14 10M87 153l-9 20',line(1.4))});
 s.shape('M152 132Q170 134 177 156L190 185L182 198L163 185L146 157Z',{O:.8,Y:.18},{shade:P(hatch(160,151,15,27,5,3,2),line(.95)),details:P('M170 177l14 15',line(1.4))});
 s.shape('M46 187H82V273H51Z',{Y:.3,B:.32},{shade:P('M70 189h12v85H70Z',tint(.4)),details:P('M48 214h31M53 269h29',line(1.4))});
 s.shape('M166 187H202L197 273H166Z',{Y:.3,B:.32},{shade:P('M188 189h14l-5 84h-10Z',tint(.4)),details:P('M168 214h31M167 269h29',line(1.4))});
 s.add('N',symbol('ram-head',ram(64,202,.84))+symbol('ram-head',ram(184,202,.84)));
 // Right hand (viewer left) closes around the ankh's stem.
 s.shape('M57 143h4v22h-4ZM48 145h22v4H48Z',{Y:1},{width:1,tag:'ankh-sceptre'});
 s.shape('M59 143C42 136 46 119 59 119C72 119 76 136 59 143Z',{Y:1},{width:1.5,tag:'ankh-sceptre'});
 s.knockout(P('M59 138C49 133 50 123 59 123C68 123 69 133 59 138Z',CUT));
 s.add('N',P('M59 138C49 133 50 123 59 123C68 123 69 133 59 138Z',line(.9)));
 s.shape('M56 178L52 167L54 157Q56 154 59 158L60 164L66 161Q72 162 71 168L67 181L62 185Z',{Y:.26,O:.14},{width:1.35,details:P('M59 165l8 2m-9 3l8 2',line(.75))});
 // Left palm supports the orb; the fingers wrap its near lower edge.
 s.shape('M196 170a13 13 0 1 1-26 0a13 13 0 1 1 26 0Z',{Y:1},{width:1.8,shade:P('M185 157q20 13-2 26l12-1v-24Z',tint(.2)),details:P('M174 163q7-6 14-2M172 172q11 5 22 0',line(.9)),tag:'orb'});
 s.shape('M178 185L173 179L173 174Q175 172 177 176L180 179L190 177Q194 178 191 182L184 188Z',{Y:.26,O:.14},{width:1.25,details:P('M180 182l8-2',line(.7))});
 // A mature face: heavier brow, long nose, grey side hair and beard.
 s.shape('M104 73Q100 85 101 106L97 128L151 128L148 94Q146 72 125 70Z',{Y:.08,B:.11},{shade:P(hatch(102,85,0,41,12,4),line(.9))});
 s.shape('M107 75Q124 65 142 77L141 98Q137 115 124 120Q109 116 106 99Z',{Y:.25,O:.17},{width:1.9,shade:P('M132 77l10 2l-1 21l-8 12l-2-11Z',tint(.25)),details:P('M112 86q5-3 10-1m6 0q6-3 10 1M113 90l7 1m9 0l7-1M125 89l-2 13l5 2M110 96l3 6m22-6l-2 6',line(1.1))});
 s.shape('M107 101Q113 108 123 106Q134 109 142 100L144 118Q139 139 125 149Q110 141 104 120Z',{Y:.1,B:.09},{width:1.9,shade:P('M130 109l13-6l-2 20l-17 26l1-19Z',tint(.3))+P(hatch(109,113,6,22,8,3,0,2),line(.85)),details:P('M113 105q5-3 11 2q7-5 12-2M119 114q5 2 10 0M115 127l7 10m10-17l-5 20',line(1.1))});
 s.shape('M104 76L101 57L110 62L114 49L125 59L137 48L141 62L150 56L145 78Q124 71 104 76Z',{Y:1,O:.12},{width:1.8,tag:'crown',details:P('M106 71q19-6 37 1',line(1.1))+C(124,66,3,line(1.1))});
 return s.finish();
}
