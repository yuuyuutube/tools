import { rangeFor, rangeMarkers, MODELS, clamp, frequencyAt, positionAt, pitchOf, semitonesFrom, sensitivityAt, signed } from './pitch.js';
import { Synth } from './audio.js';
import { bindInstrument } from './instrument.js';
import { PitchPlot } from './visualization.js';
import { bindFocusMode } from './focus.js';
const $ = id => document.getElementById(id);
let range = rangeFor(new URLSearchParams(window.location.search).get('range'));
let position = .35, model = 'inverse', reference = range.base, sounding = false;
let soundRequest = 0, pendingEnable = false;
let focused = false, instrumentHeld = false, audioEnableTask = null, focusMutedByUser = false;
const plots = [new PitchPlot($('frequency-plot'), 'frequency', range), new PitchPlot($('pitch-plot'), 'pitch', range)];
function soundButton(label, enabled, { pending = false, error = false } = {}) {
  $('sound-label').textContent = label;
  for (const id of ['sound', 'focus-sound']) {
    const button = $(id);
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-busy', String(pending));
    button.setAttribute('aria-label', label);
    button.title = label;
    button.dataset.error = String(error);
  }
  for (const id of ['sound-icon', 'focus-sound-icon']) {
    $(id).setAttribute('href', enabled ? '#icon-volume' : '#icon-muted');
  }
}
function audioStatus(message) {
  $('audio-status').textContent = message || (sounding ? '發聲中' : synth.enabled ? '聲音已開啟' : '聲音已關閉');
}
const synth = new Synth({ onState(playing, error) {
  sounding = playing;
  $('face').classList.toggle('playing', playing);
  if (error) soundButton('重試聲音', false, { error: true });
  else if (!synth.enabled && !pendingEnable) soundButton('開啟聲音', false);
  audioStatus(error);
} });
function render() {
  const f = frequencyAt(position, model, range), pitch = pitchOf(f);
  $('finger').style.bottom = `${(1 - position) * 100}%`;
  synth.setFrequency(f);
  if (focused) {
    $('strip').setAttribute('aria-valuenow', (position * 100).toFixed(2));
    $('strip').setAttribute('aria-valuetext', `${pitch.note}，${f.toFixed(1)} 赫茲，${signed(pitch.cents)} cents`);
    return; // Hidden plots/readouts catch up on exit; keep fast gestures inexpensive.
  }
  $('hz').textContent = f.toFixed(1);
  $('note').textContent = pitch.note;
  $('cents').textContent = `${signed(pitch.cents)} cents`;
  $('tuner-needle').style.left = `${pitch.cents + 50}%`;
  $('percent').textContent = `${(position * 100).toFixed(1)}%`;
  $('pos').value = position * 100;
  const description = `${(position * 100).toFixed(1)}%，${pitch.note}，${f.toFixed(1)} 赫茲，${signed(pitch.cents)} cents`;
  $('strip').setAttribute('aria-valuenow', (position * 100).toFixed(2));
  for (const id of ['strip', 'pos']) $(id).setAttribute('aria-valuetext', description);
  $('graph-position').textContent = `x = ${position.toFixed(3)}`;
  $('graph-hz').textContent = `${f.toFixed(1)} Hz`;
  $('graph-semitones').textContent = `${semitonesFrom(f, range.base).toFixed(2)} 半音`;
  $('reference-hz').textContent = `${reference.toFixed(1)} Hz`;
  $('reference-note').textContent = pitchOf(reference).note;
  $('ratio').textContent = `× ${(f / reference).toFixed(3)}`;
  $('interval').textContent = `${signed(Number(semitonesFrom(f, reference).toFixed(2)))} 半音`;
  const octaveAvailable = reference * 2 <= range.top * (1 + 1e-10);
  $('octave').disabled = !octaveAvailable;
  $('octave-help').textContent = octaveAvailable ? '頻率 × 2 = +12 半音 = 1 個八度。' : `此基準的兩倍超出 ${range.highNote}；請先在較低處重新標記。`;
  $('sensitivity').textContent = sensitivityAt(position, model, range).toFixed(1);
  for (const plot of plots) plot.update(position, f, reference);
}
function setPosition(value) { position = clamp(value); render(); }
const instrument = bindInstrument({ strip: $('strip'), track: $('track'), range: $('pos'), getPosition: () => position, onPosition: setPosition, onStart() {
  instrumentHeld = true;
  if (focused && !synth.enabled && !focusMutedByUser) {
    void ensureSound().then(enabled => { if (enabled && instrumentHeld && focused) synth.play(); });
  } else synth.play();
}, onStop() { instrumentHeld = false; synth.stop(); } });
function changeModel() {
  instrument.stop();
  model = $('model').value;
  $('formula').textContent = MODELS[model].formula;
  $('model-hint').textContent = MODELS[model].hint;
  for (const plot of plots) plot.setModel(model, range);
  $('note-marks').replaceChildren();
  for (let semitone = 0; semitone <= range.semitones; semitone++) {
    const mark = document.createElement('i');
    mark.className = 'note-mark';
    const frequency = semitone === range.semitones ? range.top : range.base * 2 ** (semitone / 12);
    mark.style.bottom = `${(1 - positionAt(frequency, model, range)) * 100}%`;
    if (semitone % 12 === 0 || semitone === range.semitones) { mark.style.width = '15px'; mark.style.background = '#c8f16e'; }
    $('note-marks').append(mark);
  }
  $('octave-legend').textContent = rangeMarkers(range).map(marker => marker.note).join(' / ');
  $('simulation-description').textContent = `音域 ${range.label}（${range.base.toFixed(2)}–${range.top.toFixed(2)} Hz），${range.semitones} 半音。十二平均律，A4 = 440 Hz。x 是由上至下、靠近頭部的位置比例；f₀ = ${range.lowNote}，f₁ = ${range.highNote}。反比模型僅供數學比較，不代表 Otamatone DX 真正的電路控制方式，也不是實測資料。合成音不是 Otamatone 原音色。`;
  render();
}
$('range').value = range.id;
$('range').addEventListener('change', () => {
  range = rangeFor($('range').value);
  reference = Math.max(range.base, Math.min(range.top, reference));
  const url = new URL(window.location.href);
  url.searchParams.set('range', range.id);
  try { window.history.replaceState(window.history.state, '', url); } catch { /* Local file viewer. */ }
  changeModel();
});
$('model').addEventListener('change', changeModel);
$('mark').addEventListener('click', () => { instrument.stop(); reference = frequencyAt(position, model, range); render(); });
$('octave').addEventListener('click', () => { instrument.stop(); setPosition(positionAt(reference * 2, model, range)); });
async function setSoundEnabled(enable) {
  const request = ++soundRequest;
  pendingEnable = enable;
  soundButton(enable ? '重試啟動聲音' : '開啟聲音', false, { pending: enable });
  try {
    await synth.setEnabled(enable);
    if (request !== soundRequest) return false;
    pendingEnable = false;
    soundButton(synth.enabled ? '關閉聲音' : '開啟聲音', synth.enabled);
    audioStatus();
    return synth.enabled;
  } catch (error) {
    if (request !== soundRequest) return false;
    pendingEnable = false;
    soundButton('重試聲音', false, { error: true });
    audioStatus(error.message);
    return false;
  }
}
function ensureSound() {
  if (!audioEnableTask) {
    const task = setSoundEnabled(true);
    audioEnableTask = task;
    void task.finally(() => { if (audioEnableTask === task) audioEnableTask = null; });
  }
  return audioEnableTask;
}
// A real click can retry a suspended first-touch resume instead of merely
// canceling it. Both views use the same state and the same enable request.
function toggleSound() {
  const enable = !synth.enabled;
  focusMutedByUser = !enable;
  audioEnableTask = null;
  instrument.stop();
  void setSoundEnabled(enable);
}
for (const id of ['sound', 'focus-sound']) $(id).addEventListener('click', toggleSound);
const focus = bindFocusMode({
  button: $('focus-mode'), strip: $('strip'),
  onEnter({ activateAudio }) {
    instrument.stop(); focused = true; focusMutedByUser = false;
    if (activateAudio) void ensureSound();
  },
  onExit() { instrument.stop(); focused = false; render(); },
});
// Emergency stop also invalidates a not-yet-completed enable gesture.
function emergencyStop() {
  ++soundRequest; pendingEnable = false; audioEnableTask = null;
  instrument.stop(); synth.setEnabled(false);
  soundButton('開啟聲音', false); audioStatus();
}
$('stop').addEventListener('click', emergencyStop);
document.addEventListener('keydown', e => { if (e.key === 'Escape') emergencyStop(); });
window.addEventListener('blur', emergencyStop);
window.addEventListener('pagehide', emergencyStop);
document.addEventListener('visibilitychange', () => { if (document.hidden) emergencyStop(); });
changeModel();

// Opening a URL is not an audio gesture. Show the stage immediately; the first
// pointer/key hold resumes audio through ensureSound in the input handler.
if (new URLSearchParams(window.location.search).get('mode') === 'play') {
  focus.enter({ activateAudio: false });
}
