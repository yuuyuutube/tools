import { MINI_OTAMA_MEDIA, miniOtamaPitch } from '../src/live/mini-otama.js';
const miniFrame = document.getElementById('live'), miniRun = document.getElementById('run');
const miniResults = document.getElementById('results'), miniSummary = document.getElementById('summary');
const miniPause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function miniUntil(predicate, label, timeout = 5000) {
  const start = performance.now();
  while (!predicate()) { if (performance.now() - start > timeout) throw new Error(`Timeout: ${label}`); await miniPause(40); }
}
if (miniFrame.contentDocument?.readyState === 'complete') miniRun.disabled = false;
else miniFrame.addEventListener('load', () => { miniRun.disabled = false; }, { once: true });
miniRun.addEventListener('click', async () => {
  miniRun.disabled = true; miniResults.replaceChildren(); let failures = 0, count = 0;
  const check = (label, condition) => {
    const item = document.createElement('li'); item.className = condition ? 'pass' : 'fail';
    item.textContent = `${condition ? 'PASS' : 'FAIL'}: ${label}`; miniResults.append(item); count++; if (!condition) failures++;
  };
  const win = miniFrame.contentWindow, doc = miniFrame.contentDocument, $ = id => doc.getElementById(id);
  const desktop = win.matchMedia(MINI_OTAMA_MEDIA).matches;
  const original = win.navigator.mediaDevices.getUserMedia;
  let source;
  win.navigator.mediaDevices.getUserMedia = async () => {
    const context = new (win.AudioContext || win.webkitAudioContext)();
    const oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination();
    oscillator.frequency.value = 440; gain.gain.value = .15;
    oscillator.connect(gain); gain.connect(destination); oscillator.start(); await context.resume();
    source = { context, oscillator, gain, stream: destination.stream }; return destination.stream;
  };
  const validHz = frequency => Math.abs(parseFloat($('live-hz').textContent) - frequency) < Math.max(.3, frequency * .002);
  const markerBottom = () => parseFloat($('mini-finger').style.bottom);
  const consistent = () => Math.abs(markerBottom() - (1 - miniOtamaPitch(parseFloat($('live-hz').textContent)).position) * 100) < .1;
  try {
    check('normal page hides the mini Otama button and panel', $('mini-otama-toggle').getClientRects().length === 0 && $('mini-otama').getClientRects().length === 0);
    $('timeline-focus').click();
    check('panel starts collapsed and has no invented pitch marker', $('mini-otama').hidden && $('mini-finger').hidden);
    check('toggle visibility follows desktop pointer and width requirements', $('mini-otama-toggle').getClientRects().length > 0 === desktop);
    if (desktop) {
      const before = $('timeline').getBoundingClientRect().width;
      $('mini-otama-toggle').click();
      check('desktop can expand the panel with an accessible SVG toggle', !$('mini-otama').hidden && $('mini-otama-toggle').getAttribute('aria-pressed') === 'true' && !!$('mini-otama-toggle').querySelector('svg'));
      const neck = $('mini-otama').getBoundingClientRect(), plot = $('timeline').getBoundingClientRect();
      check('left panel has reserved space without covering the graph', neck.left < 30 && neck.right < plot.left && plot.width < before);
      check('original face and complete neck are retained', !!$('mini-face').querySelector('.mouth') && $('mini-face').querySelectorAll('.eye').length === 2 && !!$('mini-otama').querySelector('.rail .strip .finger'));
      check('range and Simulation distinction are present', $('mini-otama').textContent.includes('G3') && $('mini-otama').textContent.includes('D6') && $('mini-otama').textContent.includes('Simulation'));
      check('mini neck is visual-only and does not become a second input', !$('mini-otama').querySelector('[tabindex]') && !$('mini-otama').querySelector('[role=slider]'));
    } else {
      check('mobile focus contains neither a toggle nor a visible character', $('mini-otama-toggle').hidden && $('mini-otama').getClientRects().length === 0 && !doc.documentElement.classList.contains('mini-otama-open'));
    }
    $('focus-microphone').click(); await miniUntil(() => validHz(440), 'A4');
    check('original pitch readout remains A4 with zero cents', $('live-note').textContent === 'A4' && Math.abs(parseInt($('live-cents').textContent)) <= 1);
    if (desktop) {
      check('A4 moves the marker to the matching continuous inverse position', !$('mini-finger').hidden && consistent() && $('mini-face').classList.contains('playing'));
      const a4 = markerBottom(); source.oscillator.detune.value = 37;
      await miniUntil(() => Math.abs(parseInt($('live-cents').textContent) - 37) <= 1, '37 cents');
      check('off-note input moves continuously without semitone snapping', markerBottom() < a4 && consistent());
      source.oscillator.detune.value = 0; source.oscillator.frequency.value = 195.9977;
      await miniUntil(() => validHz(195.9977), 'G3');
      check('G3 is the upper end of the neck', markerBottom() > 99.9);
      source.oscillator.frequency.value = 1174.659;
      await miniUntil(() => validHz(1174.659), 'D6');
      check('D6 is the lower end near the face', markerBottom() < .1);
      source.oscillator.frequency.value = 82.41;
      await miniUntil(() => validHz(82.41), 'low input');
      check('below G3 clamps only the visual marker', markerBottom() === 100 && $('mini-otama').dataset.limit === 'low' && parseFloat($('live-hz').textContent) < 100);
      source.oscillator.frequency.value = 1900;
      await miniUntil(() => validHz(1900), 'high input');
      check('above D6 clamps only the visual marker', markerBottom() === 0 && $('mini-otama').dataset.limit === 'high' && parseFloat($('live-hz').textContent) > 1800);
      source.oscillator.frequency.value = 330; await miniUntil(() => validHz(330), '330 Hz');
      $('mini-otama-toggle').click(); source.oscillator.frequency.value = 660;
      await miniUntil(() => validHz(660), 'hidden follower'); $('mini-otama-toggle').click();
      check('reopening shows the latest heard pitch, including while hidden', consistent() && !$('mini-otama').hidden);
      source.gain.gain.value = 0;
      await miniUntil(() => $('live-hz').textContent === '—', 'silence');
      const held = markerBottom(); await miniPause(150);
      check('silence closes the mouth while retaining the last pitch position', markerBottom() === held && !$('mini-face').classList.contains('playing'));
      source.gain.gain.value = .15; await miniUntil(() => validHz(660), 'signal returns');
      $('record-pitch').click(); await miniPause(400);
      check('recording with mini panel still fits the focused viewport', doc.documentElement.scrollWidth === doc.documentElement.clientWidth && doc.documentElement.scrollHeight === doc.documentElement.clientHeight);
      $('record-pitch').click(); await miniUntil(() => $('recording-image').naturalWidth === 1440 && $('recording-preview').open, 'PNG preview');
      check('recorded PNG export remains independent of the character panel', $('recording-image').naturalHeight === 312 && $('recording-download').getAttribute('aria-disabled') === 'false');
      $('recording-close').click();
      const last = markerBottom(); $('focus-microphone').click();
      check('microphone stop preserves the marker and returns the face to rest', markerBottom() === last && !$('mini-face').classList.contains('playing'));
      $('timeline-exit').click();
      check('leaving focus hides the panel without affecting the normal page', $('mini-otama').getClientRects().length === 0 && $('mini-otama-toggle').getClientRects().length === 0);
      $('timeline-focus').click();
      check('returning to focus preserves the chosen panel and last pitch', !$('mini-otama').hidden && markerBottom() === last);
    } else {
      check('microphone analysis stays usable while the mini feature is hidden', $('microphone').getAttribute('aria-pressed') === 'true' && !$('record-pitch').disabled);
    }
    check('viewport has no horizontal or vertical scroll surface', doc.documentElement.scrollWidth === doc.documentElement.clientWidth && doc.documentElement.scrollHeight === doc.documentElement.clientHeight);
  } catch (error) { check(error.message, false); }
  finally {
    win.dispatchEvent(new win.Event('pagehide')); win.navigator.mediaDevices.getUserMedia = original;
    if (source) await source.context.close();
    miniSummary.textContent = `${count - failures}/${count} passed; ${failures} failed. ${desktop ? 'Desktop' : 'Mobile/narrow'} viewport. Synthetic audio only.`;
    miniRun.disabled = false;
  }
});
