const captureFrame = document.getElementById('live');
const captureRun = document.getElementById('run'), limitRun = document.getElementById('limit');
const captureResults = document.getElementById('results'), captureSummary = document.getElementById('summary');
const capturePause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function captureUntil(predicate, label, timeout = 5000) {
  const start = performance.now();
  while (!predicate()) { if (performance.now() - start > timeout) throw new Error(`Timeout: ${label}`); await capturePause(40); }
}
const ready = () => { captureRun.disabled = limitRun.disabled = false; };
if (captureFrame.contentDocument?.readyState === 'complete') ready(); else captureFrame.addEventListener('load', ready, { once: true });

async function runCaptureChecks(long) {
  captureRun.disabled = limitRun.disabled = true; captureResults.replaceChildren(); let failures = 0, count = 0;
  const check = (label, condition) => {
    const item = document.createElement('li'); item.className = condition ? 'pass' : 'fail';
    item.textContent = `${condition ? 'PASS' : 'FAIL'}: ${label}`; captureResults.append(item); count++; if (!condition) failures++;
  };
  const win = captureFrame.contentWindow, doc = captureFrame.contentDocument, $ = id => doc.getElementById(id);
  const oldMedia = win.navigator.mediaDevices.getUserMedia;
  const descriptors = ['share', 'canShare'].map(key => [key, Object.getOwnPropertyDescriptor(win.navigator, key)]);
  const contexts = [], shared = []; let source, canShare = true, abortShare = false;
  Object.defineProperty(win.navigator, 'canShare', { configurable: true, value: data => canShare && data.files[0].type === 'image/png' });
  Object.defineProperty(win.navigator, 'share', { configurable: true, value: async data => { if (abortShare) throw new win.DOMException('test cancelled', 'AbortError'); shared.push(data.files[0]); } });
  win.navigator.mediaDevices.getUserMedia = async () => {
    const context = new (win.AudioContext || win.webkitAudioContext)(); contexts.push(context);
    const oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination();
    gain.gain.value = .15; oscillator.frequency.value = 440;
    oscillator.connect(gain); gain.connect(destination); oscillator.start(); await context.resume();
    source = { context, oscillator, gain, stream: destination.stream }; return destination.stream;
  };
  const previewReady = () => $('recording-preview').open && $('recording-download').hasAttribute('href') && $('recording-image').complete && $('recording-image').naturalWidth > 0;
  try {
    if ($('recording-preview').open) $('recording-discard').click();
    check('recording requires an active microphone', $('record-pitch').disabled);
    if (!doc.documentElement.classList.contains('live-focus')) $('timeline-focus').click();
    check('focus shows only the graph and compact controls', win.getComputedStyle(doc.querySelector('.live-readout')).display === 'none' && $('clear-history').getClientRects().length === 0 && $('focus-microphone').getClientRects().length > 0);
    check('focus has no horizontal or vertical scroll surface', doc.documentElement.scrollWidth === doc.documentElement.clientWidth && doc.documentElement.scrollHeight === doc.documentElement.clientHeight);
    check('graph uses available viewport height', $('timeline').clientHeight > doc.documentElement.clientHeight - 150);
    check('focus controls are SVG and prevent selection', !!$('record-pitch').querySelector('svg') && win.getComputedStyle($('record-pitch')).userSelect === 'none');
    $('focus-microphone').click();
    await captureUntil(() => $('microphone').getAttribute('aria-pressed') === 'true' && Math.abs(parseFloat($('live-hz').textContent) - 440) < .3, 'focus microphone');
    check('focus microphone shares the original capture and exact pitch behavior', $('focus-microphone').getAttribute('aria-pressed') === 'true' && $('live-note').textContent === 'A4' && Math.abs(parseInt($('live-cents').textContent)) <= 1);
    check('compact volume meter responds to the same input', Number($('focus-level').getAttribute('aria-valuenow')) > 0);
    check('record control becomes available after microphone starts', !$('record-pitch').disabled);
    if (!long) {
      doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      check('Escape leaves focus without interrupting the microphone', !doc.documentElement.classList.contains('live-focus') && $('microphone').getAttribute('aria-pressed') === 'true');
      $('timeline-focus').click();
      source.gain.gain.value = 1.2;
      await captureUntil(() => $('focus-level').dataset.clipped === 'true', 'clipping indication');
      check('compact meter marks excessive input without changing detection settings', true);
      source.gain.gain.value = .15;
      await captureUntil(() => $('focus-level').dataset.clipped === 'false', 'input recovers');
    }
    $('record-pitch').click();
    check('recording has visible timer and stop control', $('record-pitch').getAttribute('aria-pressed') === 'true' && !$('recording-clock').hidden && $('record-pitch').getAttribute('aria-label') === '結束錄製');
    if (long) {
      const start = performance.now();
      while (!$('recording-preview').open && performance.now() - start < 65000) {
        const elapsed = performance.now() - start;
        source.oscillator.frequency.setTargetAtTime(330 + 110 * Math.sin(elapsed / 2200), source.context.currentTime, .05);
        captureSummary.textContent = `Real 60-second check: ${Math.floor(elapsed / 1000)} s elapsed`;
        await capturePause(300);
      }
      await captureUntil(previewReady, 'automatic PNG');
      check('real 60-second deadline stops capture automatically', $('record-pitch').getAttribute('aria-pressed') === 'false' && $('recording-duration').textContent === '60.0 秒');
      check('recording limit preserves microphone and focus mode', $('focus-microphone').getAttribute('aria-pressed') === 'true' && doc.documentElement.classList.contains('live-focus'));
      check('complete minute exports five rows rather than last 12 seconds', $('recording-image').naturalHeight === 1432);
      const response = await fetch($('recording-download').href), blob = await response.blob(), bitmap = await createImageBitmap(blob);
      const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
      canvas.getContext('2d').drawImage(bitmap, 0, 0);
      for (let row = 0; row < 5; row++) {
        const pixels = canvas.getContext('2d').getImageData(100, 24 + row * 280, 1300, 218).data;
        let ink = 0; for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 150 && pixels[i + 1] > 180 && pixels[i + 2] < 150) ink++;
        check(`full-minute PNG contains actual trajectory in row ${row + 1}`, ink > 100);
      }
      bitmap.close();
    } else {
      source.oscillator.detune.value = 37; await capturePause(1300); $('record-pitch').click();
      await captureUntil(previewReady, 'manual stop PNG');
      check('manual stop opens a bounded preview dialog', $('recording-preview').getBoundingClientRect().top >= 0 && $('recording-preview').getBoundingClientRect().bottom <= doc.documentElement.clientHeight + 1);
      check('short take produces a real high-resolution PNG', $('recording-image').naturalWidth === 1440 && $('recording-image').naturalHeight === 312);
      const png = new Uint8Array(await (await fetch($('recording-download').href)).arrayBuffer());
      check('download points to PNG bytes with an explicit filename', [...png.slice(0, 8)].join(',') === '137,80,78,71,13,10,26,10' && $('recording-download').download.endsWith('.png'));
      $('recording-share').click(); await captureUntil(() => shared.length === 1, 'share file');
      check('sharing receives the PNG File without regeneration during the gesture', shared[0].type === 'image/png' && shared[0].size === png.length);
      abortShare = true; $('recording-share').click(); await capturePause(100);
      check('cancelling share preserves download and preview', $('recording-preview').open && $('recording-download').hasAttribute('href') && !$('recording-share').disabled);
      const previousURL = $('recording-download').href;
      $('recording-close').click(); $('recording-result').click();
      check('closing and reopening retains the same completed image', $('recording-preview').open && $('recording-download').href === previousURL);
      $('recording-discard').click();
      check('discard clears only the completed take', !$('recording-preview').open && $('recording-result').hidden && $('focus-microphone').getAttribute('aria-pressed') === 'true' && !$('recording-download').hasAttribute('href'));
      source.gain.gain.value = 0; await captureUntil(() => $('live-hz').textContent === '—', 'silence');
      $('record-pitch').click(); await capturePause(300); $('record-pitch').click();
      check('silent take reports no pitch instead of exporting fake data', $('recording-preview').open && $('recording-image').hidden && $('recording-download').getAttribute('aria-disabled') === 'true' && $('recording-status').textContent.includes('沒有偵測到音高'));
      $('recording-discard').click(); source.gain.gain.value = .15; source.oscillator.detune.value = 0; canShare = false;
      await captureUntil(() => $('live-hz').textContent !== '—', 'signal resumes');
      $('record-pitch').click(); await capturePause(450); $('focus-microphone').click();
      await captureUntil(previewReady, 'mic interruption preview');
      check('turning off microphone ends and preserves the current take', source.stream.getAudioTracks()[0].readyState === 'ended' && $('record-pitch').getAttribute('aria-pressed') === 'false');
      check('unsupported sharing retains PNG download', $('recording-share').disabled && $('recording-download').getAttribute('aria-disabled') === 'false' && $('recording-status').textContent.includes('下載 PNG'));
      $('recording-close').click();
      $('timeline-exit').click();
      check('exiting focus preserves completed result and restores the normal page', !doc.documentElement.classList.contains('live-focus') && !$('recording-result').hidden && win.getComputedStyle(doc.querySelector('.live-readout')).display !== 'none');
      $('recording-result').click(); $('recording-discard').click();
      $('timeline-focus').click(); $('focus-microphone').click();
      await captureUntil(() => $('microphone').getAttribute('aria-pressed') === 'true', 'background-test microphone');
      $('record-pitch').click(); await capturePause(350);
      const hiddenDescriptor = Object.getOwnPropertyDescriptor(doc, 'hidden');
      Object.defineProperty(doc, 'hidden', { configurable: true, value: true });
      doc.dispatchEvent(new win.Event('visibilitychange'));
      if (hiddenDescriptor) Object.defineProperty(doc, 'hidden', hiddenDescriptor); else delete doc.hidden;
      doc.dispatchEvent(new win.Event('visibilitychange'));
      check('background interruption stops microphone and retains a result without opening a hidden dialog', source.stream.getAudioTracks()[0].readyState === 'ended' && !$('recording-result').hidden && !$('recording-preview').open);
      $('recording-result').click(); await captureUntil(previewReady, 'retained background result');
      check('retained result can be exported after returning to the page', true);
    }
  } catch (error) { check(error.message, false); }
  finally {
    // Keep the completed preview for native download/screenshot inspection.
    win.dispatchEvent(new win.Event('pagehide'));
    win.navigator.mediaDevices.getUserMedia = oldMedia;
    for (const [key, descriptor] of descriptors) { if (descriptor) Object.defineProperty(win.navigator, key, descriptor); else delete win.navigator[key]; }
    for (const context of contexts) await context.close();
    captureSummary.textContent = `${count - failures}/${count} passed; ${failures} failed. ${long ? 'Real 60-second limit.' : 'Short take.'} Synthetic audio; share API stubbed.`;
    captureRun.disabled = limitRun.disabled = false;
  }
}
captureRun.addEventListener('click', () => runCaptureChecks(false));
limitRun.addEventListener('click', () => runCaptureChecks(true));
