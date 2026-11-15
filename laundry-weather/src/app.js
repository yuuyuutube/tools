// 介面與資料：地點、天氣請求、輪詢、展示模式、浮層。插畫在 scene.js，評分在 score.js。
import { publishedApi } from './published-weather.js';
import { createScene } from './scene.js';
import { laundryScore } from './score.js';
import { demoWeather } from './demo.js';
import { moonPhase, moonName } from './moon.js';
import { COUNTIES, DEFAULT_LOCATION, nearestForecast, readSavedLocation, saveLocation, geolocate } from './locations.js';

const $ = id => document.getElementById(id);
const icon = name => `<svg class="ic"><use href="#i-${name}"/></svg>`;
const POLL = 10 * 60 * 1000;
const pagesSource = location.hostname.endsWith('.github.io');
const motion = matchMedia('(prefers-reduced-motion: reduce)');

const scene = createScene($('scene'), { reduced: motion.matches, shot: new URLSearchParams(location.search).has('shot') });
if (motion.matches) scene.setReduced(true);
window.laundry = scene;          // 在主控台輸入 laundry.callBirds()、laundry.callButterfly() 可以立刻預覽
motion.addEventListener('change', e => scene.setReduced(e.matches));

// 夜晚：有即時資料時由伺服器判定；展示資料依臺灣現在的時間。月亮鈕或網址 ?night=1／0 可以手動預覽
const params = new URLSearchParams(location.search), forced = params.get('night');
const shot = params.has('shot');          // ?shot：只留插畫與站名，給 scripts/og.sh 截分享圖用
if (shot) document.body.classList.add('shot');
const nightNow = () => { const h = +new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Taipei', hour: '2-digit', hourCycle: 'h23' }).format(new Date()); return h < 6 || h >= 18; };
const state = { night: forced === '1' ? true : forced === '0' ? false : null, loc: readSavedLocation() || { ...DEFAULT_LOCATION }, weather: null, demo: 'sunny', server: true, busy: null, timer: 0 };

/* ---------------- 紙張顆粒：一小塊雜點鋪滿，不用濾鏡 ---------------- */
{
  const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), d = g.createImageData(160, 160);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random(); d.data[i] = d.data[i + 1] = d.data[i + 2] = v < .5 ? 30 : 255; d.data[i + 3] = Math.random() * 22; }
  g.putImageData(d, 0, 0); $('grain').style.backgroundImage = `url(${c.toDataURL()})`;
}

/* ---------------- 小提示（取代 alert） ---------------- */
let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 3600); }

/* ---------------- 天氣 ---------------- */
async function api(path, options) {
  if (pagesSource) return publishedApi(path, options);
  const r = await fetch(path, { ...options, headers: { Accept: 'application/json', ...options?.headers } });
  const type = r.headers.get('content-type') || '';
  if (!type.includes('json')) { const e = new Error('NO_SERVER'); e.noServer = true; throw e; }   // 純靜態主機：沒有代理
  const data = await r.json(); if (!r.ok) throw new Error(data.error || '暫時無法取得天氣');
  return data;
}

async function load({ manual = false } = {}) {
  state.busy?.abort(); const ctl = state.busy = new AbortController();
  $('refresh').classList.add('spin');
  try {
    let w, failed = false;
    const previous = state.weather;
    if (state.server) {
      try { w = await api(`./api/weather?county=${encodeURIComponent(state.loc.county)}&town=${encodeURIComponent(state.loc.town)}`, { signal: ctl.signal, refresh: manual }); }
      catch (e) {
        if (e.name === 'AbortError') return;
        failed = true;
        if (!pagesSource && (e.noServer || e instanceof TypeError)) state.server = false;
        else { toast(e.message); if (state.weather?.mode === 'live' && state.weather.county === state.loc.county && state.weather.town === state.loc.town) w = { ...state.weather, stale: true }; }
      }
    }
    if (!w || w.mode !== 'live') w = demoWeather(state.demo, state.loc);
    state.weather = w; render();
    if (manual && w.mode === 'live' && !failed) toast((w.publishedAt || w.fetchedAt) === (previous?.publishedAt || previous?.fetchedAt) ? '目前沒有更新的資料' : state.score.stale ? '已讀取較舊資料' : '已更新');
  } finally { if (state.busy === ctl) { state.busy = null; $('refresh').classList.remove('spin'); } }
}

const hm = iso => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(iso));
const md = iso => new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric' }).format(new Date(iso));
const num = (v, digits = 0) => typeof v === 'number' && Number.isFinite(v) ? v.toFixed(digits) : '—';

function render() {
  const live = state.weather.mode === 'live';
  const w = state.weather = { ...state.weather, isNight: state.night ?? (live ? !!state.weather.isNight : nightNow()) }, s = laundryScore(w);
  if (shot) { s.title = '晾晾日和'; s.detail = '今天適合曬衣服嗎？'; }
  if ($('title').textContent !== s.title) $('title').textContent = s.title;        // 文字沒變就不動，螢幕閱讀器不會重複播報
  $('detail').textContent = s.detail; $('detail').hidden = !s.detail;
  $('n-temp').textContent = num(w.temperature); $('n-hum').textContent = num(w.humidity);
  $('n-wind').textContent = num(w.windSpeed, 1); $('n-pop').textContent = num(w.pop);
  $('place-name').textContent = `${w.county} ${w.town}`;
  const flag = state.loc.origin === 'default' ? '預設' : ''; $('place-flag').textContent = flag; $('place-flag').hidden = !flag;
  const at = w.observedAt || w.fetchedAt;
  $('stamp').textContent = live ? `${md(at)} ${hm(at)}${s.expired ? ' 超過一天' : s.stale ? ' 較舊資料' : ''}` : '展示資料';
  $('demo').hidden = live;
  $('moon').setAttribute('aria-pressed', !!w.isNight);
  for (const b of $('demo').querySelectorAll('[data-demo]')) { const on = b.dataset.demo === state.demo; b.setAttribute('aria-checked', on); b.tabIndex = on ? 0 : -1; }
  document.body.classList.toggle('night', !!w.isNight);
  document.querySelector('meta[name="theme-color"]').content = w.isNight ? '#1f2c49' : { sunny: '#f4eedf', cloudy: '#ece8dc', humid: '#e2e1d3', rainy: '#d3d8d4' }[s.scene];
  scene.setWeather({ scene: s.scene, night: !!w.isNight, windSpeed: w.windSpeed ?? 0, windDirection: w.windDirection ?? null });
  state.score = s;
  clearTimeout(state.timer); if (live || pagesSource) state.timer = setTimeout(() => !document.hidden && load(), POLL);
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && state.weather?.mode === 'live' && Date.now() - Date.parse(state.weather.fetchedAt) > POLL) load(); });

/* ---------------- 地點 ---------------- */
async function setLocation(loc, { save = false } = {}) { state.loc = loc; if (save) saveLocation(loc); await load(); }

async function locate({ quiet = false } = {}) {
  const row = $('locate'); row.classList.add('busy');
  try {
    const point = await geolocate(); let found = null;      // 座標只留在這個函式裡，不寫入任何儲存
    if (state.server) {
      try { found = await api('./api/locate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(point) }); }
      catch (e) { if (!pagesSource && (e.noServer || e instanceof TypeError)) state.server = false; else throw e; }
    }
    if (!found) { found = nearestForecast(point, COUNTIES.map(c => ({ county: c.name, town: c.town, lat: c.lat, lon: c.lon }))); if (!found) throw new Error('離臺灣的預報區太遠，請手動選擇地點'); }
    closeSheet(); await setLocation({ county: found.county, town: found.town, origin: 'gps' });
  } catch (e) { if (!quiet) toast(e.message); else if (state.loc.origin === 'default') toast('沒有取得定位，先顯示預設地點'); }
  finally { row.classList.remove('busy'); }
}

/* ---------------- 浮層（取代原生 dialog／select） ---------------- */
let opened = null, opener = null;
function openSheet(node, from) {
  closeSheet(); opened = node; opener = from; node.hidden = false; $('veil').hidden = false;
  (node.querySelector('[aria-current="true"]') || node.querySelector('button'))?.focus({ preventScroll: true });
}
function closeSheet() { if (!opened) return; opened.hidden = true; $('veil').hidden = true; opened = null; opener?.focus({ preventScroll: true }); opener = null; }
$('veil').addEventListener('click', closeSheet);
document.addEventListener('click', e => { if (e.target.closest('[data-close]')) closeSheet(); });
document.addEventListener('keydown', e => {
  if (!opened) return;
  if (e.key === 'Escape') return closeSheet();
  if (e.key !== 'Tab') return;                             // 焦點留在浮層裡
  const f = [...opened.querySelectorAll('button:not([hidden]), a[href]')]; if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
});

function showCounties() {
  $('pick-title').textContent = ''; $('pick-back').hidden = true;
  $('pick-list').innerHTML = COUNTIES.map(c => `<button data-county="${c.name}"${c.name === state.loc.county ? ' aria-current="true"' : ''}>${c.name}</button>`).join('');
}
async function showTowns(county) {
  const list = $('pick-list'); let towns = null;
  $('pick-title').textContent = county; $('pick-back').hidden = false; list.innerHTML = `<div class="wait">${icon('refresh')}</div>`;
  if (state.server) {
    try { towns = (await api(`./api/locations?county=${encodeURIComponent(county)}`)).towns; }
    catch (e) { if (!pagesSource && (e.noServer || e instanceof TypeError)) state.server = false; else { toast(e.message); return showCounties(); } }
  }
  if (!towns?.length) { const c = COUNTIES.find(c => c.name === county); towns = [{ county, town: c.town }]; }
  if (opened !== $('picker') || $('pick-title').textContent !== county) return;
  if (towns.length === 1) { closeSheet(); return setLocation({ county, town: towns[0].town, origin: 'manual' }, { save: true }); }
  list.innerHTML = towns.map(t => `<button data-town="${t.town}"${county === state.loc.county && t.town === state.loc.town ? ' aria-current="true"' : ''}>${t.town}</button>`).join('');
  (list.querySelector('[aria-current="true"]') || list.firstChild)?.focus({ preventScroll: true });
}
$('place').addEventListener('click', () => { showCounties(); openSheet($('picker'), $('place')); });
$('pick-back').addEventListener('click', () => { showCounties(); $('pick-list').querySelector('[aria-current="true"]')?.focus(); });
$('pick-list').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  if (b.dataset.county) return showTowns(b.dataset.county);
  closeSheet(); setLocation({ county: $('pick-title').textContent, town: b.dataset.town, origin: 'manual' }, { save: true });
});
$('locate').addEventListener('click', () => locate());

$('info').addEventListener('click', () => {
  const w = state.weather, s = state.score, live = w.mode === 'live', rows = [];
  const historical = w.historicalForecast || (live && w.currentPeriod && Date.parse(w.currentPeriod.end) <= Date.now());
  rows.push(['info', live
    ? `<a href="https://opendata.cwa.gov.tw/" target="_blank" rel="noopener">中央氣象署開放資料</a><small>${w.station ? `${w.station.name}測站 ${w.station.distanceKm} km・${hm(w.observedAt)} 觀測` : '附近沒有可用測站，數值來自預報'}</small>`
    : `展示資料<small>固定的示範數值，不是即時天氣${state.server ? '' : '。這個網址沒有連上氣象代理'}</small>`]);
  if (w.currentPeriod) rows.push(['rain', `${historical ? `上次預報 ${md(w.currentPeriod.start)} ` : ''}${hm(w.currentPeriod.start)}–${hm(w.currentPeriod.end)} 降雨機率 ${num(w.pop)}%${live && !historical && !s.stale && s.risk !== null && s.risk > (w.pop ?? 0) ? `<small>未來六小時最高 ${s.risk}%</small>` : ''}`]);
  if (w.isNight) rows.push(['moon', `今晚是${moonName(moonPhase())}`]);
  rows.push(['sun', `晾衣分數 ${s.score}<small>本站自訂的生活參考，不是官方指數，也不預測晾乾時間</small>`]);
  for (const issue of w.issues || []) rows.push(['refresh', issue]);
  $('about-list').innerHTML = rows.map(([i, html]) => `<dt>${icon(i)}</dt><dd>${html}</dd>`).join('');
  openSheet($('about'), $('info'));
});

/* ---------------- 其他操作 ---------------- */
$('refresh').addEventListener('click', () => load({ manual: true }));

$('eye').addEventListener('click', () => {
  const bare = document.body.classList.toggle('bare');
  $('eye').setAttribute('aria-pressed', bare); $('eye').setAttribute('aria-label', bare ? '顯示數值' : '隱藏數值');
  $('eye').firstElementChild.firstElementChild.setAttribute('href', bare ? '#i-eye-off' : '#i-eye');
  try { localStorage.setItem('laundry-bare', bare ? '1' : ''); } catch { /* 無痕模式 */ }
});
try { if (localStorage.getItem('laundry-bare')) $('eye').click(); } catch { /* 無痕模式 */ }

function pickDemo(name) { state.demo = name; state.weather = demoWeather(name, state.loc); render(); }
$('demo').addEventListener('click', e => { const b = e.target.closest('[data-demo]'); if (b) pickDemo(b.dataset.demo); });
$('moon').addEventListener('click', () => { state.night = !state.weather.isNight; render(); });
$('demo').addEventListener('keydown', e => {
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
  if (!e.target.dataset.demo) return;
  e.preventDefault(); const all = [...$('demo').querySelectorAll('[data-demo]')], i = all.findIndex(b => b.dataset.demo === state.demo);
  const next = all[(i + d + all.length) % all.length]; pickDemo(next.dataset.demo); next.focus();
});

const root = document.documentElement, canFull = root.requestFullscreen || root.webkitRequestFullscreen;
const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
if (!canFull) $('full').hidden = true;
$('full').addEventListener('click', async () => {
  try { if (isFull()) await (document.exitFullscreen || document.webkitExitFullscreen).call(document); else await canFull.call(root); }
  catch { toast('這個瀏覽器不能進入全螢幕'); }
});
let idleTimer = 0;
function wake() { document.body.classList.remove('idle'); clearTimeout(idleTimer); if (isFull() && !opened) idleTimer = setTimeout(() => document.body.classList.add('idle'), 4000); }
for (const type of ['fullscreenchange', 'webkitfullscreenchange']) document.addEventListener(type, () => {
  const on = isFull(); $('full').firstElementChild.firstElementChild.setAttribute('href', on ? '#i-unfull' : '#i-full');
  $('full').setAttribute('aria-label', on ? '離開全螢幕' : '全螢幕'); wake();
});
for (const type of ['pointermove', 'pointerdown', 'keydown']) addEventListener(type, wake, { passive: true });

/* ---------------- 開始 ---------------- */
if (shot) state.server = false;          // 分享圖固定用晴天的展示場景
state.weather = demoWeather(state.demo, state.loc); render();     // 先有畫面，資料到了再換
await load();
if (state.loc.origin === 'default' && !shot) locate({ quiet: true });
