import { removedSongs, removeSong, restoreLastSong, REMOVED_KEY } from './music-core/removed-songs';
import { ensureStarterLibrary } from './music-core/starter-library';
import { mountLabNavigation } from './navigation';
import { createTagDialog } from './tag-dialog';
import { readTags,saveSongTags,filterSongs,tagOptions,TAGS_KEY,type TagResult } from './music-core/tags';
import { AudioActivationError, AudioEngine } from './audio-engine/player';
import { wavFilename } from './audio-engine/wav';
import { eventSeconds, type Melody } from './music-core/model';
import { readLibrary, STORAGE_KEY, type LibraryResult } from './music-core/storage';
import { albumCoverStyle } from './album-cover';
import { createCardArt } from './card-art';
import { shareUrl } from './music-core/share';
import { createShareDialog } from './share-dialog';
import { icon } from './icons';
const app=document.querySelector<HTMLElement>('#app')!;
document.title='POCKET MUSIC BOX';
app.innerHTML=`<header class="site-header box-header"><img src="./favicon.svg" width="32" height="32" alt=""/><h1>POCKET MUSIC BOX</h1><a class="composer-link" href="./">${icon('add')}<span>編新旋律</span></a></header><main class="box-main"><div class="box-toolbar"><p id="box-count"></p><button id="box-stop" disabled>${icon('stop')}<span>停止</span></button></div><p class="box-storage-note">作品儲存於此瀏覽器。</p><p id="box-status" class="box-status" role="status" aria-live="polite"></p><button id="box-enable" hidden>${icon('volume')}<span>啟用聲音</span></button><div id="box-warning" role="status"></div><button id="box-restore" hidden>復原最近移除</button><div class="box-organizer"><label for="box-search">搜尋</label><input id="box-search" type="search" placeholder="搜尋曲名或標籤" autocomplete="off"/><div class="box-filters" role="group" aria-label="標籤篩選"></div></div><div class="album-grid"></div></main>`;
mountLabNavigation('box');
const status=document.querySelector<HTMLElement>('#box-status')!;
let starterWarning:string|undefined;
const stopButton=document.querySelector<HTMLButtonElement>('#box-stop')!;
const enableButton=document.querySelector<HTMLButtonElement>('#box-enable')!;
const engine=new AudioEngine();let request=0;let playingId:string|undefined;let sharingSong:Melody;
let worker:Worker|undefined;let downloading=false;let observer:IntersectionObserver|undefined;
let cancelDownload=()=>{};
const artworks=new Map<string,ReturnType<typeof createCardArt>>();
const playButtons=new Map<string,HTMLButtonElement>();
const search=document.querySelector<HTMLInputElement>('#box-search')!;
let selectedTag:string|null=null;
const tagButtons=new Map<string,HTMLButtonElement>();
function localTags():TagResult {try{return readTags(localStorage);}catch{return {tags:new Map(),writable:false,warning:'瀏覽器無法讀取標籤。'};}}
const tagEditor=createTagDialog((song,tags,expected)=>{
  const current=readLibrary(localStorage);
  if(!current.songs.some(value=>value.id===song.id))throw new Error('這首作品已被移除，無法更新標籤。');
  saveSongTags(localStorage,song.id,tags,expected);render();status.textContent=`已更新「${song.title}」的標籤。`;
},id=>(tagButtons.get(id)??search).focus());
search.oninput=()=>render();
function baseFor(song:Melody) {const url=new URL(location.href);url.searchParams.set('art',albumCoverStyle(song));return url.href;}
const sharing=createShareDialog(()=>sharingSong,stop,()=>baseFor(sharingSong));
function resetPlayback() {
  playingId=undefined;stopButton.disabled=true;
  playButtons.forEach(button=>{button.innerHTML=`${icon('play')}<span>試聽</span>`;button.setAttribute('aria-pressed','false');});
  artworks.forEach(art=>art.position(null));
}
function stop() {request++;engine.stop();resetPlayback();}
engine.onEnd=()=>{resetPlayback();status.textContent='播放結束。';};
engine.onPosition=index=>{if(playingId)artworks.get(playingId)?.position(index);};
async function play(song:Melody) {
  if(playingId===song.id){stop();status.textContent='已停止。';return;}
  stop();const token=++request;playingId=song.id;stopButton.disabled=false;
  const button=playButtons.get(song.id)!;button.innerHTML=`${icon('volume')}<span>啟用中</span>`;
  try {await engine.playMelody(song);if(token!==request)return;if(!engine.isPlaying){resetPlayback();return;}
    button.innerHTML=`${icon('stop')}<span>停止</span>`;button.setAttribute('aria-pressed','true');status.textContent=`正在播放「${song.title}」`;enableButton.hidden=true;
  } catch(error) {if(token!==request)return;stop();status.textContent=error instanceof AudioActivationError?error.message:'無法播放，請再試一次。';enableButton.hidden=error instanceof AudioActivationError&&!error.recoverable;}
}
stopButton.onclick=()=>{stop();status.textContent='已停止。';};
enableButton.onclick=async()=>{try{await engine.unlock();enableButton.hidden=true;status.textContent='聲音已啟用，請點作品試聽。';}catch(error){status.textContent=(error as Error).message;}};
function download(song:Melody,button:HTMLButtonElement) {
  if(downloading){status.textContent='正在準備上一份 WAV，請稍候。';return;}
  downloading=true;button.disabled=true;button.querySelector('span')!.textContent='準備中';status.textContent=`正在準備「${song.title}」的 WAV…`;
  function finish() {worker?.terminate();worker=undefined;downloading=false;button.disabled=false;button.querySelector('span')!.textContent='WAV';cancelDownload=()=>{};}
  cancelDownload=()=>{status.textContent='已取消 WAV 準備。';finish();};
  try {
    worker=new Worker(new URL('./audio-engine/wav-worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(event:MessageEvent<{buffer?:ArrayBuffer;error?:string}>)=>{
      if(event.data.error){status.textContent=event.data.error;finish();return;}
      if(!event.data.buffer){status.textContent='WAV 產生失敗，請再試一次。';finish();return;}
      const url=URL.createObjectURL(new Blob([event.data.buffer],{type:'audio/wav'}));
      const link=document.createElement('a');link.href=url;link.download=wavFilename(song.title);document.body.append(link);link.click();link.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);status.textContent=`「${song.title}」WAV 已準備好，請查看瀏覽器下載項目。`;finish();
    };
    worker.onerror=()=>{status.textContent='無法產生 WAV，請重新整理後再試。';finish();};worker.postMessage(structuredClone(song));
  } catch {status.textContent='此瀏覽器無法產生 WAV，請改用新版 Safari 或 Chrome。';finish();}
}
const restoreButton=document.querySelector<HTMLButtonElement>('#box-restore')!;
restoreButton.onclick=()=>{try{const restored=restoreLastSong(localStorage);render();status.textContent=restored?`已復原「${restored.title}」。`:'';}catch(error){status.textContent=(error as Error).message;}};
function render() {
  stop();observer?.disconnect();artworks.clear();playButtons.clear();tagButtons.clear();
  let library:LibraryResult;try{library=readLibrary(localStorage);}catch{library={songs:[],writable:false,warning:'瀏覽器無法讀取本機收藏。'};}
  try{restoreButton.hidden=!removedSongs(localStorage).length;}catch{restoreButton.hidden=true;}
  const metadata=localTags();const options=tagOptions(library.songs,metadata.tags);
  if(selectedTag&& !options.some(option=>option.key===selectedTag))selectedTag=null;
  const songs=filterSongs(library.songs,metadata.tags,search.value,selectedTag);
  document.querySelector('#box-count')!.textContent=search.value.trim()||selectedTag!==null?`${songs.length} / ${library.songs.length} 首作品`:`${library.songs.length} 首作品`;
  document.querySelector('#box-warning')!.textContent=[library.warning,metadata.warning,starterWarning].filter(Boolean).join(' ');
  document.querySelector<HTMLElement>('.box-organizer')!.hidden=!library.songs.length;
  const filters=document.querySelector('.box-filters')!;filters.replaceChildren();
  const untagged=library.songs.filter(song=>!(metadata.tags.get(song.id)?.length)).length;
  const choices=[{key:null,name:'全部',count:library.songs.length},...(untagged?[{key:'',name:'未分類',count:untagged}]:[]),...options];
  choices.forEach(choice=>{const button=document.createElement('button');button.textContent=`${choice.name} ${choice.count}`;button.setAttribute('aria-pressed',String(selectedTag===choice.key));button.onclick=()=>{selectedTag=choice.key;render();[...document.querySelectorAll<HTMLButtonElement>('.box-filters button')].find(value=>value.getAttribute('aria-pressed')==='true')?.focus();};filters.append(button);});
  const grid=document.querySelector<HTMLElement>('.album-grid')!;grid.replaceChildren();
  if(!library.songs.length){const empty=document.createElement('div');empty.className='box-empty';const text=document.createElement('p');text.textContent='還沒有收藏的旋律。';const link=document.createElement('a');link.href='./';link.className='card-home';link.textContent='編出第一首';empty.append(text,link);grid.append(empty);return;}
  if(!songs.length){const empty=document.createElement('div');empty.className='box-empty';const text=document.createElement('p');text.textContent='沒有符合的作品。';const clear=document.createElement('button');clear.textContent='清除篩選';clear.onclick=()=>{search.value='';selectedTag=null;render();search.focus();};empty.append(text,clear);grid.append(empty);return;}
  const pending=new Map<Element,()=>void>();
  if('IntersectionObserver'in window)observer=new IntersectionObserver(entries=>{entries.forEach(entry=>{if(entry.isIntersecting){pending.get(entry.target)?.();pending.delete(entry.target);observer!.unobserve(entry.target);}});},{rootMargin:'250px'});
  songs.forEach(song=>{
    const album=document.createElement('article');album.className='album-card';
    const cover=document.createElement('a');cover.className='album-cover';try{cover.href=shareUrl(song,baseFor(song));}catch{const fallback=new URL(location.href);fallback.search='';fallback.hash='';fallback.searchParams.set('song',song.id);cover.href=fallback.href;}cover.setAttribute('aria-label',`開啟 ${song.title} 的卡片`);
    const draw=()=>{const artwork=createCardArt(song,albumCoverStyle(song));cover.append(artwork.element);artworks.set(song.id,artwork);};
    const info=document.createElement('div');info.className='album-info';
    const heading=document.createElement('div');heading.className='album-heading';
    const title=document.createElement('h2');title.textContent=song.title;
    const tagsButton=document.createElement('button');tagsButton.className='album-tag-edit';tagsButton.innerHTML=`${icon('tag')}<span>標籤</span>`;tagsButton.setAttribute('aria-label',`編輯 ${song.title} 的標籤`);tagsButton.disabled=!metadata.writable;tagsButton.onclick=()=>{stop();tagEditor.open(song,metadata.tags.get(song.id)??[],options.map(option=>option.name));};tagButtons.set(song.id,tagsButton);heading.append(title,tagsButton);
    const badges=document.createElement('div');badges.className='album-tags';(metadata.tags.get(song.id)??[]).forEach(tag=>{const badge=document.createElement('span');badge.textContent=tag;badges.append(badge);});
    const meta=document.createElement('p');meta.className='album-meta';meta.textContent=`${song.tempoBpm} BPM · ${song.events.reduce((sum,event)=>sum+eventSeconds(event,song.tempoBpm),0).toFixed(1)} 秒`;
    const controls=document.createElement('div');controls.className='album-controls';
    const playButton=document.createElement('button');playButton.innerHTML=`${icon('play')}<span>試聽</span>`;playButton.setAttribute('aria-label',`試聽 ${song.title}`);playButton.setAttribute('aria-pressed','false');playButton.onclick=()=>void play(song);playButtons.set(song.id,playButton);
    const wav=document.createElement('button');wav.innerHTML=`${icon('load')}<span>WAV</span>`;wav.setAttribute('aria-label',`下載 ${song.title} 的 WAV`);wav.onclick=()=>download(song,wav);
    const edit=document.createElement('a');const editLocation=new URL(location.href);editLocation.search='';editLocation.hash='';editLocation.searchParams.set('song',song.id);edit.href=editLocation.href;edit.innerHTML=icon('edit');edit.setAttribute('aria-label',`編輯 ${song.title}`);edit.title='編輯';
    const share=document.createElement('button');share.innerHTML=icon('share');share.setAttribute('aria-label',`分享 ${song.title}`);share.title='分享';share.onclick=()=>{sharingSong=song;try{sharing.open();}catch(error){status.textContent=(error as Error).message;}};
    const remove=document.createElement('button');remove.innerHTML=icon('trash');remove.setAttribute('aria-label',`移除 ${song.title}`);remove.title='移除（可復原）';remove.className='album-remove';remove.disabled=!library.writable;
    remove.onclick=()=>{stop();if(!confirm(`移除「${song.title}」？之後可按「復原最近移除」還原。`))return;try{removeSong(localStorage,song.id);render();status.textContent=`已移除「${song.title}」，可按「復原最近移除」還原。`;restoreButton.focus();}catch(error){status.textContent=(error as Error).message;}};
    heading.append(remove);controls.append(playButton,wav,edit,share);info.append(heading,meta,badges,controls);album.append(cover,info);grid.append(album);
    if(observer){pending.set(cover,draw);observer.observe(cover);}else draw();
  });
}
window.addEventListener('storage',event=>{if(event.key===STORAGE_KEY||event.key===TAGS_KEY||event.key===REMOVED_KEY||event.key===null){render();status.textContent='收藏已更新。';}});
window.addEventListener('blur',stop);
window.addEventListener('pagehide',()=>{stop();cancelDownload();observer?.disconnect();});
window.addEventListener('pageshow',event=>{if(event.persisted)render();});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){stop();status.textContent='已停止。';}});
try { starterWarning=ensureStarterLibrary(localStorage).warning; } catch { /* render reports unavailable storage */ }
render();
