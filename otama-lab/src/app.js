import { BASE, TOP, MODELS, clamp, frequencyAt, positionAt, pitchOf, semitonesFrom, sensitivityAt, signed } from './pitch.js';
import { Synth } from './audio.js';
import { bindInstrument } from './instrument.js';
import { PitchPlot } from './visualization.js';
import { bindFocusMode } from './focus.js';
const $ = id => document.getElementById(id);
let position = .35, model = 'inverse', reference = BASE, sounding = false;
let soundRequest = 0, pendingEnable = false;
let focused = false, instrumentHeld = false, audioEnableTask = null, focusSession = 0;
const plots = [new PitchPlot($('frequency-plot'), 'frequency'), new PitchPlot($('pitch-plot'), 'pitch')];
function soundButton(label, enabled) {
  $('sound-label').textContent = label;
  $('sound-icon').setAttribute('href', enabled ? '#icon-volume' : '#icon-muted');
}
function audioStatus(message) {
  $('audio-status').textContent = message || (sounding ? '發聲中' : synth.enabled ? '聲音已開啟' : '聲音已關閉');
}
const synth = new Synth({ onState(playing, error) {
  sounding = playing;
  $('face').classList.toggle('playing', playing);
  audioStatus(error);
} });
function render() {
  const f = frequencyAt(position, model), pitch = pitchOf(f);
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
  $('graph-semitones').textContent = `${semitonesFrom(f).toFixed(2)} 半音`;
  $('reference-hz').textContent = `${reference.toFixed(1)} Hz`;
  $('reference-note').textContent = pitchOf(reference).note;
  $('ratio').textContent = `× ${(f / reference).toFixed(3)}`;
  $('interval').textContent = `${signed(Number(semitonesFrom(f, reference).toFixed(2)))} 半音`;
  const octaveAvailable = reference * 2 <= TOP * (1 + 1e-10);
  $('octave').disabled = !octaveAvailable;
  $('octave-help').textContent = octaveAvailable ? '頻率 × 2 = +12 半音 = 1 個八度。' : '此基準的兩倍超出 C6；請先在較低處重新標記。';
  $('sensitivity').textContent = sensitivityAt(position, model).toFixed(1);
  for (const plot of plots) plot.update(position, f, reference);
}
function setPosition(value) { position = clamp(value); render(); }
const instrument = bindInstrument({ strip: $('strip'), track: $('track'), range: $('pos'), getPosition: () => position, onPosition: setPosition, onStart() {
  instrumentHeld = true;
  if (focused && !synth.enabled) {
    void ensureSound().then(enabled => { if (enabled && instrumentHeld && focused) synth.play(); });
  } else synth.play();
}, onStop() { instrumentHeld = false; synth.stop(); } });
function changeModel() {
  instrument.stop();
  model = $('model').value;
  $('formula').textContent = MODELS[model].formula;
  $('model-hint').textContent = MODELS[model].hint;
  for (const plot of plots) plot.setModel(model);
  $('note-marks').replaceChildren();
  for (let semitone = 0; semitone <= 36; semitone++) {
    const mark = document.createElement('i');
    mark.className = 'note-mark';
    mark.style.bottom = `${(1 - positionAt(BASE * 2 ** (semitone / 12), model)) * 100}%`;
    if (semitone % 12 === 0) { mark.style.width = '15px'; mark.style.background = '#c8f16e'; }
    $('note-marks').append(mark);
  }
  render();
}
$('model').addEventListener('change', changeModel);
$('mark').addEventListener('click', () => { instrument.stop(); reference = frequencyAt(position, model); render(); });
$('octave').addEventListener('click', () => { instrument.stop(); setPosition(positionAt(reference * 2, model)); });
async function setSoundEnabled(enable) {
  const request = ++soundRequest;
  pendingEnable = enable;
  $('sound').setAttribute('aria-pressed', String(enable));
  soundButton(enable ? '啟動中…' : '開啟聲音', false);
  try {
    await synth.setEnabled(enable);
    if (request !== soundRequest) return false;
    pendingEnable = false;
    $('sound').setAttribute('aria-pressed', String(synth.enabled));
    soundButton(synth.enabled ? '關閉聲音' : '開啟聲音', synth.enabled);
    audioStatus();
    return synth.enabled;
  } catch (error) {
    if (request !== soundRequest) return false;
    pendingEnable = false;
    $('sound').setAttribute('aria-pressed', 'false');
    soundButton('重試聲音', false);
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
$('sound').addEventListener('click', () => {
  instrument.stop();
  void setSoundEnabled(!(synth.enabled || pendingEnable));
});
const focus = bindFocusMode({
  button: $('focus-mode'), strip: $('strip'),
  onEnter({ activateAudio }) {
    instrument.stop(); focused = true;
    const session = ++focusSession;
    if (!activateAudio) return; // A direct link waits for the first real playing gesture.
    void ensureSound().then(enabled => {
      if (!enabled && focus.active && session === focusSession) {
        const message = $('audio-status').textContent;
        focus.exit(); audioStatus(message);
      }
    });
  },
  onExit() { ++focusSession; instrument.stop(); focused = false; render(); },
});
// Emergency stop also invalidates a not-yet-completed enable gesture.
function emergencyStop() {
  ++soundRequest; pendingEnable = false; audioEnableTask = null;
  instrument.stop(); synth.setEnabled(false);
  $('sound').setAttribute('aria-pressed', 'false');
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
