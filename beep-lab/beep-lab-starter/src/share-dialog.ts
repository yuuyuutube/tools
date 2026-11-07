import type { Melody } from './music-core/model';
import { shareUrl } from './music-core/share';
import { icon } from './icons';
export function createShareDialog(getMelody: () => Melody, beforeOpen: () => void) {
  const dialog = document.createElement('dialog'); dialog.className='share-dialog';
  dialog.setAttribute('aria-labelledby','share-title');
  dialog.innerHTML=`<form method="dialog" class="share-dialog-heading"><h2 id="share-title">分享旋律</h2><button aria-label="關閉分享">${icon('close')}</button></form><p class="share-song-title"></p><label for="share-url">分享網址</label><textarea id="share-url" rows="3" readonly spellcheck="false"></textarea><p class="share-note">網址包含目前旋律。之後的修改不會更新這份分享。</p><div class="share-actions"><button class="copy-link">${icon('copy')}<span>複製網址</span></button><button class="native-share">${icon('share')}<span>系統分享</span></button><a class="preview-link" target="_blank" rel="noopener">預覽</a></div><p class="share-feedback" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const field=dialog.querySelector<HTMLTextAreaElement>('textarea')!;
  const feedback=dialog.querySelector<HTMLElement>('.share-feedback')!;
  const nativeButton=dialog.querySelector<HTMLButtonElement>('.native-share')!;
  nativeButton.hidden=typeof navigator.share!=='function';
  let title='';
  field.onclick=()=>field.select();
  dialog.querySelector<HTMLButtonElement>('.copy-link')!.onclick=async()=>{
    try { await navigator.clipboard.writeText(field.value); feedback.textContent='已複製分享網址。'; }
    catch { field.focus();field.select();feedback.textContent='請長按或按 Ctrl／⌘ C 複製網址。'; }
  };
  nativeButton.onclick=async()=>{
    try { await navigator.share({title,url:field.value}); feedback.textContent='已開啟系統分享。'; }
    catch(error) { if(!(error instanceof DOMException && error.name==='AbortError'))feedback.textContent='無法開啟系統分享，請使用複製網址。'; }
  };
  return {open() {
    const melody=getMelody(); const url=shareUrl(melody,window.location.href);
    beforeOpen(); title=melody.title;field.value=url;feedback.textContent='';
    dialog.querySelector('.share-song-title')!.textContent=title;
    dialog.querySelector<HTMLAnchorElement>('.preview-link')!.href=url;
    dialog.showModal();
  }};
}
