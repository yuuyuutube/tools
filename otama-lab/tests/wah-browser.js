import { createYin } from '../src/analysis/yin.js';
import { positionAt } from '../src/pitch.js';
const wahFrame = document.getElementById('wah'), wahRun = document.getElementById('run');
const wahPause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function wahUntil(predicate, label) { const start = performance.now(); while (!predicate()) { if (performance.now() - start > 5000) throw new Error(`Timeout: ${label}`); await wahPause(30); } }
const wahReady = () => { wahRun.disabled = false; }; if (wahFrame.contentDocument?.readyState === 'complete') wahReady(); else wahFrame.addEventListener('load', wahReady, { once: true });
wahRun.addEventListener('click', async () => {
  wahRun.disabled = true; document.getElementById('results').replaceChildren(); let count = 0, failed = 0;
  const check = (text, condition) => { count++; if (!condition) failed++; const li = document.createElement('li'); li.className = condition ? 'pass' : 'fail'; li.textContent = `${condition ? 'PASS' : 'FAIL'}: ${text}`; document.getElementById('results').append(li); };
  const win = wahFrame.contentWindow, doc = wahFrame.contentDocument, $ = id => doc.getElementById(id);
  const NativeContext = win.AudioContext || win.webkitAudioContext, originalConnect = win.AudioNode.prototype.connect;
  const originalAnalyser = NativeContext.prototype.createAnalyser, originalOscillator = NativeContext.prototype.createOscillator;
  const contexts = new Set(), destinations = new Map(), oscillators = []; let analyser;
  win.AudioNode.prototype.connect = function(destination, ...args) {
    if (destination instanceof win.AudioDestinationNode) {
      if (!destinations.has(this.context)) destinations.set(this.context, this.context.createMediaStreamDestination());
      destination = destinations.get(this.context);
    }
    return originalConnect.call(this, destination, ...args);
  };
  NativeContext.prototype.createAnalyser = function() { contexts.add(this); analyser = originalAnalyser.call(this); return analyser; };
  NativeContext.prototype.createOscillator = function() { const oscillator = originalOscillator.call(this); oscillators.push(oscillator); return oscillator; };
  const pointer = (target, type, id, props = {}) => target.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType: 'touch', isPrimary: true, button: 0, buttons: 1, ...props }));
  const neckAt = frequency => { const r = $('wah-track').getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height * positionAt(frequency, 'inverse') }; };
  const faceAt = () => { const r = $('wah-mouth').getBoundingClientRect(); return { clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 }; };
  const isPlaying = () => $('wah-face').classList.contains('playing');
  const measure = () => {
    const wave = new Float32Array(analyser.fftSize), bins = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatTimeDomainData(wave); analyser.getFloatFrequencyData(bins);
    let energy = 0, weighted = 0;
    for (let i = 1; i < bins.length; i++) { const hz = i * analyser.context.sampleRate / analyser.fftSize; if (hz > 8000) break; const e = Number.isFinite(bins[i]) ? 10 ** (bins[i] / 10) : 0; energy += e; weighted += e * hz; }
    return { pitch: createYin({ minRms: .0001 })(wave, analyser.context.sampleRate).frequencyHz, bins, centroid: weighted / energy, rms: Math.sqrt(wave.reduce((s, v) => s + v * v, 0) / wave.length), peak: Math.max(...wave.map(Math.abs)) };
  };
  try {
    check('no automatic audio context, fake trace or microphone on load', contexts.size === 0 && $('spectrum-trace').getAttribute('d') === '' && !$('spectrum-empty').hidden);
    check('original cream face, SVG controls and explicit Simulation remain', win.getComputedStyle($('wah-face')).backgroundColor === 'rgb(255, 247, 231)' && !!$('wah-sound').querySelector('svg use') && doc.body.textContent.includes('Approximate Wah Simulation'));
    check('page has no horizontal or vertical scrollbars', doc.documentElement.scrollWidth === doc.documentElement.clientWidth && doc.documentElement.scrollHeight === doc.documentElement.clientHeight);
    check('header title and 44px SVG targets fit even the narrow viewport', win.getComputedStyle(doc.querySelector('.wah-title h1')).display !== 'none' && Array.from(doc.querySelectorAll('.wah-header .icon-button')).every(button => { const r = button.getBoundingClientRect(); return r.width >= 44 && r.height >= 44 && r.left >= 0 && r.right <= doc.documentElement.clientWidth + 1; }));
    check('neck and mouth prevent scrolling and text selection', win.getComputedStyle($('wah-neck')).touchAction === 'none' && win.getComputedStyle($('wah-mouth')).touchAction === 'none' && win.getComputedStyle(doc.querySelector('.wah-page')).userSelect === 'none');
    check('readout, slider, sustain and spectrum fit in the viewport', ['wah-readout', 'wah-mouth-field', 'wah-spectrum-panel'].every(name => { const r = doc.querySelector('.' + name).getBoundingClientRect(); return r.left >= 0 && r.right <= doc.documentElement.clientWidth + 1 && r.bottom <= doc.documentElement.clientHeight + 1; }) && $('wah-sustain').getBoundingClientRect().bottom <= doc.documentElement.clientHeight);
    const initialFace = faceAt(); pointer($('wah-mouth'), 'pointerdown', 2, initialFace); pointer(win, 'pointermove', 2, { ...initialFace, clientY: initialFace.clientY + 70 });
    check('mouth alone opens without starting any audio', $('mouth-percent').textContent === '100%' && contexts.size === 0);
    pointer(win, 'pointerup', 2, initialFace); check('mouth springs closed on release', $('mouth-percent').textContent === '0%');
    const frequency = 440 * 2 ** (37 / 1200), at = neckAt(frequency);
    pointer($('wah-neck'), 'pointerdown', 11, at); await wahUntil(isPlaying, 'first gesture audio'); await wahPause(260);
    const closed = measure();
    check('first neck gesture starts real continuous nonstandard pitch', closed.rms > .001 && Math.abs(1200 * Math.log2(closed.pitch / frequency)) < 5 && $('wah-note').textContent === 'A4' && $('wah-cents').textContent === '+37 cents');
    check('live spectrum comes from native FFT values', $('spectrum-trace').getAttribute('d').length > 500 && $('spectrum-empty').hidden && Array.from(closed.bins).some(value => value > -60));
    const marker = $('fundamental').getAttribute('x1'), pitchText = $('wah-hz').textContent, face = faceAt();
    pointer($('wah-mouth'), 'pointerdown', 22, { ...face, isPrimary: false }); pointer(win, 'pointermove', 22, { ...face, clientY: face.clientY + 70, isPrimary: false }); await wahPause(260);
    const open = measure();
    check('second non-primary touch controls mouth without stopping neck', isPlaying() && $('mouth-percent').textContent === '100%' && $('wah-hz').textContent === pitchText);
    check('opening changes real harmonic balance and raises spectral centroid', open.centroid > closed.centroid * 1.15 && open.bins.some((value, i) => Number.isFinite(value) && Number.isFinite(closed.bins[i]) && value - closed.bins[i] > 6));
    check('mouth preserves fundamental, tuning and fixed f0 marker', Math.abs(1200 * Math.log2(open.pitch / frequency)) < 5 && $('fundamental').getAttribute('x1') === marker && Math.abs(oscillators.at(-1).frequency.value - frequency) < .001);
    check('output remains bounded without clipping', open.peak < .2 && closed.peak < .2);
    pointer($('wah-neck'), 'pointerdown', 33, neckAt(196)); pointer(win, 'pointermove', 33, neckAt(196));
    check('third finger cannot steal the held neck', $('wah-hz').textContent === pitchText);
    pointer(win, 'pointerup', 22, face); check('releasing mouth closes it while neck continues sounding', isPlaying() && $('mouth-percent').textContent === '0%');
    pointer(win, 'pointermove', 11, neckAt(1174.65907167)); await wahPause(150);
    check('high pitch is near the face and reaches D6', $('wah-note').textContent === 'D6' && parseFloat($('wah-hz').textContent) > 1174);
    pointer(win, 'pointermove', 11, neckAt(195.99771799)); await wahPause(150);
    check('upper neck reaches G3 continuously', $('wah-note').textContent === 'G3' && Math.abs(parseFloat($('wah-hz').textContent) - 196) < .1);
    pointer(win, 'pointerup', 11); await wahPause(150);
    check('release outside neck stops real audio and clears trace', !isPlaying() && measure().rms < .00001 && $('spectrum-trace').getAttribute('d') === '');
    pointer($('wah-mouth'), 'pointerdown', 41, faceAt()); pointer($('wah-neck'), 'pointerdown', 42, { ...neckAt(440), isPrimary: false }); await wahUntil(isPlaying, 'mouth-first multitouch');
    check('mouth-first then non-primary neck also works', isPlaying() && $('mouth-percent').textContent === '45%');
    pointer(win, 'pointercancel', 42); check('pointer cancellation stops neck without stealing mouth state', !isPlaying() && $('mouth-percent').textContent === '45%');
    pointer(win, 'pointercancel', 41); check('mouth cancellation safely closes it', $('mouth-percent').textContent === '0%');
    pointer($('wah-neck'), 'pointerdown', 51, neckAt(440)); await wahUntil(isPlaying, 'lost capture setup'); pointer($('wah-neck'), 'lostpointercapture', 51);
    check('lost pointer capture cannot leave a stuck note', !isPlaying());
    $('wah-sustain').click(); await wahUntil(isPlaying, 'desktop sustain');
    $('mouth-opening').value = '83'; $('mouth-opening').dispatchEvent(new win.Event('input', { bubbles: true }));
    check('sustain supports one-mouse mouth control and retains slider value', isPlaying() && $('wah-sustain').getAttribute('aria-pressed') === 'true' && $('mouth-percent').textContent === '83%');
    $('wah-sustain').click(); check('sustain toggles off immediately', !isPlaying());
    $('wah-neck').dispatchEvent(new win.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true })); await wahUntil(isPlaying, 'keyboard note');
    $('wah-neck').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'w', bubbles: true, cancelable: true }));
    check('keyboard can hold a note and open the mouth independently', isPlaying() && $('mouth-percent').textContent === '100%');
    $('wah-neck').dispatchEvent(new win.KeyboardEvent('keyup', { key: 'w', bubbles: true })); $('wah-neck').dispatchEvent(new win.KeyboardEvent('keyup', { key: ' ', bubbles: true }));
    check('keyboard releases close mouth and stop sound', !isPlaying() && $('mouth-percent').textContent === '0%');
    $('wah-sound').click(); pointer($('wah-neck'), 'pointerdown', 61, neckAt(440)); await wahPause(100);
    check('manual mute stays muted during further neck gestures', !isPlaying() && $('wah-sound').getAttribute('aria-pressed') === 'false'); pointer(win, 'pointerup', 61);
    $('wah-sustain').click(); await wahUntil(isPlaying, 'explicit sustain unmutes');
    $('wah-info').click(); check('opening help stops audio and sustain', $('wah-help-dialog').open && !isPlaying() && $('wah-sustain').getAttribute('aria-pressed') === 'false'); $('wah-help-close').click();
    $('wah-sustain').click(); await wahUntil(isPlaying, 'background setup');
    Object.defineProperty(doc, 'hidden', { configurable: true, value: true }); doc.dispatchEvent(new win.Event('visibilitychange')); delete doc.hidden;
    check('background transition mutes and clears held state', !isPlaying() && $('wah-sound').getAttribute('aria-pressed') === 'false' && $('wah-sustain').getAttribute('aria-pressed') === 'false');
    $('wah-sound').click(); await wahUntil(() => $('wah-sound').getAttribute('aria-pressed') === 'true', 're-enable');
    const ctx = analyser.context, resume = ctx.resume.bind(ctx); let resolve;
    ctx.resume = () => new Promise(r => { resolve = r; }); const countBefore = oscillators.length;
    pointer($('wah-neck'), 'pointerdown', 71, neckAt(440)); await wahPause(30); pointer(win, 'pointerup', 71); ctx.resume = resume; resolve(); await wahPause(100);
    check('release before pending resume cannot start a late oscillator', !isPlaying() && oscillators.length === countBefore);
    $('wah-sustain').click(); await wahUntil(isPlaying, 'escape setup'); doc.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    check('Escape stops sound, resets mouth and cancels sustain', !isPlaying() && $('mouth-percent').textContent === '0%' && $('wah-sustain').getAttribute('aria-pressed') === 'false');
    check('frequency spectrum stays actual and frame loop stops when idle', $('spectrum-trace').getAttribute('d') === '' && !$('spectrum-empty').hidden);
    document.getElementById('metrics')?.remove(); const metrics = document.createElement('pre'); metrics.id = 'metrics'; metrics.textContent = JSON.stringify({ viewport: [doc.documentElement.clientWidth, doc.documentElement.clientHeight], closed: { pitch: closed.pitch, centroid: closed.centroid, peak: closed.peak }, open: { pitch: open.pitch, centroid: open.centroid, peak: open.peak } }, null, 2); document.body.append(metrics);
  } catch (error) { check(error.stack || error.message, false); }
  finally {
    win.dispatchEvent(new win.Event('pagehide'));
    win.AudioNode.prototype.connect = originalConnect; NativeContext.prototype.createAnalyser = originalAnalyser; NativeContext.prototype.createOscillator = originalOscillator;
    for (const stream of destinations.values()) for (const track of stream.stream.getTracks()) track.stop();
    for (const context of contexts) await context.close();
    document.getElementById('summary').textContent = `${count - failed}/${count} passed; ${failed} failed. Native audio graph; synthetic pointers, no physical device.`; wahRun.disabled = false;
  }
});
