import { pitchDocument, extractPitchPng, importPitchFile } from '../src/live/format.js';
import { pitchRecordingPng } from '../src/live/export.js';
import { createYin } from '../src/analysis/yin.js';
const frame = document.getElementById('live'), run = document.getElementById('run'), summary = document.getElementById('summary'), results = document.getElementById('results');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const detectPitchYin = createYin();
async function until(predicate, label, timeout = 5000) { const start = performance.now(); while (!predicate()) { if (performance.now() - start > timeout) throw new Error(`Timeout: ${label}`); await pause(20); } }
const ready = () => { run.disabled = false; }; if (frame.contentDocument?.readyState === 'complete') ready(); else frame.addEventListener('load', ready, { once: true });
const sample = { durationMs: 2200, frames: [] };
for (let timeMs = 0; timeMs <= 2200; timeMs += 40) sample.frames.push({ timeMs, frequencyHz: timeMs < 700 ? 445.123 : timeMs < 1100 ? null : timeMs < 1900 ? 330 * 2 ** ((timeMs - 1100) / 800) : null });
sample.hasPitch = true;
run.addEventListener('click', async () => {
  run.disabled = true; results.replaceChildren(); let count = 0, failures = 0;
  const check = (label, value) => { count++; if (!value) failures++; const item = document.createElement('li'); item.className = value ? 'pass' : 'fail'; item.textContent = `${value ? 'PASS' : 'FAIL'}: ${label}`; results.append(item); };
  const win = frame.contentWindow, doc = frame.contentDocument, $ = id => doc.getElementById(id), contexts = [];
  const NativeContext = win.AudioContext || win.webkitAudioContext; let analyser;
  class SilentContext extends NativeContext {
    constructor() { super(); const sink = this.createMediaStreamDestination(); Object.defineProperty(this, 'destination', { value: sink }); analyser = this.createAnalyser(); analyser.fftSize = 4096; contexts.push(this); }
    createGain() { const gain = super.createGain(); gain.connect(analyser); return gain; }
  }
  const originalContext = win.AudioContext, originalMedia = win.navigator.mediaDevices.getUserMedia; win.AudioContext = SilentContext;
  const inject = async file => { const transfer = new win.DataTransfer(); transfer.items.add(file); $('pitch-file').files = transfer.files; $('pitch-file').dispatchEvent(new win.Event('change', { bubbles: true })); await until(() => !$('import-pitch').disabled, 'import completes', 15000); };
  const previewReady = () => $('recording-preview').open && $('recording-download').hasAttribute('href') && $('recording-image').complete && $('recording-image').naturalWidth === 1440;
  try {
    check('import is available without microphone permission', !$('import-pitch').disabled && $('microphone').getAttribute('aria-pressed') === 'false');
    await inject(new win.File([pitchDocument(sample)], 'synthetic.otama.json', { type: 'application/json' })); await until(previewReady, 'JSON preview');
    check('JSON import opens image preview and enables replay', !$('recording-play').disabled && $('recording-duration').textContent === '2.2 秒');
    const exported = await (await fetch($('recording-download').href)).blob();
    const data = extractPitchPng(new Uint8Array(await exported.arrayBuffer()));
    check('PNG export embeds exact continuous frequencies, times and rests', JSON.stringify(data.frames) === JSON.stringify(sample.frames));
    const json = await (await fetch($('recording-json').href)).text();
    check('JSON download is a versioned portable pitch-only document', JSON.parse(json).format === 'otama-lab.pitch' && !json.includes('audio'));
    const img = await createImageBitmap(exported); check('PNG remains a valid ordinary image at original dimensions', img.width === 1440 && img.height === 312); img.close();
    $('recording-play').click(); await until(() => $('recording-play').getAttribute('aria-pressed') === 'true' && parseFloat($('recording-seek').value) > 160, 'native replay starts');
    const samples = new Float32Array(4096); analyser.getFloatTimeDomainData(samples); const pitch = detectPitchYin(samples, contexts.at(-1).sampleRate);
    check('native synthesized audio reproduces a nonstandard pitch within 5 cents', pitch.frequencyHz && Math.abs(1200 * Math.log2(pitch.frequencyHz / 445.123)) < 5);
    check('progress and a visible graph cursor move together', win.getComputedStyle($('replay-cursor')).display !== 'none' && Number($('recording-seek').value) > 0 && Number($('replay-cursor').querySelector('line').getAttribute('x1')) > 100 && $('replay-note').textContent.includes('445.1'));
    await until(() => Number($('recording-seek').value) > 850, 'rest'); analyser.getFloatTimeDomainData(samples);
    check('rest is actually silent in the audio graph', Math.sqrt(samples.reduce((n, x) => n + x * x, 0) / samples.length) < .0001);
    await until(() => Number($('recording-seek').value) > 1450, 'glide'); analyser.getFloatTimeDomainData(samples); const glide = detectPitchYin(samples, contexts.at(-1).sampleRate);
    check('glissando is continuous rather than snapped to notes', glide.frequencyHz > 400 && glide.frequencyHz < 560);
    await until(() => $('recording-play').getAttribute('aria-pressed') === 'false', 'automatic end');
    check('replay ends at the actual duration', Number($('recording-seek').value) === 2200);
    $('recording-play').click(); await until(() => $('recording-play').getAttribute('aria-pressed') === 'true', 'replay again'); $('recording-close').click();
    check('closing preview stops playback immediately', $('recording-play').getAttribute('aria-pressed') === 'false');
    $('recording-result').click(); $('recording-seek').value = '1200'; $('recording-seek').dispatchEvent(new win.Event('input', { bubbles: true }));
    check('seek moves the playhead without starting audio', $('recording-play').getAttribute('aria-pressed') === 'false' && Number($('recording-seek').value) === 1200);
    $('recording-play').click(); await until(() => Number($('recording-seek').value) > 1300, 'seek replay');
    Object.defineProperty(doc, 'hidden', { configurable: true, value: true }); doc.dispatchEvent(new win.Event('visibilitychange')); delete doc.hidden;
    check('background transition stops playback', $('recording-play').getAttribute('aria-pressed') === 'false');
    $('recording-discard').click(); await inject(new win.File([exported], 'round-trip.png', { type: 'image/png' })); await until(previewReady, 'PNG import');
    check('an exported PNG can be imported and replayed without any other file', !$('recording-play').disabled);
    $('recording-close').click();
    const original = await (await fetch('../assets/favicon-32.png')).blob(); await inject(new win.File([original], 'old.png'));
    check('unrelated small PNG is rejected without replacing previous take', $('import-status').textContent.includes('圖片尺寸') && !$('recording-result').hidden);
    await inject(new win.File(['{"format":"otama-lab.pitch","version":999}'], 'future.json'));
    check('unsupported file versions produce a useful error', $('import-status').textContent.includes('版本'));
    const damaged = new Uint8Array(await exported.arrayBuffer()); damaged[50] ^= 1; await inject(new win.File([damaged], 'damaged.png'));
    check('corrupted PNG is rejected instead of played', $('import-status').textContent.includes('損壞'));
    $('timeline-focus').click();
    check('focus import control is visible, SVG-only and has a touch target', $('import-pitch').getBoundingClientRect().width >= 44 && win.getComputedStyle($('import-pitch').querySelector('span')).display === 'none');
    check('focus remains free of page scrollbars with the extra control', doc.documentElement.scrollWidth === doc.documentElement.clientWidth && doc.documentElement.scrollHeight === doc.documentElement.clientHeight);
    await inject(new win.File([json], 'focus.json')); await until(previewReady, 'focus import');
    check('focus import opens the same bounded, usable result dialog', $('recording-preview').getBoundingClientRect().top >= 0 && $('recording-preview').getBoundingClientRect().bottom <= doc.documentElement.clientHeight + 1 && $('recording-play').getBoundingClientRect().width > 0);
    check('all result actions stay within the viewport', $('recording-discard').getBoundingClientRect().bottom <= doc.documentElement.clientHeight && $('recording-preview').scrollWidth <= $('recording-preview').clientWidth);
    check('microphone never activates merely by importing or replaying', $('microphone').getAttribute('aria-pressed') === 'false');
    $('recording-close').click();
    let testStream;
    win.navigator.mediaDevices.getUserMedia = async () => {
      const context = new NativeContext(), oscillator = context.createOscillator(), sink = context.createMediaStreamDestination(); contexts.push(context);
      oscillator.connect(sink); oscillator.frequency.value = 440; oscillator.start(); await context.resume(); testStream = sink.stream; return testStream;
    };
    $('focus-microphone').click(); await until(() => $('microphone').getAttribute('aria-pressed') === 'true', 'synthetic input');
    $('recording-result').click(); $('recording-play').click();
    check('replay stops active microphone tracks before output begins', $('microphone').getAttribute('aria-pressed') === 'false' && testStream.getAudioTracks()[0].readyState === 'ended');
    $('recording-close').click();
    const minute = { durationMs: 60000, frames: [] };
    for (let timeMs = 0; timeMs <= 60000; timeMs += 40) minute.frames.push({ timeMs, frequencyHz: timeMs % 1600 < 400 ? null : 440 * 2 ** (Math.sin(timeMs / 300) / 12) });
    await inject(new win.File([pitchDocument(minute)], 'synthetic-minute.json')); await until(previewReady, 'full minute preview');
    check('a full minute imports all five rows and every frame', $('recording-image').naturalHeight === 1432 && (await importPitchFile(await (await fetch($('recording-download').href)).blob())).frames.length === 1501);
    $('recording-seek').value = '59000'; $('recording-seek').dispatchEvent(new win.Event('input', { bubbles: true }));
    check('seeking follows the matching row of a full-length graph', $('replay-cursor').querySelector('line').getAttribute('y1') === '1144');
  } catch (error) { check(error.stack || error.message, false); }
  finally { win.dispatchEvent(new win.Event('pagehide')); win.AudioContext = originalContext; win.navigator.mediaDevices.getUserMedia = originalMedia; for (const context of contexts) await context.close(); summary.textContent = `${count - failures}/${count} passed; ${failures} failed. Native audio, synthetic data, no physical microphone.`; run.disabled = false; }
});
