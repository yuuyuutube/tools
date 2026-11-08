import { certificateDetails,drawCertificate,certificateBlob } from './certificate';
import { icon } from './icons';
export function createCertificateDialog(eligible:()=>boolean,levelCount:number,beforeOpen:()=>void) {
  const dialog=document.createElement('dialog');dialog.className='certificate-dialog';dialog.setAttribute('aria-labelledby','certificate-title');
  dialog.innerHTML=`<div class="share-dialog-heading"><h2 id="certificate-title">領取通關證書</h2><button class="certificate-close" aria-label="關閉證書">${icon('close')}</button></div><form class="certificate-form"><label for="certificate-name">證書上的名字</label><div class="certificate-name-row"><input id="certificate-name" type="text" maxlength="48" autocomplete="off" enterkeyhint="done" placeholder="輸入名字"/><button class="save-button" type="submit">產生證書</button></div><p class="certificate-hint">名字最多 24 字，日期會自動填入今天。</p></form><img class="certificate-preview" alt="" hidden/><div class="certificate-actions"><button class="certificate-download" disabled>${icon('load')}<span>下載 PNG</span></button><button class="certificate-share" disabled>${icon('share')}<span>分享圖片</span></button></div><p class="certificate-status" role="status" aria-live="polite"></p>`;
  document.body.append(dialog);
  const input=dialog.querySelector<HTMLInputElement>('input')!,form=dialog.querySelector<HTMLFormElement>('form')!,generate=form.querySelector<HTMLButtonElement>('button')!;
  const preview=dialog.querySelector<HTMLImageElement>('img')!,status=dialog.querySelector<HTMLElement>('.certificate-status')!;
  const download=dialog.querySelector<HTMLButtonElement>('.certificate-download')!,share=dialog.querySelector<HTMLButtonElement>('.certificate-share')!;
  let file:File|undefined,url:string|undefined,version=0;
  function invalidate(){version++;file=undefined;if(url)URL.revokeObjectURL(url);url=undefined;preview.hidden=true;preview.removeAttribute('src');download.disabled=share.disabled=true;}
  function downloadImage(){if(!url||!file)return;const link=document.createElement('a');link.href=url;link.download=file.name;document.body.append(link);link.click();link.remove();}
  input.oninput=()=>{invalidate();status.textContent='';};
  form.onsubmit=async event=>{
    event.preventDefault();invalidate();const attempt=version;generate.disabled=true;status.textContent='正在產生證書…';
    try{
      if(!eligible())throw new Error('完成全部關卡後，就能領取通關證書。');
      const details=certificateDetails(input.value,levelCount);const canvas=document.createElement('canvas');drawCertificate(canvas,details);const blob=await certificateBlob(canvas);
      if(attempt!==version)return;
      file=new File([blob],`BEEP-LAB-通關證書-${details.dateISO}.png`,{type:'image/png'});url=URL.createObjectURL(blob);preview.src=url;preview.alt=`${details.name}的鈴聲考古通關證書，${details.dateLabel}，完成 ${levelCount} 關`;preview.hidden=false;download.disabled=share.disabled=false;status.textContent='證書已完成，可以下載或分享圖片。';
    }catch(error){if(attempt===version)status.textContent=(error as Error).message;}
    finally{generate.disabled=false;}
  };
  download.onclick=()=>{downloadImage();status.textContent='已準備下載 PNG，請查看瀏覽器下載項目。';};
  share.onclick=async()=>{
    if(!file)return;const snapshot=file,attempt=version;
    const feedback=(message:string)=>{if(attempt===version)status.textContent=message;};
    try{
      if(navigator.canShare?.({files:[snapshot]})){await navigator.share({title:'鈴聲考古通關證書',files:[snapshot]});feedback('已開啟圖片分享。');}
      else if(navigator.clipboard?.write&&typeof ClipboardItem!=='undefined'){await navigator.clipboard.write([new ClipboardItem({'image/png':snapshot})]);feedback('圖片已複製，可貼到訊息中分享。');}
      else{downloadImage();feedback('圖片已下載，可附加到訊息中分享。');}
    }catch(error){if(error instanceof DOMException&&error.name==='AbortError'){feedback('已取消分享。');return;}feedback('無法直接分享，請下載 PNG 後附加到訊息中。');}
  };
  dialog.querySelector<HTMLButtonElement>('.certificate-close')!.onclick=()=>dialog.close();
  dialog.addEventListener('close',()=>{version++;generate.disabled=false;});
  window.addEventListener('pagehide',()=>{invalidate();});
  return {open(){if(!eligible())return;beforeOpen();status.textContent='';dialog.showModal();input.focus();}};
}
