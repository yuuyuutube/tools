import { PitchRecording, RECORDING_LIMIT_MS, recordingClock } from './recording.js';
import { pitchRecordingPng, canSharePitchFile } from './export.js';
import { pitchDocument, importPitchFile } from './format.js';
import { bindPitchReplay } from './replay.js';

// UI capture lifecycle is independent of both microphone audio and 12 s history.
export function bindPitchCapture({ button, clock, resultButton, dialog, image, duration, status, download, share, discard, close, jsonDownload, importButton, input, importStatus, replayControls, beforePlay = () => {} }) {
  const recording = new PitchRecording();
  let timer = null, deadline = null, listening = false, result = null, file = null, imageURL = null, revision = 0;
  let jsonURL = null, importRevision = 0, importing = false;
  const setStatus = text => { if (status.textContent !== text) status.textContent = text; };
  const replay = bindPitchReplay({ ...replayControls, dialog, beforePlay, onError: setStatus });
  const renderControls = () => {
    button.disabled = !listening && !recording.active;
    button.setAttribute('aria-pressed', String(recording.active));
    button.setAttribute('aria-label', recording.active ? '結束錄製' : '開始錄製音高軌跡（最長 60 秒）');
    button.title = button.disabled ? '請先開啟麥克風' : recording.active ? '結束錄製' : '開始錄製音高軌跡（最長 60 秒）';
    button.querySelector('use').setAttribute('href', recording.active ? '#live-stop' : '#live-record');
    button.querySelector('span').textContent = recording.active ? '結束錄製' : '開始錄製';
    clock.hidden = !recording.active;
    resultButton.hidden = !result || recording.active;
    if (importButton) importButton.disabled = recording.active || importing;
  };
  const releaseImage = () => {
    replay.load(null);
    revision++; file = null;
    if (imageURL) URL.revokeObjectURL(imageURL);
    if (jsonURL) URL.revokeObjectURL(jsonURL);
    jsonURL = null; jsonDownload?.removeAttribute('href'); jsonDownload?.setAttribute('aria-disabled', 'true');
    imageURL = null; image.removeAttribute('src'); download.removeAttribute('href');
    download.setAttribute('aria-disabled', 'true'); share.disabled = true;
  };
  async function showResult() {
    if (!result) return;
    const snapshot = result;
    if (jsonDownload && !jsonURL) {
      jsonURL = URL.createObjectURL(new Blob([pitchDocument(snapshot)], { type: 'application/json' }));
      jsonDownload.href = jsonURL; jsonDownload.download = 'otama-pitch.otama.json'; jsonDownload.setAttribute('aria-disabled', 'false');
    }
    duration.textContent = `${(snapshot.durationMs / 1000).toFixed(1)} 秒`;
    image.alt = `${(snapshot.durationMs / 1000).toFixed(1)} 秒的音高軌跡，半音等距，A4 = 440 Hz`;
    image.hidden = !snapshot.hasPitch || !imageURL;
    if (document.hidden) return; // The result button keeps it available on return.
    if (!dialog.open) { try { dialog.showModal(); } catch { return; } }
    if (!snapshot.hasPitch) { setStatus('這段沒有偵測到音高，請確認收音後再試一次。'); return; }
    if (file) { image.hidden = false; return; }
    const request = ++revision; setStatus('正在產生圖片…');
    try {
      const blob = await pitchRecordingPng(snapshot);
      if (request !== revision || result !== snapshot) return;
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      file = new File([blob], `otama-pitch-${stamp}.png`, { type: 'image/png' });
      imageURL = URL.createObjectURL(blob); image.src = imageURL; image.hidden = false;
      download.href = imageURL; download.download = file.name; download.setAttribute('aria-disabled', 'false');
      share.disabled = !canSharePitchFile(file);
      setStatus(share.disabled ? '可下載 PNG；此瀏覽器不支援圖片分享。' : '');
    } catch (error) { if (request === revision) setStatus(error.message); }
  }
  function finish() {
    if (!recording.active) return;
    clearInterval(timer); clearTimeout(deadline); timer = deadline = null;
    const snapshot = recording.finish(performance.now());
    releaseImage(); result = snapshot; replay.load(result); renderControls();
    showResult();
  }
  function updateClock() {
    if (!recording.active) return;
    const elapsed = recording.elapsed(performance.now());
    clock.textContent = `${recordingClock(elapsed)} / 01:00`;
    if (elapsed >= RECORDING_LIMIT_MS) finish();
  }
  button.addEventListener('click', () => {
    if (recording.active) { finish(); return; }
    if (!listening) return;
    ++importRevision; importing = false; replay.stop();
    if (dialog.open) dialog.close();
    recording.start(performance.now()); renderControls(); updateClock();
    timer = setInterval(updateClock, 100); deadline = setTimeout(finish, RECORDING_LIMIT_MS);
  });
  resultButton.addEventListener('click', showResult);
  close.addEventListener('click', () => { replay.stop(); dialog.close(); });
  discard.addEventListener('click', () => { result = null; releaseImage(); dialog.close(); renderControls(); });
  importButton?.addEventListener('click', () => input.click());
  input?.addEventListener('change', async () => {
    const selected = input.files?.[0]; input.value = '';
    if (!selected || recording.active) return;
    const request = ++importRevision; importing = true; renderControls();
    importStatus.textContent = '正在讀取演奏資料…';
    try {
      const snapshot = await importPitchFile(selected);
      if (request !== importRevision || recording.active) return;
      releaseImage(); result = snapshot; replay.load(result); renderControls();
      importStatus.textContent = ''; await showResult();
    } catch (error) { if (request === importRevision) importStatus.textContent = error.message; }
    finally { if (request === importRevision) { importing = false; renderControls(); } }
  });
  download.addEventListener('click', event => { if (!file) event.preventDefault(); });
  share.addEventListener('click', async () => {
    if (!file) return;
    share.disabled = true;
    try { await navigator.share({ files: [file] }); setStatus(''); }
    catch (error) { if (error.name !== 'AbortError') setStatus('無法開啟分享，請下載 PNG。'); }
    finally { share.disabled = !file || !canSharePitchFile(file); }
  });
  renderControls();
  return {
    stopPlayback: () => replay.stop(),
    add(frame) { recording.add(frame); if (recording.active && frame.timestampMs - recording.startMs >= RECORDING_LIMIT_MS) finish(); },
    setListening(active) { listening = active; if (!active) finish(); renderControls(); },
    get active() { return recording.active; },
  };
}
