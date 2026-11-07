import { AudioActivationError, AudioEngine } from './audio-engine/player';
import { eventSeconds, formatEvent, type Melody } from './music-core/model';
import { readSharedMelody, editUrl } from './music-core/share';
import { createShareDialog } from './share-dialog';
import { icon } from './icons';
import { createCardArt, resolveArtStyle } from './card-art';
const app=document.querySelector<HTMLElement>('#app')!;
document.title='BEEP CARD';
document.documentElement.classList.add('card-mode');
app.innerHTML=`<header class="site-header"><img src="./favicon.svg" width="32" height="32" alt=""/><span class="card-brand">BEEP CARD</span><a class="composer-link" href="./">開啟編曲器</a></header><main class="card-main"><article class="beep-card"><div class="card-art"></div><div class="art-controls"><label for="card-art-style">圖案</label><select id="card-art-style"><option value="weave">旋律織紋</option><option value="stars">聲音星圖</option><option value="rhythm">節奏構成</option><option value="terrain">聲音地形</option><option value="letterpress">旋律活版</option><option value="specimen">音符標本</option><option value="windows">聲音窗景</option><option value="random">隨機驚喜</option></select></div><h1 class="card-title"></h1><p class="card-meta"></p><div class="card-score" aria-label="旋律音符"></div><div class="transport"><button id="card-play" class="play-button">${icon('play')}<span>播放</span></button><button id="card-stop">${icon('stop')}<span>停止</span></button><button id="card-mute" aria-label="靜音" aria-pressed="false">${icon('volume')}</button></div><p class="card-status" role="status" aria-live="polite">點播放聆聽旋律。</p><button id="card-enable" hidden>${icon('volume')}<span>啟用聲音</span></button><div class="card-actions"><a id="card-edit" class="save-button">${icon('edit')}<span>編輯這首</span></a><button id="card-share">${icon('share')}<span>分享</span></button></div></article></main>`;
const melody:Melody|undefined=(()=>{
try { return readSharedMelody(location.hash); }
catch(error) {
  document.querySelector('.beep-card')!.replaceChildren();
  const title=document.createElement('h1');title.textContent='無法開啟旋律';
  const message=document.createElement('p');message.textContent=(error as Error).message;
  const link=document.createElement('a');link.href='./';link.className='card-home';link.textContent='建立自己的旋律';
  document.querySelector('.beep-card')!.append(title,message,link);
  return undefined;
}
})();
if (melody) {
  const artSelect=document.querySelector<HTMLSelectElement>('#card-art-style')!;
  let style=resolveArtStyle(new URLSearchParams(location.search).get('art'));
  let artwork=createCardArt(melody,style);
  document.querySelector('.card-art')!.append(artwork.element);
  function syncStyle() {artSelect.value=style;const url=new URL(location.href);url.searchParams.set('art',style);window.history.replaceState(null,'',url);document.querySelector<HTMLAnchorElement>('#card-edit')!.href=editUrl(melody!,url.href);}
  syncStyle();
  artSelect.onchange=()=>{stop();style=resolveArtStyle(artSelect.value);artwork=createCardArt(melody,style);document.querySelector('.card-art')!.replaceChildren(artwork.element);syncStyle();};
  const engine=new AudioEngine();let muted=false;let attempt=0;
  const status=document.querySelector<HTMLElement>('.card-status')!;
  const play=document.querySelector<HTMLButtonElement>('#card-play')!;
  const enable=document.querySelector<HTMLButtonElement>('#card-enable')!;
  const score=document.querySelector<HTMLElement>('.card-score')!;
  document.querySelector('.card-title')!.textContent=melody.title;
  document.title=`${melody.title} · BEEP CARD`;
  document.querySelector('.card-meta')!.textContent=`${melody.tempoBpm} BPM · ${melody.events.length} 個音符／休止符 · ${melody.events.reduce((sum,e)=>sum+eventSeconds(e,melody.tempoBpm),0).toFixed(1)} 秒`;
  const notes=melody.events.map((event,index)=>{const note=document.createElement('span');note.textContent=formatEvent(event);note.dataset.index=String(index);score.append(note);return note;});
  function idle() {play.classList.remove('playing');play.querySelector('span')!.textContent='播放';status.textContent='點播放聆聽旋律。';}
  function stop() {attempt++;engine.stop();idle();}
  function audioError(error:unknown) {idle();status.textContent=error instanceof AudioActivationError?error.message:'無法播放，請再試一次。';enable.hidden=error instanceof AudioActivationError&&!error.recoverable;}
  engine.onEnd=idle;
  engine.onPosition=index=>{
    artwork.position(index);
    notes.forEach((note,i)=>note.classList.toggle('sounding',i===index));
    if(index!==null){const note=notes[index];if(note.offsetTop<score.scrollTop||note.offsetTop+note.offsetHeight>score.scrollTop+score.clientHeight)score.scrollTop=note.offsetTop-score.offsetTop;}
  };
  play.onclick=async()=>{
    const token=++attempt;
    try {await engine.playMelody(melody);if(token!==attempt)return;enable.hidden=true;if(engine.isPlaying){play.classList.add('playing');play.querySelector('span')!.textContent='重播';status.textContent='播放中';}}
    catch(error){if(token===attempt)audioError(error);}
  };
  document.querySelector<HTMLButtonElement>('#card-stop')!.onclick=stop;
  enable.onclick=async()=>{try{await engine.unlock();enable.hidden=true;status.textContent='聲音已啟用，請按播放。';}catch(error){audioError(error);}};
  document.querySelector<HTMLButtonElement>('#card-mute')!.onclick=event=>{muted=!muted;engine.setMuted(muted);const button=event.currentTarget as HTMLButtonElement;button.innerHTML=icon(muted?'muted':'volume');button.setAttribute('aria-pressed',String(muted));button.setAttribute('aria-label',muted?'開啟聲音':'靜音');};
  document.querySelector<HTMLAnchorElement>('#card-edit')!.href=editUrl(melody,location.href);
  const share=createShareDialog(()=>melody,stop);
  document.querySelector<HTMLButtonElement>('#card-share')!.onclick=()=>share.open();
  window.addEventListener('pagehide',stop);window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
  document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]'))return;if(event.key==='Escape')stop();else if(event.code==='Space'&&event.target===document.body){event.preventDefault();play.click();}});
}
