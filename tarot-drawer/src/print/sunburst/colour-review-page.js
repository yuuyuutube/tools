import {buildBatch} from './batch-pipeline.js';
import {BATCH} from './registry.js';
import {cardById} from '../../data/cards.js';
import {REPAIRED_CARDS} from './colour-repairs.js';
const make=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
const requested=new URLSearchParams(location.search).get('cards')?.split(',').map(Number),numbers=requested?REPAIRED_CARDS.filter(n=>requested.includes(n)):REPAIRED_CARDS;
const notes={3:'補齊左側森林、草岸與岩石；保留瀑布白水。',4:'統一胸腹鎧甲的鋼藍色，保留金腰帶。',5:'讓金、銀鑰匙各自的柄、軸與齒連色。',6:'補齊樹葉與男子膚色；兩手與軀幹、雙腿之間恢復背景色。',9:'統一外袍藍色，保留內袍與袖口的淺色。',11:'持天平的手恢復膚色。',13:'整理前景草地與石頭分色。',15:'洞窟頂部依岩壁輪廓延伸。',12:'整理光環、山坡與底部草地；臉與脖子補回膚色。',20:'整理天空與棺木色帶；人物補回膚色，兩角葉片改為綠色。',17:'重建星形色版；入水的腳恢復膚色，前景草葉與深灰岩石分色。',21:'填齊花環內外的天空，整理雲朵及上下邊緣。',10:'整理天空與雲層；斯芬克斯的臉恢復淺藍膚色。',16:'保留暴風雲明暗，深藍雲向上延伸，岩石配色向下補足。',19:'移除天空懸空的金色碎點，保留原有光芒。',14:'讓鳶尾花瓣與葉片、地面分色。'};
// Regression samples are in source drawing coordinates, independent of card placement.
const colourSamples={4:[[370,505,'chest-armour'],[450,580,'chest-armour']],5:[[480,930,'key-gold'],[340,930,'key-white']],6:[[245,600,'man'],[187,665,'gold-sky'],[290,680,'mountain'],[230,880,'garden'],[225,820,'man']],9:[[450,250,'blue'],[580,860,'blue']],11:[[615,398,'skin']],15:[[720,140,'navy']],16:[[750,140,'navy'],[548,990,'navy'],[340,990,'navy']]},sampleResults=[];
const download=(parent,cv,name,mime='image/png',quality)=>{const a=document.createElement('a');a.download=name;a.textContent=name;a.href=cv.toDataURL(mime,quality);parent.append(a);};
for(const [index,n]of numbers.entries()){
 document.getElementById('status').textContent=`正在印製 ${index+1}/${numbers.length} · ${cardById(BATCH[n].id).nameZh}`;
 const result=await buildBatch(n),card=cardById(BATCH[n].id),article=document.createElement('article');article.id=card.id;article.dataset.number=n;article.innerHTML=`<h2>${card.romanNumeral} · ${card.nameZh}</h2><p>${notes[n]}</p><div class="stages"></div>`;
 for(const [x,y,expected]of colourSamples[n]||[]){const i=Math.round(y*1536/1229)*1024+Math.round(x*1024/819),actual=BATCH[n].roles[result.labels[i]].id;sampleResults.push({number:n,x,y,expected,actual,pass:actual===expected});}
 const stages=article.querySelector('.stages');
 for(const [label,media]of [['修正前 · 平塗',Object.assign(new Image(),{src:`docs/tarot-sunburst/colour-repair-review/before/${n}-flat.png`})],['修正後 · 平塗',result.flat],['修正後 · 實際套印',result.final]]){const f=document.createElement('figure'),c=document.createElement('figcaption');c.textContent=label;f.append(c,media);stages.append(f);}
 const exports=document.createElement('details');exports.innerHTML='<summary>下載色版與網站圖片</summary>';
 for(const key of ['flat','final'])download(exports,result[key],`${n}-${key}-3x5.png`);
 for(const [key,cv]of Object.entries(result.sourcePlates))download(exports,cv,`${n}-${key}-source.png`);
 const face=make(600,1000);face.getContext('2d').drawImage(result.final,0,0,600,1000);download(exports,face,`${n}-face.webp`,'image/webp',.88);
 const art=make(1024,1536),g=art.getContext('2d'),data=Object.fromEntries(Object.entries(result.sourcePlates).map(([k,cv])=>[k,cv.getContext('2d').getImageData(0,0,1024,1536).data])),out=g.createImageData(1024,1536),inks={Y:[232,183,77],O:[222,83,43],B:[62,112,150],N:[30,40,74]};
 for(let i=0;i<1024*1536;i++){const j=i*4;let c=[246,239,224];for(const k of ['Y','O','B','N']){const d=data[k][j+1]/255;c=c.map((v,ch)=>v*(1-d+d*inks[k][ch]/255));}const ink=data.N[j]/255;for(let ch=0;ch<3;ch++)out.data[j+ch]=Math.round(c[ch]*(1-ink)+inks.N[ch]*ink);out.data[j+3]=255;}g.putImageData(out,0,0);download(exports,art,`${n}-art-preview.webp`,'image/webp',.85);
 article.append(exports);document.getElementById('cards').append(article);
 const link=document.createElement('a');link.href='#'+card.id;link.textContent=card.nameZh;document.querySelector('nav').append(link);
}
document.getElementById('status').textContent=`${numbers.length}/${numbers.length} 張色版修正已印製完成`;

const checks=document.createElement('script');checks.type='application/json';checks.id='colour-validation';checks.textContent=JSON.stringify(sampleResults);document.body.append(checks);
