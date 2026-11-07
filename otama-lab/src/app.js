import { BASE, TOP, MODELS, clamp, frequencyAt, positionAt, pitchOf, semitonesFrom, sensitivityAt, signed } from './pitch.js';
import { Synth } from './audio.js';
import { bindInstrument } from './instrument.js';
import { PitchPlot } from './visualization.js';
const $ = id => document.getElementById(id);
let position = .35, model = 'inverse', reference = BASE, sounding = false;
let soundRequest = 0, pendingEnable = false;
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
  $('hz').textContent = f.toFixed(1);
  $('note').textContent = pitch.note;
  $('cents').textContent = `${signed(pitch.cents)} cents`;
  $('tuner-needle').style.left = `${pitch.cents + 50}%`;
  $('percent').textContent = `${(position * 100).toFixed(1)}%`;
  $('pos').value = position * 100;
  const description = `${(position * 100).toFixed(1)}%，${pitch.note}，${f.toFixed(1)} 赫茲，${signed(pitch.cents)} cents`;
  $('strip').setAttribute('aria-valuenow', (position * 100).toFixed(2));
  for (const id of ['strip', 'pos']) $(id).setAttribute('aria-valuetext', description);
  $('finger').style.bottom = `${(1 - position) * 100}%`;
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
  synth.setFrequency(f);
}
function setPosition(value) { position = clamp(value); render(); }
const instrument = bindInstrument({ strip: $('strip'), track: $('track'), range: $('pos'), getPosition: () => position, onPosition: setPosition, onStart: () => synth.play(), onStop: () => synth.stop() });
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
$('sound').addEventListener('click', async () => {
  const request = ++soundRequest;
  const enable = !(synth.enabled || pendingEnable);
  pendingEnable = enable;
  instrument.stop();
  $('sound').setAttribute('aria-pressed', String(enable));
  soundButton(enable ? '啟動中…' : '開啟聲音', false);
  try {
    await synth.setEnabled(enable);
    if (request !== soundRequest) return;
    pendingEnable = false;
    $('sound').setAttribute('aria-pressed', String(synth.enabled));
    soundButton(synth.enabled ? '關閉聲音' : '開啟聲音', synth.enabled);
    audioStatus();
  } catch (error) {
    if (request !== soundRequest) return;
    pendingEnable = false;
    $('sound').setAttribute('aria-pressed', 'false');
    soundButton('重試聲音', false);
    audioStatus(error.message);
  }
});
// Emergency stop also invalidates a not-yet-completed enable gesture.
function emergencyStop() {
  ++soundRequest; pendingEnable = false;
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
