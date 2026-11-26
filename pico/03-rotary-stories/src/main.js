// ROTARY STORIES — app shell.
//
//   Pico / Mouse / Touch / Keyboard → KnobInput (degrees + presses) → current page
//   pages: library (shelf) · book (detail) · read (StoryPlayer → scenes)
import { KnobInput } from './engine/knob-input.js';
import { attachKeyboard, attachWheel, holdRepeat, attachPressButton } from '../../shared/rotary/dom-input.js';
import { PicoSerial } from '../../shared/rotary/serial-adapter.js';
import { AudioCore } from './audio/audio-core.js';
import { Progress } from './storage/progress.js';
import { Captions, ICONS, MenuOverlay } from './engine/ui.js';
import { $, h, prefersReducedMotion } from './engine/dom.js';
import { LibraryPage } from './library/library.js';
import { BookPage } from './library/book.js';
import { StoryPlayer } from './engine/story-player.js';
import { byId } from './library/registry.js';

const progress = new Progress();
const settings = progress.settings;
const knob = new KnobInput({ invert: settings.invert });
const audio = new AudioCore();
audio.volume = settings.volume;
const captions = new Captions($('#captions'), settings.captions);

const app = {
  progress,
  knob,
  audio,
  captions,
  page: null,
  get reducedMotion() {
    return settings.reducedMotion === null ? prefersReducedMotion() : settings.reducedMotion;
  },
  setVolume(v) {
    progress.setSetting('volume', Math.max(0, Math.min(1, Math.round(v * 20) / 20)));
    audio.setVolume(settings.volume);
  },
  setCaptions(on) {
    progress.setSetting('captions', on);
    captions.setEnabled(on);
  },
  useStylesheet(href) {
    const link = h('link', { rel: 'stylesheet', href });
    document.head.append(link);
    return () => link.remove();
  },
  async go(name, params = {}) {
    const hash = name === 'library' ? '#/' : name === 'book' ? `#/book/${params.id}` : `#/read/${params.id}`;
    if (location.hash !== hash) history.replaceState(null, '', hash);
    await show(name, params);
  },
};
window.__rotary = app; // handy for debugging in the console

// ---- pages ----------------------------------------------------------------------------------

const view = $('#view');
let switching = Promise.resolve();

function show(name, params) {
  switching = switching.then(async () => {
    const old = app.page;
    if (old) {
      view.classList.add('leaving');
      await wait(app.reducedMotion ? 60 : 260);
      old.leave();
    }
    view.classList.remove('leaving');
    let page;
    if (name === 'book' && byId(params.id) && byId(params.id).status === 'ready') page = new BookPage(app, params);
    else if (name === 'read' && byId(params.id) && byId(params.id).status === 'ready') {
      const manifest = (await byId(params.id).load()).default;
      const rec = progress.story(params.id);
      page = new StoryPlayer(app, manifest, { chapter: params.chapter ?? (rec ? rec.chapter : 0) });
    } else {
      const idx = params.id ? Math.max(0, (await import('./library/registry.js')).CATALOGUE.findIndex((b) => b.id === params.id)) : undefined;
      page = new LibraryPage(app, { index: idx });
    }
    app.page = page;
    document.body.dataset.page = name;
    await page.enter(view);
  });
  return switching;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

knob.onRotate((deg, info) => app.page && app.page.rotate(deg, info));
knob.onPress((kind, info) => app.page && app.page.press(kind, info));

let last = performance.now();
function loop(t) {
  const dt = Math.min(0.05, (t - last) / 1000);
  last = t;
  if (app.page && app.page.frame) app.page.frame(dt, t / 1000);
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// ---- inputs ---------------------------------------------------------------------------------

attachKeyboard(knob);
attachWheel(knob, $('#app'));

const dock = $('#dock');
for (const btn of dock.querySelectorAll('button')) btn.innerHTML = ICONS[btn.dataset.ctl];
holdRepeat(dock.querySelector('[data-ctl="ccw"]'), () => knob.detents(-1, 'button'));
holdRepeat(dock.querySelector('[data-ctl="cw"]'), () => knob.detents(1, 'button'));
attachPressButton(dock.querySelector('[data-ctl="press"]'), knob);
dock.querySelector('[data-ctl="back"]').addEventListener('click', () => knob.press('long', 'button'));
document.addEventListener('pointerup', () => {
  // Buttons must not keep focus: Enter belongs to the knob.
  if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
});

function updateDock() {
  const coarse = matchMedia('(pointer: coarse)').matches;
  const on = settings.buttons === null ? coarse : settings.buttons;
  document.body.classList.toggle('with-dock', on);
}
updateDock();

// ---- audio ----------------------------------------------------------------------------------

const soundBtn = $('#btn-sound');
function updateSound() {
  soundBtn.innerHTML = audio.ready ? ICONS.sound : ICONS.mute;
  soundBtn.classList.toggle('waiting', !audio.ready);
  soundBtn.setAttribute('aria-label', audio.ready ? '聲音已開啟' : '點一下開啟聲音');
}
const unlock = () => {
  audio.unlock();
  audio.setVolume(settings.volume);
};
window.addEventListener('pointerdown', unlock, { capture: true });
window.addEventListener('keydown', unlock, { capture: true });
audio.onState(updateSound);
updateSound();
soundBtn.addEventListener('click', () => {
  if (!audio.ready) unlock();
  else openSettings();
});

// ---- Pico -----------------------------------------------------------------------------------

const picoBtn = $('#btn-pico');
const picoLabel = { unsupported: '此瀏覽器不支援 Web Serial', idle: '連接旋鈕', connecting: '連線中', connected: '旋鈕已連線', lost: '旋鈕中斷', error: '序列埠被占用' };
const serial = new PicoSerial({
  onEvent: (e) => knob.serialEvent(e),
  onStatus: (status) => {
    picoBtn.dataset.status = status;
    picoBtn.title = picoLabel[status] || status;
    picoBtn.setAttribute('aria-label', picoBtn.title);
    if (status === 'error') toast('序列埠被占用。請先關閉其他使用 Pico 的頁面或 MicroPico。');
    if (status === 'lost') toast('旋鈕中斷了。可以繼續用滑鼠、觸控或鍵盤。');
  },
});
picoBtn.innerHTML = ICONS.plug;
picoBtn.dataset.status = serial.status;
picoBtn.title = picoLabel[serial.status];
picoBtn.addEventListener('click', (e) => {
  if (!serial.supported) return toast('這個瀏覽器不支援 Web Serial，請使用 Chrome 或 Edge。');
  if (serial.status === 'connected') serial.disconnect();
  else serial.connect({ any: e.shiftKey });
});
serial.reconnectKnown();

// ---- settings -------------------------------------------------------------------------------

$('#btn-settings').innerHTML = ICONS.gear;
$('#btn-settings').addEventListener('click', openSettings);

let settingsMenu = null;
function openSettings() {
  if (settingsMenu) return;
  const prev = app.page;
  const items = [
    { label: '音量', value: () => String(Math.round(settings.volume * 100)), adjust: (n) => app.setVolume(settings.volume + n * 0.05) },
    { label: '字幕（聲音的文字說明）', value: () => (settings.captions ? '開' : '關'), action: () => app.setCaptions(!settings.captions) },
    {
      label: '減少動態',
      value: () => (settings.reducedMotion === null ? `跟隨系統（${prefersReducedMotion() ? '開' : '關'}）` : settings.reducedMotion ? '開' : '關'),
      action: () => progress.setSetting('reducedMotion', settings.reducedMotion === null ? true : settings.reducedMotion ? false : null),
    },
    {
      label: '旋鈕方向',
      value: () => (settings.invert ? '反轉' : '正常'),
      action: () => {
        progress.setSetting('invert', !settings.invert);
        knob.invert = settings.invert;
      },
    },
    {
      label: '螢幕按鈕',
      value: () => (settings.buttons === null ? '自動' : settings.buttons ? '顯示' : '隱藏'),
      action: () => {
        progress.setSetting('buttons', settings.buttons === null ? true : settings.buttons ? false : null);
        updateDock();
      },
    },
    { label: '署名', value: () => settings.name || '（未填）', action: () => editName() },
    { label: '關閉', action: () => closeSettings() },
  ];
  settingsMenu = new MenuOverlay({ title: '設定', items, onClose: closeSettings, className: 'settings' });
  document.body.append(settingsMenu.el);
  requestAnimationFrame(() => settingsMenu.el.classList.add('on'));
  // The settings panel takes the knob while it is open.
  app.page = {
    rotate: (d) => settingsMenu.rotate(d),
    press: (k) => settingsMenu.press(k),
    frame: (dt, t) => prev && prev.frame && prev.frame(dt, t),
    leave: () => prev && prev.leave(),
    _prev: prev,
  };
}
function closeSettings() {
  if (!settingsMenu) return;
  const m = settingsMenu;
  settingsMenu = null;
  m.el.classList.remove('on');
  setTimeout(() => m.el.remove(), 300);
  if (app.page && app.page._prev) app.page = app.page._prev;
}
function editName() {
  const v = prompt('觀測紀錄上的署名（留空則使用「檔案員 07」）', settings.name || '');
  if (v !== null) progress.setSetting('name', v.trim().slice(0, 24));
  if (settingsMenu) settingsMenu.refresh();
}

// ---- toast ----------------------------------------------------------------------------------

const toastEl = $('#toast');
let toastTimer = null;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 4200);
}
app.toast = toast;

// ---- route ----------------------------------------------------------------------------------

function route() {
  const m = location.hash.match(/^#\/(book|read)\/([\w-]+)/);
  if (m) show(m[1], { id: m[2] });
  else show('library', {});
}
route();
