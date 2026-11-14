import { drawPitchRecording, pitchRecordingPng } from '../src/live/export.js';
import { importPlayablePitch } from '../src/live/image-import.js';
import { importPitchFile, pitchDocument } from '../src/live/format.js';
const $ = id => document.getElementById(id), pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label) { const start = performance.now(); while (!predicate()) { if (performance.now() - start > 20000) throw new Error(`Timeout: ${label}`); await pause(30); } }
function syntheticTake(durationMs, base = 440) {
  const frames = [];
  for (let timeMs = 0; timeMs <= durationMs; timeMs += 40) frames.push({ timeMs, frequencyHz: timeMs % 2000 >= 1300 && timeMs % 2000 <= 1650 ? null : base * 2 ** ((2 * Math.sin(timeMs / 550) + .3 * Math.sin(timeMs / 35)) / 12) });
  return { durationMs, frames, hasPitch: true };
}
function originalAt(take, time) { return take.frames[Math.min(take.frames.length - 1, Math.round(time / 40))]?.frequencyHz; }
async function rasterFile(take, width, type = 'image/png', quality = .7) {
  const original = drawPitchRecording(take, document.createElement('canvas')), canvas = document.createElement('canvas'); canvas.width = width; canvas.height = Math.round(original.height * width / original.width);
  canvas.getContext('2d').drawImage(original, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, type, quality));
  return new File([blob], `synthetic-${durationFile(take)}.${type === 'image/png' ? 'png' : 'jpg'}`, { type });
}
const durationFile = take => Math.round(take.durationMs / 100);
$('run').addEventListener('click', async () => {
  $('run').disabled = true; $('results').replaceChildren(); const metrics = []; let count = 0, failed = 0;
  const check = (label, value) => { count++; if (!value) failed++; const li = document.createElement('li'); li.className = value ? 'pass' : 'fail'; li.textContent = `${value ? 'PASS' : 'FAIL'}: ${label}`; $('results').append(li); };
  let sample;
  try {
    for (const [durationMs, width, type, quality, base = 440] of [[12000,720,'image/jpeg',.65,196],[12000,720,'image/jpeg',.65,1046.5],[2200,1440,'image/png',1],[700,720,'image/jpeg',.65],[2200,720,'image/jpeg',.65],[5300,720,'image/jpeg',.65],[9700,720,'image/jpeg',.65],[11900,720,'image/jpeg',.65],[2200,480,'image/jpeg',.55],[12000,720,'image/jpeg',.6],[25500,720,'image/jpeg',.6],[60000,720,'image/jpeg',.6]]) {
      const take = syntheticTake(durationMs, base), file = await rasterFile(take, width, type, quality);
      try {
        const recovered = await importPlayablePitch(file);
        const errors = recovered.frames.filter(frame => frame.frequencyHz && originalAt(take, frame.timeMs)).map(frame => Math.abs(1200 * Math.log2(frame.frequencyHz / originalAt(take, frame.timeMs)))).sort((a,b)=>a-b);
        const medianCents = errors[Math.floor(errors.length / 2)], durationError = Math.abs(recovered.durationMs - durationMs);
        const pairs = recovered.frames.filter(frame => frame.frequencyHz && originalAt(take, frame.timeMs)).map(frame => [Math.log2(frame.frequencyHz), Math.log2(originalAt(take, frame.timeMs))]);
        const means = [0,1].map(i => pairs.reduce((sum,pair)=>sum+pair[i],0)/pairs.length);
        const covariance = pairs.reduce((sum,pair)=>sum+(pair[0]-means[0])*(pair[1]-means[1]),0);
        const variance = [0,1].map(i=>pairs.reduce((sum,pair)=>sum+(pair[i]-means[i])**2,0));
        const correlation = covariance/Math.sqrt(variance[0]*variance[1]);
        metrics.push({ durationMs, width, base, type, calibration: recovered.reconstruction, durationError, medianCents, correlation });
        check(`${durationMs}ms/${width}px/${type}: recovers a marked approximate trajectory`, recovered.hasPitch && recovered.reconstruction?.method === 'image-curve');
        check(`${durationMs}ms/${width}px: preserves blank gaps`, recovered.frames.some(frame => frame.frequencyHz === null));
        if (width >= 720) {
          check(`${durationMs}ms/${width}px: reads pitch and time axes`, recovered.reconstruction.pitchScale === 'axis' && recovered.reconstruction.timeScale === 'axis');
          check(`${durationMs}ms/${width}px: median pitch error < 50 cents, duration error < 150ms`, medianCents < 50 && durationError < 150);
        } else {
          check(`${durationMs}ms/${width}px: unclear scale is declared as an estimate`, (recovered.reconstruction.pitchScale === 'assumed' || medianCents < 50) && recovered.reconstruction.timeScale === 'axis');
          check(`${durationMs}ms/${width}px: estimated pitch still preserves contour and timing`, correlation > .95 && durationError < 150);
        }
        if (width === 720 && durationMs === 2200) sample = file;
      } catch (error) { metrics.push({ durationMs, width, error: error.message }); check(`${durationMs}ms/${width}px: ${error.message}`, false); }
    }
    try {
      const tiny = await importPlayablePitch(await rasterFile(syntheticTake(2200), 360, 'image/jpeg', .5));
      check('very small lossy JPEG remains explicitly approximate', tiny.reconstruction?.method === 'image-curve');
    } catch (error) { check('very small unreadable JPEG fails clearly instead of inventing data', /清晰|刻度/.test(error.message)); }
    const original = syntheticTake(2200), embedded = new File([await pitchRecordingPng(original)], 'original.png', { type: 'image/png' });
    const exact = await importPlayablePitch(embedded); check('embedded data retains priority and exact frequencies', !exact.reconstruction && JSON.stringify(exact.frames) === JSON.stringify(original.frames));
    if (sample) {
      const reconstructed = await importPlayablePitch(sample), exported = new File([await pitchRecordingPng(reconstructed)], 'recovered.png');
      check('PNG re-export preserves approximation provenance', (await importPlayablePitch(exported)).reconstruction?.method === 'image-curve');
      check('JSON re-export preserves approximation provenance', (await importPitchFile(new File([pitchDocument(reconstructed)], 'recovered.json'))).reconstruction?.method === 'image-curve');
      const url = URL.createObjectURL(sample); $('sample-image').src = url; $('sample-download').href = url; $('sample-download').download = 'synthetic-image-replay.jpg'; $('sample-download').textContent = 'Download synthetic JPEG sample';
      const frame = $('live'); await until(() => frame.contentDocument?.readyState === 'complete', 'live page'); const win = frame.contentWindow, doc = frame.contentDocument, live = id => doc.getElementById(id);
      const transfer = new win.DataTransfer(); transfer.items.add(new win.File([sample], sample.name, { type: sample.type })); live('pitch-file').files = transfer.files; live('pitch-file').dispatchEvent(new win.Event('change', { bubbles: true }));
      await until(() => live('recording-preview').open && live('recording-download').hasAttribute('href'), 'approximate preview');
      check('ordinary import UI accepts JPEG and labels approximate reconstruction', live('recording-duration').textContent.includes('圖片辨識') && !live('recording-play').disabled);
      check('import does not enable microphone or autoplay', live('microphone').getAttribute('aria-pressed') === 'false' && live('recording-play').getAttribute('aria-pressed') === 'false');
      live('recording-close').click(); live('recording-result').click(); check('approximation label survives closing and reopening preview', live('recording-duration').textContent.includes('近似'));
    }
  } catch (error) { check(error.stack || error.message, false); }
  finally { $('metrics').textContent = JSON.stringify(metrics, null, 2); $('summary').textContent = `${count - failed}/${count} passed; ${failed} failed. Synthetic re-encoded images; no actual LINE transfer.`; $('run').disabled = false; }
});
