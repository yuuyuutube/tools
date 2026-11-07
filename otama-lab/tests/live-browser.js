const liveFrame = document.getElementById('live');
const run = document.getElementById('run');
const results = document.getElementById('results');
const summary = document.getElementById('summary');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label, timeout = 5000) {
  const start = performance.now();
  while (!predicate()) { if (performance.now() - start > timeout) throw new Error(`Timeout: ${label}`); await pause(40); }
}
if (liveFrame.contentDocument?.readyState === 'complete') run.disabled = false;
else liveFrame.addEventListener('load', () => { run.disabled = false; }, { once: true });
run.addEventListener('click', async () => {
  run.disabled = true; results.replaceChildren(); let failures = 0, count = 0;
  const check = (label, condition) => {
    const item = document.createElement('li'); item.className = condition ? 'pass' : 'fail';
    item.textContent = `${condition ? 'PASS' : 'FAIL'}: ${label}`; results.append(item); count++; if (!condition) failures++;
  };
  const win = liveFrame.contentWindow, doc = liveFrame.contentDocument;
  const $ = id => doc.getElementById(id);
  const original = win.navigator.mediaDevices.getUserMedia;
  let stimulus, stream, requests = 0, delayed, reject = false;
  const sources = [];
  const makeStream = async () => {
    const context = new (win.AudioContext || win.webkitAudioContext)(); sources.push(context);
    const oscillator = context.createOscillator(), gain = context.createGain(), destination = context.createMediaStreamDestination();
    gain.gain.value = .15; oscillator.frequency.value = 440;
    oscillator.connect(gain); gain.connect(destination); oscillator.start(); await context.resume();
    stimulus = { context, oscillator, gain }; stream = destination.stream;
    return stream;
  };
  win.navigator.mediaDevices.getUserMedia = async constraints => {
    requests++;
    check('capture requests audio only with music-friendly preferred constraints', constraints.video === false && constraints.audio.echoCancellation === false && constraints.audio.noiseSuppression === false && constraints.audio.autoGainControl === false);
    if (reject) throw new win.DOMException('test denied', 'NotAllowedError');
    if (delayed) return new Promise(resolve => { delayed = resolve; });
    return makeStream();
  };
  try {
    check('no automatic microphone capture on load', requests === 0 && $('microphone').getAttribute('aria-pressed') === 'false');
    check('empty initial timeline contains no invented measurements', !doc.querySelector('.timeline-trace path') && !$('timeline-empty').hidden);
    check('no horizontal overflow at current viewport', doc.documentElement.scrollWidth === doc.documentElement.clientWidth);
    check('controls disable selection and use SVG icons', win.getComputedStyle($('microphone')).userSelect === 'none' && !!$('microphone').querySelector('svg'));
    $('microphone').click();
    await until(() => Math.abs(parseFloat($('live-hz').textContent) - 440) < 1, '440 Hz');
    check('real Web Audio signal passes through real Worker into Hz readout', Math.abs(parseFloat($('live-hz').textContent) - 440) < 1);
    check('nearest note and cents agree with detected frequency', $('live-note').textContent === 'A4' && Math.abs(parseInt($('live-cents').textContent)) <= 1);
    check('microphone state and character respond to signal', $('microphone').getAttribute('aria-pressed') === 'true' && $('live-face').classList.contains('playing'));
    check('confidence reflects periodic signal', parseInt($('live-confidence').textContent) >= 95);
    await until(() => $('live-stability').textContent === '穩定', 'stable pitch');
    check('steady pitch becomes stable after observation window', true);
    await until(() => !!doc.querySelector('.timeline-trace path'), 'timeline path');
    check('timeline plots continuous detected samples', !!doc.querySelector('.timeline-trace path'));
    stimulus.oscillator.detune.value = 37;
    await until(() => Math.abs(parseInt($('live-cents').textContent) - 37) <= 1, 'non-standard pitch');
    check('off-note input is preserved instead of snapped', Math.abs(parseFloat($('live-hz').textContent) - 440 * 2 ** (37 / 1200)) < 1 && $('live-note').textContent === 'A4');
    check('tuner follows signed cents', Math.abs(parseFloat($('live-needle').style.left) - 87) <= 1);
    stimulus.oscillator.detune.value = 0; stimulus.oscillator.frequency.value = 82.41;
    await until(() => Math.abs(parseFloat($('live-hz').textContent) - 82.41) < 1, 'low pitch');
    check('real input is not limited to virtual G3–D6 range', $('live-note').textContent === 'E2');
    stimulus.oscillator.frequency.value = 1900;
    await until(() => Math.abs(parseFloat($('live-hz').textContent) - 1900) < 4, 'high pitch');
    check('four-digit high-frequency readout does not overflow', $('live-hz').closest('.readouts').scrollWidth <= $('live-hz').closest('.readouts').clientWidth && doc.documentElement.scrollWidth === doc.documentElement.clientWidth);
    stimulus.oscillator.frequency.value = 440;
    await until(() => Math.abs(parseFloat($('live-hz').textContent) - 440) < 1, 'pitch reset');
    stimulus.oscillator.frequency.setTargetAtTime(660, stimulus.context.currentTime, .2);
    await until(() => parseFloat($('live-hz').textContent) > 650, 'glissando');
    check('glissando changes timeline pitch continuously', doc.querySelector('.timeline-trace path').getAttribute('d').includes('L'));
    stimulus.oscillator.frequency.cancelScheduledValues(0);
    stimulus.oscillator.frequency.setValueAtTime(440, stimulus.context.currentTime);
    await until(() => Math.abs(parseFloat($('live-hz').textContent) - 440) < 1, 'vibrato carrier');
    const vibrato = stimulus.context.createOscillator(), depth = stimulus.context.createGain();
    vibrato.frequency.value = 5; depth.gain.value = 35;
    vibrato.connect(depth); depth.connect(stimulus.oscillator.detune); vibrato.start();
    await pause(200); // Let the 85–93 ms analysis window contain only the new carrier.
    const observed = [];
    for (let i = 0; i < 16; i++) { await pause(50); observed.push(parseFloat($('live-hz').textContent)); }
    vibrato.stop(); depth.disconnect();
    check(`5 Hz vibrato stays continuous with measurable pitch movement (${Math.min(...observed).toFixed(1)}–${Math.max(...observed).toFixed(1)} Hz)`, Math.min(...observed) > 420 && Math.max(...observed) < 460 && Math.max(...observed) - Math.min(...observed) > 7);
    check('vibrato is movement, not low signal quality', $('live-stability').textContent === '變動中' && parseInt($('live-confidence').textContent) >= 90);
    stimulus.gain.gain.value = 0;
    await until(() => $('live-hz').textContent === '—', 'silence');
    check('silence clears note, cents, confidence, needle and face', $('live-note').textContent === '—' && $('live-cents').textContent === '— cents' && $('live-confidence').textContent === '—' && $('live-needle').hidden && !$('live-face').classList.contains('playing'));
    $('clear-history').click();
    check('clear removes previous pitch without stopping microphone', !doc.querySelector('.timeline-trace path') && !$('timeline-empty').hidden && $('microphone').getAttribute('aria-pressed') === 'true');
    stimulus.gain.gain.value = .15;
    await until(() => $('live-hz').textContent !== '—', 'signal returns');
    const liveTrack = stream.getAudioTracks()[0];
    $('microphone').click();
    check('stop releases captured track immediately', liveTrack.readyState === 'ended');
    check('stop resets readouts and control state', $('live-hz').textContent === '—' && $('microphone').getAttribute('aria-pressed') === 'false');
    reject = true; $('microphone').click();
    await until(() => $('microphone').dataset.state === 'error', 'permission denial');
    check('permission denial has an actionable in-page message', $('mic-status').textContent.includes('權限') && $('mic-label').textContent === '開啟麥克風');
    reject = false; delayed = true; $('microphone').click();
    await until(() => typeof delayed === 'function', 'pending permission');
    check('pending request is cancellable', $('mic-label').textContent === '取消啟動');
    $('microphone').click(); const lateResolve = delayed; delayed = false;
    const lateStream = await makeStream(); lateResolve(lateStream); await pause(100);
    check('late permission response after cancel stops its track', lateStream.getAudioTracks()[0].readyState === 'ended' && $('microphone').getAttribute('aria-pressed') === 'false');
    $('microphone').click();
    await until(() => $('microphone').getAttribute('aria-pressed') === 'true', 'retry');
    check('fresh gesture can restart after cancellation and denial', true);
    win.dispatchEvent(new win.Event('pagehide'));
    check('leaving page stops captured tracks', stream.getAudioTracks()[0].readyState === 'ended');
    check('page retains no horizontal overflow after detection', doc.documentElement.scrollWidth === doc.documentElement.clientWidth);
  } catch (error) { check(error.message, false); }
  finally {
    win.dispatchEvent(new win.Event('pagehide'));
    win.navigator.mediaDevices.getUserMedia = original;
    for (const context of sources) await context.close();
    summary.textContent = `${count - failures}/${count} passed; ${failures} failed. Native synthetic MediaStream only; no physical microphone tested.`;
    run.disabled = false;
  }
});
