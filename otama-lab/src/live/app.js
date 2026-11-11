import { pitchOf, signed } from '../pitch.js';
import { MicrophoneInput } from '../input/microphone.js';
import { PitchStability } from '../analysis/stability.js';
import { PitchTimeline } from './timeline.js';
import { bindLiveFocus } from './focus.js';
import { bindPitchCapture } from './capture.js';
import { bindMiniOtama } from './mini-otama.js';

const liveElement = id => document.getElementById(id);
const timeline = new PitchTimeline(liveElement('timeline'), liveElement('timeline-empty'));
const stability = new PitchStability();
const miniOtama = bindMiniOtama({ button: liveElement('mini-otama-toggle'), panel: liveElement('mini-otama'), finger: liveElement('mini-finger'), face: liveElement('mini-face'), onResize: () => timeline.draw() });
// A cached pre-capture HTML page may fetch the latest bundle on a cache miss.
// Keep its original analyser usable until the HTML itself is refreshed.
const capture = liveElement('recording-preview') ? bindPitchCapture({
  button: liveElement('record-pitch'), clock: liveElement('recording-clock'), resultButton: liveElement('recording-result'),
  dialog: liveElement('recording-preview'), image: liveElement('recording-image'), duration: liveElement('recording-duration'),
  status: liveElement('recording-status'), download: liveElement('recording-download'), share: liveElement('recording-share'),
  discard: liveElement('recording-discard'), close: liveElement('recording-close'),
  jsonDownload: liveElement('recording-json'), importButton: liveElement('import-pitch'), input: liveElement('pitch-file'), importStatus: liveElement('import-status'),
  replayControls: { play: liveElement('recording-play'), seek: liveElement('recording-seek'), time: liveElement('replay-time'), note: liveElement('replay-note'), cursor: liveElement('replay-cursor') },
  beforePlay: () => microphone.stop('合成音重播時暫停收音'),
}) : { setListening() {}, add() {} };
const liveFocus = liveElement('timeline-focus') ? bindLiveFocus({ enter: liveElement('timeline-focus'), exit: liveElement('timeline-exit'), onResize: () => timeline.draw() }) : { active: false };
const compactLevel = liveElement('focus-level');
function updateLevel(value, clipped = false) {
  liveElement('input-level').value = value;
  if (!compactLevel) return;
  compactLevel.setAttribute('aria-valuenow', String(Math.round(value * 100)));
  compactLevel.dataset.clipped = String(clipped);
  compactLevel.querySelector('i').style.transform = `scaleX(${value})`;
}
let announcementTime = -Infinity;
function resetReadout() {
  for (const id of ['live-hz', 'live-note', 'live-confidence', 'live-stability']) liveElement(id).textContent = '—';
  liveElement('live-cents').textContent = '— cents';
  liveElement('live-needle').hidden = true;
  updateLevel(0);
  liveElement('live-face').classList.remove('playing');
  miniOtama.stop();
  stability.reset();
}
const microphone = new MicrophoneInput({
  workerURL: new URL('./pitch-worker.js', document.baseURI),
  onState(state, message) {
    const active = state === 'listening', pending = state === 'requesting';
    for (const id of ['microphone', 'focus-microphone']) {
      const button = liveElement(id), label = pending ? '取消啟動麥克風' : active ? '關閉麥克風' : '開啟麥克風';
      if (!button) continue;
      button.setAttribute('aria-pressed', String(active)); button.setAttribute('aria-busy', String(pending));
      button.setAttribute('aria-label', label); button.title = label; button.dataset.state = state;
    }
    liveElement('mic-label').textContent = pending ? '取消啟動' : active ? '關閉麥克風' : '開啟麥克風';
    liveElement('mic-icon').setAttribute('href', active || pending ? '#live-stop' : '#live-mic');
    liveElement('focus-mic-icon')?.setAttribute('href', active || pending ? '#live-mic' : '#live-mic-off');
    liveElement('mic-status').textContent = message;
    liveElement('mic-status').dataset.error = String(state === 'error');
    if (liveElement('focus-live-status')) {
      liveElement('focus-live-status').textContent = message;
      liveElement('focus-live-status').dataset.error = String(state === 'error');
    }
    capture.setListening(active);
    if (!active) { resetReadout(); liveElement('pitch-announcement').textContent = ''; }
    if (active) { timeline.clear(); stability.reset(); }
  },
  onFrame(frame) {
    timeline.add(frame);
    capture.add(frame);
    miniOtama.update(frame.frequencyHz);
    const movement = stability.update(frame);
    updateLevel(Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-6, frame.rms)) + 60) / 60)), frame.clipped);
    liveElement('live-face').classList.toggle('playing', frame.frequencyHz !== null);
    liveElement('live-needle').hidden = !frame.frequencyHz;
    liveElement('live-confidence').textContent = frame.frequencyHz ? `${Math.round(frame.confidence * 100)}%` : '—';
    liveElement('live-stability').textContent = movement.label;
    const status = frame.clipped ? '聲音太大，請離麥克風遠一點' : frame.frequencyHz ? '聆聽中' : frame.rms < .006 ? '等待聲音' : '請演奏清楚的單音';
    // Avoid repeating the same live-region announcement on every analysis frame.
    if (liveElement('mic-status').textContent !== status) liveElement('mic-status').textContent = status;
    if (frame.frequencyHz) {
      const pitch = pitchOf(frame.frequencyHz);
      liveElement('live-hz').textContent = frame.frequencyHz.toFixed(1);
      liveElement('live-note').textContent = pitch.note;
      liveElement('live-cents').textContent = `${signed(pitch.cents)} cents`;
      liveElement('live-needle').style.left = `${50 + pitch.cents}%`;
      if (frame.timestampMs - announcementTime >= 1000) {
        liveElement('pitch-announcement').textContent = `${pitch.note}，${frame.frequencyHz.toFixed(1)} Hz，${signed(pitch.cents)} cents，${movement.label}`;
        announcementTime = frame.timestampMs;
      }
    } else {
      liveElement('live-hz').textContent = liveElement('live-note').textContent = '—';
      liveElement('live-cents').textContent = '— cents';
      liveElement('pitch-announcement').textContent = '';
    }
  },
});
const toggleMicrophone = () => {
  capture.stopPlayback?.();
  if (['requesting', 'listening'].includes(microphone.state)) microphone.stop();
  else microphone.start();
};
for (const id of ['microphone', 'focus-microphone']) liveElement(id)?.addEventListener('click', toggleMicrophone);
liveElement('clear-history').addEventListener('click', () => timeline.clear());
window.addEventListener('pagehide', () => microphone.stop());
document.addEventListener('visibilitychange', () => { if (document.hidden) microphone.stop('頁面已暫停，請重新開啟麥克風'); });
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape' || liveElement('recording-preview')?.open) return;
  if (liveFocus.active) { event.preventDefault(); liveFocus.exit(); }
  else microphone.stop();
});
window.addEventListener('resize', () => timeline.draw());
if (window.ResizeObserver) new ResizeObserver(() => timeline.draw()).observe(liveElement('timeline'));
