import {buildBatch} from './batch-pipeline.js';
import {BATCH,BATCHES,LATEST_BATCH} from './registry.js';
import {cardById} from '../../data/cards.js';
import {shiftMap} from './layout.js';
import {deliveryAssets} from './delivery-assets.js';
const params=new URLSearchParams(location.search),allReview=params.get('view')==='all';
const requested=params.get('batch')||LATEST_BATCH;
const batchId=Object.hasOwn(BATCHES,requested)?requested:LATEST_BATCH,batch=BATCHES[batchId],inkOnly=batch.numbers.every(n=>BATCH[n].inkOnly);
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const download=(parent,cv,name,label='下載 PNG')=>{const a=document.createElement('a');a.className='download';a.download=name;a.textContent=label;a.href=cv.toDataURL();parent.append(a);return a;};
const figure=(parent,cv,title,className='')=>{const f=document.createElement('figure');f.className=className;const c=document.createElement('figcaption');c.textContent=title;f.append(c,cv);parent.append(f);return f;};
const copy=cv=>{const c=make(cv.width,cv.height);c.getContext('2d').drawImage(cv,0,0);return c;};
const load=src=>new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=src;});
document.title=`Sunburst · 第 ${batchId} 批`;
document.querySelector('h1').textContent=batch.title;
document.querySelector('.status').textContent=`SUNBURST · BATCH ${batchId} · ${inkOnly?'INK MASTER':'COLOUR REVIEW'} · INK SYNC 2026-11-19`;
document.querySelector('.intro').textContent=inkOnly?'直接加工你的原線稿，保留人物、姿勢與器物輪廓；依愚者對照線重、明暗、疏密與物件轉折。此批只做墨線母稿與黏墨檢查樣張，插畫尚未上色。預設黏墨 0.5，可調整比較。':(BATCH[batch.numbers[0]].labelMap?'直接加工你的原線稿；依原彩色參照的區域配色，沿用第 1–2 批相同的 Y／O／B／N 色版濃度與套印方式，另提供未上色的黏墨檢查樣張。預設黏墨 0.5。':'直接加工你的原線稿；此批保留既有上色成果，另提供未上色的黏墨檢查樣張，方便獨立檢查排線。預設黏墨 0.5。');
document.querySelector('a[href$="review.md"]').href=`docs/tarot-sunburst/batch-${batchId}/review.md`;
const nav=document.createElement('nav');nav.className='controls';
for(const [id,b]of Object.entries(BATCHES)){const a=document.createElement('a');a.href='?batch='+id;a.textContent=id+' · '+b.title;nav.append(a);}document.querySelector('.controls').after(nav);
const colourReview=document.createElement('a');colourReview.href='colour-repair-review.html';colourReview.textContent='色版修正 · 前後對照';nav.prepend(colourReview);
const paintProjects=document.createElement('a');paintProjects.href='docs/tarot-sunburst/light-paint/';paintProjects.textContent='Light Paint 分層專案';nav.prepend(paintProjects);
const allLink=document.createElement('a');allLink.href='?view=all';allLink.textContent='1–21 全套總覽';nav.prepend(allLink);
const inkReview=document.createElement('section');inkReview.id='ink-review';inkReview.innerHTML=`<h2>墨線疏密對照 · 愚者／${batch.title.replaceAll('、','／')}</h2><p>相同比例查看墨線母稿；黏墨樣張另保留實際的細線合墨、飛白與紙紋，插畫不加入色版或網點。</p><canvas id="ink-comparison"></canvas>`;document.getElementById('cards').before(inkReview);
const jump=document.createElement('a');jump.href='#ink-review';jump.textContent='與愚者比較墨線';document.querySelector('.controls').append(jump);
function detail(article,result,number){
 const cfg=BATCH[number],rect=cfg.detailRect||({1:[235,330,370,370],2:[262,430,292,365],3:[218,402,360,450],5:[533,399,56,75],6:[100,180,620,385]}[number])||[240,360,360,420];
 const [x,y,w,h]=rect,master=make(720,Math.round(720*h/w)),proof=make(master.width,master.height),map=shiftMap(cfg.map,number);
 master.getContext('2d').drawImage(result.inkMaster,x*1024/819,y*1536/1229,w*1024/819,h*1536/1229,0,0,master.width,master.height);
 proof.getContext('2d').drawImage(result.proof,(map.x+x*1024/819*map.scale)*3,(map.y+y*1536/1229*map.scale)*3,w*1024/819*map.scale*3,h*1536/1229*map.scale*3,0,0,proof.width,proof.height);
 const group=document.createElement('div');group.className='stages';group.style.maxWidth='1040px';group.style.marginTop='24px';group.id='ink-detail-'+number;article.append(group);
 download(figure(group,master,'局部 · 原尺寸墨線母稿'),master,`${number}-ink-detail.png`);
 download(figure(group,proof,'同一局部 · 黏墨樣張（未上色）'),proof,`${number}-proof-detail.png`);
}
async function render(){
 const button=document.getElementById('render'),progress=document.getElementById('progress');button.disabled=true;const cards=document.getElementById('cards');cards.replaceChildren();
 const overview=document.getElementById('overview');overview.width=960;overview.height=550;const og=overview.getContext('2d');og.fillStyle='#e8e4dc';og.fillRect(0,0,960,550);
 const ic=document.getElementById('ink-comparison');ic.width=1280;ic.height=550;const ig=ic.getContext('2d');ig.fillStyle='#e8e4dc';ig.fillRect(0,0,1280,550);
 try{
  const ref=await load('docs/tarot-sunburst/fool-pipeline/fool-ink-3x5.png');ig.drawImage(ref,10,0,300,500);ig.fillStyle='#39352e';ig.textAlign='center';ig.font='20px serif';ig.fillText('愚者 · 已確認參照',160,532);
  for(const [index,number]of batch.numbers.entries()){
   progress.textContent=`正在處理 ${index+1} / ${batch.numbers.length} · ${cardById(BATCH[number].id).nameZh}…`;
   const cfg=BATCH[number],card=cardById(cfg.id),result=await buildBatch(number,{inkSpread:Number(document.getElementById('spread').value)}),a=document.createElement('article');a.id=card.id;a.dataset.number=number;
   const heading=document.createElement('h2');heading.textContent=card.romanNumeral+' · '+card.nameZh;a.append(heading);const stages=document.createElement('div');stages.className='stages';a.append(stages);cards.append(a);
   const titles={smooth:'1 · 你的原始平滑線稿',ink:'2 · 主次墨線＋木刻陰影',proof:'黏墨檢查樣張 · 未上色',...(!result.monochrome?{flat:'3 · 色版上色（平塗）',final:'4 · 最終套印'}:{})};
   for(const [key,title]of Object.entries(titles))download(figure(stages,copy(result[key]),title),result[key],`${number}-${key}-3x5.png`);
   const note=document.createElement('p');note.className='audit';note.textContent=cfg.reviewNote||'沿用原線稿輪廓，細部與圖像象徵差異詳見本批查核紀錄。墨線完成不等於美術核准。';a.append(note);
   const thumb=figure(a,copy(result.proof),'120px · 黏墨樣張','thumb');thumb.style.marginTop='20px';detail(a,result,number);
   const downloads=document.createElement('details');downloads.innerHTML='<summary>下載墨線母稿與印版</summary>';download(downloads,result.inkMaster,`${number}-ink${cfg.masterEdits?'-current':''}.png`,'墨線母稿 PNG　');for(const [key,cv]of Object.entries(result.sourcePlates))download(downloads,cv,`${number}-${key}-source.png`,key+' 版　');if(result.masks)download(downloads,result.masks,`${number}-masks-source.png`,'區域遮罩');a.append(downloads);
   if(!result.monochrome){download(downloads,result.illustration,`${number}-illustration.png`,'插畫 PNG（無牌框文字）　');const assets=deliveryAssets(result);for(const [key,cv]of Object.entries(assets)){const a=document.createElement('a');a.download=`${number}-${key==='face'?'face':'art-preview'}.webp`;a.textContent=key==='face'?'網站牌面 WEBP　':'圖窗編輯器 WEBP';a.href=cv.toDataURL('image/webp',key==='face'?.88:.85);downloads.append(a);}}
   const reference=document.createElement('details');reference.innerHTML=`<summary>原彩色參照（供後續上色）</summary><figure class="ref"><img src="docs/tarot-sunburst/color-spec-with-effect-demo/${number}.png" alt="${card.nameZh}原彩色參照"></figure>`;a.append(reference);
   og.drawImage(result.monochrome?result.proof:result.final,index*320+10,0,300,500);og.fillStyle='#39352e';og.textAlign='center';og.font='20px serif';og.fillText(card.nameZh,index*320+160,532);
   ig.drawImage(result.ink,(index+1)*320+10,0,300,500);ig.fillStyle='#39352e';ig.fillText(card.nameZh,(index+1)*320+160,532);
  }
  const od=document.getElementById('overview-download');od.href=overview.toDataURL();od.download=`sunburst-batch-${batchId}.png`;
  inkReview.querySelector('a[download]')?.remove();download(inkReview,ic,'ink-comparison.png','下載墨線對照');
  progress.textContent=`第 ${batchId} 批 ${batch.numbers.join('、')} 號已完成 · ${inkOnly?'墨線母稿與黏墨樣張，插畫尚未上色':'上色成圖與未上色黏墨檢查'}。請查看本批查核紀錄。`;
 }catch(e){progress.textContent='處理失敗：'+e.message;throw e;}finally{button.disabled=false;}
}
document.getElementById('render').addEventListener('click',render);
async function renderAll(){
 document.title='Sunburst · 1–21 全套總覽';
 document.querySelector('h1').textContent='1–21 · 上色成圖與墨線總覽';
 document.querySelector('.status').textContent='SUNBURST · ALL CARDS · COLOUR + INK · 2026-11-19';
 document.querySelector('.intro').textContent='全套原線稿的墨線加工與上色已完成。可切換看最終套印、含黏墨 0.5 的未上色樣張或母稿；點任一張進入該批的原圖、墨線、色版、套印與放大對照。7–21 依原彩色參照的區域配色，沿用第 1–2 批的色版濃度。牌義缺漏與來源結構疑義另列於查核紀錄，留待你判斷。';
 document.querySelector('.controls').querySelector('label').hidden=true;
 document.getElementById('render').hidden=true;document.getElementById('overview').hidden=true;document.getElementById('overview-download').hidden=true;inkReview.hidden=true;
 const audit=document.querySelector('a[href$="review.md"]');audit.href='docs/tarot-sunburst/ink-review-index.md';
 document.querySelector('a[href="#ink-review"]').hidden=true;
 const controls=document.createElement('div');controls.className='controls';
 const mode=document.createElement('select');mode.setAttribute('aria-label','總覽樣張種類');
 for(const [value,label]of [['final','最終套印 · 上色'],['proof','含黏墨 0.5 · 未上色'],['ink','墨線母稿 · 無黏墨']]){const option=document.createElement('option');option.value=value;option.textContent=label;mode.append(option);}
 const save=document.createElement('a');save.textContent='下載全套總覽';save.className='download';controls.append(mode,save);nav.after(controls);
 const deck=document.getElementById('cards');deck.className='deck-index';
 const sheet=make(1470,1190),ctx=sheet.getContext('2d');
 let revision=0;
 async function show(){
  const ticket=++revision,kind=mode.value;
  deck.replaceChildren();ctx.fillStyle='#e8e4dc';ctx.fillRect(0,0,sheet.width,sheet.height);
  for(let n=1;n<=21;n++){
   const cfg=BATCH[n],card=cardById(cfg.id),path=`docs/tarot-sunburst/batch-${cfg.batch}/${n}-${kind}-3x5.png`;
   const link=document.createElement('a');link.href=`?batch=${cfg.batch}#${cfg.id}`;link.className='deck-card';
   const img=document.createElement('img');img.src=path+'?v=ink-20261119';img.alt=`${card.romanNumeral} · ${card.nameZh} · ${({final:'最終套印',proof:'黏墨樣張',ink:'墨線母稿'})[kind]}`;img.width=180;img.height=300;
   const caption=document.createElement('span');caption.textContent=card.romanNumeral+' · '+card.nameZh;link.append(img,caption);
   if(cfg.reviewNote){const flag=document.createElement('small');flag.textContent='有原圖待判斷事項';link.append(flag);}deck.append(link);
   const bitmap=await load(path+'?v=ink-20261119');if(ticket!==revision)return;const x=((n-1)%7)*210+15,y=Math.floor((n-1)/7)*390+10;
   ctx.drawImage(bitmap,x,y,180,300);ctx.fillStyle='#39352e';ctx.textAlign='center';ctx.font='18px serif';ctx.fillText(caption.textContent,x+90,y+327);
  }
  save.href=sheet.toDataURL();save.download=`sunburst-1-21-${kind}.png`;
  document.getElementById('progress').textContent='21 / 21 墨線母稿、黏墨樣張與上色成圖已備妥 · 待審閱。';
 }
 mode.addEventListener('change',show);await show();
}
if(allReview)await renderAll();else await render();
