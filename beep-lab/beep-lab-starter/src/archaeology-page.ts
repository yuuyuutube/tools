import { createRepairTimeline } from './repair-timeline';
import { canIssueCertificate } from './certificate';
import { createCertificateDialog } from './certificate-dialog';
import { drawRepairPraise } from './repair-praise';
import { readRepairProgress,saveRepairProgress,type RepairProgress } from './music-core/repair-progress';
import { AudioActivationError,AudioEngine } from './audio-engine/player';
import { durations,formatEvent,type Melody } from './music-core/model';
import { repairLevels,compareRepair } from './music-core/archaeology';
import { noteFromStep,noteStep,pitchSteps,updateSelected } from './music-core/studio';
import { EditHistory } from './music-core/history';
import type { EditorState } from './music-core/editor';
import { editUrl } from './music-core/share';
import { createShareDialog } from './share-dialog';
import { mountLabNavigation } from './navigation';
import { newRepairFlow,markRepairHeard,advanceRepair,canVisitRepair,visitRepair,finishRepair,invalidateRepair,type RepairStep } from './repair-flow';
import { icon } from './icons';
const app=document.querySelector<HTMLElement>('#app')!;
document.title='鈴聲考古 · BEEP LAB';
const steps=[{title:'先聽原曲',short:'聽原曲'},{title:'再聽錯誤版',short:'聽錯誤版'},{title:'動手修復你的樂譜',short:'修復樂譜'},{title:'確認後，送出答案',short:'送出答案'},{title:'答對了，修復成功！',short:'通關'}];
app.innerHTML=`<header class="site-header repair-header"><img src="./favicon.svg" width="32" height="32" alt=""/><h1>RINGTONE ARCHAEOLOGY</h1></header>
<main class="repair-main">
  <div class="repair-level-picker"><label for="repair-level-select">關卡</label><select id="repair-level-select"></select><span id="repair-progress-count"></span><button id="repair-certificate-return" class="repair-certificate-return" hidden>通關證書</button></div>
  <div class="repair-level-label"><span id="repair-level-number"></span><span id="repair-level-title"></span></div><p class="repair-attribution"></p><p id="repair-progress-warning" role="status"></p>
  <ol class="repair-steps" aria-label="本關步驟">${steps.map((step,index)=>`<li><button data-step="${index+1}" aria-label="步驟 ${index+1}：${step.short}"><span class="repair-step-dot">${index+1}</span><span>${step.short}</span></button></li>`).join('')}</ol>
  <div class="repair-stage-heading"><p id="repair-step-count"></p><h2 id="repair-stage-title" tabindex="-1"></h2></div>
  <div class="repair-audio-bar" hidden><p id="repair-audio" role="status" aria-live="polite"></p><button id="repair-stop" aria-label="停止播放">${icon('stop')}</button><button id="repair-enable" hidden>${icon('volume')}<span>啟用聲音</span></button></div>
  <div id="repair-playback-timeline"></div>
  <section data-pane="1" aria-label="步驟一：聽原曲">
    <p class="repair-stage-copy"><span id="repair-intro-difference"></span>。先聽正確版本，記住旋律，待會你要把錯誤版修回來。</p>
    <div class="repair-listen-card"><span>正確版本</span><button id="repair-reference" data-audio="reference">${icon('volume')}<span>播放原曲</span></button><p>留意旋律的高低與長短，可以重複聽。</p></div>
    <p class="repair-next-help" id="repair-reference-help">先播放一次原曲，就能前往下一步。</p>
    <div class="repair-stage-actions"><button class="save-button" id="repair-next-reference">聽好了，下一步 ${icon('right')}</button></div>
  </section>
  <section data-pane="2" aria-label="步驟二：聽錯誤版" hidden>
    <p class="repair-stage-copy">這是你的起始樂譜，<span id="repair-damaged-difference"></span>。先比較哪裡不一樣，下一步再修改。</p>
    <div class="repair-listen-card damaged"><span>錯誤版 · 你的起始樂譜</span><button data-audio="damaged">${icon('play')}<span>播放錯誤版</span></button><p>不用急著找到答案，先聽出兩個版本的差別。</p></div>
    <button class="repair-compare-button" data-audio="reference">${icon('volume')}<span>再聽原曲</span></button>
    <p class="repair-next-help" id="repair-damaged-help">先播放一次錯誤版，就能開始修復。</p>
    <div class="repair-stage-actions"><button data-go="1">上一步</button><button class="save-button" id="repair-next-damaged">開始修復 ${icon('right')}</button></div>
  </section>
  <section data-pane="3" aria-label="步驟三：修復樂譜" hidden>
    <p class="repair-mission"></p>
    <div class="repair-compare"><button data-audio="reference">${icon('volume')}<span>聽原曲</span></button><button data-audio="candidate">${icon('play')}<span>聽我的版本</span></button></div>
    <section class="repair-panel" aria-label="修復編輯區"><div class="repair-edit-intro"><p class="repair-edit-instruction">點音符試聽，再調整音高。</p><button id="repair-hint">需要提示</button></div><p id="repair-hint-text" role="status" aria-live="polite"></p><p id="repair-score-caption" class="repair-score-caption">我的版本</p><div class="repair-score" role="group" aria-label="選擇要修復的音符"></div><div class="repair-pitch-field"><label for="repair-pitch" id="repair-pitch-label">把第 1 音的音高調整為：</label><select id="repair-pitch"></select></div>
      <details class="repair-rhythm"><summary>節奏設定</summary><div class="repair-fields"><label>時值<select id="repair-duration">${durations.map(value=>`<option value="${value}">1/${value}</option>`).join('')}</select></label><label><input type="checkbox" id="repair-dot"/>附點</label></div></details>
      <div class="repair-edit-actions"><button id="repair-undo">${icon('undo')}<span>復原</span></button><button id="repair-redo">${icon('redo')}<span>重做</span></button><button id="repair-reset">還原起始樂譜</button></div>
    </section>
    <div class="repair-stage-actions"><button data-go="2">上一步</button><button class="save-button" id="repair-next-edit">改好了，試聽確認 ${icon('right')}</button></div>
  </section>
  <section data-pane="4" aria-label="步驟四：送出答案" hidden>
    <p class="repair-stage-copy">再聽一次你修好的版本。覺得和原曲一樣了，就送出答案。</p>
    <div class="repair-listen-card"><span>你目前的修復版本</span><button id="repair-listen" data-audio="candidate">${icon('play')}<span>播放修復版本</span></button><div class="repair-review-score" aria-label="待送出的樂譜"></div></div>
    <button class="repair-compare-button" data-audio="reference">${icon('volume')}<span>再聽原曲</span></button>
    <p id="repair-result" role="status" aria-live="polite"></p>
    <div class="repair-stage-actions"><button data-go="3">返回修復</button><button id="repair-check" class="save-button">送出答案 ${icon('right')}</button></div>
  </section>
  <section data-pane="5" class="repair-complete" aria-label="步驟五：通關" hidden>
    <div class="repair-success-mark">${icon('check')}</div><p class="repair-success-copy"></p><p class="repair-success-note"></p><button id="repair-next-level" class="save-button"></button><div class="repair-certificate-reward" hidden><p>全八關修復完成，這張證書屬於你。</p><button id="repair-certificate" class="save-button">領取通關證書</button></div>
    <div class="repair-secondary-actions"><button id="repair-replay">再玩一次</button><button id="repair-share">${icon('share')}<span>分享修復作品</span></button></div><a id="repair-create" class="repair-create">帶去編曲器繼續創作 ${icon('right')}</a>
  </section>
</main>`;
mountLabNavigation('archaeology');
const levels=repairLevels();
let progress:RepairProgress;try{progress=readRepairProgress(localStorage);}catch{progress={completed:[],current:'nokia',writable:false,warning:'瀏覽器無法儲存闖關進度；仍可遊玩。'};}
const retiredLevels:Record<string,string>={'fate':'can-can','swan-lake':'william-tell'};
const rawRequested=new URLSearchParams(location.search).get('level');
const requested=rawRequested?retiredLevels[rawRequested]??rawRequested:null;
if(rawRequested&&requested!==rawRequested){const url=new URL(location.href);url.searchParams.set('level',requested!);window.history.replaceState(null,'',url);}
const savedLevel=retiredLevels[progress.current]??progress.current;
let levelIndex=Math.max(0,levels.findIndex(value=>value.id===(requested??savedLevel))),level=levels[levelIndex];
let currentPraise='',previousPraise='';
let state:EditorState={melody:structuredClone(level.damaged),cursor:1,octave:2},flow=newRepairFlow();
const history=new EditHistory(),engine=new AudioEngine();let audioAttempt=0,hints=0;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const pitch=$<HTMLSelectElement>('#repair-pitch'),duration=$<HTMLSelectElement>('#repair-duration'),dot=$<HTMLInputElement>('#repair-dot');
pitch.innerHTML='<option value="rest">休止符</option>'+Array.from({length:36},(_,step)=>`<option value="${step}">${pitchSteps[step%12].toUpperCase()}${Math.floor(step/12)+1}</option>`).join('');
const certificate=createCertificateDialog(()=>canIssueCertificate(progress.completed,levels.map(value=>value.id)),levels.length,stop);
$('#repair-certificate').onclick=$('#repair-certificate-return').onclick=()=>certificate.open();
function followingLevel(){return levelIndex+1<levels.length?levelIndex+1:levels.findIndex(value=>!progress.completed.includes(value.id));}
function renderLevels(){
  const select=$<HTMLSelectElement>('#repair-level-select');select.replaceChildren();
  levels.forEach((value,index)=>{const option=document.createElement('option');option.value=value.id;option.textContent=`${index+1}. ${value.target.title}${progress.completed.includes(value.id)?' · 已修復':''}`;select.append(option);});select.value=level.id;
  $('#repair-progress-count').textContent=`已修復 ${levels.filter(value=>progress.completed.includes(value.id)).length} / ${levels.length}`;
  $('#repair-level-number').textContent=`第 ${levelIndex+1} 關 / ${levels.length}`;$('#repair-level-title').textContent=level.target.title;
  $('.repair-attribution').textContent=level.attribution;$('#repair-progress-warning').textContent=progress.warning??'';
  $('#repair-intro-difference').textContent=`這段旋律${level.difference}`;$('#repair-damaged-difference').textContent=level.difference;
  $('.repair-mission').textContent=`目標：把你的樂譜改成和原曲一樣。${level.mission}`;
  $('.repair-edit-instruction').textContent=level.kind==='rhythm'?'點音符試聽，再調整時值。休止符不發聲。':level.kind==='mixed'?'點音符試聽，再調整音高與時值。':'點音符試聽，再調整音高。';
  $('.repair-success-copy').textContent=currentPraise;
  const completed=levels.filter(value=>progress.completed.includes(value.id)).length;
  const allComplete=canIssueCertificate(progress.completed,levels.map(value=>value.id));
  $('.repair-certificate-reward').hidden=!allComplete;$('#repair-certificate-return').hidden=!allComplete;
  $('.repair-success-note').textContent=completed===levels.length?`本批 ${levels.length} 關全數修復！新關卡將陸續加入。`:`「${level.target.title}」修復完成！已修復 ${completed} / ${levels.length} 關。`;
  const following=followingLevel();const next=$<HTMLButtonElement>('#repair-next-level');next.hidden=following<0;next.textContent=following>=0?`${following>levelIndex?'下一關':'繼續挑戰'}：${levels[following].target.title}`:'';
}
function persistProgress(){
  try{progress=saveRepairProgress(localStorage,level.id,progress.completed);}
  catch(error){progress={...progress,current:level.id,warning:(error as Error).message};}
}
function resetLevel(index:number,focus=true){
  stop();levelIndex=index;level=levels[index];state={melody:structuredClone(level.damaged),cursor:1,octave:2};flow=newRepairFlow();history.clear();hints=0;currentPraise='';
  $('#repair-hint-text').textContent='';$('#repair-hint').textContent='需要提示';$('#repair-result').textContent='';$('#repair-result').removeAttribute('data-passed');
  $<HTMLDetailsElement>('.repair-rhythm').open=level.kind!=='pitch';
  persistProgress();const url=new URL(location.href);url.searchParams.set('level',level.id);window.history.replaceState(null,'',url);
  renderEditor();renderFlow(focus);
}
$<HTMLSelectElement>('#repair-level-select').onchange=()=>{const index=levels.findIndex(value=>value.id===$<HTMLSelectElement>('#repair-level-select').value);if(index>=0)resetLevel(index);};
$('#repair-next-level').onclick=()=>{const index=followingLevel();if(index>=0)resetLevel(index);};
function renderFlow(focus=false){
  renderLevels();
  document.querySelectorAll<HTMLElement>('[data-pane]').forEach(pane=>pane.hidden=Number(pane.dataset.pane)!==flow.step);
  document.querySelectorAll<HTMLButtonElement>('[data-step]').forEach(button=>{
    const step=Number(button.dataset.step) as RepairStep;button.disabled=!canVisitRepair(flow,step);
    if(step===flow.step)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');
    button.classList.toggle('completed',step<flow.furthest&&step!==flow.step);
    button.querySelector('.repair-step-dot')!.innerHTML=step<flow.furthest&&step!==flow.step?icon('check'):String(step);
  });
  $('#repair-step-count').textContent=`步驟 ${flow.step} / 5`;$('#repair-stage-title').textContent=steps[flow.step-1].title;
  $<HTMLButtonElement>('#repair-next-reference').disabled=!flow.heardReference;$<HTMLButtonElement>('#repair-next-damaged').disabled=!flow.heardDamaged;
  $('#repair-reference-help').hidden=flow.heardReference;$('#repair-damaged-help').hidden=flow.heardDamaged;
  if(focus){$('#repair-stage-title').focus({preventScroll:true});window.scrollTo(0,0);}
}
const playbackTimeline=createRepairTimeline($('#repair-playback-timeline'));
engine.onProgress=(seconds,total)=>playbackTimeline.update(seconds,total);
function maskReferenceScore(masked:boolean){
  $('#repair-score-caption').textContent=masked?'正在聽原曲，音符暫時隱藏':'我的版本';
  document.querySelectorAll<HTMLButtonElement>('.repair-note').forEach((button,index)=>{
    const code=formatEvent(state.melody.events[index]);button.querySelector('strong')!.textContent=masked?'──':code;
    button.setAttribute('aria-label',masked?`第 ${index+1} 音，原曲播放中，點選編輯我的版本`:`第 ${index+1} 音 ${code}`);
  });
}
function idle(){maskReferenceScore(false);document.querySelectorAll('[data-audio]').forEach(button=>button.setAttribute('aria-pressed','false'));document.querySelectorAll('.repair-note.sounding').forEach(note=>note.classList.remove('sounding'));$('#repair-stop').hidden=true;}
function audioMessage(text:string){$('#repair-audio').textContent=text;$('.repair-audio-bar').hidden=!text;}
function stop(){audioAttempt++;engine.stop();idle();audioMessage('');}
engine.onEnd=()=>{idle();audioMessage('播放結束。');};
engine.onPosition=index=>document.querySelectorAll('.repair-note').forEach((note,i)=>note.classList.toggle('sounding',i===index));
async function listen(kind:'reference'|'damaged'|'candidate'){
  stop();const token=++audioAttempt;const melody=kind==='reference'?level.target:kind==='damaged'?level.damaged:state.melody;playbackTimeline.prepare(melody);
  try{await engine.playMelody(melody);if(token!==audioAttempt)return;$('#repair-enable').hidden=true;
    if(engine.isPlaying){maskReferenceScore(kind==='reference');document.querySelectorAll(`[data-audio="${kind}"]`).forEach(button=>button.setAttribute('aria-pressed','true'));$('#repair-stop').hidden=false;audioMessage(kind==='reference'?'正在播放原曲':kind==='damaged'?'正在播放錯誤版':'正在播放你的修復版本');if(kind!=='candidate'){flow=markRepairHeard(flow,kind);renderFlow();}}
  }catch(error){if(token!==audioAttempt)return;audioMessage(error instanceof AudioActivationError?error.message:'無法播放，請再試一次。');$('#repair-enable').hidden=error instanceof AudioActivationError&&!error.recoverable;}
}
document.querySelectorAll<HTMLButtonElement>('[data-audio]').forEach(button=>button.onclick=()=>void listen(button.dataset.audio as 'reference'|'damaged'|'candidate'));
$('#repair-stop').onclick=stop;
$('#repair-enable').onclick=async()=>{try{await engine.unlock();$('#repair-enable').hidden=true;audioMessage('聲音已啟用，請再點播放。');}catch(error){audioMessage((error as Error).message);}};
function go(step:RepairStep){if(!canVisitRepair(flow,step))return;stop();flow=visitRepair(flow,step);renderFlow(true);}
function next(){stop();flow=advanceRepair(flow);renderFlow(true);}
document.querySelectorAll<HTMLButtonElement>('[data-step],[data-go]').forEach(button=>button.onclick=()=>go(Number(button.dataset.step??button.dataset.go) as RepairStep));
$('#repair-next-reference').onclick=$('#repair-next-damaged').onclick=$('#repair-next-edit').onclick=next;
function renderEditor(){
  const score=$('.repair-score');score.replaceChildren();
  state.melody.events.forEach((event,index)=>{
    const button=document.createElement('button');button.className='repair-note';button.innerHTML=`<span>${index+1}</span><strong>${formatEvent(event)}</strong>`;button.setAttribute('aria-label',`第 ${index+1} 音 ${formatEvent(event)}`);button.setAttribute('aria-pressed',String(index===state.cursor-1));
    button.onclick=()=>{state={...state,cursor:index+1};renderEditor();pitch.focus();void previewSelected();};
    button.onkeydown=key=>{if(key.key==='ArrowLeft'||key.key==='ArrowRight'){key.preventDefault();stop();state={...state,cursor:Math.max(1,Math.min(state.melody.events.length,state.cursor+(key.key==='ArrowLeft'?-1:1)))};renderEditor();document.querySelectorAll<HTMLButtonElement>('.repair-note')[state.cursor-1]?.focus();void previewSelected();}};
    score.append(button);
  });
  const event=state.melody.events[state.cursor-1];pitch.value=String(noteStep(event)??'rest');duration.value=String(event.duration);dot.checked=event.dotted;$('#repair-pitch-label').textContent=`把第 ${state.cursor} 音的音高調整為：`;
  $<HTMLButtonElement>('#repair-undo').disabled=!history.canUndo;$<HTMLButtonElement>('#repair-redo').disabled=!history.canRedo;
  const review=$('.repair-review-score');review.replaceChildren();state.melody.events.forEach(event=>{const note=document.createElement('span');note.textContent=formatEvent(event);review.append(note);});
}
async function previewSelected(){
  stop();const event=state.melody.events[state.cursor-1];
  if(!event||event.type==='rest')return;
  const token=++audioAttempt;
  try{await engine.previewNote(event,state.melody.tempoBpm);if(token===audioAttempt)$('#repair-enable').hidden=true;}
  catch(error){if(token!==audioAttempt)return;audioMessage(error instanceof AudioActivationError?error.message:'無法試聽，請再點一次音符。');$('#repair-enable').hidden=error instanceof AudioActivationError&&!error.recoverable;}
}
function invalidate(){currentPraise='';const previous=flow.step;flow=invalidateRepair(flow);$('#repair-result').textContent='';$('#repair-result').removeAttribute('data-passed');renderFlow(previous!==flow.step);}
function change(){stop();const timing={duration:Number(duration.value) as typeof durations[number],dotted:dot.checked};const event=pitch.value==='rest'?{type:'rest' as const,...timing}:noteFromStep(Number(pitch.value),timing);const result=updateSelected(state,event);history.record(state,result.state);state=result.state;invalidate();renderEditor();void previewSelected();}
pitch.onchange=duration.onchange=dot.onchange=change;
function restore(direction:'undo'|'redo'){stop();state=history[direction](state);invalidate();renderEditor();}
$('#repair-undo').onclick=()=>restore('undo');$('#repair-redo').onclick=()=>restore('redo');
$('#repair-reset').onclick=()=>{stop();const nextState={...state,melody:structuredClone(level.damaged),cursor:1};history.record(state,nextState);state=nextState;hints=0;$('#repair-hint-text').textContent='';$('#repair-hint').textContent='需要提示';invalidate();renderEditor();};
$('#repair-hint').onclick=()=>{hints=Math.min(level.hints.length,hints+1);$('#repair-hint-text').textContent=level.hints[hints-1];$('#repair-hint').textContent=`再給我一個提示 ${hints}/${level.hints.length}`;};
$('#repair-check').onclick=()=>{
  stop();const result=compareRepair(level.target,state.melody);flow=finishRepair(flow,result.passed);
  if(result.passed){if(!currentPraise){currentPraise=drawRepairPraise(previousPraise);previousPraise=currentPraise;}progress={...progress,completed:[...new Set([...progress.completed,level.id])]};persistProgress();$<HTMLAnchorElement>('#repair-create').href=editUrl(state.melody,location.href);renderFlow(true);}
  else{const remaining=[result.pitchErrors.length?`${result.pitchErrors.length} 個音高`:null,result.rhythmErrors.length?`${result.rhythmErrors.length} 個節奏`:null].filter(Boolean).join('、');$('#repair-result').textContent=result.countMismatch?'音符數量還不一致，請返回修復。':result.tempoMismatch?'播放速度還不一致，請返回修復。':`還差一點：${remaining}與原曲不同。返回修復再試一次，也可以查看提示。`;$('#repair-result').setAttribute('data-passed','false');renderFlow();$('#repair-result').scrollIntoView({block:'nearest'});}
};
$('#repair-replay').onclick=()=>resetLevel(levelIndex);
const share=createShareDialog(()=>state.melody,stop);$('#repair-share').onclick=()=>{try{share.open();}catch(error){audioMessage((error as Error).message);}};
window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]'))return;if(event.key==='Escape')stop();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!(event.target instanceof HTMLElement&&event.target.matches('input,select,textarea'))){event.preventDefault();restore(event.shiftKey?'redo':'undo');}});
idle();$<HTMLDetailsElement>('.repair-rhythm').open=level.kind!=='pitch';renderEditor();renderFlow();
