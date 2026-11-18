// Semantic colour repairs in original 819 × 1229 drawing coordinates.
// Read the smooth source for boundaries: woodcut hatch marks must not split a
// single physical object into separate colour regions. No ink is painted here.
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export const REPAIRED_CARDS=[3,4,5,6,9,11,13,15,16,12,20,17,21,10,19,14];
export async function repairColours(number,labels,roles,w,h){
 if(!REPAIRED_CARDS.includes(number))return;
 const image=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=`/docs/tarot-sunburst/line/${number}.png`;});
 const cv=make(w,h),g=cv.getContext('2d',{willReadFrequently:true});g.drawImage(image,0,0,w,h);
 const raw=g.getImageData(0,0,w,h).data,free=new Uint8Array(w*h);for(let i=0;i<free.length;i++)free[i]=raw[i*4]>199;
 const id=name=>{const v=roles.findIndex(r=>r.id===name);if(v<0)throw Error('Unknown colour '+name);return v;};
 const shape=path=>{g.clearRect(0,0,w,h);g.save();g.scale(w/819,h/1229);g.fillStyle='white';g.fill(new Path2D(path));g.restore();const p=g.getImageData(0,0,w,h).data,m=new Uint8Array(w*h);for(let i=0;i<m.length;i++)m[i]=p[i*4+3]>127;return m;};
 const rectangle=([x0,y0,x1,y1])=>`M${x0} ${y0}H${x1}V${y1}H${x0}Z`;
 const flood=(points,box=[0,0,819,1229])=>{
  const allowed=shape(Array.isArray(box)?rectangle(box):box),mask=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
  for(const [x,y]of points){let X=Math.round(x*w/819),Y=Math.round(y*h/1229),s=Y*w+X;
   if(!free[s]){let found=false;for(let r=1;r<=6&&!found;r++)for(let dy=-r;dy<=r&&!found;dy++)for(let dx=-r;dx<=r;dx++){const t=(Y+dy)*w+X+dx;if(allowed[t]&&free[t]){s=t;found=true;break;}}}
   if(allowed[s]&&free[s]&&!mask[s]){mask[s]=1;q[tail++]=s;}
  }
  while(head<tail){const i=q[head++],x=i%w;for(const j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<mask.length&&!mask[j]&&allowed[j]&&free[j]){mask[j]=1;q[tail++]=j;}}
  return mask;
 };
 const put=(mask,role,from)=>{const value=id(role),only=from?.map(id);for(let i=0;i<labels.length;i++)if(mask[i]&&(!only||only.includes(labels[i])))labels[i]=value;};
 const region=(point,role,box)=>put(flood([point],box),role);
 const paint=(path,role,from)=>put(shape(path),role,from);

 // These shapes select colour only; the original ink and hatching stay intact.
 if(number===3){
  paint('M166 352Q181 342 193 355Q210 350 219 365Q235 360 243 375Q255 378 258 398L245 414L209 435L170 429Z','forest',['warm-sky']);
  paint('M44 558Q77 553 97 568Q111 581 119 599L112 617L44 624Z','bank-rock');
  paint('M44 709Q58 697 73 702Q91 704 101 724L116 733Q107 744 44 741Z','bank-rock');
  for(const p of [[70,430],[130,470],[175,465],[222,386],[205,350]])region(p,'forest',[44,340,254,502]);
  for(const p of [[67,528],[90,549]])region(p,'bank-grass',[44,500,130,567]);
  for(const p of [[70,578],[72,615],[70,721]])region(p,'bank-rock',[44,555,127,750]);
 }
 if(number===4){
  // Armour flutes are separated by ink, but all belong to the same steel plate.
  paint('M337 447Q405 482 465 455L489 482L483 527L432 523L335 538L329 529Z','chest-armour');
  paint('M337 563Q407 547 483 563L483 580L434 602L335 590Z','chest-armour');
  for(const p of [[355,580],[382,580],[415,580],[450,580],[475,576]])region(p,'chest-armour',[330,562,485,603]);
 }
 if(number===5){
  // Gold key behind the silver key; holes in the bows reveal the stone step.
  paint('M355 824C325 824 320 856 342 866L449 944L466 955L491 929L476 915L467 922L457 912L447 918L369 855C385 833 372 824 355 824Z','key-gold');
  paint('M461 824C435 824 426 850 443 863L328 920L321 929L344 954L371 933L375 921L475 864C496 847 482 824 461 824Z','key-white');
  region([353,846],'stone',[340,832,366,858]);
  region([461,846],'stone',[448,832,474,858]);
  for(const [p,r]of [[[340,932],'key-white'],[[354,941],'key-white'],[[376,917],'key-white'],[[471,932],'key-gold'],[[481,928],'key-gold'],[[456,919],'key-gold']]){const m=flood([p],[318,868,500,956]);let area=0;for(const v of m)area+=v;if(area<10000)put(m,r);}
 }
 if(number===6){
  // Skin follows the source contour, not the previous coarse polygon.
  for(const [p,box]of [[[243,590],[195,527,300,696]],[[169,690],[145,578,200,776]],[[325,685],[280,605,403,739]]])region(p,'man',box);
  // The two negative spaces must be put back AFTER the body colour.
  paint('M192 606Q196 635 204 653L204 679L190 697L180 691L174 670L181 645Z','gold-sky');
  paint('M279 643Q286 659 298 673L314 688L305 700L290 694L280 681Z','mountain');
  // Garden seen between the legs; exclude both calves and feet.
  region([228,880],'garden','M245 815L252 825L249 855L242 900L243 950L235 974L202 980L180 974L185 940L204 895L212 865L232 839Z');
  region([145,601],'knowledge-tree',[120,574,170,625]);
  for(const p of [[132,597],[70,667],[68,535],[139,786],[151,879]]){const m=flood([p],[42,500,170,925]);let area=0;for(const v of m)area+=v;if(area<7000)put(m,'knowledge-tree');}
 }
 if(number===9){
  paint('M346 239Q390 207 433 193Q461 187 463 219L462 251Q470 271 491 289L490 309L453 338L430 351L433 322L421 300L400 278L377 256L353 241L355 275L345 264Z','blue');
  paint('M433 351Q462 328 490 309Q528 310 548 349L541 375L539 433L562 432L579 410L597 427L608 449L600 541L598 650L603 741L624 825L645 888L678 924L659 934L627 935L586 917L563 932L535 922L524 897L510 899L523 823L531 743L538 650L539 520L540 440L532 411L518 407L513 476L503 558L490 542L468 491L451 438Z','blue',['cream','white','blue','deep-blue','pale-sky','stone','grey','slate','sage']);
  // One blue outer mantle; cream lining, hair, hands and the inner robe remain.
  const outer='M346 239Q390 207 433 193Q461 187 463 219L462 251Q470 271 491 289L490 309Q540 309 551 359L543 374L539 431L563 432L579 408Q609 419 609 449L601 532L597 642L602 740L623 822L644 887L679 922L663 932L626 936L585 918L563 932L533 921L521 899L496 911L461 909L414 876L392 827L332 817L336 770L311 709L300 641L298 550L270 472L250 380L255 248L284 260L318 281L342 310L352 321L355 301L346 281Z';
  paint(outer,'blue',['blue','deep-blue','slate','grey','stone','sage','pale-sky']);
 }
 if(number===11){
  region([614,398],'skin',[585,369,640,446]);
 }
 if(number===13){
  // Unified grass bed; exclude the white horse, kneeling figure, crown and rose.
  const ground='M60 760L145 770L223 777L295 790L348 799L351 854L373 870L398 871L408 852L409 821L460 811L535 816L554 854L528 900L521 939L548 972L584 985H60Z';
  paint(ground,'meadow',['sand','wood','hair','dark-brown','skin','ochre-sky','sage','green','meadow','grey','stone']);
  // Stones are deliberately bounded individual silhouettes, never grass specks.
  for(const p of [[93,931],[474,917],[280,970],[285,850],[531,935],[80,983]]){const m=flood([p],[60,795,550,991]);let area=0;for(const v of m)area+=v;if(area<2400)put(m,'stone');}
 }
 if(number===15){
  // Roof silhouettes continue to the top bleed, following the stalactite tips.
  paint('M0 0H294V135L266 140L253 133L234 151L222 208L218 175L203 202L199 190L187 214L180 192L163 227L150 270L138 188L130 214L119 255L112 284L103 296L91 353L65 402L61 214L74 186L109 155V0Z','navy',['navy','black','charcoal','slate','grey','stone','blue','deep-blue','pale-sky','sage']);
  paint('M512 0H819V526L753 532L750 231L738 201L721 170L709 205L702 268L699 409L684 343L678 288L662 243L645 221L629 200L621 148L607 240L595 214L582 233L574 146L564 181L551 140L548 180L535 155L523 139H512Z','navy',['navy','black','charcoal','slate','grey','stone','blue','deep-blue','pale-sky','sage']);
 }
 if(number===12){
  // Two actual hill/ground components, not the ragged halo picked from print dots.
  const ground='M55 716Q115 691 160 693Q230 708 302 740L335 756H480Q560 716 634 707Q690 707 765 737V1229H55Z';
  region([280,830],'meadow',ground);
  region([210,744],'sage',ground);
  region([410,1000],'meadow',ground);
  const halo=shape('M487 784A79 79 0 1 0 329 784A79 79 0 1 0 487 784Z');
  // Halo is behind head, hair and collar; it affects only background colours.
  put(halo,'gold',['blue','deep-blue','pale-sky','sage','meadow','green','sand','stone','grey','pale-gold','gold','ochre-sky']);
  paint('M70 100H300V180H70ZM550 100H760V180H550Z','green',['gold','pale-gold','ochre-sky','skin','sand','cream']);
  paint('M70 250H300V860H70ZM550 250H760V860H550Z','green',['gold','pale-gold','ochre-sky','skin','sand','cream']);
  // Skin is restored after the halo so its gold never covers the face or neck.
  for(const p of [[408,775],[408,735]])region(p,'skin',[365,710,450,825]);
 }
 if(number===20){
  paint('M0 0H819V175H0Z','blue',['blue','deep-blue','pale-sky','slate','stone','grey','sage']);
  const belowCloud='M0 460Q80 465 155 451Q205 465 251 499Q265 512 252 529Q275 527 279 540L300 570Q331 549 352 543Q375 539 389 559Q415 549 434 554Q439 537 453 530Q468 514 489 517Q500 505 515 515Q535 505 556 515Q568 513 578 527Q583 535 599 531Q615 529 627 519Q653 513 681 505Q735 495 819 470V730H0Z';
  paint(belowCloud,'blue',['white','cream','pale-gold','blue','deep-blue','pale-sky','stone','grey','sage']);
  region([125,950],'wood',[60,900,240,1229]);
  region([400,970],'wood',[258,930,560,1229]);
  region([690,950],'wood',[580,900,760,1229]);
  for(const [points,box]of [[[[210,605],[140,685],[155,760]],[60,550,258,900]],[[[300,660],[415,780],[530,625]],[260,570,555,915]],[[[590,650],[675,700],[650,770]],[550,570,755,895]]])for(const p of points){const m=flood([p],box);let area=0;for(const v of m)area+=v;if(area<50000)put(m,'skin');}
  // Leaf bases are open in the source: trace their silhouettes so the coffin
  // behind them cannot be reached by a flood fill.
  paint('M60 1003V924Q80 938 85 966Q95 949 137 936Q135 969 110 994Q126 980 143 991Q138 971 149 947Q171 958 172 983Q188 972 206 966Q201 987 182 1001L208 1003Z','green');
  paint('M610 1003Q618 990 630 990Q619 977 615 974Q640 964 659 987Q647 967 659 944Q680 949 688 978Q677 952 697 924Q717 947 709 980Q724 951 757 934Q758 961 739 985Q750 971 760 974V1003Z','green');

 }
 if(number===17){
  // Stars are deliberately authored colour silhouettes, not blurred samples.
  region([410,180],'navy',[55,80,765,440]);
  const star=(x,y,r)=>Array.from({length:16},(_,i)=>{const a=-Math.PI/2+i*Math.PI/8,v=i%2?r*.32:r;return `${i?'L':'M'}${x+Math.cos(a)*v} ${y+Math.sin(a)*v}`;}).join('')+'Z';
  paint(star(410,233,79),'gold');
  for(const [x,y]of [[260,195],[560,195],[200,278],[620,278],[280,340],[530,340]])paint(star(x,y,24),'white');
  region([600,940],'water',[390,775,765,1020]);
  region([318,968],'stone',[240,920,383,1020]);
  region([700,754],'stone',[641,704,765,782]);
  region([733,994],'stone',[660,966,765,1020]);
  for(const path of ['M230 940Q280 911 319 931Q360 944 383 1020H230Z','M642 746Q683 707 722 723Q748 729 770 744V784H642Z','M660 960H819V1030H660Z'])paint(path,'stone',['wood','hair','dark-brown','sand','skin']);
  region([300,890],'green',[60,780,395,1001]);
  for(const p of [[75,935],[91,898],[115,945],[143,930],[150,970],[193,920],[225,945],[245,985],[295,995]])region(p,'green',[60,805,390,1001]);
  paint('M260 929Q310 920 345 949Q369 972 380 1010H260Z','slate',['stone','sand','skin','cream','white','grey','slate','blue','deep-blue']);
  region([345,975],'slate',[250,920,383,990]);
  paint('M260 929Q310 920 345 949Q369 972 380 1010H260Z','slate',['green','meadow','sage','stone','sand','skin','cream','white','grey','slate','blue','deep-blue']);
  region([510,830],'skin',[435,650,575,930]);
  region([515,900],'skin',[480,850,568,925]);
 }
 if(number===21){
  region([410,250],'deep-blue',[55,70,765,1100]);
  for(const p of [[80,500],[738,500],[285,980],[544,990]])region(p,'deep-blue',[55,70,765,1100]);
  // Remove colour flecks inside each cloud without touching the four witnesses.
  for(const p of [[85,317],[725,360],[105,972],[736,980]])region(p,'cream',[55,100,765,1040]);
 }
 if(number===10){
  for(const p of [[410,145],[300,350],[525,355],[400,850]])region(p,'charcoal',[60,100,760,1000]);
  const cloudColours=['charcoal','slate','navy','black','grey','stone','sage','blue','deep-blue','pale-sky','white','cream'];
  for(const path of [
   'M69 351Q84 339 102 354Q126 340 151 351Q176 341 196 351Q217 342 233 347L246 329L260 316Q271 297 290 302Q313 307 309 327Q304 346 280 347Q282 364 261 370Q232 375 213 396Q198 406 167 398Q158 422 136 420Q112 422 101 407Q80 415 66 399Q55 385 61 365Z',
   'M562 332Q575 316 596 325L622 340L645 345L660 355L675 348L695 363L717 340Q746 321 756 347Q763 365 752 378Q768 396 758 410Q765 438 738 430Q722 433 720 420Q700 433 682 428Q660 427 652 410Q631 416 623 394Q603 398 595 376Q570 384 560 367Q549 348 562 332Z',
   'M60 674Q88 650 115 665Q144 680 129 714Q152 710 164 731Q185 724 201 742Q230 740 229 767L263 813Q280 800 298 819Q321 819 326 843Q335 860 313 879Q343 877 353 903Q360 918 346 929Q374 930 382 950L382 1008H55V674Z',
   'M765 692Q730 680 704 714L570 840L524 845Q495 835 476 857Q457 880 476 906Q448 887 426 914Q406 931 409 954Q389 952 380 976V1008H765Z'
  ])paint(path,'cream',cloudColours);
  for(const p of [[404,212],[405,195],[400,230]])region(p,'pale-sky',[374,180,438,247]);

 }
 if(number===16){
  const sky=flood([[100,170]],[45,90,775,720]),dark=['navy','black','slate','charcoal','dark-brown'].map(id),light=['blue','deep-blue','pale-sky','grey','stone','white','cream','sage','green'].map(id);
  for(let i=0;i<labels.length;i++)if(sky[i]){if(dark.includes(labels[i]))labels[i]=id('navy');else if(light.includes(labels[i]))labels[i]=id('blue');}
  // Small disconnected cloud-colour islands are sampling noise, not new clouds.
  const seen=new Uint8Array(w*h),q=new Int32Array(w*h);
  for(let s=0;s<labels.length;s++){if(!sky[s]||seen[s]||![id('navy'),id('blue')].includes(labels[s]))continue;const colour=labels[s];let head=0,tail=1;seen[s]=1;q[0]=s;const votes=new Map();
   while(head<tail){const i=q[head++],x=i%w;for(const j of [x?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<labels.length&&sky[j]){if(labels[j]!==colour)votes.set(labels[j],(votes.get(labels[j])||0)+1);else if(!seen[j]){seen[j]=1;q[tail++]=j;}}}
   if(tail<350&&votes.size){const next=[...votes].sort((a,b)=>b[1]-a[1])[0][0];if([id('navy'),id('blue')].includes(next))for(let k=0;k<tail;k++)labels[q[k]]=next;}
  }
  for(const [p,role]of [[[300,800],'stone'],[[380,800],'grey'],[[430,880],'stone'],[[500,940],'grey'],[[240,970],'slate'],[[640,970],'stone']])region(p,role,[50,710,770,1002]);
  // Extend the original top storm masses without a straight sampled-row edge.
  paint('M140 0H480V140Q457 170 437 190L422 215L435 248L421 264L397 259L375 246L351 247L325 236L297 239L273 221L253 224L229 211L211 204L210 184L193 165L170 159Z','navy',['blue','deep-blue','pale-sky','navy','slate','stone','grey','sage','cream','white','pale-gold']);
  // Complete the upper-right storm mass, including its corner at the bleed.
  paint('M605 0H819V212Q779 193 758 210Q744 224 730 223Q707 220 692 238L683 225L693 207L700 176L683 156L658 152L648 121L627 101Z','navy');
  paint('M190 920L260 871L324 851L379 895L402 1008H190Z','slate',['wood','hair','dark-brown','sand']);
  // Individual rock planes follow the drawn ridges all the way to the bottom.
  paint('M323 857L347 871L375 902L401 1005H321L348 931L347 900Z','slate');
  paint('M323 857L319 903L301 934L280 1005H211L240 945L250 906L281 877Z','slate');
  paint('M323 857L303 873L280 887L274 905L252 920L229 1005H191L211 949L224 919L233 905L249 891L250 879L281 863Z','grey');
  paint('M484 852L507 866L537 893L547 919L559 945L579 973L603 1005H539L523 967L511 960L507 934L499 919L497 896Z','navy');
  paint('M351 899L375 907L374 936L360 963L349 1008H322L338 965L347 936Z','navy');
  paint('M484 852L461 878L447 907L440 944L422 1005H400L421 942L438 911L456 891L463 864Z','grey');

 }
 if(number===19)for(const p of [[180,250],[650,250]])region(p,'deep-blue',[60,60,760,650]);
 if(number===14){
  for(const p of [[140,650],[108,680],[173,680],[140,704],[247,741],[220,770],[275,770],[250,797],[687,750],[658,775],[714,775],[685,800]]){const m=flood([p],[65,615,760,830]);let area=0;for(const v of m)area+=v;if(area<4500)put(m,'purple');}
  for(const p of [[110,895],[150,960]]){const m=flood([p],[60,860,260,1003]);let area=0;for(const v of m)area+=v;if(area<30000)put(m,'stone');}
  paint('M60 865H290V1030H60Z','stone',['wood','hair','dark-brown','sand','skin','ochre-sky','pale-gold']);
 }
}
