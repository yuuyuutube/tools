import { Synth } from '../src/audio.js';
import { bindInstrument } from '../src/instrument.js';
import { RANGES, DEFAULT_RANGE, rangeMarkers, frequencyAt, positionAt, pitchOf, semitonesFrom } from '../src/pitch.js';
const BASE = DEFAULT_RANGE.base, TOP = DEFAULT_RANGE.top;
const frame = document.querySelector('#app');
const list = document.querySelector('#results');
const failures = [];
Promise.all([...document.querySelectorAll('iframe')].map(surface => new Promise(resolve => {
  if (surface.contentDocument?.readyState === 'complete' && surface.contentDocument.URL !== 'about:blank') resolve();
  else surface.addEventListener('load', resolve, { once: true });
}))).then(() => { document.querySelector('#run').disabled = false; });
function check(name, condition) {
  const li = document.createElement('li'); li.className = condition ? 'pass' : 'fail';
  li.textContent = `${condition ? 'PASS' : 'FAIL'}: ${name}`; list.append(li);
  if (!condition) failures.push(name);
}
document.querySelector('#run').addEventListener('click', async () => {
  list.replaceChildren(); document.querySelector('#summary')?.remove(); failures.length = 0;
  const synth = new Synth();
  // Start/resume synchronously inside this trusted click gesture.
  const audioReady = synth.setEnabled(true).catch(error => error);
  const win = frame.contentWindow, doc = frame.contentDocument;
  const $ = id => doc.getElementById(id), strip = $('strip');
  const key = (type, key, shiftKey = false) => strip.dispatchEvent(new win.KeyboardEvent(type, { key, shiftKey, bubbles: true, cancelable: true }));
  const pointer = (target, type, pointerType, id, x, y) => target.dispatchEvent(new win.PointerEvent(type, { bubbles: true, cancelable: true, pointerId: id, pointerType, isPrimary: true, button: 0, buttons: ['pointerup', 'pointercancel'].includes(type) ? 0 : 1, clientX: x, clientY: y }));
  // Synthetic pointers are not in the UA active-pointer registry; intercept only capture
  // so input state can be tested. Native capture is verified separately by real drag.
  const capture = strip.setPointerCapture, has = strip.hasPointerCapture;
  strip.setPointerCapture = () => {}; strip.hasPointerCapture = () => false;
  check('G3–D6 is the default range', $('range').value === 'g3-d6');
  check('the range control has exactly the two agreed options', [...$('range').options].map(option => option.value).join(',') === 'g3-d6,c3-c6');
  for (const selected of Object.values(RANGES)) {
    $('range').value = selected.id; $('range').dispatchEvent(new win.Event('change'));
    for (const mapping of ['inverse', 'exponential', 'linear']) {
      $('model').value = mapping; $('model').dispatchEvent(new win.Event('change'));
      for (const x of [0, .3712, 1]) {
        $('pos').value = x * 100; $('pos').dispatchEvent(new win.Event('input', { bubbles: true }));
        const expected = frequencyAt(x, mapping, selected);
        check(`${selected.label}/${mapping}/${x}: pitch and both graphs agree`, $('hz').textContent === expected.toFixed(1) && $('note').textContent === pitchOf(expected).note && Number($('frequency-plot').dataset.frequency) === expected && Math.abs(Number($('pitch-plot').dataset.value) - semitonesFrom(expected, selected.base)) < 1e-8);
      }
      check(`${selected.label}/${mapping}: semitone extent, marks and legend`, Math.abs(Number($('pitch-plot').dataset.value) - selected.semitones) < 1e-8 && $('note-marks').children.length === selected.semitones + 1 && $('octave-legend').textContent === rangeMarkers(selected).map(marker => marker.note).join(' / '));
      check(`${selected.label}/${mapping}: endpoint stays inside both plots`, Number($('frequency-plot').querySelector('circle:last-of-type').getAttribute('cy')) >= 30 && Number($('pitch-plot').querySelector('circle:last-of-type').getAttribute('cy')) >= 29.999999);
    }
    check(`${selected.label}: selected range is in the bookmark URL`, new URL(win.location.href).searchParams.get('range') === selected.id);
  }
  // A marked frequency remains in bounds when switching between the presets.
  $('range').value = DEFAULT_RANGE.id; $('range').dispatchEvent(new win.Event('change'));
  key('keydown', 'End'); key('keyup', 'End');
  $('mark').click(); $('range').value = 'c3-c6'; $('range').dispatchEvent(new win.Event('change'));
  check('a reference above the new range is clamped to its upper endpoint', $('reference-hz').textContent === `${RANGES['c3-c6'].top.toFixed(1)} Hz` && $('octave').disabled);
  key('keydown', 'Home'); key('keyup', 'Home'); $('mark').click();
  $('range').value = DEFAULT_RANGE.id; $('range').dispatchEvent(new win.Event('change'));
  check('a reference below the new range is clamped to its lower endpoint', $('reference-hz').textContent === `${BASE.toFixed(1)} Hz` && !$('octave').disabled);
  for (const model of ['inverse', 'exponential', 'linear']) {
    $('model').value = model; $('model').dispatchEvent(new win.Event('change'));
    key('keydown', 'Home'); key('keyup', 'Home');
    check(`${model}: Home ${DEFAULT_RANGE.lowNote}`, $('note').textContent === DEFAULT_RANGE.lowNote && $('hz').textContent === BASE.toFixed(1));
    key('keydown', 'End'); key('keyup', 'End');
    check(`${model}: End ${DEFAULT_RANGE.highNote}`, $('note').textContent === DEFAULT_RANGE.highNote && $('cents').textContent === '0 cents');
    $('pos').value = 37.123; $('pos').dispatchEvent(new win.Event('input', { bubbles: true }));
    const f = frequencyAt(.3712, model); // native range step is 0.01%.
    check(`${model}: frequency / note / cents`, $('hz').textContent === f.toFixed(1) && $('note').textContent === pitchOf(f).note && $('cents').textContent === `${pitchOf(f).cents > 0 ? '+' : ''}${pitchOf(f).cents} cents`);
    const a = $('frequency-plot'), b = $('pitch-plot');
    check(`${model}: graph cursors share exact position and frequency`, a.dataset.position === b.dataset.position && a.dataset.frequency === b.dataset.frequency && Math.abs(Number(b.dataset.value) - semitonesFrom(Number(a.dataset.frequency))) < 1e-10);
    $('mark').click(); $('octave').click();
    check(`${model}: octave ratio and interval`, $('ratio').textContent === '× 2.000' && $('interval').textContent === '+12 半音');
    check(`${model}: reference position follows mapping`, Math.abs(Number(a.dataset.position) - positionAt(f * 2, model)) < 1e-8);
    key('keydown', 'End'); key('keyup', 'End'); $('mark').click();
    check(`${model}: octave out of range is disabled`, $('octave').disabled);
  }
  const scale = $('track').getBoundingClientRect();
  for (const model of ['inverse', 'exponential', 'linear']) {
    $('model').value = model; $('model').dispatchEvent(new win.Event('change'));
    for (const type of ['mouse', 'touch', 'pen']) {
      pointer(strip, 'pointerdown', type, 90, scale.left, scale.top);
      check(`${model}/${type}: top is low ${DEFAULT_RANGE.lowNote}`, $('note').textContent === DEFAULT_RANGE.lowNote && $('finger').style.bottom === '100%');
      pointer(win, 'pointermove', type, 90, scale.left, scale.bottom);
      check(`${model}/${type}: near head is high ${DEFAULT_RANGE.highNote}`, $('note').textContent === DEFAULT_RANGE.highNote && $('finger').style.bottom === '0%');
      pointer(win, 'pointerup', type, 90, scale.left, scale.bottom);
    }
  }
  const rect = strip.getBoundingClientRect();
  for (const type of ['mouse', 'touch', 'pen']) {
    pointer(strip, 'pointerdown', type, 10, rect.x + 4, rect.top + rect.height * .25);
    pointer(strip, 'pointermove', type, 10, rect.x + 4, rect.bottom + 100);
    check(`${type}: captured motion outside rail clamps to ${DEFAULT_RANGE.highNote}`, $('note').textContent === DEFAULT_RANGE.highNote);
    pointer(win, 'pointerup', type, 10, rect.x + 100, rect.bottom + 100);
    pointer(strip, 'pointermove', type, 10, rect.x, rect.top);
    check(`${type}: release ignores subsequent motion`, $('note').textContent === DEFAULT_RANGE.highNote);
    pointer(strip, 'pointerdown', type, 11, rect.x, rect.top);
    pointer(win, 'pointercancel', type, 11, rect.x, rect.top);
    pointer(strip, 'pointermove', type, 11, rect.x, rect.bottom);
    check(`${type}: cancellation clears drag`, $('note').textContent === DEFAULT_RANGE.lowNote);
  }
  const trackRect = $('track').getBoundingClientRect();
  const finger = $('finger').getBoundingClientRect();
  check('thumb edge belongs to the interactive neck', strip.contains(doc.elementFromPoint(finger.left + 2, finger.top + finger.height / 2)));
  const rangeRect = $('pos').getBoundingClientRect();
  const rangeCapture = $('pos').setPointerCapture;
  $('pos').setPointerCapture = () => {};
  for (const pointerType of ['mouse', 'touch']) {
    pointer($('pos'), 'pointerdown', pointerType, 30, rangeRect.left + 9, rangeRect.top + 20);
    pointer(win, 'pointermove', pointerType, 30, rangeRect.right - 9, rangeRect.top + 20);
    check(`${pointerType}: horizontal range reaches 100%`, $('note').textContent === DEFAULT_RANGE.highNote);
    pointer(win, 'pointermove', pointerType, 30, rangeRect.left + 9, rangeRect.top + 20);
    check(`${pointerType}: horizontal range reaches 0%`, $('note').textContent === DEFAULT_RANGE.lowNote);
    pointer(win, 'pointerup', pointerType, 30, rangeRect.left, rangeRect.top);
  }
  strip.setPointerCapture = () => { throw new win.DOMException('Capture unavailable'); };
  pointer(strip, 'pointerdown', 'touch', 40, rect.left, trackRect.top);
  pointer(win, 'pointermove', 'touch', 40, rect.right + 100, trackRect.bottom);
  check('capture failure still drags outside the neck through window events', $('note').textContent === DEFAULT_RANGE.highNote);
  pointer(win, 'pointerup', 'touch', 40, rect.right + 100, trackRect.bottom);
  pointer(win, 'pointermove', 'touch', 40, rect.left, trackRect.top);
  check('capture fallback also stops after release', $('note').textContent === DEFAULT_RANGE.highNote);
  strip.setPointerCapture = () => {};
  pointer(strip, 'pointerdown', 'touch', 50, rect.left, trackRect.top);
  strip.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 51, pointerType: 'touch', isPrimary: false, button: 0, clientY: trackRect.bottom, bubbles: true }));
  check('second finger does not take over the first touch', $('note').textContent === DEFAULT_RANGE.lowNote);
  pointer(win, 'pointerup', 'touch', 50, rect.left, trackRect.top);
  pointer(strip, 'pointerdown', 'touch', 60, rect.left, trackRect.top);
  pointer(strip, 'lostpointercapture', 'touch', 60, rect.left, trackRect.top);
  pointer(win, 'pointermove', 'touch', 60, rect.left, trackRect.bottom);
  check('lost capture clears pointer state', $('note').textContent === DEFAULT_RANGE.lowNote);
  strip.setPointerCapture = capture; strip.hasPointerCapture = has;
  $('pos').setPointerCapture = rangeCapture;
  check('decorative copy has been removed', !doc.querySelector('.hero, .rail-caption, .character-caption, .footer-sign, .eyebrow'));
  check('all action icons are SVG', [...doc.querySelectorAll('button')].every(button => button.querySelector('.icon use')));
  check('favicon and OG image configured', !!doc.querySelector('link[rel="icon"][type="image/svg+xml"]') && doc.querySelector('meta[property="og:image"]').content.endsWith('/assets/og.png'));

  key('keydown', 'Home'); key('keyup', 'Home'); key('keydown', 'ArrowUp', true); key('keyup', 'ArrowUp', true);
  check('Shift fine step = 0.1%', Math.abs(Number(strip.getAttribute('aria-valuenow')) - .1) < .001);
  check('vertical slider accessibility', strip.getAttribute('aria-orientation') === 'vertical' && strip.getAttribute('aria-valuetext').includes('cents'));
  check('rail prevents touch scrolling via CSS', win.getComputedStyle(strip).touchAction === 'none');
  check('range prevents touch scrolling via CSS', win.getComputedStyle($('pos')).touchAction === 'none');
  check('no horizontal page overflow', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth);
  const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
  const mode = $('focus-mode');
  mode.click(); await pause(120);
  check('focus mode enters and enables audio from its gesture', doc.documentElement.classList.contains('focus-mode') && $('sound').getAttribute('aria-pressed') === 'true');
  check('focus mode URL can be bookmarked', new URL(win.location.href).searchParams.get('mode') === 'play');
  check('focus mode hides graphs, readouts and labels', ['.visualization', '.readouts', '.tickmarks', '.experiment', 'footer'].every(selector => win.getComputedStyle(doc.querySelector(selector)).display === 'none'));
  check('focus mode keeps sound and exit controls visible', [...doc.querySelectorAll('button')].filter(button => button.getClientRects().length).length === 2 && mode.getClientRects().length > 0 && $('focus-sound').getClientRects().length > 0);
  check('focus mode fits the viewport without overflow', doc.documentElement.scrollHeight <= doc.documentElement.clientHeight && doc.documentElement.scrollWidth <= doc.documentElement.clientWidth);
  check('performance interface prevents accidental text selection', win.getComputedStyle(doc.querySelector('.page')).userSelect === 'none');
  check('exit button is accessible', mode.getAttribute('aria-pressed') === 'true' && mode.getAttribute('aria-label') === '離開專注演奏');
  const focusSound = $('focus-sound');
  check('focus sound button is icon-only with an accessible name', focusSound.textContent.trim() === '' && !!focusSound.querySelector('svg use') && !!focusSound.getAttribute('aria-label'));
  check('focus and lab sound controls show the same enabled state', focusSound.getAttribute('aria-pressed') === 'true' && $('sound').getAttribute('aria-pressed') === 'true' && $('focus-sound-icon').getAttribute('href') === '#icon-volume');
  focusSound.click(); await pause(60);
  check('focus mute updates both controls without leaving the stage', focusSound.getAttribute('aria-pressed') === 'false' && $('sound').getAttribute('aria-pressed') === 'false' && doc.documentElement.classList.contains('focus-mode'));
  const mutedRect = $('track').getBoundingClientRect();
  pointer(strip, 'pointerdown', 'touch', 105, mutedRect.left + 5, mutedRect.top);
  pointer(win, 'pointermove', 'touch', 105, mutedRect.left + 5, mutedRect.bottom); await pause(80);
  check('dragging after explicit mute does not turn audio back on', focusSound.getAttribute('aria-pressed') === 'false' && !$('face').classList.contains('playing'));
  pointer(win, 'pointerup', 'touch', 105, mutedRect.left + 5, mutedRect.bottom);
  focusSound.click(); await pause(80);
  check('focus sound can be enabled again with one click', focusSound.getAttribute('aria-pressed') === 'true' && $('sound').getAttribute('aria-pressed') === 'true');
  win.dispatchEvent(new win.Event('blur'));
  check('an interruption keeps the stage but updates both sound icons', doc.documentElement.classList.contains('focus-mode') && focusSound.getAttribute('aria-pressed') === 'false' && $('sound').getAttribute('aria-pressed') === 'false');
  focusSound.click(); await pause(80);
  check('the focus sound button retries audio after interruption', focusSound.getAttribute('aria-pressed') === 'true' && doc.documentElement.classList.contains('focus-mode'));
  const hiddenFrequency = $('frequency-plot').dataset.frequency;
  let focusRect = $('track').getBoundingClientRect();
  pointer(strip, 'pointerdown', 'touch', 100, focusRect.left + 5, focusRect.top);
  await pause(60);
  check('focus touch hold produces a playing expression', $('face').classList.contains('playing'));
  for (let i = 0; i <= 200; i++) pointer(win, 'pointermove', 'touch', 100, focusRect.left - 60, focusRect.top + focusRect.height * i / 200);
  check('fast focus glissando reaches the high endpoint near the head', strip.getAttribute('aria-valuenow') === '100.00' && $('finger').style.bottom === '0%');
  check('hidden graphs stay idle during performance', $('frequency-plot').dataset.frequency === hiddenFrequency);
  pointer(win, 'pointerup', 'touch', 100, focusRect.left - 60, focusRect.bottom);
  await pause(80);
  check('focus release closes the mouth and stops playing', !$('face').classList.contains('playing'));
  win.scrollTo(0, 100);
  check('focus viewport cannot scroll', win.scrollY === 0);
  frame.style.height = '320px'; await pause(100);
  check('short landscape-height stage fits without scrolling', doc.documentElement.scrollHeight <= doc.documentElement.clientHeight && $('face').getBoundingClientRect().bottom <= doc.documentElement.clientHeight);
  frame.style.height = '600px'; await pause(100);
  key('keydown', ' '); await pause(60);
  mode.click(); await pause(80);
  check('exit stops a held note', !$('face').classList.contains('playing'));
  check('exit removes only the performance query parameter', !new URL(win.location.href).searchParams.has('mode'));
  check('exit restores readouts and the latest graph values', !doc.documentElement.classList.contains('focus-mode') && $('hz').textContent === TOP.toFixed(1) && Number($('frequency-plot').dataset.frequency) === TOP);
  mode.click(); await pause(60); key('keydown', 'Escape');
  check('Escape exits and disables audio safely', !doc.documentElement.classList.contains('focus-mode') && $('sound').getAttribute('aria-pressed') === 'false');
  mode.click(); mode.click(); await pause(100);
  check('rapid mode toggles never leave a late playing note', !doc.documentElement.classList.contains('focus-mode') && !$('face').classList.contains('playing'));
  const directWin = document.querySelector('#direct').contentWindow;
  const directDoc = directWin.document;
  const directStrip = directDoc.getElementById('strip');
  const directSound = directDoc.getElementById('sound');
  check('direct link starts in performance mode', directDoc.documentElement.classList.contains('focus-mode'));
  check('direct link waits silently for its first gesture', directSound.getAttribute('aria-pressed') === 'false' && !directDoc.getElementById('face').classList.contains('playing'));
  check('direct link preserves other URL parameters and anchor', new URL(directWin.location.href).searchParams.get('keep') === 'test' && directWin.location.hash === '#strip');
  const directRect = directDoc.getElementById('track').getBoundingClientRect();
  const directPointer = (target, type, y) => target.dispatchEvent(new directWin.PointerEvent(type, { pointerType: 'touch', pointerId: 200, button: 0, buttons: type === 'pointerup' ? 0 : 1, isPrimary: true, clientX: directRect.left + 5, clientY: y, bubbles: true, cancelable: true }));
  directPointer(directStrip, 'pointerdown', directRect.top);
  await pause(150);
  check('first hold in the direct link enables and plays audio', directSound.getAttribute('aria-pressed') === 'true' && directDoc.getElementById('face').classList.contains('playing'));
  directPointer(directWin, 'pointermove', directRect.bottom);
  check('direct link glides down to the high endpoint', directStrip.getAttribute('aria-valuenow') === '100.00');
  directPointer(directWin, 'pointerup', directRect.bottom); await pause(80);
  check('direct link release stops the sound', !directDoc.getElementById('face').classList.contains('playing'));
  const directFocusSound = directDoc.getElementById('focus-sound');
  directFocusSound.click(); await pause(60);
  check('direct-link sound button can mute without leaving focus', directSound.getAttribute('aria-pressed') === 'false' && directDoc.documentElement.classList.contains('focus-mode'));
  directFocusSound.click(); await pause(80);
  check('direct-link sound button can restart without leaving focus', directSound.getAttribute('aria-pressed') === 'true' && directFocusSound.getAttribute('aria-pressed') === 'true' && directDoc.documentElement.classList.contains('focus-mode'));
  directDoc.getElementById('focus-mode').click();
  check('direct link exit preserves unrelated query and anchor', !new URL(directWin.location.href).searchParams.has('mode') && new URL(directWin.location.href).searchParams.get('keep') === 'test' && directWin.location.hash === '#strip');
  check('direct link exit restores the current pitch in the lab', !directDoc.documentElement.classList.contains('focus-mode') && directDoc.getElementById('hz').textContent === TOP.toFixed(1));
  const legacyWin = document.querySelector('#legacy').contentWindow;
  const legacyDoc = legacyWin.document;
  const legacyStrip = legacyDoc.getElementById('strip');
  check('C3–C6 can be selected by a performance direct link', legacyDoc.getElementById('range').value === 'c3-c6' && legacyDoc.documentElement.classList.contains('focus-mode'));
  legacyStrip.dispatchEvent(new legacyWin.KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true }));
  legacyStrip.dispatchEvent(new legacyWin.KeyboardEvent('keyup', { key: 'End', bubbles: true, cancelable: true }));
  check('legacy direct-link high endpoint remains C6', legacyStrip.getAttribute('aria-valuetext').includes('C6'));
  legacyDoc.getElementById('focus-mode').click();
  check('exiting focus preserves the selected range', new URL(legacyWin.location.href).searchParams.get('range') === 'c3-c6' && legacyDoc.getElementById('hz').textContent === RANGES['c3-c6'].top.toFixed(1));
  const cachedWin = document.querySelector('#cached').contentWindow, cachedDoc = cachedWin.document;
  check('cached pre-range HTML receives exactly the two range options', cachedDoc.getElementById('range')?.options.length === 2);
  check('cached pre-range HTML remains playable with new default readings', cachedDoc.getElementById('hz').textContent === frequencyAt(.35, 'inverse').toFixed(1) && cachedDoc.getElementById('octave-legend').textContent === 'G3 / G4 / G5 / D6');
  cachedDoc.getElementById('range').value = 'c3-c6'; cachedDoc.getElementById('range').dispatchEvent(new cachedWin.Event('change'));
  check('cached pre-range HTML can switch range without a reload', cachedDoc.getElementById('hz').textContent === frequencyAt(.35, 'inverse', RANGES['c3-c6']).toFixed(1) && cachedDoc.getElementById('simulation-description').textContent.includes('C3–C6'));
  const audioResult = await audioReady;
  if (audioResult instanceof Error) {
    check('native Web Audio can start from a user gesture', false);
  } else {
    const testStrip = document.createElement('div'), testRange = document.createElement('input');
    testStrip.tabIndex = 0; testRange.type = 'range'; document.body.append(testStrip, testRange);
    testStrip.setPointerCapture = () => {}; testStrip.hasPointerCapture = () => false;
    const input = bindInstrument({ strip: testStrip, range: testRange, getPosition: () => .5, onPosition: () => {}, onStart: () => synth.play(), onStop: () => synth.stop() });
    const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
    const realPointer = type => testStrip.dispatchEvent(new PointerEvent(type, { pointerId: 77, pointerType: 'touch', isPrimary: true, button: 0, clientY: 0, bubbles: true }));
    synth.setFrequency(440);
    testStrip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await sleep(100);
    const voice = synth.voice;
    check('native Web Audio starts while keyboard is held', !!voice && synth.context.state === 'running');
    if (voice) {
      const analyser = synth.context.createAnalyser(); analyser.fftSize = 2048; voice.gain.connect(analyser);
      await sleep(100);
      const samples = new Float32Array(analyser.fftSize); analyser.getFloatTimeDomainData(samples);
      check('native audio output has a nonzero waveform', samples.some(value => Math.abs(value) > .001));
      synth.setFrequency(450); await sleep(100);
      check('native oscillator glides to requested frequency', Math.abs(voice.osc.frequency.value - 450) < .01);
      testStrip.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      await sleep(100); analyser.getFloatTimeDomainData(samples);
      check('key release stops the voice and audio signal', synth.voice === null && samples.every(value => Math.abs(value) < .00001));
      analyser.disconnect();
    }
    for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      realPointer('pointerdown'); await sleep(60);
      check(`${event}: real synth starts on synthetic touch hold`, !!synth.voice);
      realPointer(event); await sleep(60);
      check(`${event}: real synth stops`, synth.voice === null);
    }
    realPointer('pointerdown'); await sleep(60);
    window.dispatchEvent(new Event('blur')); await sleep(60);
    check('window blur stops native synth', synth.voice === null);
    testStrip.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
    await sleep(60); input.stop(); await synth.setEnabled(false);
    check('emergency stop and disabling leave no voice', synth.voice === null && !synth.enabled);
    testStrip.remove(); testRange.remove();
    await synth.context.close();
  }
  const result = document.createElement('p'); result.id = 'summary'; result.textContent = `${list.children.length - failures.length}/${list.children.length} passed`; list.after(result);
});
