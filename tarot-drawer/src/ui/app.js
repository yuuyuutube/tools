// 畫面與流程：IDLE → SHUFFLING → SPREADING → SELECTING → REVEALING → RESULT
// 抽牌結果全部來自 engine/draw.js 的 session；這裡只負責把它演出來，動畫不會再擲任何一次骰子。
import { SPREADS, SPREAD_INFO, DEFAULTS, MOTION, EASE } from '../config.js';
import { actOf, elementOf, ELEMENTS, elementIcon, relationsOf, moonPhaseIndex, CLOSING } from '../data/pro.js';
import { CARDS, CARD_IDS, cardById, keywordsOf } from '../data/cards.js';
import { createSession } from '../engine/draw.js';
import { faceSVG, BACKS, BACK_NAMES, offsetsFromSeed, svgDataURL } from '../art/frame.js';
import { stampForBack } from '../poster/stamps.js';
import { posterBlob, savePoster } from '../poster/poster.js';
import { sfx, soundOn, setSound } from '../audio/sound.js';
import { SWIPE, swipeCardDelta, fanFocusPosition, wheelCardDelta } from './fan-input.js';
import { revealWindow } from './window-reveal.js';

const $ = s => document.querySelector(s);
const app = $('#app'), stage = $('#stage'), pile = $('#pile'), board = $('#board'), cols = $('#cols'), detail = $('#detail');
const live = $('#live'), toastEl = $('#toast');
const N = CARDS.length;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const ms = t => reduced.matches ? 0 : t;
const wait = t => new Promise(r => setTimeout(r, ms(t)));

// ---------------- 狀態 ----------------
let state = 'idle';
let run = 0;            // 每次開始／取消一段流程就 +1；還在等動畫的舊流程醒來後發現號碼不對就自己結束
let session = null;     // 這一次抽牌（洗好的牌堆與已抽到的牌）
let result = null;      // 揭曉後的結果，海報也用它
let fan = [];           // 還在牌扇上的牌，由左到右；fan[j] 對應牌堆裡的 deckIndex
let focus = -1;         // 牌扇上被抬起來的那張
let pos = 0;            // 牌扇捲動位置：哪一張在正中央（可以是小數）
let active = 0;         // 三張結果裡，手機上正在看的那張
let kbd = false;        // 最近一次操作是不是鍵盤
let saving = false;
let M = null, G = null; // 版面尺寸、牌扇幾何

const settings = { ...DEFAULTS };
let returning = false;   // 以前來過（有存過設定）的人，歡迎詞改成「歡迎回來」
try { returning = localStorage.getItem('tarot-settings') !== null; } catch { /* 沒有紀錄 */ }
try { Object.assign(settings, JSON.parse(localStorage.getItem('tarot-settings') || '{}')); } catch { /* 用預設值 */ }
settings.reversals = !!settings.reversals;
settings.pro = !!settings.pro;
// 張數與牌陣要對得上；一般模式只有單張與兩種三張牌陣
function normalizeSettings() {
  if (!SPREADS[settings.spread]) settings.spread = DEFAULTS.spread;
  if (!settings.pro && SPREAD_INFO[settings.spread].pro) settings.spread = DEFAULTS.spread;
  if (settings.count !== 1) settings.count = SPREADS[settings.spread].length;
}
normalizeSettings();
const labelsOf = s => s.count > 1 ? SPREADS[s.spread] : [null];
const spreadName = () => settings.count === 1 ? SPREAD_INFO.single.name : SPREAD_INFO[settings.spread].name;

function setState(s) {
  state = s;
  app.dataset.state = s;
  $('#back').hidden = s === 'idle';
}
const say = text => { live.textContent = ''; requestAnimationFrame(() => { live.textContent = text; }); };

// ---------------- 牌 ----------------
// 牌背輪換：每次回到牌堆（打開網頁、再抽一次、中途返回）就換下一款。
// 第一次來從隨機一款開始，之後依序輪流並記在瀏覽器裡，所以連續兩次不會一樣、每一款都會輪到。
let backIndex = -1;
try { backIndex = parseInt(localStorage.getItem('tarot-back'), 10); } catch { /* 沒有紀錄 */ }
if (!(backIndex >= 0 && backIndex < BACKS.length)) backIndex = Math.floor(Math.random() * BACKS.length) - 1;
let backReady = false;
function nextBack() {
  backIndex = (backIndex + 1) % BACKS.length;
  try { localStorage.setItem('tarot-back', backIndex); } catch { /* 存不了就只換這一次 */ }
  const url = BACKS[backIndex], set = () => { if (url === BACKS[backIndex]) stage.style.setProperty('--back', `url("${url}")`); };
  if (!backReady) { backReady = true; set(); return; }       // 第一次直接用，牌背底色會先墊著
  const img = new Image();                                   // 之後先載好再換，收牌時不會閃一下空白
  img.onload = img.onerror = set;
  img.src = url;
}
const cards = Array.from({ length: N }, () => {
  const el = document.createElement('div');
  el.className = 'card';
  el.setAttribute('role', 'button');
  el.setAttribute('aria-hidden', 'true');
  el.tabIndex = -1;
  el.innerHTML = '<div class="flip"><div class="back"></div><div class="face"></div></div>';
  stage.append(el);
  return { el, face: el.querySelector('.face'), pose: { x: 0, y: 0, r: 0, s: 1 }, w: 0, deckIndex: -1, drawn: null, slot: -1, anim: null };
});
const cardOf = el => cards.find(c => c.el === el);
let order = cards.slice();   // 牌堆由下到上的順序（只是畫面，與抽牌結果無關）

function place(cd, pose, o = {}) {
  cd.pose = pose;
  const d = ms(o.dur || 0), dl = ms(o.delay || 0);
  let t = d ? `transform ${d}ms ${o.ease || EASE.out} ${dl}ms` : 'transform 0s';
  if (o.fade) t += `, opacity ${ms(260)}ms ease ${dl}ms`;
  cd.el.style.transition = t + ', translate .25s cubic-bezier(.2,1.2,.4,1)';
  cd.el.style.transform = `translate(${pose.x.toFixed(2)}px,${pose.y.toFixed(2)}px) rotate(${pose.r.toFixed(2)}deg) scale(${(pose.s ?? 1).toFixed(4)})`;
}

// 固定的小亂數：牌堆裡每張牌歪一點點。純裝飾，所以不用抽牌的亂數來源
const jit = i => { const s = Math.sin(i * 12.9898) * 43758.5453; return s - Math.floor(s) - .5; };
const pilePose = k => ({ x: jit(k) * 3, y: M.pileY - k * .5, r: jit(k + 40) * 3.4, s: 1 });

function measure() {
  const W = stage.clientWidth, H = stage.clientHeight, mobile = W < 700;
  const topPad = mobile ? 58 : 68, bottomPad = 200;
  const avail = H - topPad - bottomPad - 36;
  const cw = Math.round(clamp(Math.min(mobile ? W * .31 : H * .2, avail * .6), 64, 150));
  M = { W, H, mobile, cw, ch: cw * 5 / 3, topPad, pileY: Math.round((topPad - bottomPad) / 2) };
  stage.style.setProperty('--cw', cw + 'px');
  pile.style.transform = `translateY(${M.pileY}px)`;
  for (const cd of cards) if (!cd.drawn) cd.w = cw;
}

function markTop() {
  order.forEach((cd, k) => {
    cd.el.classList.toggle('top1', k === N - 1);
    cd.el.classList.toggle('top3', k === N - 2 || k === N - 3);
  });
}

function resetCard(cd) {
  const el = cd.el;
  if (cd.w !== M.cw) {          // 放大過的牌：先換回原本的尺寸（用 scale 補上，畫面不會跳）
    const s = cd.w / M.cw;
    el.style.removeProperty('--cw');
    cd.w = M.cw;
    place(cd, { ...cd.pose, s });
    void el.offsetWidth;
  }
  cd.anim?.cancel(); cd.anim = null;
  el.classList.remove('drawn', 'flipped', 'printing', 'gone', 'tap');
  cd.cancelWindowReveal?.(); cd.cancelWindowReveal = null;
  el.style.removeProperty('--face-reveal-start');
  cd.faceReady = null;
  el.tabIndex = -1;
  el.setAttribute('aria-hidden', 'true');
  el.removeAttribute('aria-label');
  cd.drawn = null; cd.slot = -1; cd.deckIndex = -1;
}

// ---------------- IDLE ----------------
function toIdle(animate = true) {
  run++;
  nextBack();
  cancelAnimationFrame(raf); raf = 0; drag = null;
  session = null; result = null; fan = []; focus = -1; saving = false;
  $('#save').classList.remove('busy');
  setState('idle');
  board.hidden = true;
  measure();
  order.forEach((cd, k) => {
    resetCard(cd);
    cd.el.style.zIndex = k;
    place(cd, pilePose(k), animate ? { dur: MOTION.gather, ease: EASE.out, delay: k * 6 } : {});
  });
  markTop();
}

// ---------------- SHUFFLING → SPREADING ----------------
async function start() {
  if (state !== 'idle') return;
  const my = ++run;
  setState('shuffling');
  // 洗牌在資料層完成：此刻整副牌的順序與每張牌的正逆位就已經決定，接下來的動畫只是演出
  session = createSession(CARD_IDS, settings);
  session.pro = settings.pro;
  session.offsets = offsetsFromSeed(session.seed);
  for (const cd of cards) { cd.face.innerHTML = ''; cd.face.classList.remove('rev'); cd.el.classList.remove('top1', 'top3'); }
  sfx.shuffle(MOTION.shuffleRounds);

  const half = N / 2;
  for (let rd = 0; rd < MOTION.shuffleRounds; rd++) {
    const left = order.slice(0, half), right = order.slice(half);
    left.forEach((cd, j) => place(cd, { x: -M.cw * .64, y: M.pileY - j * .5, r: -5 + jit(j + rd * 9) * 3, s: 1 }, { dur: MOTION.shuffleOut, delay: j * 3 }));
    right.forEach((cd, j) => place(cd, { x: M.cw * .64, y: M.pileY - j * .5, r: 5 + jit(j + rd * 9 + 20) * 3, s: 1 }, { dur: MOTION.shuffleOut, delay: j * 3 }));
    await wait(MOTION.shuffleOut + 70);
    if (my !== run) return;
    order = left.flatMap((cd, j) => [cd, right[j]]);      // 左右交錯疊回去
    order.forEach((cd, k) => { cd.el.style.zIndex = k; place(cd, pilePose(k), { dur: MOTION.shuffleIn, ease: EASE.back, delay: k * 9 }); });
    await wait(MOTION.shuffleIn + N * 9 + 30);
    if (my !== run) return;
  }

  setState('spreading');
  buildBoard();
  fan = order.slice();
  fan.forEach((cd, j) => { cd.deckIndex = j; cd.el.style.zIndex = j; });
  fanGeom();
  pos = (fan.length - 1) / 2;
  focus = G.scroll ? Math.round(pos) : -1;
  sfx.spread();
  fan.forEach((cd, j) => place(cd, fanPose(j), { dur: MOTION.spread, delay: j * MOTION.spreadStagger }));
  await wait(MOTION.spread + N * MOTION.spreadStagger);
  if (my !== run) return;

  setState('selecting');
  fan.forEach(cd => cd.el.removeAttribute('aria-hidden'));
  labelFan();
  announcePick();
  if (kbd) setFocus(Math.round((fan.length - 1) / 2), true);
}

// ---------------- 牌陣（上方的空位與結果文字） ----------------
function buildBoard() {
  const labels = labelsOf(session);
  // 月相牌陣：標出今天最接近的月相位置
  const today = session.spread === 'moon' && session.count === 4 ? moonPhaseIndex(new Date()) : -1;
  cols.innerHTML = labels.map((l, i) =>
    `<div class="col${i === 0 ? ' next' : ''}${i === today ? ' today' : ''}">${l ? `<div class="pos"><b>${i + 1}</b>${l.zh}${l.hint ? `<i>${l.hint}</i>` : ''}</div>` : ''}<div class="slot"></div><div class="meta"></div></div>`).join('');
  detail.innerHTML = ''; detail.classList.remove('shown');
  board.dataset.count = session.count;
  board.toggleAttribute('data-multi', session.count > 1);
  board.toggleAttribute('data-pro', !!session.pro);
  board.style.setProperty('--n', session.count);
  $('#rel').hidden = true;
  board.dataset.phase = 'picking';
  board.hidden = false;
}

function slotRect(k) {
  const r = cols.children[k].querySelector('.slot').getBoundingClientRect(), s = stage.getBoundingClientRect();
  return { x: r.left + r.width / 2 - (s.left + s.width / 2), y: r.top + r.height / 2 - (s.top + s.height / 2), w: r.width };
}
// 飛到空位：飛行途中用 scale，落定後換成真正的尺寸（settle），牌面才會是清晰的
function fly(cd, dur, ease) {
  const t = slotRect(cd.slot);
  place(cd, { x: t.x, y: t.y, r: 0, s: t.w / cd.w }, { dur, ease });
}
function settle(cd) {
  const t = slotRect(cd.slot);
  cd.w = t.w;
  cd.el.style.setProperty('--cw', t.w + 'px');
  place(cd, { x: t.x, y: t.y, r: 0, s: 1 });
}

// ---------------- 牌扇 ----------------
function fanGeom() {
  const { W, H, cw, ch } = M;
  const fit = (W * .9 - cw) / (N - 1);
  const scroll = fit < 34;                                 // 放不下就改成可以左右拖的牌扇（手機）
  const s = scroll ? Math.max(40, cw * .46) : Math.min(fit, cw * .4);
  const R = scroll ? Math.max(480, W * 1.5) : Math.max(900, W * 1.15);
  let top = M.topPad;
  if (session.count > 1) top = cols.getBoundingClientRect().bottom - stage.getBoundingClientRect().top + 8;
  const fy = Math.min((top + H) / 2 - H / 2 + ch * .04, H / 2 - ch / 2 - 44);
  G = { s, R, fy, scroll, lift: ch * .13 };
}
function fanPose(j) {
  const a = (j - pos) * G.s / G.R, sn = Math.sin(a), cs = Math.cos(a);
  const up = j === focus ? G.lift : 0;
  return { x: G.R * sn + sn * up, y: G.fy + G.R * (1 - cs) - cs * up, r: a * 180 / Math.PI, s: 1 };
}
function layoutFan(o) {
  fan.forEach((cd, j) => place(cd, fanPose(j), o));
  const tab = focus < 0 ? Math.round((fan.length - 1) / 2) : focus;
  fan.forEach((cd, j) => { cd.el.tabIndex = j === tab ? 0 : -1; });
}
function labelFan() {
  fan.forEach((cd, j) => cd.el.setAttribute('aria-label', `牌背，第 ${j + 1} 張，共 ${fan.length} 張`));
}
function setFocus(i, viaKeyboard, recenter = true) {
  if (i === focus && !viaKeyboard) return;
  focus = i;
  pos = fanFocusPosition(pos, i, G.scroll, recenter);
  layoutFan({ dur: MOTION.hover });
  if (viaKeyboard && fan[i]) fan[i].el.focus({ preventScroll: true });
}
function announcePick() {
  const k = session.drawn.length;
  say(session.count > 1 ? `選第 ${k + 1} 張牌：${labelsOf(session)[k].zh}` : '選一張牌');
}

// 拖曳與慣性（只有放不下的牌扇才會捲）
// 手指恢復 1.6 個牌距換一張；滑鼠按住拖曳較慢，放開即停。
let drag = null, raf = 0, suppressClick = false;
function fling(v) {
  cancelAnimationFrame(raf);
  v = clamp(v * SWIPE.fling, -SWIPE.maxV, SWIPE.maxV);
  if (reduced.matches || Math.abs(v) < .002) return;
  let last = performance.now();
  const step = t => {
    const dt = Math.min(32, t - last); last = t;
    pos += v * dt; v *= Math.pow(SWIPE.friction, dt);
    if (pos < 0 || pos > fan.length - 1) { pos = clamp(pos, 0, fan.length - 1); v = 0; }
    focus = Math.round(pos);
    layoutFan();
    raf = Math.abs(v) > .0012 && state === 'selecting' ? requestAnimationFrame(step) : 0;
  };
  raf = requestAnimationFrame(step);
}

stage.addEventListener('pointerdown', e => {
  kbd = false;
  if (state !== 'selecting' || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
  cancelAnimationFrame(raf); raf = 0;
  suppressClick = false;
  drag = { id: e.pointerId, pointerType: e.pointerType, x: e.clientX, pos0: pos, moved: false, lx: e.clientX, lt: e.timeStamp, v: 0 };
});
stage.addEventListener('pointermove', e => {
  if (state !== 'selecting') return;
  if (!drag) {
    if (e.pointerType === 'mouse') {                     // 滑鼠滑過：那張牌抬起來
      const cd = cardOf(e.target.closest?.('.card'));
      // Hover may lift a card, but must not recenter the mobile carousel.
      setFocus(cd && !cd.drawn ? fan.indexOf(cd) : (G.scroll ? focus : -1), false, false);
    }
    return;
  }
  if (e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x;
  if (!drag.moved && Math.abs(dx) > 8) {
    drag.moved = true;
    if (G.scroll) { try { stage.setPointerCapture(e.pointerId); } catch { /* 指標已經不在了 */ } }
  }
  if (drag.moved && G.scroll) {
    const dt = Math.max(1, e.timeStamp - drag.lt);
    drag.v = drag.v * .6 + (swipeCardDelta(e.clientX - drag.lx, G.s, drag.pointerType) / dt) * .4;
    drag.lx = e.clientX; drag.lt = e.timeStamp;
    pos = clamp(drag.pos0 + swipeCardDelta(dx, G.s, drag.pointerType), 0, fan.length - 1);
    focus = Math.round(pos);
    layoutFan();
  }
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  const d = drag; drag = null;
  if (d.moved && G?.scroll && state === 'selecting') {
    suppressClick = true;
    if (e.type === 'pointerup' && d.pointerType !== 'mouse' && e.timeStamp - d.lt < 80) fling(d.v);
  }
}
stage.addEventListener('pointerup', endDrag);
stage.addEventListener('pointercancel', endDrag);
stage.addEventListener('pointerleave', e => {
  if (state === 'selecting' && !drag && e.pointerType === 'mouse' && !G.scroll) setFocus(-1);
});

stage.addEventListener('wheel', e => {
  if (state !== 'selecting' || !G?.scroll || drag) return;
  const delta = wheelCardDelta(e, G.s, M.W);
  if (!delta) return;
  e.preventDefault();
  cancelAnimationFrame(raf); raf = 0;
  kbd = false;
  pos = clamp(pos + delta, 0, fan.length - 1);
  focus = Math.round(pos);
  layoutFan();
}, { passive: false });

stage.addEventListener('click', e => {
  const cd = cardOf(e.target.closest('.card'));
  if (!cd) return;
  if (state === 'selecting') {
    if (suppressClick) { suppressClick = false; return; }
    pick(cd);
  } else if (state === 'result' && cd.drawn) setActive(cd.slot);
});

stage.addEventListener('keydown', e => {
  const cd = cardOf(e.target.closest('.card'));
  if (!cd) return;
  const enter = e.key === 'Enter' || e.key === ' ';
  if (state === 'selecting' && !cd.drawn) {
    const n = fan.length;
    let i = fan.indexOf(cd);
    if (enter) { e.preventDefault(); pick(cd); return; }
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') i = Math.min(n - 1, i + 1);
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') i = Math.max(0, i - 1);
    else if (e.key === 'Home') i = 0;
    else if (e.key === 'End') i = n - 1;
    else return;
    e.preventDefault();
    setFocus(i, true);
  } else if (state === 'result' && cd.drawn && enter) { e.preventDefault(); setActive(cd.slot); }
});
stage.addEventListener('focusin', e => {
  if (state !== 'selecting' || !kbd) return;
  const i = fan.indexOf(cardOf(e.target.closest('.card')));
  if (i >= 0 && i !== focus) setFocus(i);
});

// ---------------- 選牌 ----------------
function pick(cd) {
  if (state !== 'selecting' || cd.drawn) return;
  const d = session.pick(cd.deckIndex);        // 這張牌背對應的就是牌堆裡的這一張
  if (!d) return;
  cancelAnimationFrame(raf); raf = 0;
  const idx = fan.indexOf(cd);
  fan.splice(idx, 1);
  cd.drawn = d; cd.slot = d.position;
  cd.el.classList.add('drawn');
  cd.el.style.zIndex = 100 + d.position;
  cd.el.tabIndex = -1;
  cd.el.setAttribute('aria-label', `第 ${d.position + 1} 張牌，尚未翻開`);
  cd.face.innerHTML = faceSVG(cardById(d.cardId), { offsets: session.offsets, printed: true });
  // Decode while the back is still showing, so the front never starts as a fade
  // from an unloaded illustration. The SVG and preload share the cached URL.
  const artImage = cd.face.querySelector('[data-card-layer="illustration"] image');
  const readyImage = new Image(); readyImage.src = artImage.getAttribute('href');
  cd.faceReady = readyImage.decode().catch(() => {});
  cd.face.classList.toggle('rev', d.orientation === 'reversed');
  sfx.slide();

  const col = cols.children[d.position];
  col.classList.remove('next'); col.classList.add('filled');

  if (session.done) { reveal(); return; }

  cols.children[d.position + 1]?.classList.add('next');
  fly(cd, MOTION.pick, EASE.soft);
  const my = run;
  setTimeout(() => { if (my === run && state === 'selecting' && cd.drawn) settle(cd); }, ms(MOTION.pick) + 30);
  // 牌扇補上缺口
  if (G.scroll) { if (idx < pos) pos -= 1; pos = clamp(pos, 0, fan.length - 1); focus = Math.round(pos); }
  else { pos = (fan.length - 1) / 2; focus = -1; }
  layoutFan({ dur: 320 });
  labelFan();
  announcePick();
  if (kbd) setFocus(Math.min(idx, fan.length - 1), true);
}

// ---------------- REVEALING → RESULT ----------------
const FLIP = [
  { transform: 'translateY(0) rotateY(0deg) scale(1)' },
  { transform: 'translateY(-6%) rotateY(86deg) scale(1.06)', offset: .44 },
  { transform: 'translateY(-2.5%) rotateY(187deg) scale(1.03)', offset: .8 },
  { transform: 'translateY(0) rotateY(180deg) scale(1)' },
];

const metaHTML = it => {
  const rev = it.orientation === 'reversed';
  return `<div class="no">${it.card.romanNumeral}</div><h2>${it.card.nameZh}</h2><div class="en">${it.card.nameEn.toUpperCase()}</div>` +
    `<div class="ori${rev ? ' rev' : ''}"><svg class="ic" aria-hidden="true"><use href="#${rev ? 'i-down' : 'i-up'}"/></svg>${rev ? '逆位' : '正位'}</div>` +
    `<p class="kw">${keywordsOf(it.card, it.orientation).map(k => `<span>${k}</span>`).join('')}</p>` +
    (it.pro ? proTags(it.card) : '');
};
// 專業模式：愚者之旅第幾幕、元素
const proTags = card => {
  const act = actOf(card.number), el = elementOf(card.number);
  return `<p class="tags"><span>${act.zh}・${act.name}</span><span>${elementIcon(el, 13)}${ELEMENTS[el].zh}</span></p>`;
};
const describe = it => `${it.label ? it.label.zh + '：' : ''}${it.card.nameZh}，${it.orientation === 'reversed' ? '逆位' : '正位'}。${keywordsOf(it.card, it.orientation).join('、')}`;

function setActive(k) {
  if (!result || result.cards.length < 2) return;
  active = k;
  [...cols.children].forEach((c, i) => c.classList.toggle('active', i === k));
  detail.innerHTML = metaHTML(result.cards[k]);
  if (state === 'result') say(describe(result.cards[k]));
}

async function reveal() {
  const my = ++run;
  setState('revealing');
  const picked = cards.filter(c => c.drawn).sort((a, b) => a.slot - b.slot);
  result = {
    seed: session.seed, offsets: session.offsets, date: new Date(), spread: session.spread,
    stampId: stampForBack(BACK_NAMES[backIndex]),   // 分享圖的日期章跟著這次的牌背
    pro: !!session.pro, moonPhase: session.spread === 'moon' && session.count === 4 ? moonPhaseIndex(new Date()) : -1,
    cards: session.drawn.map((d, i) => ({ card: cardById(d.cardId), orientation: d.orientation, label: labelsOf(session)[i], pro: !!session.pro })),
  };
  // 先把結果的版面排好（文字還看不見），才量得到每張牌最後要去的位置
  result.cards.forEach((it, i) => { cols.children[i].querySelector('.meta').innerHTML = metaHTML(it); });
  board.dataset.phase = 'result';
  setActive(0);

  const mid = (fan.length - 1) / 2;
  fan.forEach((cd, j) => {
    cd.el.classList.add('gone');
    cd.el.tabIndex = -1; cd.el.setAttribute('aria-hidden', 'true');
    place(cd, { x: cd.pose.x * 1.1, y: cd.pose.y + M.H * .45, r: cd.pose.r * 1.6, s: 1 }, { dur: 460, ease: EASE.in, delay: Math.abs(j - mid) * 9, fade: true });
  });
  picked.forEach(cd => fly(cd, MOTION.toResult, EASE.soft));
  await Promise.all([wait(MOTION.toResult + 40), ...picked.map(cd => cd.faceReady)]);
  if (my !== run) return;
  picked.forEach(settle);

  const faceStart = Math.round(MOTION.flip * MOTION.faceRevealAt);
  const metaStart = Math.max(MOTION.flip, faceStart + MOTION.faceRevealDuration) + MOTION.metaRevealGap;
  for (let i = 0; i < picked.length; i++) {
    const cd = picked[i], it = result.cards[i];
    cd.el.style.setProperty('--face-reveal-start', `${faceStart}ms`);
    cd.cancelWindowReveal?.();
    cd.cancelWindowReveal = revealWindow(cd.face.querySelector('svg'), { delay: ms(faceStart), duration: ms(MOTION.windowRevealDuration), startRatio: MOTION.windowRevealStartRatio });
    cd.el.classList.add('printing', 'flipped');
    if (!reduced.matches) cd.anim = cd.el.firstElementChild.animate(FLIP, { duration: MOTION.flip, easing: EASE.flip });
    cd.el.setAttribute('aria-label', describe(it));
    sfx.flip();
    setTimeout(() => { if (my === run) cols.children[i].classList.add('shown'); }, ms(metaStart));
    if (i < picked.length - 1) { await wait(MOTION.flipGap); if (my !== run) return; }
  }
  await wait(metaStart);
  if (my !== run) return;

  detail.classList.add('shown');
  await wait(MOTION.metaRevealDuration);
  if (my !== run) return;
  setState('result');
  if (result.cards.length > 1) picked.forEach(cd => { cd.el.classList.add('tap'); cd.el.tabIndex = 0; });
  $('#rel').hidden = !(result.pro && result.cards.length > 1);
  say(result.cards.map(describe).join(' '));
  posterBlob(result).catch(() => {});      // 先把海報算好，按下儲存時就能馬上交給系統
}

// ---------------- 結果操作 ----------------
let toastTimer = 0;
function toast(text) {
  toastEl.textContent = text;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 2600);
}

$('#save').addEventListener('click', async () => {
  if (state !== 'result' || saving || !result) return;     // 產生途中重複按不會再做一次
  saving = true;
  const btn = $('#save'), mine = result;
  btn.classList.add('busy');
  try { await savePoster(mine); sfx.stamp(); }
  catch { toast('圖片沒有存成功，再試一次'); }
  finally { if (result === mine) { saving = false; btn.classList.remove('busy'); } }
});

$('#again').addEventListener('click', () => {
  if (state !== 'result') return;
  app.classList.add('again');                 // 收牌的這一小段時間，設定面板不用跑出來
  toIdle();
  const my = run;
  setTimeout(() => {
    if (my === run && state === 'idle') start();
    app.classList.remove('again');
  }, ms(MOTION.gather + N * 6) + 20);
});

$('#back').addEventListener('click', () => { if (state !== 'idle') { toIdle(); if (kbd) $('#go').focus(); } });
$('#go').addEventListener('click', start);
pile.addEventListener('click', start);

// ---------------- 抽牌設定（只有 IDLE 能改） ----------------
function renderSettings() {
  for (const b of $('#count').children) b.setAttribute('aria-checked', String(+b.dataset.count === settings.count));
  for (const b of $('#spread').children) b.setAttribute('aria-checked', String(b.dataset.spread === settings.spread));
  $('#rev').setAttribute('aria-checked', String(settings.reversals));
  $('#spread').classList.toggle('off', settings.count !== 3);
  for (const b of $('#spread').children) b.tabIndex = settings.count === 3 ? 0 : -1;
  // 專業模式：張數與牌陣合成一個「選擇牌陣」按鈕
  $('#pro').setAttribute('aria-pressed', String(settings.pro));
  app.classList.toggle('pro', settings.pro);
  $('#pick-spread').hidden = !settings.pro;
  $('#pick-spread .ps-name').textContent = spreadName();
  try { localStorage.setItem('tarot-settings', JSON.stringify(settings)); } catch { /* 存不了就只用這一次 */ }
}
$('#count').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || state !== 'idle') return;
  settings.count = +b.dataset.count; renderSettings();
});
$('#spread').addEventListener('click', e => {
  const b = e.target.closest('button');
  if (!b || state !== 'idle' || settings.count !== 3) return;
  settings.spread = b.dataset.spread; renderSettings();
});
$('#rev').addEventListener('click', () => {
  if (state !== 'idle') return;
  settings.reversals = !settings.reversals; renderSettings();
});
// 單選群組的方向鍵
for (const group of [$('#count'), $('#spread')]) {
  group.addEventListener('keydown', e => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const bs = [...group.children], i = bs.indexOf(document.activeElement);
    const next = bs[(i + dir + bs.length) % bs.length];
    next.focus(); next.click();
  });
}

// ---------------- 音效與說明 ----------------
function renderSound() {
  const b = $('#sound');
  b.setAttribute('aria-pressed', String(soundOn()));
  b.querySelector('use').setAttribute('href', soundOn() ? '#i-sound' : '#i-mute');
}
$('#sound').addEventListener('click', () => { setSound(!soundOn()); renderSound(); if (soundOn()) sfx.slide(); });

// 浮層：說明、選擇牌陣、牌間關係共用同一套開關
const veil = $('#veil'), about = $('#about');
let sheet = null, opener = null;
function openSheet(el, from) {
  if (sheet) closeSheet(false);
  sheet = el; opener = from; veil.hidden = false; el.hidden = false;
  (el.querySelector('[aria-checked="true"]') || el.querySelector('[data-close]')).focus();
}
function closeSheet(restore = true) {
  if (!sheet) return;
  const was = sheet;
  veil.hidden = true; sheet.hidden = true; sheet = null;
  if (restore) opener?.focus();
  if (was === welcome) welcomeDone();
}
$('#info').addEventListener('click', () => openSheet(about, $('#info')));
veil.addEventListener('click', () => closeSheet());
for (const el of [about, $('#spreads'), $('#relations'), $('#welcome')]) {
  el.querySelector('[data-close]').addEventListener('click', () => closeSheet());
  el.addEventListener('keydown', e => {          // Tab 只在浮層裡繞
    if (e.key !== 'Tab') return;
    const f = [...el.querySelectorAll('button')].filter(b => b.offsetParent !== null);
    const i = f.indexOf(document.activeElement);
    e.preventDefault();
    f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
  });
}

// ---------------- 第一次來：選簡易或專業 ----------------
// 只出現一次；選了什麼（或直接關掉＝簡易）就記在這台裝置上
const welcome = $('#welcome');
let welcomeSeen = true;
try { welcomeSeen = localStorage.getItem('tarot-welcome') !== null; } catch { /* 存不了就不打擾 */ }
function welcomeDone() {
  try { localStorage.setItem('tarot-welcome', '1'); } catch { /* 存不了就只這一次 */ }
  renderSettings();
  $('#pro').classList.remove('hint'); void $('#pro').offsetWidth; $('#pro').classList.add('hint');
  setTimeout(() => $('#pro').classList.remove('hint'), 2400);
}
function showWelcome() {
  if (welcomeSeen || state !== 'idle') return;
  if (returning) {
    $('#welcome-title').textContent = '旅人，歡迎回來';
    welcome.querySelector('.wl-lead').textContent = '抽牌所新添了專業模式：更多牌陣，還能看看牌與牌之間的關係。';
  }
  openSheet(welcome, $('#go'));
  welcome.querySelector(`[data-mode="${settings.pro ? 'pro' : 'simple'}"]`).focus();
}
welcome.querySelector('.wl-choices').addEventListener('click', e => {
  const b = e.target.closest('button[data-mode]');
  if (!b) return;
  settings.pro = b.dataset.mode === 'pro';
  normalizeSettings();
  closeSheet();
  toast(settings.pro ? '已切換成專業模式' : '已選擇簡易模式');
});

// ---------------- 專業模式 ----------------
$('#pro').addEventListener('click', () => {
  settings.pro = !settings.pro;
  normalizeSettings();
  renderSettings();
  const later = state === 'idle' ? '' : '，下一次抽牌生效';
  toast(settings.pro ? `專業模式：開啟${later}` : `專業模式：關閉${later}`);
});

const spreadChoices = () => ['single', ...Object.keys(SPREADS)];
function renderSpreadList() {
  const cur = settings.count === 1 ? 'single' : settings.spread;
  $('#spreads .spread-list').innerHTML = spreadChoices().map(id => {
    const info = SPREAD_INFO[id], n = id === 'single' ? 1 : SPREADS[id].length;
    const dots = Array.from({ length: n }, () => '<i></i>').join('');
    return `<button role="radio" aria-checked="${id === cur}" data-id="${id}"><span class="sl-dots" data-n="${n}">${dots}</span><span class="sl-text"><b>${info.name}</b><small>${n} 張・${info.note}</small></span></button>`;
  }).join('');
}
$('#pick-spread').addEventListener('click', () => {
  if (state !== 'idle') return;
  renderSpreadList();
  openSheet($('#spreads'), $('#pick-spread'));
});
$('#spreads .spread-list').addEventListener('click', e => {
  const b = e.target.closest('button[data-id]');
  if (!b || state !== 'idle') return;
  const id = b.dataset.id;
  if (id === 'single') settings.count = 1;
  else { settings.spread = id; settings.count = SPREADS[id].length; }
  renderSettings();
  closeSheet();
});
$('#spreads .spread-list').addEventListener('keydown', e => {
  const dir = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
  if (!dir) return;
  e.preventDefault();
  const bs = [...e.currentTarget.children], i = bs.indexOf(document.activeElement);
  bs[(i + dir + bs.length) % bs.length].focus();
});

// 牌間關係：只寫「有什麼關係」，不寫解讀
function relationsHTML(res) {
  const nums = res.cards.map(it => it.card.number), r = relationsOf(nums);
  const name = i => `<b>${i + 1}</b>${res.cards[i].card.nameZh}`;
  const steps = r.steps.map(st => `<li><div class="rl-pair">${name(st.from)}<span>→</span>${name(st.to)}</div><div class="rl-tags"><span>${st.journey}</span><span>${st.element}</span></div></li>`).join('');
  const notes = r.notes.map(nt => `<li class="note"><div class="rl-pair">${name(nt.a)}<span>＋</span>${name(nt.b)}</div><div class="rl-tags"><span>${nt.text}</span></div></li>`).join('');
  const els = Object.keys(ELEMENTS).map(k => `<span class="${r.count[k] ? '' : 'none'}">${elementIcon(k, 13)}${ELEMENTS[k].zh} ${r.count[k] || 0}</span>`).join('');
  const lead = r.lead.length ? `${r.lead.map(k => ELEMENTS[k].zh).join('、')}元素主導` : '';
  const miss = r.missing.length && nums.length >= 3 ? `缺少${r.missing.map(k => ELEMENTS[k].zh).join('、')}元素` : '';
  return `<h3>相鄰兩張</h3><ol class="rl">${steps}</ol>` +
    (notes ? `<h3>特別的組合</h3><ol class="rl">${notes}</ol>` : '') +
    `<h3>元素分布</h3><p class="rl-els">${els}</p>${lead || miss ? `<p class="rl-sum">${[lead, miss].filter(Boolean).join('；')}</p>` : ''}` +
    `<p class="rl-close">${CLOSING}</p>`;
}
$('#rel').addEventListener('click', () => {
  if (state !== 'result' || !result?.pro) return;
  $('#relations .rel-body').innerHTML = relationsHTML(result);
  openSheet($('#relations'), $('#rel'));
});

addEventListener('keydown', e => {
  kbd = true;
  if (e.key === 'Escape') { if (sheet) closeSheet(); else if (state !== 'idle') $('#back').click(); }
});
app.addEventListener('contextmenu', e => e.preventDefault());
addEventListener('dragstart', e => e.preventDefault());

// ---------------- 版面 ----------------
function relayout() {
  measure();
  if (state === 'idle') order.forEach((cd, k) => place(cd, pilePose(k)));
  else if (state === 'selecting') {
    fanGeom();
    pos = G.scroll ? clamp(pos, 0, fan.length - 1) : (fan.length - 1) / 2;
    if (G.scroll && focus < 0) focus = Math.round(pos);
    layoutFan();
    cards.filter(c => c.drawn).forEach(settle);
  } else if (state === 'result') cards.filter(c => c.drawn).forEach(settle);
}
new ResizeObserver(relayout).observe(stage);

renderSettings();
renderSound();
toIdle(false);
setTimeout(showWelcome, ms(500));
