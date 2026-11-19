import {CARDS} from '../data/cards.js';
import {faceSVG} from '../art/frame.js';
import {DEFAULT_INK_BLEED,DRY_INK_PRESET,ORIGINAL_INK_BLEED,readInkBleed,hasSavedPrintTexture,saveInkBleed,normalizeInkBleed} from '../art/ink-settings.js';
const $=id=>document.getElementById(id),keys=['line','text','fine','tooth','edge','dry','stick'];
const saved=readInkBleed(),hasSavedTexture=hasSavedPrintTexture();
let values=saved,pending=0;
$('card').innerHTML=CARDS.map(c=>`<option value="${c.number}">${c.number} · ${c.nameZh}</option>`).join('');
function preview(){
 const card=CARDS.find(c=>c.number===Number($('card').value));
 $('before').innerHTML=faceSVG(card,{printed:true,id:'ink_before_',inkBleed:ORIGINAL_INK_BLEED});
 $('after').innerHTML=faceSVG(card,{printed:true,id:'ink_after_',inkBleed:values});
}
function controls(){for(const key of keys){$(key).value=values[key]*100;$(key+'-value').value=`${Math.round(values[key]*100)}%`;}}
function changed(){
 $('status').textContent='預覽中，尚未套用。';
 cancelAnimationFrame(pending);pending=requestAnimationFrame(preview);
}
for(const key of keys)$(key).addEventListener('input',()=>{values[key]=Number($(key).value)/100;controls();changed();});
$('card').addEventListener('change',preview);
$('zoom').addEventListener('change',()=>{document.documentElement.style.setProperty('--zoom',$('zoom').value);});
for(const [button,settings] of [['dry-preset',DRY_INK_PRESET],['original',ORIGINAL_INK_BLEED],['suggested',DEFAULT_INK_BLEED],['none',{line:0,text:0,fine:0,tooth:0,edge:0,dry:0,stick:0}]])$(button).addEventListener('click',()=>{values={...settings};controls();changed();});
$('apply').addEventListener('click',()=>{
 try{values=saveInkBleed(values);$('status').textContent='已儲存。重新整理抽牌或分享預覽頁，就會使用這組質感。';}
 catch{$('status').textContent='瀏覽器無法儲存，請先匯出設定保留。';}
});
$('export').addEventListener('click',()=>{
 const blob=new Blob([JSON.stringify({type:'tarot-ink-bleed',version:3,settings:values},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='tarot-ink-bleed.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 $('status').textContent='設定已匯出。';
});
$('import').addEventListener('change',async e=>{
 const file=e.target.files[0];if(!file)return;
 try{
  const data=JSON.parse(await file.text());
  if(data.type!=='tarot-ink-bleed'||![1,2,3].includes(data.version)||!(data.version===1?keys.slice(0,3):data.version===2?keys.slice(0,6):keys).every(k=>typeof data.settings?.[k]==='number'&&Number.isFinite(data.settings[k])&&data.settings[k]>=0&&data.settings[k]<=((['tooth','edge','dry','stick'].includes(k))?1:6)))throw Error();
  values=normalizeInkBleed({stick:0,...data.settings,...(data.version===1?{tooth:0,edge:0,dry:0,stick:0}:{})});controls();changed();$('status').textContent='已匯入預覽，確認後按「儲存並套用」。';
 }catch{$('status').textContent='設定檔格式不正確，請選擇從這個頁面匯出的檔案。';}
 e.target.value='';
});
controls();preview();
$('status').textContent=hasSavedTexture?'已載入儲存的設定。':'已載入全站預設，可調整後儲存。';
