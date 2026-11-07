import { Synth } from '../src/audio.js';
import { bindInstrument } from '../src/instrument.js';
import { BASE, TOP, frequencyAt, positionAt, pitchOf, semitonesFrom } from '../src/pitch.js';
const frame = document.querySelector('#app');
const list = document.querySelector('#results');
const failures = [];
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
  for (const model of ['inverse', 'exponential', 'linear']) {
    $('model').value = model; $('model').dispatchEvent(new win.Event('change'));
    key('keydown', 'Home'); key('keyup', 'Home');
    check(`${model}: Home C3`, $('note').textContent === 'C3' && $('hz').textContent === BASE.toFixed(1));
    key('keydown', 'End'); key('keyup', 'End');
    check(`${model}: End C6`, $('note').textContent === 'C6' && $('cents').textContent === '0 cents');
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
  const rect = strip.getBoundingClientRect();
  for (const type of ['mouse', 'touch', 'pen']) {
    pointer(strip, 'pointerdown', type, 10, rect.x + 4, rect.top + rect.height * .75);
    pointer(strip, 'pointermove', type, 10, rect.x + 4, rect.top - 100);
    check(`${type}: captured motion outside rail clamps to C6`, $('note').textContent === 'C6');
    pointer(win, 'pointerup', type, 10, rect.x + 100, rect.top - 100);
    pointer(strip, 'pointermove', type, 10, rect.x, rect.bottom);
    check(`${type}: release ignores subsequent motion`, $('note').textContent === 'C6');
    pointer(strip, 'pointerdown', type, 11, rect.x, rect.bottom);
    pointer(win, 'pointercancel', type, 11, rect.x, rect.bottom);
    pointer(strip, 'pointermove', type, 11, rect.x, rect.top);
    check(`${type}: cancellation clears drag`, $('note').textContent === 'C3');
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
    check(`${pointerType}: horizontal range reaches 100%`, $('note').textContent === 'C6');
    pointer(win, 'pointermove', pointerType, 30, rangeRect.left + 9, rangeRect.top + 20);
    check(`${pointerType}: horizontal range reaches 0%`, $('note').textContent === 'C3');
    pointer(win, 'pointerup', pointerType, 30, rangeRect.left, rangeRect.top);
  }
  strip.setPointerCapture = () => { throw new win.DOMException('Capture unavailable'); };
  pointer(strip, 'pointerdown', 'touch', 40, rect.left, trackRect.bottom);
  pointer(win, 'pointermove', 'touch', 40, rect.right + 100, trackRect.top);
  check('capture failure still drags outside the neck through window events', $('note').textContent === 'C6');
  pointer(win, 'pointerup', 'touch', 40, rect.right + 100, trackRect.top);
  pointer(win, 'pointermove', 'touch', 40, rect.left, trackRect.bottom);
  check('capture fallback also stops after release', $('note').textContent === 'C6');
  strip.setPointerCapture = () => {};
  pointer(strip, 'pointerdown', 'touch', 50, rect.left, trackRect.bottom);
  strip.dispatchEvent(new win.PointerEvent('pointerdown', { pointerId: 51, pointerType: 'touch', isPrimary: false, button: 0, clientY: trackRect.top, bubbles: true }));
  check('second finger does not take over the first touch', $('note').textContent === 'C3');
  pointer(win, 'pointerup', 'touch', 50, rect.left, trackRect.bottom);
  pointer(strip, 'pointerdown', 'touch', 60, rect.left, trackRect.bottom);
  pointer(strip, 'lostpointercapture', 'touch', 60, rect.left, trackRect.bottom);
  pointer(win, 'pointermove', 'touch', 60, rect.left, trackRect.top);
  check('lost capture clears pointer state', $('note').textContent === 'C3');
  strip.setPointerCapture = capture; strip.hasPointerCapture = has;
  $('pos').setPointerCapture = rangeCapture;
  check('decorative copy has been removed', !doc.querySelector('.hero, .rail-caption, .character-caption, .footer-sign, .eyebrow'));
  check('all action icons are SVG', doc.querySelectorAll('button .icon use').length === 4);
  check('favicon and OG image configured', !!doc.querySelector('link[rel="icon"][type="image/svg+xml"]') && doc.querySelector('meta[property="og:image"]').content.endsWith('/assets/og.png'));

  key('keydown', 'Home'); key('keyup', 'Home'); key('keydown', 'ArrowUp', true); key('keyup', 'ArrowUp', true);
  check('Shift fine step = 0.1%', Math.abs(Number(strip.getAttribute('aria-valuenow')) - .1) < .001);
  check('vertical slider accessibility', strip.getAttribute('aria-orientation') === 'vertical' && strip.getAttribute('aria-valuetext').includes('cents'));
  check('rail prevents touch scrolling via CSS', win.getComputedStyle(strip).touchAction === 'none');
  check('range prevents touch scrolling via CSS', win.getComputedStyle($('pos')).touchAction === 'none');
  check('no horizontal page overflow', doc.documentElement.scrollWidth <= doc.documentElement.clientWidth);
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
