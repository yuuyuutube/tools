import { AudioActivationError,AudioEngine } from './audio-engine/player';
import { durations,formatEvent,type Melody } from './music-core/model';
import { firstRepairLevel,compareRepair } from './music-core/archaeology';
import { noteFromStep,noteStep,pitchSteps,updateSelected } from './music-core/studio';
import { EditHistory } from './music-core/history';
import type { EditorState } from './music-core/editor';
import { editUrl } from './music-core/share';
import { createShareDialog } from './share-dialog';
import { mountLabNavigation } from './navigation';
import { icon } from './icons';
const app=document.querySelector<HTMLElement>('#app')!;document.title='鈴聲考古 · BEEP LAB';
app.innerHTML=`<header class="site-header repair-header"><img src="./favicon.svg" width="32" height="32" alt=""/><h1>RINGTONE ARCHAEOLOGY</h1></header><main class="repair-main"><div class="repair-heading"><span>第 1 關</span><h2>修復一個音</h2><p>有一個音高損壞了。聽原曲，再選音符調整。</p></div><div class="repair-listen"><button id="repair-reference">${icon('volume')}<span>聽原曲</span></button><button id="repair-listen">${icon('play')}<span>聽修復版本</span></button><button id="repair-stop" aria-label="停止播放">${icon('stop')}</button></div><p id="repair-audio" role="status" aria-live="polite"></p><button id="repair-enable" hidden>${icon('volume')}<span>啟用聲音</span></button><section class="repair-panel" aria-label="修復編輯區"><h3>你的修復版本</h3><div class="repair-score" role="group" aria-label="選擇要修復的音符"></div><div class="repair-fields"><label>音高<select id="repair-pitch"></select></label><label>時值<select id="repair-duration">${durations.map(value=>`<option value="${value}">1/${value}</option>`).join('')}</select></label><label><input type="checkbox" id="repair-dot"/>附點</label></div><div class="repair-edit-actions"><button id="repair-undo" aria-label="復原">${icon('undo')}</button><button id="repair-redo" aria-label="重做">${icon('redo')}</button><button id="repair-reset">${icon('redo')}<span>重新修復</span></button></div></section><div class="repair-submit"><button id="repair-check" class="save-button">檢查修復</button><button id="repair-hint">提示</button></div><p id="repair-hint-text" role="status" aria-live="polite"></p><p id="repair-result" role="status" aria-live="polite"></p><div class="repair-complete" hidden><p>第一關完成。你可以把修好的旋律帶去繼續創作。</p><div><a id="repair-create" class="card-home">${icon('edit')}<span>繼續創作</span></a><button id="repair-share">${icon('share')}<span>分享修復作品</span></button></div></div></main>`;
mountLabNavigation('archaeology');
const level=firstRepairLevel();let state:EditorState={melody:structuredClone(level.damaged),cursor:1,octave:2};
const history=new EditHistory(),engine=new AudioEngine();let audioAttempt=0,hints=0;
const $=<T extends HTMLElement=HTMLElement>(selector:string)=>document.querySelector<T>(selector)!;
const pitch=$<HTMLSelectElement>('#repair-pitch'),duration=$<HTMLSelectElement>('#repair-duration'),dot=$<HTMLInputElement>('#repair-dot');
pitch.innerHTML='<option value="rest">休止符</option>'+Array.from({length:36},(_,step)=>`<option value="${step}">${pitchSteps[step%12].toUpperCase()}${Math.floor(step/12)+1}</option>`).join('');
function idle(){for(const id of ['#repair-reference','#repair-listen'])$(id).setAttribute('aria-pressed','false');document.querySelectorAll('.repair-note.sounding').forEach(note=>note.classList.remove('sounding'));}
function stop(){audioAttempt++;engine.stop();idle();$('#repair-audio').textContent='';}
engine.onEnd=()=>{idle();$('#repair-audio').textContent='播放結束。';};
engine.onPosition=index=>document.querySelectorAll('.repair-note').forEach((note,i)=>note.classList.toggle('sounding',i===index));
async function listen(melody:Melody,reference:boolean){stop();const token=++audioAttempt;try{await engine.playMelody(melody);if(token!==audioAttempt)return;$('#repair-enable').hidden=true;if(engine.isPlaying){$(reference?'#repair-reference':'#repair-listen').setAttribute('aria-pressed','true');$('#repair-audio').textContent=reference?'正在播放原曲':'正在播放你的修復版本';}}catch(error){if(token!==audioAttempt)return;$('#repair-audio').textContent=error instanceof AudioActivationError?error.message:'無法播放，請再試一次。';$('#repair-enable').hidden=error instanceof AudioActivationError&&!error.recoverable;}}
$('#repair-reference').onclick=()=>void listen(level.target,true);$('#repair-listen').onclick=()=>void listen(state.melody,false);$('#repair-stop').onclick=stop;
$('#repair-enable').onclick=async()=>{try{await engine.unlock();$('#repair-enable').hidden=true;$('#repair-audio').textContent='聲音已啟用，請再點聆聽。';}catch(error){$('#repair-audio').textContent=(error as Error).message;}};
function render(){
  const score=$('.repair-score');score.replaceChildren();
  state.melody.events.forEach((event,index)=>{const button=document.createElement('button');button.className='repair-note';button.textContent=formatEvent(event);button.setAttribute('aria-label',`第 ${index+1} 音 ${formatEvent(event)}`);button.setAttribute('aria-pressed',String(index===state.cursor-1));button.onclick=()=>{stop();state={...state,cursor:index+1};render();};button.onkeydown=key=>{if(key.key==='ArrowLeft'||key.key==='ArrowRight'){key.preventDefault();stop();state={...state,cursor:Math.max(1,Math.min(state.melody.events.length,state.cursor+(key.key==='ArrowLeft'?-1:1)))};render();document.querySelectorAll<HTMLButtonElement>('.repair-note')[state.cursor-1]?.focus();}};score.append(button);});
  const event=state.melody.events[state.cursor-1];pitch.value=String(noteStep(event)??'rest');duration.value=String(event.duration);dot.checked=event.dotted;
  $<HTMLButtonElement>('#repair-undo').disabled=!history.canUndo;$<HTMLButtonElement>('#repair-redo').disabled=!history.canRedo;
}
function invalidate(){const result=$('#repair-result');result.textContent='';result.removeAttribute('data-passed');$('.repair-complete').hidden=true;}
function change(){stop();const timing={duration:Number(duration.value) as typeof durations[number],dotted:dot.checked};const event=pitch.value==='rest'?{type:'rest' as const,...timing}:noteFromStep(Number(pitch.value),timing);const result=updateSelected(state,event);history.record(state,result.state);state=result.state;invalidate();render();}
pitch.onchange=duration.onchange=dot.onchange=change;
function restore(direction:'undo'|'redo'){stop();state=history[direction](state);invalidate();render();}
$('#repair-undo').onclick=()=>restore('undo');$('#repair-redo').onclick=()=>restore('redo');
$('#repair-reset').onclick=()=>{stop();const next={...state,melody:structuredClone(level.damaged),cursor:1};history.record(state,next);state=next;hints=0;$('#repair-hint-text').textContent='';$('#repair-hint').textContent='提示';invalidate();render();};
$('#repair-hint').onclick=()=>{hints=Math.min(level.hints.length,hints+1);$('#repair-hint-text').textContent=level.hints[hints-1];$('#repair-hint').textContent=`提示 ${hints}/${level.hints.length}`;};
$('#repair-check').onclick=()=>{
  stop();const result=compareRepair(level.target,state.melody);const feedback=$('#repair-result');feedback.setAttribute('data-passed',String(result.passed));
  feedback.textContent=result.passed?'修復成功！音高與節奏都與原曲一致。':result.countMismatch?'音符數量還不一致。':result.tempoMismatch?'播放速度還不一致。':`還有 ${result.pitchErrors.length} 個音高、${result.rhythmErrors.length} 個節奏需要修復。再聽一次，或使用提示。`;
  $('.repair-complete').hidden=!result.passed;
  if(result.passed)$<HTMLAnchorElement>('#repair-create').href=editUrl(state.melody,location.href);
};
const share=createShareDialog(()=>state.melody,stop);$('#repair-share').onclick=()=>{try{share.open();}catch(error){$('#repair-result').textContent=(error as Error).message;}};
window.addEventListener('blur',stop);window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
document.addEventListener('keydown',event=>{if(document.querySelector('dialog[open]'))return;if(event.key==='Escape')stop();if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='z'&&!(event.target instanceof HTMLElement&&event.target.matches('input,select,textarea'))){event.preventDefault();restore(event.shiftKey?'redo':'undo');}});
render();
