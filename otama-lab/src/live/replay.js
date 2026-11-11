import { PitchPlayer } from './playback.js';
import { recordingCursor } from './export.js';
import { pitchOf } from '../pitch.js';

export function bindPitchReplay({ play, seek, time, note, cursor, dialog, beforePlay, onError }) {
  if (!play) return { load() {}, stop() {} }; // Cached pre-import HTML.
  let recording = null, position = 0;
  const display = (timeMs, frequency = null) => {
    position = timeMs; seek.value = String(timeMs);
    time.textContent = `${(timeMs / 1000).toFixed(1)} / ${((recording?.durationMs || 0) / 1000).toFixed(1)} s`;
    seek.setAttribute('aria-valuetext', `${(timeMs / 1000).toFixed(1)} 秒`);
    note.textContent = frequency ? `${pitchOf(frequency).note} · ${frequency.toFixed(1)} Hz` : '—';
    cursor.toggleAttribute('hidden', !recording?.hasPitch);
    if (!recording) return;
    const point = recordingCursor(recording, timeMs), line = cursor.querySelector('line');
    cursor.setAttribute('viewBox', `0 0 1440 ${point.height}`);
    line.setAttribute('x1', point.x); line.setAttribute('x2', point.x);
    line.setAttribute('y1', point.top); line.setAttribute('y2', point.bottom);
  };
  const player = new PitchPlayer({ onProgress: display, onState(active, error) {
    play.setAttribute('aria-pressed', String(active));
    play.setAttribute('aria-label', active ? '停止重播' : '合成音重播');
    play.title = active ? '停止重播' : '合成音重播';
    play.querySelector('use').setAttribute('href', active ? '#live-stop' : '#live-play');
    play.querySelector('span').textContent = active ? '停止' : '播放';
    if (error) onError(error);
  } });
  play.addEventListener('click', () => {
    if (player.active) { player.stop(); return; }
    if (!recording?.hasPitch) return;
    beforePlay();
    player.play(recording, position >= recording.durationMs ? 0 : position);
  });
  seek.addEventListener('input', () => { player.stop(); display(Number(seek.value)); });
  // Native close is queued; don't let an old close event stop a reopened take.
  dialog.addEventListener('close', () => { if (!dialog.open) player.stop(); });
  dialog.addEventListener('cancel', () => player.stop());
  window.addEventListener('pagehide', () => player.stop());
  document.addEventListener('visibilitychange', () => { if (document.hidden) player.stop(); });
  return {
    stop: () => player.stop(),
    load(snapshot) {
      player.stop(); recording = snapshot; play.disabled = seek.disabled = !snapshot?.hasPitch;
      seek.max = String(snapshot?.durationMs || 1); display(0);
    },
  };
}
