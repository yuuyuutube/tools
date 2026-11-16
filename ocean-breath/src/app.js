// UI：海岸切換（圖鑑）、資訊、觀測／觀賞模式、全螢幕、時間軸、分享、展示模式。
import { COASTS, coastById, DEFAULT_COAST } from './coasts.js';
import { coastData } from './marine.js';
import { visualState } from './visual.js';
import { createScene } from './scene.js';
import { demoSnapshot } from './demo.js';
import { createTimeline } from './timeline.js';
import { buildPoster } from './share.js';
import { loadSnapshot, loadHistory } from './api.js';
import { STATE_TEXT, TYPE_TEXT } from './tide.js';
import { sunTimes } from './sun.js';
import { hm, md, ymd, dayStart } from './util.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg class="ic"><use href="#i-${name}"/></svg>`;
const POLL = 10 * 60 * 1000, TICK = 30 * 1000;
const params = new URLSearchParams(location.search);
const shot = params.has('shot');            // ?shot：只留插畫與站名，給 scripts/og.sh 截分享圖用
if (shot) document.body.classList.add('shot');
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('ocean-' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('ocean-' + k, JSON.stringify(v)); } catch { /* 無痕模式 */ } },
};

const state = {
  coast: coastById(params.get('coast')) || coastById(store.get('home')) || coastById(DEFAULT_COAST),
  snapshot: null, history: null, t: null, playing: 0,
  demo: { tide: 'rising', sea: 'calm', sky: null },
  favs: new Set(store.get('favs') || []), home: store.get('home') || null,
  enjoy: !!store.get('enjoy'), busy: false, timer: 0,
};
const now = () => Date.now();
const viewTime = () => state.t ?? now();

/* ---------------- 紙張顆粒 ---------------- */
{
  const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'), d = g.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random(); d.data[i] = d.data[i + 1] = d.data[i + 2] = v < .5 ? 40 : 255; d.data[i + 3] = Math.random() * 26; }
  g.putImageData(d, 0, 0); $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3800); }

/* ---------------- 海景圖層（切換時交叉淡入） ---------------- */
let current = null;
function mountScene(coast, dir = 0) {
  const layer = document.createElement('div');
  layer.className = 'layer' + (current ? ` enter${dir > 0 ? ' from-r' : dir < 0 ? ' from-l' : ''}` : '');
  $('stage').appendChild(layer);
  const scene = createScene(layer, coast, { still: motion.matches });
  const old = current; current = { layer, scene, coast };
  render({ instant: true });
  if (old) {
    requestAnimationFrame(() => requestAnimationFrame(() => { layer.classList.remove('enter', 'from-r', 'from-l'); old.layer.classList.add('leave'); }));
    setTimeout(() => { old.scene.destroy(); old.layer.remove(); }, motion.matches ? 50 : 1700);
  }
}

/* ---------------- 資料 ---------------- */
async function load({ manual = false } = {}) {
  if (state.busy) return; state.busy = true;
  try {
    const snap = await loadSnapshot({ refresh: manual });
    state.snapshot = snap || demoSnapshot(state.demo);
    if (!snap) state.snapshot.offline = true;
  } catch (e) {
    // 失敗：保留上一份真實資料並標示；完全沒有就進展示模式
    if (state.snapshot?.mode === 'live') { state.snapshot = { ...state.snapshot, failed: true }; toast(e.message || '海象資料暫時無法取得'); }
    else { state.snapshot = demoSnapshot(state.demo); state.snapshot.failed = true; }
  } finally { state.busy = false; }
  render();
  clearTimeout(state.timer); state.timer = setTimeout(() => !document.hidden && load(), POLL);
}

/* ---------------- 畫面 ---------------- */
let merged = null;
function dataFor(coast, t = viewTime()) {
  let snap = state.snapshot;
  // 30 天的累積觀測併進 48 小時資料，拖到更早的日子時才有實測可用
  if (state.history && snap?.mode === 'live') {
    if (merged?.src !== snap || merged.hist !== state.history) {
      const stations = { ...snap.stations };
      for (const [id, list] of Object.entries(state.history)) {
        const m = new Map(list.map(x => [Date.parse(x.t), x])); for (const x of snap.stations[id] || []) m.set(Date.parse(x.t), x);
        stations[id] = [...m.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
      }
      merged = { src: snap, hist: state.history, snap: { ...snap, stations } };
    }
    snap = merged.snap;
  }
  return coastData(snap, coast, t, now());
}
function stateFor(data, t) {
  const vs = visualState(data, t);
  if (state.snapshot?.mode === 'demo' && state.demo.sky && state.t == null) {
    // 展示模式的日夜切換：只換天色與日月位置，資料時間不變
    const alt = state.demo.sky === 'night' ? dayStart(t) + 22 * 3600000 : dayStart(t) + (data.coast.facing > 180 ? 16.5 : 8.5) * 3600000;
    Object.assign(vs, (({ phase, elevation, azimuth, moon }) => ({ phase, elevation, azimuth, moon }))(visualState(data, alt)), { t: alt });
  }
  return vs;
}

let lastData = null;
function render({ instant = false } = {}) {
  if (!current) return;
  const t = viewTime(), data = dataFor(state.coast, t), vs = stateFor(data, t);
  lastData = data;
  current.scene.setState(vs, { instant: instant || state.t != null });
  const live = state.snapshot?.mode === 'live';
  const dark = vs.phase === 'night';
  document.body.classList.toggle('dark', dark);
  const pal = current.scene.palette();
  if (pal) { document.documentElement.style.setProperty('--text', pal.text); document.querySelector('meta[name="theme-color"]').content = pal.sky; }

  $('place-name').textContent = state.coast.name;
  $('stage').setAttribute('aria-label', `${state.coast.name}的海景插畫，${STATE_TEXT[data.tide.state] || ''}`);

  // 潮汐狀態：預報優先；沒有預報時才用潮位站觀測的「漲潮／退潮」欄位；都沒有就說資料不足
  let title, ic;
  if (data.tide.status === 'ok') { title = STATE_TEXT[data.tide.state]; ic = data.tide.rising ? 'rise' : 'fall'; }
  else if (data.obs.tide?.sample.level) { title = data.obs.tide.sample.level === 'rising' ? '漲潮中' : '退潮中'; ic = data.obs.tide.sample.level === 'rising' ? 'rise' : 'fall'; }
  else { title = '潮汐資料不足'; ic = 'alert'; }
  if (shot) { title = '海洋呼吸觀測所'; }
  if ($('state').textContent !== title) $('state').textContent = title;
  $('state-ic').firstElementChild.setAttribute('href', `#i-${ic}`);
  const nx = data.tide.status === 'ok' ? data.next : null;      // 預報沒涵蓋這個時刻時，不顯示可能誤導的「下一次」
  $('next').hidden = !nx;
  if (nx) {
    const sameDay = ymd(nx.t) === ymd(t);
    $('next-text').textContent = `${TYPE_TEXT[nx.type]} ${sameDay ? '' : md(nx.t) + ' '}${hm(nx.t)}`;
    $('next-ic').setAttribute('href', `#i-${nx.type === 'high' ? 'high' : 'low'}`);
  }
  const kind = replayKind(data, t);
  $('replay').hidden = !kind; $('replay').textContent = kind;

  // 數值：只顯示真的有的觀測；沒有就是「—」
  const num = (id, o, f, label) => {
    const li = $(id), v = o?.value;
    li.querySelector('span').textContent = v == null ? '—' : f(v);
    li.classList.toggle('none', v == null);
    li.setAttribute('aria-label', v == null ? `${label}：無可用觀測` : `${label} ${f(v)}${li.querySelector('small').textContent}，${o.station.name}`);
  };
  num('v-tide', data.obs.tide, v => (v > 0 ? '+' : '') + v, '觀測潮位');
  num('v-wave', data.obs.wave, v => v.toFixed(1), '浪高');
  num('v-temp', data.obs.temp, v => v.toFixed(1), '海溫');
  num('v-wind', data.obs.wind, v => v.toFixed(1), '風速');
  $('v-wind').hidden = !state.coast.wind.length;

  const tideAt = data.obs.tide?.at || data.obs.wave?.at || data.obs.temp?.at;
  const S = {
    live: () => `<b>觀測</b> ${hm(tideAt)}`,
    recent: () => `<b>近期觀測</b> ${hm(tideAt)}`,
    delayed: () => `${icon('alert')}<b>資料延遲</b> ${md(tideAt)} ${hm(tideAt)}`,
    forecastOnly: () => `${icon('alert')}<b>僅潮汐預報</b>`,
    noData: () => `${icon('alert')}<b>無觀測資料</b>`,
    error: () => `${icon('alert')}<b>API 失敗</b>`,
    demo: () => `<b>展示模式</b>`,
  };
  let stamp = (S[data.status] || S.noData)();
  if (state.snapshot?.pending) stamp = '';
  else if (state.t != null) stamp = `<b>${md(t)} ${hm(t)}</b>`;
  else if (state.snapshot?.failed && live) stamp = `${icon('alert')}<b>連線失敗</b> ${hm(state.snapshot.generatedAt)}`;
  $('stamp').innerHTML = stamp;
  $('demo').hidden = state.snapshot?.mode !== 'demo' || !!state.snapshot.pending;
  for (const grp of $('demo').querySelectorAll('[data-group]')) for (const b of grp.querySelectorAll('button')) {
    const on = (state.demo[grp.dataset.group] ?? (grp.dataset.group === 'sky' ? (dark ? 'night' : 'day') : null)) === b.dataset.v;
    b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1;
  }
  timeline.update();
}

function replayKind(data, t) {
  if (state.playing) return state.playingKind;
  if (state.t == null) return '';
  if (t < now() - 30 * 60000) return data.obs.tide?.status === 'history' ? '歷史觀測' : data.tide.status === 'ok' ? '潮汐預報・示意水位' : '無觀測資料';
  return data.tide.status === 'ok' ? '潮汐預報・示意水位' : '超出預報範圍';
}

/* 現在時刻：每 30 秒更新一次潮汐水位與天色（真實時間，不加速） */
setInterval(() => { if (!document.hidden && state.t == null) render(); }, TICK);
document.addEventListener('visibilitychange', () => {
  current?.scene.setPaused(document.hidden);
  if (!document.hidden) { if (state.snapshot?.mode === 'live' && now() - Date.parse(state.snapshot.generatedAt) > POLL) load(); render(); }
});
motion.addEventListener('change', e => current?.scene.setStill(e.matches));

/* ---------------- 海岸切換 ---------------- */
function goto(coast, dir = 0) {
  if (!coast || coast === state.coast) return;
  state.coast = coast; stopPlay();
  history.replaceState(null, '', `?coast=${coast.id}${location.hash}`);
  mountScene(coast, dir);
}
const step = d => { const i = COASTS.indexOf(state.coast); goto(COASTS[(i + d + COASTS.length) % COASTS.length], d); };

// 左右滑動（手指或滑鼠拖曳）翻到下一片海
{
  let sx = 0, sy = 0, st = 0, id = null;
  $('stage').addEventListener('pointerdown', e => { if (e.button > 0) return; id = e.pointerId; sx = e.clientX; sy = e.clientY; st = performance.now(); });
  $('stage').addEventListener('pointerup', e => {
    if (e.pointerId !== id) return; id = null;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 1.6 && performance.now() - st < 900) step(dx < 0 ? 1 : -1);
  });
  $('stage').addEventListener('pointercancel', () => { id = null; });
}
addEventListener('keydown', e => {
  if (opened || e.target.closest?.('#tl-ruler, .seg')) return;
  if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
});

/* ---------------- 浮層（取代原生 dialog／select／alert） ---------------- */
let opened = null, opener = null;
function openSheet(node, from) {
  closeSheet(); opened = node; opener = from; node.hidden = false; $('veil').hidden = false; wake();
  (node.querySelector('[aria-current="true"]') || node.querySelector('button'))?.focus({ preventScroll: true });
}
function closeSheet() { if (!opened) return; opened.hidden = true; $('veil').hidden = true; if (opened === $('atlas')) clearThumbs(); opened = null; opener?.focus({ preventScroll: true }); opener = null; }
$('veil').addEventListener('click', closeSheet);
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', e => {
  if (!opened) return;
  if (e.key === 'Escape') return closeSheet();
  if (e.key !== 'Tab') return;
  const f = [...opened.querySelectorAll('button:not([hidden]), a[href]')].filter(b => b.offsetParent); if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

/* 圖鑑：每片海一張小插畫 */
let thumbs = [];
function clearThumbs() { thumbs.forEach(s => s.destroy()); thumbs = []; }
function showAtlas() {
  clearThumbs();
  const list = $('atlas-list');
  list.innerHTML = COASTS.map(c => `<div class="card" role="button" tabindex="0" data-id="${c.id}" aria-label="${c.name}"${c === state.coast ? ' aria-current="true"' : ''}>
    <span class="thumb"></span>
    <span class="name">${c.name}<small></small></span>
    <span class="marks">
      <button data-act="fav" aria-label="收藏${c.name}" aria-pressed="${state.favs.has(c.id)}">${icon('star')}</button>
      <button data-act="home" aria-label="設為預設海岸" aria-pressed="${state.home === c.id}">${icon('home')}</button>
    </span></div>`).join('');
  openSheet($('atlas'), $('place'));
  for (const card of list.children) {
    const c = coastById(card.dataset.id), box = card.querySelector('.thumb');
    const w = box.clientWidth || 220, h = box.clientHeight || 138;
    const s = createScene(box, c, { size: [w, h], still: true });
    const d = dataFor(c, now()); s.setState(stateFor(d, now()), { instant: true }); thumbs.push(s);
    if (d.next) card.querySelector('small').innerHTML = `${icon(d.next.type === 'high' ? 'high' : 'low')}${hm(d.next.t)}`;
  }
}
$('place').addEventListener('click', showAtlas);
$('atlas-list').addEventListener('click', e => {
  const card = e.target.closest('.card'); if (!card) return;
  const act = e.target.closest('[data-act]');
  if (act) {
    e.stopPropagation();
    const id = card.dataset.id;
    if (act.dataset.act === 'fav') { state.favs.has(id) ? state.favs.delete(id) : state.favs.add(id); store.set('favs', [...state.favs]); act.setAttribute('aria-pressed', state.favs.has(id)); toast(state.favs.has(id) ? '已收藏' : '已取消收藏'); }
    else { state.home = state.home === id ? null : id; store.set('home', state.home); for (const b of $('atlas-list').querySelectorAll('[data-act="home"]')) b.setAttribute('aria-pressed', b.closest('.card').dataset.id === state.home); toast(state.home ? `打開時先看${coastById(id).name}` : '已取消預設海岸'); }
    return;
  }
  const c = coastById(card.dataset.id), i = COASTS.indexOf(c) - COASTS.indexOf(state.coast);
  closeSheet(); goto(c, Math.sign(i));
});
$('atlas-list').addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('card')) { e.preventDefault(); e.target.click(); } });

/* 資料來源與說明 */
$('info').addEventListener('click', () => {
  const d = lastData, c = state.coast, demo = state.snapshot?.mode === 'demo', rows = [];
  $('about-title').textContent = c.name;
  if (demo) rows.push(['alert', `<span class="warn">展示模式</span><small>固定的測試資料，不是真實觀測${state.snapshot?.failed ? '。海象資料連線失敗' : state.snapshot?.offline ? '。這個網址沒有連上資料來源' : ''}</small>`, 'warn']);
  rows.push(['source', `<a href="https://opendata.cwa.gov.tw/dataset/forecast/F-A0021-001" target="_blank" rel="noopener">潮汐預報 F-A0021-001</a><small>${c.forecast.name}${state.snapshot?.forecastAt ? `・取得 ${md(state.snapshot.forecastAt)} ${hm(state.snapshot.forecastAt)}` : ''}</small>`]);
  const stationRow = (key, label, unit, ic) => {
    const o = d.obs[key], list = c[key];
    if (!list.length) return rows.push([ic, `${label}<small>此場景沒有對應的${label}測站</small>`]);
    if (!o) return rows.push([ic, `${label}<small>${list.map(s => s.name).join('、')}目前無可用觀測</small>`]);
    const datum = key === 'tide' ? `・基準 ${o.station.datum}` : '';
    rows.push([ic, `${label} ${key === 'tide' && o.value > 0 ? '+' : ''}${o.value}${unit}<small>${o.station.name} ${o.station.id}・距預報地點 ${o.distanceKm} km${datum}・${md(o.at)} ${hm(o.at)}</small>`]);
  };
  stationRow('tide', '潮位', ' cm', 'gauge');
  stationRow('wave', '浪高', ' m', 'wave');
  if (!c.wave.length || !d.obs.wave) rows.push(['alert', '此場景無可用浪高觀測資料。<small>海浪維持基礎的藝術動態</small>']);
  stationRow('temp', '海溫', ' °C', 'temp');
  if (c.wind.length) stationRow('wind', '風速', ' m/s', 'wind');
  if (d.status === 'forecastOnly') rows.push(['alert', '目前使用潮汐預報，未取得最新觀測資料。']);
  if (d.tide.status !== 'ok') rows.push(['alert', '潮汐預報事件不足或不連續，暫停推算漲退潮。']);
  const ev = d.clean.events.filter(e => e.t > viewTime()).slice(0, 4);
  if (ev.length) rows.push(['clock', ev.map(e => `${TYPE_TEXT[e.type]} ${md(e.t)} ${hm(e.t)}${e.height != null ? `　${e.height > 0 ? '+' : ''}${e.height} cm` : ''}`).join('<br>') + '<small>潮高相對當地平均海平面；觀測潮位的基準可能不同，不能直接相減</small>']);
  rows.push(['rise', '畫面上的連續水位是依相鄰滿潮、乾潮平滑插值的視覺示意，不是官方逐時潮位。']);
  const sun = sunTimes(dayStart(viewTime()), c.lat, c.lon);
  if (sun.rise) rows.push(['sun', `日出 ${hm(sun.rise)}・日落 ${hm(sun.set)}<small>依 ${c.name} 的經緯度推算，用來決定天色</small>`]);
  for (const issue of state.snapshot?.issues || []) rows.push(['alert', issue]);
  rows.push(['info', '本網站為海象資料視覺化作品，海岸活動安全請以中央氣象署及相關主管機關最新公告為準。<small>小船、海鳥等為裝飾性動畫，不代表實際動態</small>']);
  $('about-list').innerHTML = rows.map(([i, html, cls]) => `<dt>${icon(i)}</dt><dd${cls ? ` class="${cls}"` : ''}>${html}</dd>`).join('');
  openSheet($('about'), $('info'));
});

/* ---------------- 觀測／觀賞 ---------------- */
function setEnjoy(on) {
  state.enjoy = on; document.body.classList.toggle('enjoy', on); store.set('enjoy', on);
  $('mode').setAttribute('aria-pressed', on); $('mode').setAttribute('aria-label', on ? '顯示觀測資訊' : '純觀賞模式');
  $('mode').querySelector('use').setAttribute('href', on ? '#i-eye-off' : '#i-eye');
}
$('mode').addEventListener('click', () => setEnjoy(!state.enjoy));

/* ---------------- 展示模式控制 ---------------- */
$('demo').addEventListener('click', e => {
  const b = e.target.closest('button[data-v]'); if (!b) return;
  const grp = b.closest('[data-group]').dataset.group;
  state.demo[grp] = b.dataset.v;
  if (grp !== 'sky') state.snapshot = demoSnapshot(state.demo);
  render();
});
document.addEventListener('keydown', e => {
  const grp = e.target.closest?.('.seg[role="radiogroup"]'); if (!grp) return;
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
  e.preventDefault(); e.stopPropagation();
  const all = [...grp.querySelectorAll('button')], i = all.indexOf(e.target), next = all[(i + d + all.length) % all.length];
  next.click(); next.focus();
});

/* ---------------- 全螢幕與閒置 ---------------- */
const root = document.documentElement, canFull = root.requestFullscreen || root.webkitRequestFullscreen;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
if (!canFull) $('full').hidden = true;
$('full').addEventListener('click', async () => {
  try { if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document); else await canFull.call(root); }
  catch { toast('這個瀏覽器不能進入全螢幕'); }
});
let idleTimer = 0;
function wake() { document.body.classList.remove('idle'); clearTimeout(idleTimer); if (isFull() && !opened && $('timeline').hidden) idleTimer = setTimeout(() => document.body.classList.add('idle'), 4000); }
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(type, () => {
  const on = isFull(); $('full').querySelector('use').setAttribute('href', on ? '#i-unfull' : '#i-full');
  $('full').setAttribute('aria-label', on ? '離開全螢幕' : '全螢幕'); wake();
});
for (const type of ['pointermove', 'pointerdown', 'keydown']) addEventListener(type, wake, { passive: true });

/* ---------------- 時間軸與回放 ---------------- */
const timeline = createTimeline($('tl-ruler'), {
  get: () => ({ data: lastData, coast: state.coast, t: viewTime(), now: now(), history: state.history, live: state.snapshot?.mode === 'live' }),
  onScrub(t) { stopPlay(); state.t = Math.abs(t - now()) < 10 * 60000 ? null : t; render({ instant: true }); },
  onRange(range) { if (range === 'month') ensureHistory(); },
  label: text => { $('tl-time').textContent = text; },
  kind: text => { $('tl-kind').textContent = text; },
});
async function ensureHistory() {
  if (state.history || state.snapshot?.mode !== 'live') { if (state.snapshot?.mode !== 'live') toast('展示模式沒有歷史觀測'); return; }
  try { state.history = (await loadHistory())?.history || {}; render(); if (!Object.keys(state.history).length) toast('目前只累積了 48 小時內的觀測'); }
  catch { toast('歷史觀測暫時無法取得'); }
}
function openTimeline(on) {
  $('timeline').hidden = !on; document.body.classList.toggle('timeline', on); $('time').setAttribute('aria-pressed', on);
  if (!on) { stopPlay(); state.t = null; render(); } else { timeline.update(true); $('tl-ruler').focus({ preventScroll: true }); }
}
$('time').addEventListener('click', () => openTimeline($('timeline').hidden));
$('tl-close').addEventListener('click', () => openTimeline(false));
$('tl-now').addEventListener('click', () => { stopPlay(); state.t = null; render(); });
$('tl-play').addEventListener('click', () => state.playing ? stopPlay() : startPlay());
function startPlay() {
  // 30 秒回放今天 00:00–24:00。過去的部分有潮位觀測就用觀測，其餘是預報插值
  const d0 = dayStart(now()), dur = motion.matches ? 6000 : 30000, start = performance.now();
  state.playingKind = state.snapshot?.mode === 'demo' ? '展示模式回放' : '潮汐預報回放';
  $('tl-play').querySelector('use').setAttribute('href', '#i-pause'); $('tl-play').setAttribute('aria-label', '停止回放');
  const tick = () => {
    const p = (performance.now() - start) / dur;
    if (p >= 1) { stopPlay(); return; }
    state.t = d0 + p * 86400000; render({ instant: true });
    state.playing = requestAnimationFrame(tick);
  };
  state.playing = requestAnimationFrame(tick);
}
function stopPlay() {
  if (!state.playing) return;
  cancelAnimationFrame(state.playing); state.playing = 0;
  $('tl-play').querySelector('use').setAttribute('href', '#i-play'); $('tl-play').setAttribute('aria-label', '以 30 秒回放今天');
  render();
}

/* ---------------- 分享 ---------------- */
let poster = { ori: innerWidth / innerHeight < .9 ? 'port' : 'land', blob: null, url: '' };
async function makePoster() {
  const t = viewTime(), data = dataFor(state.coast, t);
  $('poster-img').removeAttribute('src');
  for (const b of $('poster-ori').children) b.setAttribute('aria-checked', b.dataset.v === poster.ori);
  try {
    poster.blob = await buildPoster({ coast: state.coast, data, vs: stateFor(data, t), t, ori: poster.ori, demo: state.snapshot?.mode === 'demo', live: state.t == null });
    URL.revokeObjectURL(poster.url); poster.url = URL.createObjectURL(poster.blob);
    $('poster-img').src = poster.url; $('poster-img').alt = `${state.coast.name} ${ymd(t)} 的海景海報`;
    const file = new File([poster.blob], 'x.png', { type: 'image/png' });
    $('p-share').hidden = !(navigator.canShare && navigator.canShare({ files: [file] }));
  } catch { toast('圖片產生失敗'); }
}
$('share').addEventListener('click', () => { openSheet($('poster'), $('share')); makePoster(); });
$('poster-ori').addEventListener('click', e => { const b = e.target.closest('button'); if (b && b.dataset.v !== poster.ori) { poster.ori = b.dataset.v; makePoster(); } });
const fileName = () => `ocean-breath-${state.coast.id}-${ymd(viewTime())}-${poster.ori}.png`;
$('p-save').addEventListener('click', () => {
  if (!poster.blob) return;
  const a = document.createElement('a'); a.href = poster.url; a.download = fileName(); document.body.appendChild(a); a.click(); a.remove();
});
$('p-share').addEventListener('click', async () => {
  try { await navigator.share({ files: [new File([poster.blob], fileName(), { type: 'image/png' })], title: `海洋呼吸觀測所・${state.coast.name}`, url: shareUrl() }); }
  catch (e) { if (e.name !== 'AbortError') toast('分享失敗'); }
});
const shareUrl = () => `${location.origin}${location.pathname}?coast=${state.coast.id}`;
$('p-link').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(shareUrl()); toast('已複製連結'); } catch { toast(shareUrl()); }
});

/* ---------------- 開始 ---------------- */
setEnjoy(state.enjoy);
state.snapshot = demoSnapshot(state.demo); state.snapshot.pending = true;
mountScene(state.coast);
await load();
if (params.has('timeline')) openTimeline(true);
window.ocean = { bird: () => current?.scene.birdNow(), state };
