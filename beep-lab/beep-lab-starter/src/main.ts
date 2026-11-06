import './style.css';
import { icon, type IconName } from './icons';
import { createMelody, eventSeconds, formatEvent, MAX_BPM, MIN_BPM, type Melody } from './music-core/model';
import { edit, type EditorState } from './music-core/editor';
import { readLibrary, writeLibrary } from './music-core/storage';
import { AudioActivationError, AudioEngine } from './audio-engine/player';
import { demoMelody } from './demo';

const $ = <T extends HTMLElement = HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
const player = new AudioEngine();
let state: EditorState = { melody: createMelody('未命名旋律'), cursor: 0, octave: 2 };
let dirty = false;
let muted = false;
let library: ReturnType<typeof readLibrary>;
try { library = readLibrary(localStorage); }
catch { library = { songs: [], writable: false, warning: '瀏覽器禁止本機儲存；仍可編輯與播放。' }; }

const keys: { key: string; pitch?: string; label: string; symbol?: IconName }[] = [
  { key: '1', pitch: 'C', label: 'C' }, { key: '2', pitch: 'D', label: 'D' },
  { key: '3', pitch: 'E', label: 'E' }, { key: '4', pitch: 'F', label: 'F' },
  { key: '5', pitch: 'G', label: 'G' }, { key: '6', pitch: 'A', label: 'A' },
  { key: '7', pitch: 'B', label: 'B' }, { key: '8', label: '縮短', symbol: 'shorter' },
  { key: '9', label: '延長', symbol: 'longer' }, { key: '*', label: '八度', symbol: 'octave' },
  { key: '0', label: '休止', symbol: 'rest' }, { key: '#', label: '升音', symbol: 'sharp' },
];
$('#app').innerHTML = `
  <header class="site-header"><img src="./favicon.svg" width="32" height="32" alt="" /><h1>BEEP COMPOSER</h1></header>
  <main>
    <section class="instrument" aria-label="單音編曲器">
      <div class="editor-panel">
        <div class="lcd">
          <div class="lcd-top"><span id="lcd-mode">就緒</span><span id="dirty-label">未儲存</span></div>
          <label class="song-label" for="song-title">曲名</label><input id="song-title" maxlength="60" value="未命名旋律" autocomplete="off" spellcheck="false" enterkeyhint="done" />
          <div id="score" class="score" role="group" aria-label="旋律，點音符將游標置於其右方" tabindex="0" inputmode="none"></div>
          <div class="lcd-footer"><span id="position" aria-label="游標位置">0 / 0</span><span id="duration">0.0 秒</span><span id="octave">八度 2</span></div>
        </div>
        <div class="edit-tools"><div class="cursor-controls"><button data-command="ArrowLeft" aria-label="游標向左">${icon('left')}</button><button data-command="ArrowRight" aria-label="游標向右">${icon('right')}</button><button data-command="Backspace" aria-label="刪除游標左方音符">${icon('backspace')}</button></div><button data-command="." class="dot-key" aria-label="切換左方音符附點">${icon('dot')}<span>附點</span></button></div>
        <div class="transport"><button id="play" class="play-button" aria-label="播放旋律">${icon('play')}<span>播放</span></button><button id="stop" aria-label="停止播放">${icon('stop')}<span>停止</span></button><button id="mute" aria-label="靜音" aria-pressed="false">${icon('volume')}</button></div>
        <div id="sound-recovery" class="sound-recovery" hidden>
          <p id="sound-recovery-message" role="status">聲音尚未啟用</p>
          <button id="enable-sound">${icon('volume')}<span>啟用聲音</span></button>
        </div>
      </div>
      <div class="keypad-panel"><div class="keypad" aria-label="數字編曲鍵盤">
        ${keys.map(({key, pitch, label, symbol}) => `<button class="music-key ${pitch ? 'note-key' : 'function-key'}" data-key="${key}" aria-label="${key} ${label}"><span class="key-number">${key}</span><span class="key-note">${pitch ?? icon(symbol!)}</span>${pitch ? '' : `<span class="key-caption">${label}</span>`}</button>`).join('')}
      </div></div>
      <div class="settings-panel">
        <div class="tempo-row"><label for="tempo">速度 <span>BPM</span></label><input id="tempo" type="range" min="40" max="240" step="1" value="120" /><input id="tempo-number" type="number" inputmode="numeric" min="40" max="240" step="1" value="120" aria-label="每分鐘拍數" enterkeyhint="done" /></div>
        <p id="status" class="status" role="status" aria-live="polite">按 1–7 輸入音符，長按可加入附點。</p>
        <div class="workspace-actions"><button id="save" class="save-button">${icon('save')}<span>儲存</span></button><button id="new">${icon('add')}<span>新旋律</span></button><button id="demo">${icon('load')}<span>示範</span></button></div>
      </div>
    </section>
    <section class="below"><details class="guide"><summary>操作說明 ${icon('chevron')}</summary><div class="guide-body"><p><b>1–7</b> 輸入 C–B；<b>0</b> 插入休止符。按鍵會立即試聽，首次點擊會啟用聲音。</p><p><b>8 / 9</b> 縮短／延長游標左方音符；<b>#</b> 切換升音（E、B 除外）。<b>*</b> 設定下一音的八度 1–3。</p><p>長按音符鍵 450ms 輸入附點音，或用「附點」／實體 <b>.</b> 修改左方音符。左右方向鍵移動，Backspace 左刪除，空白鍵播放／停止，Esc 停止。</p><p>點音符把游標放在它右方；新音符一律插入。作品僅儲存在目前瀏覽器。音訊啟用失敗時可按「啟用聲音」重試；成功後請再按音符或播放。iPhone 若仍無聲，請確認媒體音量。</p><p class="historical-note">現代復刻，音色及部分操作為近似設計；附點按鈕為擴充功能。</p></div></details>
    <div class="library"><div class="library-heading"><h2>已儲存作品 <span id="library-count">0</span></h2><span>僅儲存於此瀏覽器</span></div><div id="library-notice"></div><div id="songs"></div></div></section>
  </main>
  <dialog id="confirm-dialog" aria-labelledby="confirm-title"><form method="dialog"><h2 id="confirm-title">確認操作</h2><p id="confirm-text"></p><div class="dialog-actions"><button value="cancel">取消</button><button value="confirm" class="save-button">確認</button></div></form></dialog>
`;
function notify(message: string) { $('#status').textContent = message; }
function renderAudioRecovery() {
  $('#sound-recovery').hidden = player.availability !== 'blocked' || muted;
}
function handleAudioError(error: unknown) {
  if (error instanceof AudioActivationError) {
    renderAudioRecovery();
    if (!muted) notify(error.message);
  } else notify(error instanceof Error ? error.message : '無法播放聲音，請再試一次。');
}
player.onAvailability = availability => {
  renderAudioRecovery();
  if (availability === 'unavailable') notify('此瀏覽器無法啟用聲音，請改用 Safari 或 Chrome。');
};
const enableSoundButton = $<HTMLButtonElement>('#enable-sound');
enableSoundButton.onclick = async () => {
  stop();
  enableSoundButton.disabled = true;
  enableSoundButton.setAttribute('aria-busy', 'true');
  $('#sound-recovery-message').textContent = '正在啟用聲音…';
  try {
    await player.unlock();
    notify('聲音已啟用，請按音符或播放。');
  } catch (error) { handleAudioError(error); }
  finally {
    enableSoundButton.disabled = false;
    enableSoundButton.removeAttribute('aria-busy');
    $('#sound-recovery-message').textContent = '聲音尚未啟用';
  }
};
function setDirty(value = true) { dirty = value; $('#dirty-label').textContent = value ? '未儲存' : '已儲存'; }
function stop() { cancelPress(); player.stop(); $('#lcd-mode').textContent = '就緒'; $('#play').classList.remove('playing'); }
function renderScore() {
  const score = $('#score');
  score.replaceChildren();
  if (!state.melody.events.length) {
    const empty = document.createElement('div'); empty.className = 'empty-score';
    empty.innerHTML = '<span class="empty-cursor" aria-hidden="true"></span><span>按 1–7 輸入音符</span>';
    score.append(empty);
  } else {
    const beginning = document.createElement('button'); beginning.className = 'start-cursor'; beginning.innerHTML = '<svg class="icon" viewBox="0 0 6 24" width="6" height="24" aria-hidden="true"><path d="M3 3v18" stroke="currentColor"/></svg>'; beginning.setAttribute('aria-label', '移至旋律開頭');
    beginning.classList.toggle('cursor-here', state.cursor === 0);
    beginning.onclick = () => { stop(); state.cursor = 0; renderScore(); };
    score.append(beginning);
    state.melody.events.forEach((event, index) => {
      const button = document.createElement('button'); button.className = 'score-note'; button.dataset.index = String(index);
      button.classList.toggle('selected', index === state.cursor - 1);
      button.classList.toggle('cursor-here', index === state.cursor - 1);
      button.textContent = formatEvent(event); button.setAttribute('aria-label', `第 ${index + 1} 音 ${formatEvent(event)}，選取`);
      button.setAttribute('aria-pressed', String(index === state.cursor - 1));
      button.onclick = () => { stop(); state.cursor = index + 1; renderScore(); };
      score.append(button);
    });
  }
  $('#position').textContent = `${state.cursor} / ${state.melody.events.length}`;
  $('#duration').textContent = `${state.melody.events.reduce((sum, e) => sum + eventSeconds(e, state.melody.tempoBpm), 0).toFixed(1)} 秒`;
  $('#octave').textContent = `八度 ${state.octave}`;
  requestAnimationFrame(() => {
    const selected = score.querySelector<HTMLElement>('.cursor-here');
    if (selected) revealNote(selected);
  });
}
function revealNote(element: HTMLElement) {
  const score = $('#score');
  if (element.offsetTop < score.scrollTop) score.scrollTop = element.offsetTop;
  else if (element.offsetTop + element.offsetHeight > score.scrollTop + score.clientHeight) score.scrollTop = element.offsetTop + element.offsetHeight - score.clientHeight;
}
function apply(key: string, dotted = false) {
  stop();
  const previous = state.melody;
  const result = edit(state, key, dotted);
  state = result.state;
  if (previous !== state.melody) setDirty();
  renderScore();
  if (result.message) notify(result.message);
  else if (result.preview) notify(`${formatEvent(result.preview)} · ${result.preview.type === 'rest' ? '休止符' : '已輸入／修改'}${result.preview.dotted ? ' · 附點 × 1.5' : ''}`);
  if (result.preview) void player.previewNote(result.preview, state.melody.tempoBpm).catch(handleAudioError);
}
player.onPosition = index => {
  document.querySelectorAll('.score-note.sounding').forEach(el => el.classList.remove('sounding'));
  if (index !== null) {
    const element = document.querySelector<HTMLElement>(`.score-note[data-index="${index}"]`);
    if (element) { element.classList.add('sounding'); revealNote(element); }
    $('#lcd-mode').textContent = `播放 ${index + 1}`;
  }
};
player.onEnd = () => { $('#lcd-mode').textContent = '就緒'; $('#play').classList.remove('playing'); };
$('#play').onclick = () => {
  if (player.isPlaying) { stop(); return; }
  if (!state.melody.events.length) { notify('先按幾個音符，或載入示範旋律。'); return; }
  void player.playMelody(state.melody).then(() => {
    if (player.isPlaying) { $('#play').classList.add('playing'); $('#lcd-mode').textContent = '播放中'; notify('播放中 · 再按播放或空白鍵可停止。'); }
  }).catch(handleAudioError);
};
$('#stop').onclick = () => { stop(); notify('已停止。'); };
$('#mute').onclick = () => {
  muted = !muted; player.setMuted(muted);
  $('#mute').setAttribute('aria-pressed', String(muted)); $('#mute').setAttribute('aria-label', muted ? '取消靜音' : '靜音'); $('#mute').innerHTML = icon(muted ? 'muted' : 'volume');
  renderAudioRecovery();
  if (muted) notify('已靜音。');
  else void player.unlock().then(() => notify('聲音已啟用。')).catch(handleAudioError);
};
const titleInput = $<HTMLInputElement>('#song-title');
titleInput.oninput = () => { state.melody = { ...state.melody, title: titleInput.value, updatedAt: new Date().toISOString() }; setDirty(); };
function tempo(value: string) {
  stop();
  const number = Number(value);
  if (!Number.isInteger(number) || number < MIN_BPM || number > MAX_BPM) { notify('BPM 請輸入 40–240 的整數。'); return; }
  state.melody = { ...state.melody, tempoBpm: number, updatedAt: new Date().toISOString() };
  $<HTMLInputElement>('#tempo').value = String(number); $<HTMLInputElement>('#tempo-number').value = String(number);
  setDirty(); renderScore();
}
$<HTMLInputElement>('#tempo').oninput = event => tempo((event.target as HTMLInputElement).value);
$<HTMLInputElement>('#tempo-number').oninput = event => tempo((event.target as HTMLInputElement).value);
$<HTMLInputElement>('#tempo-number').onchange = event => { tempo((event.target as HTMLInputElement).value); $<HTMLInputElement>('#tempo-number').value = String(state.melody.tempoBpm); };
document.querySelectorAll<HTMLButtonElement>('[data-command]').forEach(button => { button.onclick = () => apply(button.dataset.command!); });

// One pending press for both pointer and physical keyboard. Hold fires once; release never duplicates it.
let press: { key: string; timer: ReturnType<typeof setTimeout>; fired: boolean; button?: HTMLElement; pointerId?: number } | undefined;
function cancelPress() { if (press) { clearTimeout(press.timer); press.button?.classList.remove('pressed'); press = undefined; } }
function beginPress(key: string, button?: HTMLElement, pointerId?: number) {
  cancelPress();
  void player.unlock().catch(handleAudioError);
  button?.classList.add('pressed');
  if (!/^[1-7]$/.test(key)) { apply(key); return; }
  const pending = { key, fired: false, button, pointerId, timer: setTimeout(() => { pending.fired = true; apply(key, true); }, 450) };
  press = pending;
}
function endPress(key: string) {
  if (!press || press.key !== key) return;
  const shouldFire = !press.fired; cancelPress(); if (shouldFire) apply(key);
}
document.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button => {
  button.onpointerdown = event => {
    if (event.button !== 0 || !event.isPrimary) return;
    button.setPointerCapture(event.pointerId); beginPress(button.dataset.key!, button, event.pointerId);
  };
  button.onpointerup = event => { if (press?.pointerId === event.pointerId) endPress(button.dataset.key!); button.classList.remove('pressed'); };
  button.onpointercancel = () => { cancelPress(); button.classList.remove('pressed'); };
  button.onlostpointercapture = () => { if (press?.button === button) cancelPress(); };
  button.oncontextmenu = event => event.preventDefault();
  button.onclick = event => { if (event.detail === 0) apply(button.dataset.key!); };
});
const musicKeys = new Set('0123456789*#'.split(''));
function textTarget(target: EventTarget | null) { return target instanceof HTMLElement && (target.matches('input, textarea, select') || target.isContentEditable); }
document.addEventListener('keydown', event => {
  if (textTarget(event.target) || event.ctrlKey || event.metaKey || event.altKey || $<HTMLDialogElement>('#confirm-dialog').open) return;
  if (musicKeys.has(event.key)) {
    event.preventDefault(); if (!event.repeat) beginPress(event.key, document.querySelector<HTMLElement>(`[data-key="${event.key}"]`) ?? undefined);
  } else if (['ArrowLeft', 'ArrowRight', 'Backspace', '.'].includes(event.key)) { event.preventDefault(); apply(event.key); }
  else if (event.code === 'Space' && event.target === enableSoundButton) return;
  else if (event.code === 'Space') { event.preventDefault(); if (!event.repeat) $('#play').click(); }
  else if (event.key === 'Escape') { cancelPress(); stop(); }
});
document.addEventListener('keyup', event => { endPress(event.key); document.querySelectorAll('.music-key.pressed').forEach(el => el.classList.remove('pressed')); });
window.addEventListener('resize', () => requestAnimationFrame(() => {
  const selected = document.querySelector<HTMLElement>('.score-note.sounding, .score .cursor-here');
  if (selected) revealNote(selected);
}));
window.addEventListener('blur', () => { cancelPress(); stop(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelPress(); stop(); } });
window.addEventListener('pagehide', () => { cancelPress(); stop(); });
window.addEventListener('beforeunload', event => { if (dirty) event.preventDefault(); });
async function confirmAction(message: string): Promise<boolean> {
  stop(); cancelPress();
  const dialog = $<HTMLDialogElement>('#confirm-dialog'); $('#confirm-text').textContent = message;
  dialog.returnValue = ''; dialog.showModal();
  return new Promise(resolve => dialog.addEventListener('close', () => resolve(dialog.returnValue === 'confirm'), { once: true }));
}
function load(melody: Melody, saved: boolean) {
  stop(); cancelPress(); state = { melody: structuredClone(melody), cursor: melody.events.length, octave: 2 };
  titleInput.value = melody.title;
  $<HTMLInputElement>('#tempo').value = String(melody.tempoBpm); $<HTMLInputElement>('#tempo-number').value = String(melody.tempoBpm);
  setDirty(!saved); renderScore(); notify(`已載入「${melody.title}」。`);
}
$('#new').onclick = async () => { if (!dirty || await confirmAction('目前旋律尚未儲存。確定捨棄並建立新旋律？')) load(createMelody('未命名旋律'), false); };
$('#demo').onclick = async () => { if (!dirty || await confirmAction('目前旋律尚未儲存。確定捨棄並載入示範？')) load(demoMelody(), false); };
$('#save').onclick = () => {
  // Refresh before writing so another tab's songs are not silently overwritten.
  let current: ReturnType<typeof readLibrary>;
  try { current = readLibrary(localStorage); } catch { notify('瀏覽器禁止本機儲存。'); return; }
  if (!current.writable) { notify(current.warning!); return; }
  const title = titleInput.value.trim();
  if (!title) { notify('先為你的旋律取個名字。'); titleInput.focus(); return; }
  if (!state.melody.events.length) { notify('先輸入至少一個音符或休止符再儲存。'); return; }
  const melody = { ...state.melody, title, updatedAt: new Date().toISOString() };
  const songs = [structuredClone(melody), ...current.songs.filter(song => song.id !== melody.id)];
  try {
    writeLibrary(localStorage, songs); library = { songs, writable: true }; state.melody = melody; titleInput.value = title;
    setDirty(false); renderLibrary(); notify(`「${title}」已儲存在這個瀏覽器。`);
  } catch (error) { notify((error as Error).message); }
};
function renderLibrary() {
  $('#library-count').textContent = String(library.songs.length);
  $('#library-notice').textContent = library.warning ?? '';
  const container = $('#songs'); container.replaceChildren();
  if (!library.songs.length) {
    const empty = document.createElement('p'); empty.className = 'empty-library'; empty.textContent = '尚無已儲存作品。'; container.append(empty);
  }
  library.songs.forEach(song => {
    const row = document.createElement('div'); row.className = 'song-row';
    const info = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = song.title;
    const details = document.createElement('small'); details.textContent = `${song.events.length} 個音符／休止符 · ${song.tempoBpm} BPM`;
    info.append(name, details);
    const loadButton = document.createElement('button'); loadButton.innerHTML = `${icon('load')}<span>載入</span>`; loadButton.setAttribute('aria-label', `載入 ${song.title}`);
    loadButton.onclick = async () => { if (!dirty || await confirmAction('目前旋律尚未儲存。確定捨棄並載入收藏？')) load(song, true); };
    const deleteButton = document.createElement('button'); deleteButton.innerHTML = icon('trash'); deleteButton.className = 'delete-song'; deleteButton.setAttribute('aria-label', `刪除 ${song.title}`);
    deleteButton.onclick = async () => {
      if (!await confirmAction(`確定刪除收藏「${song.title}」？此操作無法復原。`)) return;
      try {
        const current = readLibrary(localStorage);
        if (!current.writable) { notify(current.warning!); return; }
        const songs = current.songs.filter(s => s.id !== song.id);
        writeLibrary(localStorage, songs); library = { songs, writable: true }; renderLibrary();
        if (state.melody.id === song.id) setDirty();
        notify(`已刪除收藏「${song.title}」，編輯區內容仍保留。`);
      } catch (error) { notify((error as Error).message); }
    };
    row.append(info, loadButton, deleteButton); container.append(row);
  });
}
renderScore(); renderLibrary();
if (library.warning) notify(library.warning);
