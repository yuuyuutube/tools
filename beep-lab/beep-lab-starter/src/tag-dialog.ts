import type { Melody } from './music-core/model';
import { MAX_TAGS,MAX_TAG_LENGTH,normalizeTags,searchKey } from './music-core/tags';
import { icon } from './icons';
export function createTagDialog(save:(song:Melody,tags:string[],expected:string[])=>void,closed:(id:string)=>void) {
  const dialog=document.createElement('dialog');dialog.className='tag-dialog';dialog.setAttribute('aria-labelledby','tag-title');
  dialog.innerHTML=`<div class="share-dialog-heading"><h2 id="tag-title">作品標籤</h2><button class="tag-close" aria-label="關閉標籤設定">${icon('close')}</button></div><p class="tag-song-title"></p><div class="tag-draft" aria-label="已加入的標籤"></div><form class="tag-add-form"><label for="tag-input">新增標籤</label><div class="tag-add-row"><input id="tag-input" type="text" maxlength="${MAX_TAG_LENGTH}" autocomplete="off" enterkeyhint="done"/><button>${icon('add')}<span>加入</span></button></div></form><p class="tag-hint">每首最多 ${MAX_TAGS} 個，每個 ${MAX_TAG_LENGTH} 字。</p><div class="tag-suggestions" aria-label="快速加入標籤"></div><p class="tag-feedback" role="status" aria-live="polite"></p><div class="dialog-actions"><button class="tag-cancel">取消</button><button class="tag-save save-button">儲存標籤</button></div>`;
  document.body.append(dialog);
  const input=dialog.querySelector<HTMLInputElement>('input')!;
  const feedback=dialog.querySelector<HTMLElement>('.tag-feedback')!;
  let composing=false;input.addEventListener('compositionstart',()=>composing=true);input.addEventListener('compositionend',()=>composing=false);
  let song:Melody;let draft:string[]=[];let expected:string[]=[];let suggestions:string[]=[];
  function render(){
    const list=dialog.querySelector('.tag-draft')!;list.replaceChildren();
    if(!draft.length){const empty=document.createElement('span');empty.className='tag-empty';empty.textContent='尚未加入標籤。';list.append(empty);}
    draft.forEach((tag,index)=>{const chip=document.createElement('span');chip.className='tag-draft-chip';const name=document.createElement('span');name.textContent=tag;const remove=document.createElement('button');remove.type='button';remove.innerHTML=icon('close');remove.setAttribute('aria-label',`移除標籤 ${tag}`);remove.onclick=()=>{draft.splice(index,1);feedback.textContent='';render();input.focus();};chip.append(name,remove);list.append(chip);});
    const quick=dialog.querySelector('.tag-suggestions')!;quick.replaceChildren();
    suggestions.filter(tag=>!draft.some(current=>searchKey(current)===searchKey(tag))).slice(0,6).forEach(tag=>{const button=document.createElement('button');button.type='button';button.textContent=tag;button.setAttribute('aria-label',`加入標籤 ${tag}`);button.disabled=draft.length>=MAX_TAGS;button.onclick=()=>{try{draft=normalizeTags([...draft,tag]);feedback.textContent='';render();}catch(error){feedback.textContent=(error as Error).message;}};quick.append(button);});
  }
  function add(){if(!input.value.trim())return;draft=normalizeTags([...draft,input.value]);input.value='';feedback.textContent='';render();}
  dialog.querySelector<HTMLFormElement>('form')!.onsubmit=event=>{event.preventDefault();if(composing)return;try{add();input.focus();}catch(error){feedback.textContent=(error as Error).message;}};
  dialog.querySelector<HTMLButtonElement>('.tag-save')!.onclick=()=>{try{add();save(song,draft,expected);dialog.close('saved');}catch(error){feedback.textContent=(error as Error).message;}};
  dialog.querySelector<HTMLButtonElement>('.tag-close')!.onclick=dialog.querySelector<HTMLButtonElement>('.tag-cancel')!.onclick=()=>dialog.close('cancel');
  dialog.addEventListener('close',()=>closed(song.id));
  return {open(value:Melody,tags:string[],existing:string[]){song=value;draft=[...tags];expected=[...tags];suggestions=normalizeTagsForSuggestions(existing);input.value='';composing=false;feedback.textContent='';dialog.querySelector('.tag-song-title')!.textContent=value.title;render();dialog.showModal();input.focus();}};
}
function normalizeTagsForSuggestions(existing:string[]){const seen=new Set<string>();return [...existing,'未完成','原創','想送給朋友'].filter(tag=>{const key=searchKey(tag);if(seen.has(key))return false;seen.add(key);return true;});}
