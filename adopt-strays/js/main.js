/* 小小相遇所：大廳、相遇所店員、轉蛋流程、頁面切換 */
import { $, el, wait, reduced } from './util.js';
import { icon } from './icons.js';
import { machineSVG, npcSVG, bookSVG, albumSVG, plantSVG, combo } from './art.js';
import { state, subscribe, load, whenReady } from './data.js';
import { statusOf } from './eligibility.js';
import { pick } from './selector.js';
import { createFavorites } from './favorites.js';
import { meetCard, setStamp, proxied, IMG_PROXY } from './card.js';
import { playGacha } from './gacha.js';
import { bookView, albumView, detailView, aboutView, openShare, openFilter } from './views.js';
import { iconBtn, modal, toast } from './ui.js';
import { copyText } from './share.js';
import { LINES, encounterLines } from './copy.js';
import { sfx, soundOn, setSound } from './sound.js';
import { COUNTY } from './normalize.js';
import { KIND } from './labels.js';

const favs = createFavorites(localStorage);
const lobby = $('#lobby'), page = $('#page'), meetEl = $('#meet'), talk = $('#talk');

/* ---------- 大廳 ---------- */
$('#machine').innerHTML = machineSVG();
$('#npc').innerHTML = npcSVG('full');
$('#host').innerHTML = npcSVG('head');
$('#book').innerHTML = bookSVG();
$('#album').innerHTML = albumSVG() + '<i id="albumDot"></i>';
$('#plant').innerHTML = plantSVG();
$('#about').innerHTML = icon('info');
const paintSound = () => { $('#sound').innerHTML = icon(soundOn() ? 'soundOn' : 'soundOff'); $('#sound').setAttribute('aria-pressed', String(soundOn())); };
paintSound();
$('#sound').addEventListener('click', () => { setSound(!soundOn()); paintSound(); sfx('blip'); });

let filter = { kind: '', area: '' };
try { filter = { kind: '', area: '', ...JSON.parse(sessionStorage.getItem('enc.filter') || '{}') }; } catch { /* ignore */ }
function paintBoard() {
  $('#boardIc').innerHTML = icon(filter.kind === 'dog' ? 'dog' : filter.kind === 'cat' ? 'cat' : 'paw');
  $('#boardText').textContent = COUNTY[filter.area] || '全台';
  $('#board').setAttribute('aria-label', `相遇條件：${COUNTY[filter.area] || '全台'}，${KIND[filter.kind] || '不限種類'}`);
}
paintBoard();
$('#board').addEventListener('click', () => openFilter(filter, f => {
  filter = f; try { sessionStorage.setItem('enc.filter', JSON.stringify(f)); } catch { /* ignore */ }
  paintBoard(); say(LINES.filter);
}));
const paintAlbum = () => { $('#albumDot').hidden = !favs.count(); };
paintAlbum();

/* ---------- 相遇所店員 ---------- */
let queue = [], talkTimer = 0, mouthTimer = 0, hideTimer = 0, idleTimer = 0, dazeTimer = 0, moodTimer = 0;
const hosts = [$('#npc'), $('#host')];
const setMood = m => hosts.forEach(h => { h.dataset.mood = m || ''; });
function showLine(line, live) {
  const text = typeof line === 'string' ? line : line.text;
  clearTimeout(moodTimer);
  if (typeof line !== 'string') setMood(line.mood);
  $('#talkHint').textContent = queue.length ? '接著呢？ ›' : '點一下，繼續相遇';
  talk.setAttribute('aria-label', text + (queue.length ? '。下一句' : '。收起對話'));
  clearTimeout(talkTimer); clearTimeout(hideTimer);
  $('#line').textContent = text;
  if (live) $('#live').textContent = text;
  talk.classList.remove('in'); void talk.offsetWidth; talk.classList.add('in');
  hosts.forEach(h => { h.classList.remove('hop'); void h.offsetWidth; h.classList.add('hop', 'talking'); });
  sfx('blip');
  clearTimeout(mouthTimer); mouthTimer = setTimeout(() => hosts.forEach(h => h.classList.remove('talking')), 260 + text.length * 70);
  const stay = 1500 + text.length * 90;
  if (queue.length) talkTimer = setTimeout(() => showLine(queue.shift(), live), stay);
  else hideTimer = setTimeout(() => talk.classList.remove('in'), stay + 2600);
}
function say(lines, { mood = '', live = true } = {}) {
  queue = [].concat(lines); setMood(mood);
  showLine(queue.shift(), live);
  if (mood && typeof lines === 'string') moodTimer = setTimeout(() => setMood(''), 2600);
  resetIdle();
}
const hush = () => { queue = []; clearTimeout(talkTimer); clearTimeout(hideTimer); clearTimeout(moodTimer); hosts.forEach(h => h.classList.remove('talking')); setMood(''); talk.classList.remove('in'); };
const advanceTalk = () => queue.length ? showLine(queue.shift(), true) : hush();
talk.addEventListener('click', advanceTalk);
talk.addEventListener('keydown', e => {
  if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); advanceTalk(); }
});
const atLobby = () => page.hidden && meetEl.hidden && !busy && !document.querySelector('.modal');
function resetIdle() {
  clearTimeout(idleTimer); clearTimeout(dazeTimer);
  if (hosts[0].dataset.mood === 'daze') setMood('');
  dazeTimer = setTimeout(() => { if (atLobby() && !talk.classList.contains('in')) setMood('daze'); }, 16000);
  idleTimer = setTimeout(() => {
    if (atLobby() && !document.hidden) say(LINES.idle[Math.floor(Math.random() * LINES.idle.length)], { live: false });
    else resetIdle();
  }, 26000 + Math.random() * 9000);
}
['pointerdown', 'keydown'].forEach(t => document.addEventListener(t, () => { if (hosts[0].dataset.mood === 'daze') setMood(''); }, true));
const INTRO_KEY = 'enc.welcome.v2';
const WELCOME = [
  ['先從一場小小相遇開始', '（阿糰把一顆轉蛋輕輕放上桌。）歡迎來到小小相遇所！我是店員阿糰。這裡把台灣收容所的動物資料，變成一張張可以慢慢認識的相遇卡。'],
  ['轉開的，是認識牠的機會', '轉一下旋鈕，或翻開桌上的動物圖鑑，就能看看牠的照片、基本資料與收容所資訊。喜歡的朋友可以收藏進小冊子；準備好領養時，先聯絡收容所，了解照顧需求，再依正式程序辦理。'],
  ['還不能領養，也能幫上忙', '（阿糰把圖鑑往你這邊推近一點。）你可以把動物的相遇卡分享出去，或把這間小店介紹給朋友。多一個人看見，就多一次被認識的機會。今天，先來認識一位朋友吧？'],
];
function openWelcome() {
  if (!atLobby()) return;
  hush(); setMood('happy');
  let step = 0, finished = false;
  const content = el('div');
  const m = modal(content, { label: '阿糰的歡迎故事', cls: 'welcome' });
  const finish = action => {
    if (finished) return;
    finished = true;
    try { localStorage.setItem(INTRO_KEY, '1'); } catch { /* ignore */ }
    m.close();
    // 等歡迎視窗離場後再交給大廳動作。
    if (action) setTimeout(action, 200);
  };
  function paint() {
    const [title, story] = WELCOME[step];
    const next = el('button', { type: 'button', class: 'primary', text: step < 2 ? '接著呢？' : '遇見一位朋友', onclick: () => {
      if (step < 2) { step++; paint(); } else finish(meet);
    } });
    content.replaceChildren(
      iconBtn('close', '先自己逛逛', { class: 'x', onclick: () => finish() }),
      el('div', { class: 'welcome-head' }, el('div', { class: 'welcome-portrait', 'aria-hidden': 'true', html: npcSVG('head') }),
        el('div', {}, el('p', { class: 'welcome-name', text: '相遇所店員 · 阿糰' }), el('h2', { text: title }))),
      el('p', { class: 'welcome-story', text: story, 'aria-live': 'polite' }),
      el('p', { class: 'welcome-step', text: `小店的故事 ${step + 1} / 3` }),
      el('div', { class: 'welcome-actions' },
        ...(step ? [el('button', { type: 'button', class: 'ghost', text: '上一段', onclick: () => { step--; paint(); } })] : []), next,
        ...(step === 2 ? [el('button', { type: 'button', class: 'ghost', text: '先翻翻圖鑑', onclick: () => finish(() => go('book')) })] : [])),
      ...(step === 2 ? [el('button', { type: 'button', class: 'welcome-share', text: '把小小相遇所介紹給朋友', onclick: async () => {
        const url = new URL(location.href); url.hash = ''; url.search = '';
        const text = '來小小相遇所，認識台灣收容所的動物。領養或分享，讓更多朋友被看見。';
        if (navigator.share) {
          try { await navigator.share({ title: '小小相遇所', text, url: url.href }); }
          catch (e) { if (e.name !== 'AbortError') toast(await copyText(text + '\n' + url.href) ? '介紹與網址已複製，可以貼給朋友了。' : '暫時無法分享，請複製瀏覽器網址。'); }
        } else toast(await copyText(text + '\n' + url.href) ? '介紹與網址已複製，可以貼給朋友了。' : '暫時無法分享，請複製瀏覽器網址。');
      } })] : []));
    next.focus({ preventScroll: true });
  }
  paint();
  m.closed.then(() => { setMood(''); resetIdle(); });
}
$('#npc').addEventListener('click', openWelcome);

/* ---------- 轉蛋 ---------- */
let busy = false, last = 0, current = null;
let encounterTurn = Math.floor(Math.random() * 12);
const seen = new Set();
try { JSON.parse(sessionStorage.getItem('enc.seen') || '[]').forEach(i => seen.add(i)); } catch { /* ignore */ }
const saveSeen = () => { try { sessionStorage.setItem('enc.seen', JSON.stringify([...seen].slice(-3000))); } catch { /* ignore */ } };

async function meet() {
  if (busy) return;
  busy = true;
  try {
    if (!state.ready) {
      say(LINES.loading); $('#go').classList.add('wait');
      await whenReady(); $('#go').classList.remove('wait');
    }
    const { animal, reset } = pick(state.animals, filter, { today: state.today, seen, last });
    if (!animal) {
      say(LINES.empty, { mood: 'wow' });
      const b = $('#board'); b.classList.remove('wig'); void b.offsetWidth; b.classList.add('wig');
      return;
    }
    if (reset) seen.clear();
    seen.add(animal.id); last = animal.id; saveSeen();
    if (animal.photo && IMG_PROXY) new Image().src = proxied(animal.photo, 700, false);   // 動畫期間先載入照片
    hush(); setMood('happy');
    await playGacha({ machine: $('#machine'), color: combo(animal.id).a === '#E9E4D8' ? combo(animal.id).s : combo(animal.id).a, onOpen: () => showMeet(animal) });
    say([...encounterLines(animal, encounterTurn++), ...(reset ? [LINES.reset] : [])], { mood: 'wow' });
    $('#meetGo')?.focus({ preventScroll: true });
  } finally { busy = false; }
}
$('#go').addEventListener('click', meet);
$('#machine').addEventListener('click', meet);

function showMeet(a) {
  current = a;
  const st = statusOf(a, state.today);
  const card = meetCard(a, st, favs.get(a.id));
  const save = iconBtn('bookmarkO', '收藏這次相遇', { onclick: () => { const on = toggleFav(a); paintSave(); setStamp(card.querySelector('.blk'), favs.get(a.id), on); say(on ? LINES.saved : LINES.unsaved, { mood: on ? 'happy' : '' }); } });
  const paintSave = () => { const on = favs.has(a.id); save.innerHTML = icon(on ? 'bookmark' : 'bookmarkO'); save.setAttribute('aria-pressed', String(on)); save.classList.toggle('on', on); };
  paintSave();
  const acts = el('div', { class: 'acts' },
    save,
    iconBtn('share', '分享這位朋友', { onclick: () => openShare(a) }),
    iconBtn('again', '再遇見一位', { onclick: async () => { await closeMeet(); say(LINES.again, { mood: 'happy' }); await wait(reduced() ? 0 : 500); meet(); } }),
    el('button', { type: 'button', class: 'primary', id: 'meetGo', text: '認識牠', onclick: () => go('a/' + a.id) }));
  meetEl.replaceChildren(iconBtn('close', '關閉', { class: 'x', onclick: async () => { await closeMeet(); say(LINES.close); $('#go').focus({ preventScroll: true }); } }), el('div', { class: 'meet-in' }, card, acts));
  meetEl.hidden = false; document.body.classList.add('meeting'); lobby.inert = true;
  if (reduced()) return Promise.resolve();
  acts.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: 300, delay: 420, fill: 'backwards' });
  return card.animate([{ transform: 'scale(.15) rotate(-10deg)', opacity: 0 }, { transform: 'scale(1.05) rotate(1.500deg)', opacity: 1, offset: 0.68 }, { transform: 'none', opacity: 1 }], { duration: 560, easing: 'cubic-bezier(.2,.9,.3,1)' }).finished.catch(() => {});
}
async function closeMeet() {
  if (meetEl.hidden) return;
  if (!reduced()) await meetEl.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200 }).finished.catch(() => {});
  meetEl.hidden = true; meetEl.replaceChildren(); current = null;
  document.body.classList.remove('meeting'); lobby.inert = !page.hidden;
}

function toggleFav(a) {
  const on = !favs.has(a.id);
  if (on) { favs.add(a); sfx('stamp'); } else favs.remove(a.id);
  paintAlbum();
  return on;
}

/* ---------- 頁面 ---------- */
let view = null, depth = 0;
const go = h => { depth++; location.hash = '#/' + h; };
const back = () => { if (depth > 0) { depth--; history.back(); } else { history.replaceState(null, '', location.pathname + location.search); route(); } };
const app = { go, back, favs, toggleFav, favChanged: paintAlbum };

function route() {
  const h = location.hash.replace(/^#\/?/, '');
  const m = /^a\/(\d{1,9})$/.exec(h);
  const make = h === 'book' ? () => bookView(app) : h === 'album' ? () => albumView(app) : h === 'about' ? () => aboutView(app) : m ? () => detailView(app, Number(m[1])) : null;
  view?.destroy(); view = null;
  if (!make) {
    if (!page.hidden) { page.hidden = true; page.replaceChildren(); }
    lobby.inert = !meetEl.hidden; meetEl.inert = false;
    document.body.classList.remove('paging');
    if (current) setStamp(meetEl.querySelector('.blk'), favs.get(current.id), false);
    resetIdle();
    return;
  }
  hush();
  view = make();
  page.replaceChildren(view.el); page.hidden = false; page.scrollTop = 0;
  lobby.inert = true; meetEl.inert = true; document.body.classList.add('paging');
  if (!reduced()) page.animate([{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 240, easing: 'cubic-bezier(.2,.8,.3,1)' });
  view.el.querySelector('.bar button')?.focus({ preventScroll: true });
}
addEventListener('hashchange', route);
$('#book').addEventListener('click', () => go('book'));
$('#album').addEventListener('click', () => go('album'));
$('#about').addEventListener('click', () => go('about'));
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape' || document.querySelector('.modal,.pop') || !$('#gacha').hidden) return;
  if (!page.hidden) back(); else if (!meetEl.hidden) meetEl.querySelector('.x').click();
});
document.addEventListener('dragstart', e => e.preventDefault());

/* ---------- 開始 ---------- */
let told = false;
subscribe(s => {
  document.body.classList.toggle('demo', s.mode === 'demo');
  if (s.complete && !told) {
    told = true;
    if (s.mode === 'demo' && s.error) say(LINES.demo, { mood: 'wow' });
    else if (s.mode === 'stale') say(LINES.stale);
  }
});
route();
load();
let visited = false;
try { visited = localStorage.getItem('enc.visited') === '1'; localStorage.setItem('enc.visited', '1'); } catch { /* ignore */ }
setMood('daze');
let introduced = false;
try { introduced = localStorage.getItem(INTRO_KEY) === '1'; } catch { /* ignore */ }
setTimeout(() => {
  if (!atLobby()) return;
  if (!introduced) openWelcome();
  else if (!talk.classList.contains('in')) say(visited ? LINES.back : LINES.welcome, { mood: 'happy' });
}, 900);
