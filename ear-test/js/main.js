/* 測試流程：首頁 → 音量確認 → 掃頻 → 細修 → 海報 */
import { CONFIG } from './config.js';
import * as audio from './audio.js';
import { toP, toF, clampF, stageAt, fmt, setMax, maxHz } from './freq.js';
import { animalSVG, flagSVG, ANIMALS } from './art.js';
import { icon } from './icons.js';
import { ageFor } from './age.js';
import { drawPoster, toBlob, sharePoster, downloadPoster } from './poster.js';

const $ = s => document.querySelector(s);
const screens = ['home', 'ready', 'test', 'tune', 'result'];
let screen = 'home';

/* ---------- 共用 ---------- */
document.querySelectorAll('[data-i]').forEach(el => { el.outerHTML = icon(el.dataset.i, 20); });
document.querySelectorAll('.fl').forEach(el => { el.outerHTML = flagSVG({ size: 34, color: '#F5F3EE', cloth: '#F5F3EE' }); });
const setIcon = (btn, name, size = 22) => { btn.innerHTML = icon(name, size); };
setIcon($('#home-btn'), 'back');
setIcon($('#restart'), 'replay');
setIcon($('#down'), 'left', 26); setIcon($('#up'), 'right', 26);
setIcon($('#share'), 'share'); setIcon($('#save'), 'download'); setIcon($('#again'), 'replay');

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg; t.classList.add('on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 2400);
}
const say = msg => { $('#sr').textContent = ''; requestAnimationFrame(() => { $('#sr').textContent = msg; }); };

function show(id) {
  screen = id;
  for (const s of screens) {
    const el = document.getElementById(s);
    if (s === id) { el.hidden = false; el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
    else el.hidden = true;
  }
  $('#home-btn').hidden = id === 'home';
  $('#tools').hidden = !(id === 'test' || id === 'tune');
  $('#pause').hidden = id !== 'test';
}

function fillStage(el, ids) {
  el.insertAdjacentHTML('beforeend', ids.map(id => animalSVG(id)).join(''));
}
function setStage(el, id) {
  for (const a of el.querySelectorAll('.animal')) a.classList.toggle('on', a.classList.contains('a-' + id));
}

async function ensureAudio() {
  const ok = await audio.unlock();
  if (!ok) toast('聲音沒有啟動，請再按一次');
  return ok;
}

/* ---------- 首頁 ---------- */
$('.parade').innerHTML = ANIMALS.map((id, i) => animalSVG(id)).join('');
$('.parade').querySelectorAll('.animal').forEach((a, i) => {
  const s = 1 - i * 0.085;                                  // 由大到小：低頻到高頻
  a.style.width = (s / 5.215 * 112) + '%';                  // 七隻加起來剛好排滿一行
  a.style.animationDelay = (i * 60) + 'ms';
});

$('#go').addEventListener('click', async () => {
  if (!(await ensureAudio())) return;
  setMax(Math.min(CONFIG.F_MAX, Math.floor(audio.nyquist() * CONFIG.NYQUIST_MARGIN)));
  show('ready');
  refPlay(true);
});

/* ---------- 音量確認 ---------- */
const refStage = $('#ready .stage');
fillStage(refStage, [stageAt(CONFIG.REF_HZ)]);
setStage(refStage, stageAt(CONFIG.REF_HZ));
$('#refHz').textContent = fmt(CONFIG.REF_HZ);
let refOn = false;
function refPlay(on) {
  refOn = on;
  if (on) audio.pulse(CONFIG.REF_HZ); else audio.stop();
  $('#ready').classList.toggle('playing', on);
  setIcon($('#refToggle'), on ? 'stop' : 'volMid');
}
$('#refToggle').addEventListener('click', async () => {
  if (!refOn && !(await ensureAudio())) return;
  refPlay(!refOn);
});
$('#refOk').addEventListener('click', async () => {
  refPlay(false);
  if (!(await ensureAudio())) return;
  show('test');
  startSweep(CONFIG.F_MIN);
});

/* ---------- 掃頻 ---------- */
const testStage = $('#test .stage');
fillStage(testStage, ANIMALS);
let sweepState = 'idle';   // run | pause | end
let raf = 0, lastStage = '';

function paintSweep(f) {
  $('#sweepHz').textContent = fmt(f);
  $('#sweepBar').style.width = (toP(f) * 100).toFixed(2) + '%';
  const st = stageAt(f);
  if (st !== lastStage) { lastStage = st; setStage(testStage, st); }
}
function loop() {
  paintSweep(audio.sweepHz());
  if (sweepState === 'run') raf = requestAnimationFrame(loop);
}
function startSweep(from) {
  cancelAnimationFrame(raf);
  const rest = CONFIG.SWEEP_SEC * (1 - toP(from));
  if (rest < 0.2) return endSweep();
  audio.startSweep(from, maxHz(), rest, endSweep);
  sweepState = 'run';
  $('#toEnd').hidden = true;
  $('#test').classList.remove('ended');
  setIcon($('#pause'), 'pause'); $('#pause').setAttribute('aria-label', '暫停');
  loop();
}
function pauseSweep() {
  if (sweepState !== 'run') return;
  audio.stop();
  sweepState = 'pause';
  cancelAnimationFrame(raf);
  paintSweep(audio.sweepHz());
  setIcon($('#pause'), 'play'); $('#pause').setAttribute('aria-label', '繼續');
  $('#pause').classList.add('hot');
}
function endSweep() {
  sweepState = 'end';
  cancelAnimationFrame(raf);
  paintSweep(maxHz());
  $('#toEnd').hidden = false;
  setIcon($('#pause'), 'play'); $('#pause').setAttribute('aria-label', '從頭開始');
  say('已到達測試上限');
}

$('#pause').addEventListener('click', async () => {
  $('#pause').classList.remove('hot');
  if (sweepState === 'run') return pauseSweep();
  if (!(await ensureAudio())) return;
  startSweep(sweepState === 'pause' ? audio.sweepHz() : CONFIG.F_MIN);
});
$('#restart').addEventListener('click', async () => {
  audio.stop(); stopProbe();
  $('#pause').classList.remove('hot');
  if (!(await ensureAudio())) return;
  if (screen !== 'test') show('test');
  lastStage = '';
  startSweep(CONFIG.F_MIN);
});

let leaving = false;
$('#surrender').addEventListener('click', () => {
  if (leaving || screen !== 'test') return;
  const f = sweepState === 'end' ? maxHz() : audio.sweepHz();
  audio.stop();
  sweepState = 'idle';
  cancelAnimationFrame(raf);
  paintSweep(f);
  const btn = $('#surrender');
  btn.classList.remove('waved'); void btn.offsetWidth; btn.classList.add('waved');
  leaving = true;
  setTimeout(() => { leaving = false; enterTune(f); }, 420);
});
$('#toEnd').addEventListener('click', () => {
  audio.stop(); sweepState = 'idle';
  showResult(maxHz(), true);
});

/* ---------- 細修 ---------- */
const tuneStage = $('#tune .stage');
fillStage(tuneStage, ANIMALS);
const slider = $('#slider');
const T = { f: 1000, lo: null, hi: null, fine: false, playing: false };
const round = f => Math.round(f / CONFIG.STEP_FINE) * CONFIG.STEP_FINE;

function enterTune(f) {
  T.f = clampF(round(f)); T.lo = null; T.hi = null;
  show('tune');
  renderTune();
}
function renderTune() {
  $('#tuneHz').textContent = fmt(T.f);
  slider.querySelector('.thumb').style.left = (toP(T.f) * 100) + '%';
  const lo = slider.querySelector('.lo'), hi = slider.querySelector('.hi');
  lo.hidden = T.lo == null; hi.hidden = T.hi == null;
  if (T.lo != null) lo.style.left = (toP(T.lo) * 100) + '%';
  if (T.hi != null) hi.style.left = (toP(T.hi) * 100) + '%';
  slider.setAttribute('aria-valuemin', CONFIG.F_MIN);
  slider.setAttribute('aria-valuemax', Math.round(maxHz()));
  slider.setAttribute('aria-valuenow', T.f);
  slider.setAttribute('aria-valuetext', fmt(T.f) + ' Hz');
  setStage(tuneStage, stageAt(T.f));
}
function setF(f, animate = false) {
  const nf = clampF(round(f));
  if (nf === T.f) return;
  stopProbe();
  slider.classList.toggle('anim', animate);
  T.f = nf;
  renderTune();
}

function setProbeIcon() {
  setIcon($('#probe'), T.playing ? 'stop' : 'play', 24);
  $('#probe').setAttribute('aria-label', T.playing ? '停止' : '播放這個頻率');
}
function stopProbe() {
  if (T.playing) { audio.stop(); T.playing = false; setProbeIcon(); }
}
async function playProbe() {
  if (!(await ensureAudio())) return;
  T.playing = true; setProbeIcon();
  audio.tone(T.f, CONFIG.PROBE_SEC, () => { T.playing = false; setProbeIcon(); });
}
setProbeIcon();
$('#probe').addEventListener('click', () => (T.playing ? stopProbe() : playProbe()));

const step = () => (T.fine ? CONFIG.STEP_FINE : CONFIG.STEP);
$('#fine').addEventListener('click', () => {
  T.fine = !T.fine;
  $('#fine').textContent = '±' + step();
  $('#fine').setAttribute('aria-pressed', T.fine);
});

/* 左右微調：按住會連續移動（滑鼠與觸控都一樣），鍵盤按 Enter／空白鍵一次一格 */
function holdRepeat(btn, dir) {
  let t1 = 0, t2 = 0;
  const end = () => { clearTimeout(t1); clearInterval(t2); };
  btn.addEventListener('pointerdown', e => {
    if (e.button !== 0) return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    setF(T.f + dir * step());
    t1 = setTimeout(() => { t2 = setInterval(() => setF(T.f + dir * step()), 70); }, 420);
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(ev => btn.addEventListener(ev, end));
  btn.addEventListener('click', e => { if (e.detail === 0) setF(T.f + dir * step()); });
}
holdRepeat($('#down'), -1);
holdRepeat($('#up'), 1);

/* 滑桿：拖曳時不發聲 */
slider.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  e.preventDefault();
  slider.setPointerCapture(e.pointerId);
  slider.classList.add('drag');
  const at = ev => {
    const r = slider.getBoundingClientRect();
    setF(toF(Math.min(1, Math.max(0, (ev.clientX - r.left) / r.width))));
  };
  at(e);
  const move = ev => at(ev);
  const up = () => {
    slider.classList.remove('drag');
    slider.removeEventListener('pointermove', move);
    slider.removeEventListener('pointerup', up);
    slider.removeEventListener('pointercancel', up);
  };
  slider.addEventListener('pointermove', move);
  slider.addEventListener('pointerup', up);
  slider.addEventListener('pointercancel', up);
});

/* A/B 比較：每回答一次就往中間逼近，並自動播下一個點 */
function answer(heard) {
  const f = T.f;
  if (heard) { T.lo = f; if (T.hi != null && T.hi <= f) T.hi = null; }
  else { T.hi = f; if (T.lo != null && T.lo >= f) T.lo = null; }
  let next;
  if (T.lo != null && T.hi != null) {
    if (T.hi - T.lo <= CONFIG.AB_DONE) {
      setF(T.lo, true); renderTune();
      say(fmt(T.lo) + ' Hz');
      const c = $('#confirm'); c.classList.remove('waved'); void c.offsetWidth; c.classList.add('waved');
      return;
    }
    next = Math.sqrt(T.lo * T.hi);
  } else next = heard ? f * CONFIG.AB_FIRST : f / CONFIG.AB_FIRST;
  next = clampF(round(next));
  if (next === f) { renderTune(); return; }    // 已在上限或下限
  setF(next, true); renderTune();
  playProbe();
}
$('#heard').addEventListener('click', () => answer(true));
$('#unheard').addEventListener('click', () => answer(false));

$('#confirm').addEventListener('click', () => {
  stopProbe();
  showResult(T.f, T.f >= maxHz() - 1);
});

/* ---------- 結果 ---------- */
let blob = null, blobURL = '';
async function showResult(hz, isLimit) {
  const a = ageFor(hz, isLimit);
  const r = { hz, isLimit, age: a.age, line: a.line, animal: isLimit ? 'mosquito' : stageAt(hz) };
  show('result');
  const img = $('#posterImg');
  img.classList.remove('in');
  blob = null;
  $('#share').disabled = $('#save').disabled = true;
  try {
    const canvas = await drawPoster(r);
    blob = await toBlob(canvas);
    if (!blob) throw new Error('blob');
    if (blobURL) URL.revokeObjectURL(blobURL);
    blobURL = URL.createObjectURL(blob);
    img.src = blobURL;
    await img.decode().catch(() => {});
    img.alt = `耳朵年齡機：${r.age}，${fmt(hz)} Hz，${r.line}`;
    img.classList.add('in');
    $('#share').disabled = $('#save').disabled = false;
  } catch (e) {
    toast('海報沒有畫出來，請再試一次');
  }
}
$('#share').addEventListener('click', async () => {
  if (!blob) return;
  const res = await sharePoster(blob);
  if (res === 'downloaded') toast('已下載圖片');
});
$('#save').addEventListener('click', () => { if (blob) downloadPoster(blob); });
$('#again').addEventListener('click', async () => {
  if (!(await ensureAudio())) return;
  show('test');
  lastStage = '';
  startSweep(CONFIG.F_MIN);
});

/* ---------- 回首頁 ---------- */
$('#home-btn').addEventListener('click', () => {
  audio.stop(); refPlay(false); stopProbe();
  sweepState = 'idle'; cancelAnimationFrame(raf);
  show('home');
});

/* ---------- 鍵盤 ---------- */
document.addEventListener('keydown', e => {
  const free = e.target === document.body || e.target === slider;
  if (screen === 'test' && free && (e.key === ' ' || e.key === 'Enter')) {
    e.preventDefault(); $('#surrender').click();
  }
  if (screen === 'tune') {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = (e.key === 'ArrowLeft' || e.key === 'ArrowDown') ? -1 : 1;
      setF(T.f + dir * (e.shiftKey ? CONFIG.STEP_FINE : step()));
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      e.preventDefault(); setF(T.f + (e.key === 'PageUp' ? 1000 : -1000));
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault(); setF(e.key === 'Home' ? CONFIG.F_MIN : maxHz());
    } else if (e.key === ' ' && free) {
      e.preventDefault(); T.playing ? stopProbe() : playProbe();
    }
  }
});

/* ---------- 離開頁面：一律停聲 ---------- */
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  if (screen === 'test') pauseSweep();
  if (screen === 'ready' && refOn) refPlay(false);
  stopProbe();
  audio.stop();
});
window.addEventListener('pagehide', () => audio.stop());

show('home');
