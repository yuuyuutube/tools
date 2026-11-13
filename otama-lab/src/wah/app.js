import { DEFAULT_RANGE, clamp, frequencyAt, positionAt, pitchOf, signed } from '../pitch.js';
import { WahSynth } from './audio.js';
import { bindWahInput } from './input.js';
import { WahSpectrum } from './spectrum.js';

const wahElement = id => document.getElementById(id);
let wahPosition = positionAt(440, 'inverse'), mouthOpening = 0, neckHeld = false, sustained = false;
let manuallyMuted = false, enabling = null, soundRevision = 0, pendingSound = false, wHeld = false;
const spectrum = new WahSpectrum({ svg: wahElement('wah-spectrum'), trace: wahElement('spectrum-trace'), fundamental: wahElement('fundamental'), empty: wahElement('spectrum-empty'), getAnalyser: () => synth.analyser });
function soundControls(error = '') {
  const enabled = synth.enabled;
  const label = error ? '重試聲音' : pendingSound ? '重試啟動聲音' : enabled ? '關閉聲音' : '開啟聲音';
  wahElement('wah-sound').setAttribute('aria-label', label); wahElement('wah-sound').title = label;
  wahElement('wah-sound').setAttribute('aria-pressed', String(enabled)); wahElement('wah-sound').setAttribute('aria-busy', String(pendingSound));
  wahElement('wah-sound').dataset.error = String(Boolean(error));
  wahElement('wah-sound-icon').setAttribute('href', enabled ? '#wah-volume' : '#wah-muted');
  const text = error || (synth.voice ? '發聲中' : enabled ? '聲音已開啟' : '聲音已關閉');
  if (wahElement('wah-status').textContent !== text) wahElement('wah-status').textContent = text;
  wahElement('wah-status').dataset.error = String(Boolean(error));
}
const synth = new WahSynth({ onState(playing, error) {
  wahElement('wah-face').classList.toggle('playing', playing);
  if (playing) spectrum.start(); else spectrum.clear();
  soundControls(error);
} });
function renderWahPosition(value) {
  wahPosition = clamp(value);
  const hz = frequencyAt(wahPosition, 'inverse'), pitch = pitchOf(hz);
  synth.setFrequency(hz); spectrum.setFrequency(hz);
  wahElement('wah-finger').style.bottom = `${(1 - wahPosition) * 100}%`;
  wahElement('wah-hz').textContent = hz.toFixed(1); wahElement('wah-note').textContent = pitch.note;
  wahElement('wah-cents').textContent = `${signed(pitch.cents)} cents`;
  wahElement('wah-neck').setAttribute('aria-valuenow', (wahPosition * 100).toFixed(2));
  wahElement('wah-neck').setAttribute('aria-valuetext', `${pitch.note}，${hz.toFixed(1)} 赫茲，${signed(pitch.cents)} cents`);
}
function renderMouth(value) {
  mouthOpening = clamp(value); synth.setOpening(mouthOpening);
  wahElement('wah-face').style.setProperty('--mouth-opening', mouthOpening);
  const amount = String(Math.round(mouthOpening * 100));
  wahElement('mouth-opening').value = mouthOpening * 100; wahElement('mouth-percent').textContent = `${amount}%`;
  wahElement('wah-mouth').setAttribute('aria-valuenow', amount); wahElement('wah-mouth').setAttribute('aria-valuetext', `嘴巴開啟 ${amount}%`);
}
function renderSustain() {
  wahElement('wah-sustain').setAttribute('aria-pressed', String(sustained));
  wahElement('wah-sustain').querySelector('span').textContent = sustained ? '停止持續發聲' : '持續發聲';
}
async function enableWahSound() {
  const request = ++soundRevision;
  pendingSound = true; soundControls();
  try {
    const enabled = await synth.setEnabled(true);
    if (request !== soundRevision) return false;
    pendingSound = false; soundControls(); return enabled;
  } catch (error) {
    if (request !== soundRevision) return false;
    pendingSound = false; sustained = false; renderSustain(); soundControls(error.message); return false;
  }
}
function ensureWahSound() {
  if (synth.enabled) return Promise.resolve(true);
  if (!enabling) {
    const task = enableWahSound(); enabling = task;
    void task.finally(() => { if (enabling === task) enabling = null; });
  }
  return enabling;
}
async function requestWahVoice() {
  if (manuallyMuted) return;
  const enabled = await ensureWahSound();
  if (enabled && (neckHeld || sustained) && !manuallyMuted) void synth.play();
}
const wahInput = bindWahInput({ neck: wahElement('wah-neck'), track: wahElement('wah-track'), face: wahElement('wah-mouth'), openingRange: wahElement('mouth-opening'),
  getPosition: () => wahPosition, getOpening: () => mouthOpening, onPosition: renderWahPosition, onOpening: renderMouth,
  onHold() { neckHeld = true; void requestWahVoice(); },
  onRelease() { neckHeld = false; if (!sustained) synth.stop(); },
});
function stopWah() {
  ++soundRevision; pendingSound = false; enabling = null; sustained = false; neckHeld = false; wHeld = false;
  renderSustain(); wahInput.stop(); void synth.setEnabled(false); spectrum.clear(); soundControls();
}
wahElement('wah-sound').addEventListener('click', () => {
  if (synth.enabled && !pendingSound) { manuallyMuted = true; stopWah(); return; }
  manuallyMuted = false;
  // A fresh user click may retry a stalled first-touch AudioContext.resume.
  const task = enableWahSound(); enabling = task;
  void task.finally(() => { if (enabling === task) enabling = null; });
  void task.then(enabled => { if (enabled && (neckHeld || sustained) && !manuallyMuted) synth.play(); });
});
wahElement('wah-sustain').addEventListener('click', () => {
  sustained = !sustained; renderSustain();
  if (sustained) { manuallyMuted = false; void requestWahVoice(); }
  else if (!neckHeld) synth.stop();
});
wahElement('wah-info').addEventListener('click', () => { stopWah(); wahElement('wah-help-dialog').showModal(); });
wahElement('wah-help-close').addEventListener('click', () => wahElement('wah-help-dialog').close());
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') stopWah();
  if (event.key.toLowerCase() === 'w' && !wahElement('wah-help-dialog').open && ['wah-neck', 'wah-mouth', ''].includes(event.target.id)) {
    event.preventDefault(); wHeld = true; renderMouth(1);
  }
});
document.addEventListener('keyup', event => { if (event.key.toLowerCase() === 'w' && wHeld) { wHeld = false; renderMouth(0); } });
window.addEventListener('blur', stopWah); window.addEventListener('pagehide', stopWah);
document.addEventListener('visibilitychange', () => { if (document.hidden) stopWah(); });
const wahResize = () => document.documentElement.style.setProperty('--wah-height', `${window.visualViewport?.height || window.innerHeight}px`);
window.addEventListener('resize', wahResize); window.visualViewport?.addEventListener('resize', wahResize);
wahResize(); renderWahPosition(wahPosition); renderMouth(0); renderSustain(); soundControls();
