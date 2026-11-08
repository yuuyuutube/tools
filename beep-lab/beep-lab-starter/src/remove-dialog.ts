import type { Melody } from './music-core/model';
import { icon } from './icons';
export function createRemoveDialog(remove:(id:string)=>void,closed:(id:string,removed:boolean)=>void) {
  const dialog=document.createElement('dialog');dialog.className='remove-dialog';
  dialog.setAttribute('aria-labelledby','remove-title');dialog.setAttribute('aria-describedby','remove-description');
  dialog.innerHTML=`<div class="share-dialog-heading"><h2 id="remove-title">移除作品？</h2><button class="remove-close" aria-label="關閉移除視窗">${icon('close')}</button></div><p class="remove-song-title"></p><p id="remove-description">移除後，可按「復原最近移除」還原作品。</p><p class="remove-feedback" role="status" aria-live="polite"></p><div class="dialog-actions"><button class="remove-cancel">取消</button><button class="remove-confirm save-button">移除作品</button></div>`;
  document.body.append(dialog);
  const cancel=dialog.querySelector<HTMLButtonElement>('.remove-cancel')!;
  let song:Melody;
  cancel.onclick=dialog.querySelector<HTMLButtonElement>('.remove-close')!.onclick=()=>dialog.close('cancel');
  dialog.querySelector<HTMLButtonElement>('.remove-confirm')!.onclick=()=>{
    try {remove(song.id);dialog.close('removed');}
    catch(error){dialog.querySelector('.remove-feedback')!.textContent=(error as Error).message;}
  };
  dialog.addEventListener('close',()=>closed(song.id,dialog.returnValue==='removed'));
  return {open(value:Melody){song=value;dialog.returnValue='';dialog.querySelector('.remove-song-title')!.textContent=`「${value.title}」`;dialog.querySelector('.remove-feedback')!.textContent='';dialog.showModal();cancel.focus();}};
}
