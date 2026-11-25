// Wiring:  Pico / Mouse / Touch / Keyboard → InputController → GameController → screens
//          → SafeStage (renderer) / AudioEngine / SaveManager
import { SaveManager } from './core/save-manager.js';
import { GameController } from './core/game-controller.js';
import { AudioEngine } from './audio/audio-engine.js';
import { InputController, attachKeyboard, attachWheel, holdRepeat } from './input/input-controller.js';
import { attachPointerDial } from './input/pointer-dial.js';
import { PicoSerial } from './input/serial-adapter.js';
import { SafeStage } from './rendering/safe-stage.js';
import { TitleScreen, IntroScreen, MenuScreen, MissionsScreen, DailyScreen, BriefScreen, SettingsScreen, ConfirmScreen } from './ui/screens-menu.js';
import { UnlockScreen } from './ui/screen-unlock.js';
import { RevealScreen, ArchiveScreen, DetailScreen } from './ui/screens-archive.js';
import { ICONS, sealSVG } from './ui/icons.js';
import { LINES } from './game/dialogue.js';

const $ = (s) => document.querySelector(s);

const save = new SaveManager();
const settings = save.settings;
const audio = new AudioEngine();
audio.volume = settings.volume;
audio.ambientOn = settings.ambient;
const input = new InputController({ sensitivity: settings.sensitivity, invert: settings.invert });
const stage = new SafeStage($('#stage'));
const serial = new PicoSerial({
  onEvent: (e) => input.serialEvent(e),
  onStatus: (status) => onSerialStatus(status),
});

const controls = $('#controls');
const game = new GameController({
  stage,
  sheet: $('#sheet'),
  dispatch: $('#dispatch'),
  audio,
  save,
  input,
  serial,
  toast: $('#toast'),
  controls,
});
document.documentElement.classList.toggle('calm', game.reducedMotion);

game.register('title', new TitleScreen());
game.register('intro', new IntroScreen());
game.register('menu', new MenuScreen());
game.register('missions', new MissionsScreen());
game.register('daily', new DailyScreen());
game.register('brief', new BriefScreen());
game.register('settings', new SettingsScreen());
game.register('confirm', new ConfirmScreen());
game.register('unlock', new UnlockScreen());
game.register('reveal', new RevealScreen());
game.register('archive', new ArchiveScreen());
game.register('detail', new DetailScreen());

// ---- inputs ---------------------------------------------------------------------------

attachKeyboard(input);
attachWheel(input, $('#app'));
attachPointerDial($('#stage'), {
  getCenter: () => stage.getDialCenter(),
  onAngle: (deg) => input.angle(deg, 'pointer'),
  onPress: (kind) => input.press(kind, 'pointer'),
  onDragState: (on) => {
    $('#stage').classList.toggle('dragging', on);
    if (!on) input.endDrag();
  },
  canStart: (e) => !e.target.closest('button, .handle'),
});
$('#stage').addEventListener('click', (e) => {
  if (e.target.closest('.handle') && game.screenName === 'unlock') input.press('short', 'pointer');
});

// On-screen controls for anyone who prefers buttons to circles.
for (const btn of controls.querySelectorAll('.ctl')) btn.innerHTML = ICONS[btn.dataset.ctl];
holdRepeat(controls.querySelector('[data-ctl="ccw"]'), () => input.detents(-1, 'button'));
holdRepeat(controls.querySelector('[data-ctl="cw"]'), () => input.detents(1, 'button'));
controls.querySelector('[data-ctl="back"]').addEventListener('click', () => input.press('long', 'button'));
{
  // The centre button: tap = short, hold = long, like the real knob.
  const b = controls.querySelector('[data-ctl="press"]');
  let timer = null;
  let fired = false;
  b.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      input.press('long', 'button');
    }, 650);
  });
  const up = (e) => {
    clearTimeout(timer);
    if (e.type === 'pointerup' && !fired) input.press('short', 'button');
    fired = true;
  };
  b.addEventListener('pointerup', up);
  b.addEventListener('pointercancel', up);
  b.addEventListener('pointerleave', up);
  b.addEventListener('keydown', (e) => e.key === 'Enter' && e.stopPropagation());
}
// Buttons should not keep keyboard focus: Enter belongs to the knob.
document.addEventListener('pointerup', () => {
  if (document.activeElement && document.activeElement.tagName === 'BUTTON') document.activeElement.blur();
});

// Audio may only start after a gesture. Pico events are not gestures, so the first click counts.
const unlockAudio = () => {
  audio.unlock();
  audio.setVolume(save.settings.volume);
  updateSoundButton();
};
window.addEventListener('pointerdown', unlockAudio, { capture: true });
window.addEventListener('keydown', unlockAudio, { capture: true });
audio.onState(updateSoundButton);

// ---- letterhead buttons ---------------------------------------------------------------

$('#letterhead .seal').innerHTML = sealSVG({ color: '#22392F' });
const soundBtn = $('#btn-sound');
const picoBtn = $('#btn-pico');
let lastVolume = save.settings.volume || 0.8;

function updateSoundButton() {
  const v = save.settings.volume;
  soundBtn.innerHTML = !audio.ready ? ICONS.soundWait : v > 0 ? ICONS.soundOn : ICONS.soundOff;
  soundBtn.dataset.state = !audio.ready ? 'wait' : v > 0 ? 'on' : 'off';
}
soundBtn.addEventListener('click', () => {
  if (!audio.ready) return updateSoundButton();
  const v = save.settings.volume;
  if (v > 0) lastVolume = v;
  save.setSetting('volume', v > 0 ? 0 : lastVolume || 0.8);
  audio.setVolume(save.settings.volume);
  updateSoundButton();
});

function updatePicoButton() {
  const s = serial.status;
  picoBtn.innerHTML = s === 'connected' ? ICONS.plug : ICONS.plugOff;
  picoBtn.dataset.state = s;
  picoBtn.title = { connected: '旋鈕已連線（點擊中斷）', connecting: '連線中', lost: '旋鈕連線中斷', error: '序列埠被占用', unsupported: '此瀏覽器不支援 Web Serial', idle: '連接 Pico 旋鈕' }[s] || '';
}
picoBtn.addEventListener('click', (e) => {
  if (serial.status === 'connected') serial.disconnect();
  else game.connectPico({ any: e.shiftKey });
});

game.connectPico = ({ any = false } = {}) => {
  if (!serial.supported) {
    game.say(LINES.pico.unsupported);
    return;
  }
  if (serial.status === 'connected') {
    game.notify('旋鈕已連線');
    return;
  }
  serial.connect({ any });
};

function onSerialStatus(status) {
  updatePicoButton();
  if (status === 'connected') {
    game.say(LINES.pico.connected);
    game.notify('旋鈕已連線');
  } else if (status === 'lost') {
    game.say(LINES.pico.lost);
    game.notify('旋鈕連線中斷，可改用滑鼠、觸控或鍵盤');
  } else if (status === 'error') {
    game.say(LINES.pico.error);
  }
  if (game.screenName === 'menu') game.screens.menu.list.refresh(game.screens.menu.build({}).items);
}

// ---- save import / export ---------------------------------------------------------------

game.exportSave = () => {
  const blob = new Blob([save.exportJSON()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bup-save-${save.data.employeeNo}-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  game.notify('存檔已匯出');
};

const fileInput = $('#import-file');
game.importSave = () => fileInput.click();
fileInput.addEventListener('change', async () => {
  const file = fileInput.files && fileInput.files[0];
  fileInput.value = '';
  if (!file) return;
  const ok = save.importJSON(await file.text());
  game.notify(ok ? '存檔已匯入' : '這不是本局的存檔');
  if (ok) {
    audio.setVolume(save.settings.volume);
    input.setSensitivity(save.settings.sensitivity);
    input.invert = save.settings.invert;
    game.go('menu', { quiet: true }, -1);
  }
});

// ---- loop -------------------------------------------------------------------------------

let last = performance.now();
function loop(t) {
  const dt = Math.min(100, t - last);
  last = t;
  game.frame(dt, t);
  requestAnimationFrame(loop);
}

updateSoundButton();
updatePicoButton();
game.go('title');
requestAnimationFrame(loop);
serial.reconnectKnown();

// Debug handle for the console. Harmless.
window.bureau = { game, save, stage, audio, input, serial };
