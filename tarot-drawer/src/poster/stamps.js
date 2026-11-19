// Monochrome date seals derived from the nine original card backs.
// Native SVG keeps them editable, sharp in exported posters and independent of art.
import {burst} from '../art/kit.js';
export const STAMP_DESIGNS = [
 {id:'celestial-eye',name:'星芒之眼',asset:'card-back',color:'#b64c35',frame:'星冠八角框',description:'星芒與杏眼，像祕密學會的藏印。'},
 {id:'moth-garden',name:'夜蛾花園',asset:'card-back-moth',color:'#785064',frame:'花葉橢圓框',description:'展翅夜蛾與月點，藏在藤蔓花冠裡。'},
 {id:'tide-gate',name:'潮汐之門',asset:'card-back-tide',color:'#2d7477',frame:'貝形波浪框',description:'扇貝、珍珠與潮線，像沿海寄來的郵戳。'},
 {id:'pomegranate-garden',name:'石榴秘園',asset:'card-back-pomegranate',color:'#984554',frame:'莊園卷葉框',description:'剖面石榴與果籽，留一點莊園藏書章的氣息。'},
 {id:'serpent-ring',name:'黑金蛇環',asset:'card-back-serpent',color:'#896f3c',frame:'扇紋切角框',description:'盤蛇纏著晶石，像一枚煉金術印記。'},
 {id:'snow-fox',name:'雪境雙狐',asset:'card-back-fox',color:'#5c708f',frame:'冰晶尖拱框',description:'兩隻回望的狐狸，守著細細的雪晶。'},
 {id:'vermilion-cranes',name:'朱砂雙鶴',asset:'card-back-crane',color:'#b04f3c',frame:'如意雲紋框',description:'相向雙鶴與流雲，像一枚朱砂吉印。'},
 {id:'moon-flower',name:'月白花窗',asset:'card-back-flower',color:'#78638b',frame:'花瓣曲線框',description:'放射花冠與小葉，像壓在採集簿上的花章。'},
 {id:'jade-maze',name:'翠玉迷宮',asset:'card-back-geometry',color:'#356b53',frame:'回紋八角框',description:'八角星與折線迴廊，像古老的測繪印記。'},
];
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const path=(d,extra='')=>`<path d="${d}" ${extra}/>`;
const dot=(x,y,r=1.7)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;
const star=(x,y,r=5)=>`${burst(x,y,r,r*.32,4)} fill="currentColor" stroke="none"/>`;
const mirror=art=>`${art}<g transform="scale(-1 1)">${art}</g>`;
const oct=(w,h,c)=>`M${-w/2+c} ${-h/2}H${w/2-c}L${w/2} ${-h/2+c}V${h/2-c}L${w/2-c} ${h/2}H${-w/2+c}L${-w/2} ${h/2-c}V${-h/2+c}Z`;
const frame=(outer,inner)=>path(outer,'stroke-width="3.5" data-stamp-frame="outer"')+path(inner,'stroke-width="1.2" data-stamp-frame="inner"');
const leaf=(x,y,angle=0)=>`<path d="M0 0Q-11 -7 -4 -16Q7 -10 0 0Z" transform="translate(${x} ${y}) rotate(${angle})" stroke-width="1.25"/>`;
function artwork(id){
 switch(id){
 case 'celestial-eye':return {
  border:frame(oct(280,110,19),oct(264,94,15))+mirror(path('M-119 -34h28M-120 32h15M-116 -27h14','stroke-width="1.3"'))+star(-123,0,5)+star(123,0,5),
  icon:`${burst(0,-22,23,17,16)} stroke-width="1.4"/>`+`<ellipse cx="0" cy="-22" rx="13.6" ry="10.5" fill="#f4eedf"/>`+path('M-12 -22Q0 -33 12 -22Q0 -11 -12 -22Z','stroke-width="1.7"')+dot(0,-22,4.3)+mirror(path('M-45 -22h-28m-8 0h-8')),
 };
 case 'moth-garden':{
  const wing=path('M-2 -24C-15 -44 -36 -40 -34 -28C-33 -17 -17 -15 -3 -21M-3 -20C-23 -24 -27 -10 -19 -7C-11 -4 -6 -12 -2 -18')+path('M-7 -26Q-18 -34 -27 -30M-7 -20Q-17 -17 -18 -12','stroke-width="1.1"')+dot(-22,-27,2.1);
  return {border:frame('M-137 0C-137 -35 -99 -54 -45 -49Q-21 -61 0 -54Q21 -61 45 -49C99 -54 137 -35 137 0S99 54 45 49Q21 61 0 54Q-21 61 -45 49C-99 54 -137 35 -137 0Z','M-127 0C-127 -30 -91 -45 -44 -41Q-20 -52 0 -46Q20 -52 44 -41C91 -45 127 -30 127 0S91 45 44 41Q20 52 0 46Q-20 52 -44 41C-91 45 -127 30 -127 0Z')+mirror(path('M-116 20Q-136 -7 -102 -32')+leaf(-116,10,-50)+leaf(-113,-9,15)+leaf(-100,-29,60)),icon:mirror(wing)+path('M0 -35C-5 -29 -4 -15 0 -7C4 -15 5 -29 0 -35ZM-1 -34Q-10 -43 -9 -38M1 -34Q10 -43 9 -38')+dot(-58,-23)+dot(58,-23)+star(-75,-23,3.5)+star(75,-23,3.5)};
 }
 case 'tide-gate':return {
  border:frame('M-118 -51H118Q130 -50 130 -37Q145 -33 138 -17Q149 0 138 17Q145 33 130 37Q130 50 118 51H-118Q-130 50 -130 37Q-145 33 -138 17Q-149 0 -138 -17Q-145 -33 -130 -37Q-130 -50 -118 -51Z','M-114 -43H114Q121 -43 122 -31Q134 -28 130 -15Q140 0 130 15Q134 28 122 31Q121 43 114 43H-114Q-121 43 -122 31Q-134 28 -130 15Q-140 0 -130 -15Q-134 -28 -122 -31Q-121 -43 -114 -43Z')+mirror(path('M-118 -23Q-126 -12 -118 -2T-118 19','stroke-width="1"')),
  icon:path('M-5 -7C-11 -17 -31 -20 -28 -32Q-27 -39 -20 -35Q-20 -44 -12 -40Q-8 -49 0 -42Q8 -49 12 -40Q20 -44 20 -35Q27 -39 28 -32C31 -20 11 -17 5 -7Z','stroke-width="2"')+path('M0 -9V-40M-3 -9L-12 -37M3 -9L12 -37M-5 -10L-22 -32M5 -10L22 -32M-7 -6Q0 -2 7 -6','stroke-width="1.1"')+mirror(path('M-46 -20q-8 -6 -16 0t-16 0t-16 0M-46 -13q-8 -6 -16 0t-16 0','stroke-width="1.5"')),
 };
 case 'pomegranate-garden':return {
  border:frame('M-107 -52H107Q109 -40 127 -43Q120 -27 138 -22V22Q120 27 127 43Q109 40 107 52H-107Q-109 40 -127 43Q-120 27 -138 22V-22Q-120 -27 -127 -43Q-109 -40 -107 -52Z','M-102 -44H102Q107 -31 117 -34Q114 -22 130 -16V16Q114 22 117 34Q107 31 102 44H-102Q-107 31 -117 34Q-114 22 -130 16V-16Q-114 -22 -117 -34Q-107 -31 -102 -44Z')+mirror(path('M-105 21Q-126 9 -114 -4Q-101 -14 -101 -29')+leaf(-108,10,-75)+leaf(-103,-20,45)),
  icon:path('M-5 -38L-10 -46L-2 -43L0 -49L3 -43L11 -46L6 -38M0 -35C-19 -47 -30 -25 -18 -13Q-10 -5 0 -4Q10 -5 18 -13C30 -25 19 -47 0 -35Z','stroke-width="1.9"')+path('M0 -31Q-14 -40 -17 -25Q-19 -15 0 -9Q19 -15 17 -25Q14 -40 0 -31Z','stroke-width="1.1"')+[-10,0,10].map((x,i)=>dot(x,-24+(i%2)*2,2)).join('')+dot(-5,-16,1.8)+dot(5,-16,1.8)+mirror(path('M-42 -17Q-66 -17 -78 -33')+leaf(-58,-21,85)+leaf(-75,-30,15)),
 };
 case 'serpent-ring':return {
  border:frame(oct(280,110,27),oct(264,94,23))+mirror(path('M-107 -43L-132 -18M-98 -43L-132 -9M-89 -43L-132 0M-116 34L-132 18M-107 43L-132 18','stroke-width="1.1"')),
  icon:path('M18 -36C25 -51 -5 -51 -18 -37C-34 -19 -15 -7 0 -17C13 -26 29 -15 15 -6C6 0 -8 -3 -11 -8','stroke-width="5.5"')+path('M19 -37L25 -32L16 -29L13 -34Z','fill="currentColor" stroke-width="1"')+dot(19,-33,1)+path('M-2 -38L7 -28L-2 -15L-11 -28ZM-2 -38V-15M-11 -28H7','stroke-width="1.1"')+mirror(path('M-45 -21h-43M-54 -26h-24M-54 -16h-24')),
 };
 case 'snow-fox':{
  const fox=path('M-5 -14L-19 -8L-34 -18L-34 -40L-25 -31L-18 -43L-16 -27L-6 -22L-1 -17Z','stroke-width="1.8"')+path('M-30 -34L-29 -22L-22 -16M-20 -35L-22 -25M-18 -21L-12 -19','stroke-width="1"')+dot(-22,-23,1.3)+dot(-3,-17,1.4)+path('M-30 -12Q-45 -13 -46 -24Q-51 -8 -35 -4','stroke-width="1.4"');
  return {border:frame('M-140 0L-120 -37L-42 -46L0 -59L42 -46L120 -37L140 0L120 37L42 46L0 59L-42 46L-120 37Z','M-130 0L-115 -29L-40 -38L0 -50L40 -38L115 -29L130 0L115 29L40 38L0 50L-40 38L-115 29Z')+mirror(path('M-117 -16l14 -10M-117 -8l23 -16M-118 16l14 10','stroke-width="1.1"')),
  icon:mirror(fox)+path('M0 -39V-25M-6 -35L6 -29M6 -35L-6 -29','stroke-width="1.25"')+mirror(star(-77,-20,4))};
 }
 case 'vermilion-cranes':{
  const crane=path('M-8 -17Q-14 -30 -27 -25L-40 -31L-33 -19Q-27 -10 -14 -14Q-4 -21 -12 -31Q-21 -39 -14 -42Q-8 -44 -6 -39L-17 -37','stroke-width="1.7"')+path('M-28 -22L-35 -17M-24 -20L-29 -15M-18 -18L-21 -12M-18 -13L-22 -4M-14 -13L-12 -4','stroke-width="1"');
  return {border:frame('M-106 -52H106Q107 -44 117 -44Q136 -49 137 -35Q139 -25 129 -22Q146 -16 140 -4Q149 7 135 17Q143 37 124 39Q119 51 106 52H-106Q-119 51 -124 39Q-143 37 -135 17Q-149 7 -140 -4Q-146 -16 -129 -22Q-139 -25 -137 -35Q-136 -49 -117 -44Q-107 -44 -106 -52Z','M-102 -44H102Q106 -35 119 -36Q132 -39 128 -30Q120 -24 122 -17Q138 -15 130 -4Q140 7 125 13Q134 29 118 31Q113 43 102 44H-102Q-113 43 -118 31Q-134 29 -125 13Q-140 7 -130 -4Q-138 -15 -122 -17Q-120 -24 -128 -30Q-132 -39 -119 -36Q-106 -35 -102 -44Z'),icon:mirror(crane)+dot(0,-28,3)+mirror(path('M-53 -22Q-63 -32 -69 -24Q-75 -33 -83 -25Q-90 -28 -94 -22M-53 -15H-87','stroke-width="1.2"'))};
 }
 case 'moon-flower':{
  const petals=Array.from({length:12},(_,i)=>`<g transform="translate(0 -24) rotate(${i*30})">${path('M0 -5C-8 -10 -6 -18 0 -22C6 -18 8 -10 0 -5Z','stroke-width="1.2"')}</g>`).join('');
  return {border:frame('M-111 -46Q-137 -46 -133 -22Q-151 -14 -138 0Q-151 14 -133 22Q-137 46 -111 46Q-95 58 -70 49Q-37 60 0 54Q37 60 70 49Q95 58 111 46Q137 46 133 22Q151 14 138 0Q151 -14 133 -22Q137 -46 111 -46Q95 -58 70 -49Q37 -60 0 -54Q-37 -60 -70 -49Q-95 -58 -111 -46Z','M-107 -38Q-126 -38 -124 -18Q-139 -10 -128 0Q-139 10 -124 18Q-126 38 -107 38Q-94 49 -70 41Q-36 51 0 46Q36 51 70 41Q94 49 107 38Q126 38 124 18Q139 10 128 0Q139 -10 124 -18Q126 -38 107 -38Q94 -49 70 -41Q36 -51 0 -46Q-36 -51 -70 -41Q-94 -49 -107 -38Z'),icon:petals+dot(0,-24,4)+mirror(path('M-40 -21Q-62 -9 -86 -26')+leaf(-58,-16,70)+leaf(-79,-23,15))};
 }
 case 'jade-maze':return {
  border:frame(oct(280,110,25),oct(264,94,21))+mirror(path('M-101 -44v12h-17v16h-14M-91 -44v21h-18v17h-23M-101 44V32h-17V16h-14','stroke-width="1.4"')),
  icon:`${burst(0,-23,24,12,8,-67.5)} stroke-width="1.6"/>`+`${burst(0,-23,13,6,4)} stroke-width="1.2"/>`+mirror(path('M-40 -24h-15v-12h-16v11h-15M-40 -17h-22v-12h-9','stroke-width="1.5"')),
 };
 }
}
export function dateStampSVG(designId,{cx=0,cy=0,date='',rotation=0,wear=.35,id='date_stamp'}={}){
 const design=STAMP_DESIGNS.find(d=>d.id===designId)||STAMP_DESIGNS[0],art=artwork(design.id);
 const amount=Number.isFinite(wear)?Math.max(0,Math.min(1,wear)):.35;
 const filterId=String(id).replace(/[^a-zA-Z0-9_-]/g,'_')+'_wear';
 const filter=amount>0?`<defs><filter id="${filterId}" filterUnits="userSpaceOnUse" x="-160" y="-72" width="320" height="144" color-interpolation-filters="sRGB"><feTurbulence type="fractalNoise" baseFrequency="1.15" numOctaves="2" seed="29" result="paper"/><feColorMatrix in="paper" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0"/><feComponentTransfer result="wearMask"><feFuncA type="linear" slope="12" intercept="${-12*(.69-amount*.17)}"/></feComponentTransfer><feComposite in="SourceGraphic" in2="wearMask" operator="out" result="dry"/><feTurbulence baseFrequency="1.5" numOctaves="2" seed="31" result="edge"/><feDisplacementMap in="dry" in2="edge" scale="${amount*.65}" xChannelSelector="R" yChannelSelector="G"/></filter></defs>`:'';
 return `<g data-poster-layer="date-stamp" data-stamp-design="${design.id}" transform="translate(${cx} ${cy}) rotate(${rotation})" opacity=".93" style="mix-blend-mode:multiply;color:${design.color}">${filter}<g ${amount>0?`filter="url(#${filterId})"`:''} fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${art.border}<g data-stamp-emblem="${design.id}">${art.icon}</g><text data-stamp-date="true" x=".75" y="31" text-anchor="middle" font-family="Georgia,'Times New Roman',serif" font-size="23" font-weight="700" letter-spacing="1.5" fill="currentColor" stroke="none">${esc(date)}</text></g></g>`;
}
export function standaloneStampSVG(designId,options={}){
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-160 -72 320 144" role="img" aria-label="${esc(STAMP_DESIGNS.find(d=>d.id===designId)?.name||'日期印章')}">${dateStampSVG(designId,options)}</svg>`;
}
