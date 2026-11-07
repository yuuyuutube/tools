import { pitchOf, signed } from '../pitch.js';
import { MicrophoneInput } from '../input/microphone.js';
import { PitchStability } from '../analysis/stability.js';
import { PitchTimeline } from './timeline.js';

const liveElement = id => document.getElementById(id);
const timeline = new PitchTimeline(liveElement('timeline'), liveElement('timeline-empty'));
const stability = new PitchStability();
let announcementTime = -Infinity;
function resetReadout() {
  for (const id of ['live-hz', 'live-note', 'live-confidence', 'live-stability']) liveElement(id).textContent = '—';
  liveElement('live-cents').textContent = '— cents';
  liveElement('live-needle').hidden = true;
  liveElement('input-level').value = 0;
  liveElement('live-face').classList.remove('playing');
  stability.reset();
}
const microphone = new MicrophoneInput({
  workerURL: new URL('./pitch-worker.js', document.baseURI),
  onState(state, message) {
    const active = state === 'listening', pending = state === 'requesting';
    const button = liveElement('microphone');
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-busy', String(pending));
    button.dataset.state = state;
    liveElement('mic-label').textContent = pending ? '取消啟動' : active ? '關閉麥克風' : '開啟麥克風';
    liveElement('mic-icon').setAttribute('href', active || pending ? '#live-stop' : '#live-mic');
    liveElement('mic-status').textContent = message;
    liveElement('mic-status').dataset.error = String(state === 'error');
    if (!active) { resetReadout(); liveElement('pitch-announcement').textContent = ''; }
    if (active) { timeline.clear(); stability.reset(); }
  },
  onFrame(frame) {
    timeline.add(frame);
    const movement = stability.update(frame);
    liveElement('input-level').value = Math.max(0, Math.min(1, (20 * Math.log10(Math.max(1e-6, frame.rms)) + 60) / 60));
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
liveElement('microphone').addEventListener('click', () => {
  if (['requesting', 'listening'].includes(microphone.state)) microphone.stop();
  else microphone.start();
});
liveElement('clear-history').addEventListener('click', () => timeline.clear());
window.addEventListener('pagehide', () => microphone.stop());
document.addEventListener('visibilitychange', () => { if (document.hidden) microphone.stop('頁面已暫停，請重新開啟麥克風'); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') microphone.stop(); });
window.addEventListener('resize', () => timeline.draw());
