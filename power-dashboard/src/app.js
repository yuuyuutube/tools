// 介面：資料輪詢、供電狀態牌、六宮格、動畫迴圈、NPC 對話、單座詳細、說明。
import { PLANTS, shares } from './classify.js';
import { animationState, approach } from './state.js';
import { candidates, eventLines, readTime, Scheduler, CAST } from './npc.js';
import { detectEvents } from './events.js';
import { merge, pointOf, coverage, ago } from './history.js';
import { createScene } from './scenes/index.js';
import { loadSnapshot } from './api.js';
import { demoSnapshot } from './demo.js';
import { INFO, COMP_NAME } from './plants.js';
import { sunPosition } from './sun.js';
import { clamp, hm, mdhm, wan, pct, taipeiHours, sameDay } from './util.js';
import { INDICATORS } from './supply.js';

const $ = id => document.getElementById(id);
const params = new URLSearchParams(location.search);
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get(k) { try { return JSON.parse(localStorage.getItem('power:' + k)); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('power:' + k, JSON.stringify(v)); } catch { /* 私密模式 */ } },
};
const LAT = 23.7, LON = 120.96;
const POLL = 5 * 60000;

// ?shot：截分享圖用，固定展示資料、只留插畫與標題
const SHOT = params.has('shot');
const S = {
  mode: params.has('demo') || SHOT ? 'demo' : store.get('mode') === 'demo' ? 'demo' : 'live',
  demo: params.get('demo') || 'day', auto: false,
  snap: null, error: null, loading: true, history: [], prevLight: null, loadedAt: Date.now(),
  anim: null, level: Object.fromEntries(PLANTS.map(p => [p, 0])), enjoy: !!store.get('enjoy'),
  tiles: {}, detail: null, talk: null, timer: 0,
};
const sched = new Scheduler();

/* ---------------- 紙張顆粒 ---------------- */
{
  const c = document.createElement('canvas'); c.width = c.height = 180; const g = c.getContext('2d'), d = g.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = Math.random(); d.data[i] = d.data[i + 1] = d.data[i + 2] = v < .5 ? 40 : 255; d.data[i + 3] = Math.random() * 22; }
  g.putImageData(d, 0, 0);
  const grain = document.createElement('div'); grain.id = 'grain'; grain.style.backgroundImage = `url(${c.toDataURL()})`;
  Object.assign(grain.style, { position: 'fixed', inset: 0, pointerEvents: 'none', opacity: .55, mixBlendMode: 'multiply', zIndex: 5 });
  $('app').appendChild(grain);
}

let toastTimer = 0;
function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('on'), 4200); }

/* ---------------- 時鐘：展示模式用固定的展示時間繼續走 ---------------- */
const clock = () => S.snap?.mode === 'demo' && S.snap.clock ? S.snap.clock + (Date.now() - S.loadedAt) : Date.now();
function sky() {
  const sun = sunPosition(clock(), LAT, LON);
  return { sun, night: clamp((4 - sun.elevation) / 12, 0, 1) };
}

/* ---------------- 六宮格 ---------------- */
function buildGrid() {
  const tpl = $('tile-tpl');
  for (const p of PLANTS) {
    const node = tpl.content.firstElementChild.cloneNode(true);
    node.dataset.plant = p;
    node.querySelector('.name').textContent = INFO[p].name;
    $('grid').appendChild(node);
    const scene = createScene(node.querySelector('.art'), p);
    const tile = { p, node, scene, bubble: node.querySelector('.bubble') };
    S.tiles[p] = tile;
    node.addEventListener('click', () => openDetail(p));
    node.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(p); } });
    scene.npc.hit.addEventListener('click', e => { e.stopPropagation(); poke(p); });
  }
}

function plantLabel(p, a) {
  const name = INFO[p].name;
  if (!a || a.state === 'missing') return `${name}：資料暫缺`;
  return `${name}：${wan(a.mw)} 萬瓩${a.share !== null ? `，占 ${pct(a.share)}%` : ''}`;
}

function stateLabel(p, a, night) {
  if (S.loading && !S.snap) return null;
  if (!a || a.state === 'missing') return ['#i-question', '資料缺'];
  if (a.state === 'off') return p === 'solar' && night > .5 ? ['#i-moon', '夜間休息'] : ['#i-pause', '未發電'];
  if (S.anim?.fresh === 'stale' || S.anim?.fresh === 'gone') return ['#i-clock', '資料較舊'];
  return null;
}

function renderTiles() {
  const A = S.anim, { night } = sky();
  for (const p of PLANTS) {
    const t = S.tiles[p], a = A?.plants[p];
    t.node.dataset.state = a?.state || 'missing';
    t.node.classList.toggle('loading', S.loading && !S.snap);
    t.node.classList.toggle('stale', A?.fresh === 'stale' || A?.fresh === 'gone');
    t.node.querySelector('.mw').textContent = a && a.mw !== null ? wan(a.mw) : '—';
    t.node.querySelector('.share').textContent = a && a.share !== null && a.state !== 'off' ? `${pct(a.share)}%` : '';
    const st = stateLabel(p, a, night), el = t.node.querySelector('.state');
    el.hidden = !st;
    if (st) { el.querySelector('use').setAttribute('href', st[0]); el.querySelector('span').textContent = st[1]; }
    t.node.setAttribute('aria-label', plantLabel(p, a) + (st ? `，${st[1]}` : '') + '。開啟詳細');
  }
}

/* ---------------- 供電狀態牌 ---------------- */
function renderBoard() {
  const s = S.snap?.supply, g = S.snap?.generation;
  $('load').textContent = s?.load != null ? s.load.toLocaleString('zh-TW', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—';
  $('util').textContent = s?.util ?? '—';
  const light = s?.peak?.light;
  $('peak-box').dataset.tone = light?.tone || 'unknown';
  $('light').textContent = light ? (light.label || `燈號 ${light.code}`) : '—';
  $('resv').textContent = s?.peak?.rate != null ? s.peak.rate.toFixed(2) : '—';
  $('peak-box').title = `今日預估尖峰${s?.peak?.hours ? `（${s.peak.hours}）` : ''}備轉容量率與台電燈號，不是此刻的狀態`;
  // 更新時間：用電資料時間；發電資料時間不同時一起標
  const times = [s?.at, g?.at].filter(Boolean).map(Date.parse);
  const oldest = times.length ? Math.min(...times) : null;
  const fmt = t => sameDay(t, Date.now()) ? hm(t) : mdhm(t);
  let txt = '—';
  if (s?.at && g?.at && Math.abs(Date.parse(s.at) - Date.parse(g.at)) > 5 * 60000) txt = `${fmt(Date.parse(s.at))}／${fmt(Date.parse(g.at))}`;
  else if (oldest) txt = fmt(oldest);
  $('stamp-t').textContent = txt;
  $('stamp').classList.toggle('old', S.anim?.fresh === 'stale' || S.anim?.fresh === 'gone');
  $('stamp').title = `用電資料 ${s?.at ? mdhm(Date.parse(s.at)) : '—'}；機組發電資料 ${g?.at ? mdhm(Date.parse(g.at)) : '—'}`;
  $('load-box').setAttribute('aria-label', `目前用電功率 ${$('load').textContent} 萬瓩`);
  $('badge').hidden = S.snap?.mode !== 'demo' && !(S.mode === 'demo');
  $('badge').textContent = S.auto ? '展示資料（未連上資料來源）' : '展示資料';
  $('demo').hidden = S.mode !== 'demo';
  for (const b of $('demo').querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.v === S.demo));
}

/* ---------------- 資料 ---------------- */
async function refresh({ manual = false } = {}) {
  clearTimeout(S.timer);
  if (manual) $('refresh').classList.add('spin');
  let snap = null, error = null;
  if (S.mode === 'demo') {
    if (S.demo === 'offline') error = 'demo-offline';
    else snap = demoSnapshot(S.demo);
  } else {
    try {
      snap = await loadSnapshot();
      if (!snap) { S.auto = true; S.mode = 'demo'; snap = demoSnapshot(S.demo); }
    } catch { error = 'fetch'; }
  }
  $('refresh').classList.remove('spin');
  S.loading = false;
  if (error) {
    S.error = error;
    if (error === 'demo-offline') { S.snap = null; S.history = []; }
    toast(S.snap ? '暫時無法取得最新台電資料，先顯示上一次的資料。' : '暫時無法取得台電資料，稍後會自動再試。');
  } else {
    const prevMode = S.snap?.mode;
    S.error = null;
    if (snap.mode !== prevMode) { S.history = []; S.prevLight = null; }
    S.snap = snap; S.loadedAt = Date.now();
    S.history = merge(S.history, snap.history || [], clock());
    const pt = pointOf(snap); if (pt) S.history = merge(S.history, [pt], clock());
    if (snap.mode === 'live' && snap.issues?.length) {
      if (snap.issues.includes('generation-unavailable')) toast('機組發電資料暫時無法取得。');
      else if (snap.issues.includes('supply-unavailable')) toast('今日電力資訊暫時無法取得。');
    }
    // 事件
    const light = snap.supply?.peak?.light?.code || null;
    for (const ev of detectEvents({ history: S.history, prevLight: S.prevLight, light, now: clock() })) {
      sched.push(eventLines(ev));
      if (ev.type === 'light') { const b = $('peak-box'); b.classList.remove('flip'); void b.offsetWidth; b.classList.add('flip'); announce(`今日預估尖峰燈號更新：${snap.supply.peak.light.label || light}`); }
    }
    if (S.prevLight === null && light) announce(summary());
    S.prevLight = light;
    if (manual) toast(S.snap.mode === 'demo' ? '已切換展示資料。' : '已更新台電資料。');
  }
  const first = !S.anim?.total;
  S.anim = animationState(S.snap, clock());
  // 第一次拿到資料：動畫直接從該有的節奏開始；之後的更新才慢慢過渡
  if (first && S.anim.total) for (const p of PLANTS) S.level[p] = S.anim.plants[p].level;
  renderBoard(); renderTiles();
  if (S.detail) renderDetail();
  dirty = true;
  if (S.mode === 'live' || S.auto) S.timer = setTimeout(refresh, POLL);
}

function summary() {
  const s = S.snap?.supply;
  if (!s) return '';
  return `目前用電功率 ${s.load ?? '—'} 萬瓩，供電使用率 ${s.util ?? '—'}%，今日預估尖峰備轉容量率 ${s.peak?.rate ?? '—'}%，${s.peak?.light?.label || ''}。`;
}
function announce(text) { $('sr').textContent = ''; setTimeout(() => { $('sr').textContent = text; }, 60); }

/* ---------------- NPC 對話 ---------------- */
function npcCtx() {
  const { night } = sky();
  return { plants: S.anim.plants, night: night > .5, hour: taipeiHours(clock()), light: S.snap?.supply?.peak?.light || null, peakHours: S.snap?.supply?.peak?.hours, fresh: S.error && !S.snap ? 'gone' : S.anim.fresh, charging: S.anim.plants.other.charging };
}

function baseMood(p) {
  const a = S.anim?.plants[p], { night } = sky();
  if (!S.snap || !a) return 'think';
  if (S.anim.fresh === 'gone') return 'think';
  if (a.state === 'missing') return 'think';
  if (a.state === 'off') return p === 'solar' && night > .5 ? 'sleep' : 'calm';
  return a.state === 'high' ? 'happy' : 'calm';
}

function scenesOf(p) { const list = [S.tiles[p]]; if (S.detail?.p === p) list.push(S.detail); return list; }

function placeBubble(view, text) {
  const b = view.bubble, host = b.parentElement;
  b.textContent = text;
  const hr = view.scene.npc.head.getBoundingClientRect(), cr = host.getBoundingClientRect();
  if (!cr.width || !hr.width) return;
  const bw = b.offsetWidth, bh = b.offsetHeight;
  const cx = hr.left + hr.width / 2 - cr.left;
  const left = clamp(cx - bw / 2, 8, cr.width - bw - 8);
  const top = Math.max(8, hr.top - cr.top - bh - 12);
  b.style.left = left + 'px'; b.style.top = top + 'px';
  b.style.setProperty('--tx', clamp(cx - left, 14, bw - 14) + 'px');
}

function stopTalk() {
  if (!S.talk) return;
  clearTimeout(S.talk.timer);
  for (const p of PLANTS) for (const v of scenesOf(p)) { v.bubble.classList.remove('on'); v.scene.npc.talk(false); v.scene.npc.setMood(baseMood(p)); }
  S.talk = null;
}

function play(dialog) {
  stopTalk();
  const talk = S.talk = { timer: 0 };
  let i = 0;
  const step = () => {
    if (S.talk !== talk) return;
    for (const p of PLANTS) for (const v of scenesOf(p)) { v.bubble.classList.remove('on'); v.scene.npc.talk(false); v.scene.npc.setMood(baseMood(p)); }
    const line = dialog.lines[i++];
    if (!line) { S.talk = null; return; }
    for (const v of scenesOf(line.plant)) {
      placeBubble(v, line.text);
      v.bubble.classList.add('on');
      v.scene.npc.setMood(line.mood === 'sleep' ? 'sleep' : line.mood || 'calm');
      if (line.mood !== 'sleep') v.scene.npc.talk(!motion.matches);
      if (line.jump && !motion.matches) v.scene.npc.jump();
    }
    talk.timer = setTimeout(() => {
      for (const v of scenesOf(line.plant)) { v.bubble.classList.remove('on'); v.scene.npc.talk(false); }
      talk.timer = setTimeout(step, 600);
    }, readTime(line.text));
  };
  step();
}

function poke(p) {
  if (!S.anim) return;
  const pick = sched.poke(p, candidates(npcCtx()));
  if (pick) play(pick);
}

/* ---------------- 動畫迴圈 ---------------- */
let last = 0, dirty = true, raf = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  if (document.hidden) return;
  const still = motion.matches;
  if (now - last < 31 && !dirty) return;          // 約 30 fps，長時間開著比較省電
  const dt = Math.min(.1, (now - last) / 1000 || 0); last = now;
  const t = now / 1000, { sun, night } = sky();
  const A = S.anim;
  for (const p of PLANTS) {
    const a = A?.plants[p] || { level: 0, state: 'missing' };
    S.level[p] = still ? a.level : approach(S.level[p], a.level, dt, 8);
    const arg = { level: S.level[p], state: a.state, night, sun, speed: 1, components: a.components, charging: a.charging };
    for (const v of scenesOf(p)) {
      if (still) { if (dirty) { v.scene.update(t, 0, arg); v.scene.npc.update(t, 0, true, arg); } }
      else { v.scene.update(t, dt, arg); v.scene.npc.update(t, dt, false, arg); }
    }
  }
  if (still && dirty) for (const p of PLANTS) for (const v of scenesOf(p)) if (!S.talk) v.scene.npc.setMood(baseMood(p));
  dirty = false;
  // 對話排程
  if (A && !S.talk && !SHOT) {
    for (const p of PLANTS) for (const v of scenesOf(p)) if (v.scene.npc.mood !== baseMood(p)) v.scene.npc.setMood(baseMood(p));
    const d = sched.tick(candidates(npcCtx()), false);
    if (d) play(d);
  }
}

/* ---------------- 單座發電廠 ---------------- */
function openDetail(p) {
  if (S.detail) return;
  const tile = S.tiles[p];
  const box = $('detail'), art = box.querySelector('.d-art');
  art.dataset.plant = p; box.querySelector('.d-info').style.setProperty('--key', getComputedStyle(tile.node).getPropertyValue('--key'));
  box.style.setProperty('--key', getComputedStyle(tile.node).getPropertyValue('--key'));
  const scene = createScene(art, p);
  S.detail = { p, scene, bubble: art.querySelector('.bubble'), from: tile.node };
  scene.npc.hit.addEventListener('click', e => { e.stopPropagation(); poke(p); });
  renderDetail();
  $('veil').hidden = false; box.hidden = false;
  if (S.talk) stopTalk();
  dirty = true;
  // 放大：從格子的位置長成整個畫面
  const from = tile.node.getBoundingClientRect(), to = box.getBoundingClientRect();
  if (!motion.matches) {
    box.classList.add('opening');
    const anim = box.animate([
      { clipPath: `inset(${from.top - to.top}px ${to.right - from.right}px ${to.bottom - from.bottom}px ${from.left - to.left}px round 16px)` },
      { clipPath: 'inset(0 0 0 0 round 18px)' },
    ], { duration: 460, easing: 'cubic-bezier(.2,.8,.2,1)' });
    anim.onfinish = () => box.classList.remove('opening');
  }
  tile.node.classList.add('away');
  box.querySelector('[data-close]').focus({ preventScroll: true });
  setTimeout(() => { if (S.detail?.p === p && !S.talk) poke(p); }, motion.matches ? 300 : 900);
}

function closeDetail() {
  const d = S.detail; if (!d) return;
  const box = $('detail');
  stopTalk();
  const finish = () => {
    box.hidden = true; $('veil').hidden = true; box.classList.remove('closing');
    d.scene.svg.remove(); d.from.classList.remove('away'); S.detail = null;
    d.from.focus({ preventScroll: true });
  };
  if (motion.matches) return finish();
  box.classList.add('closing');
  const from = d.from.getBoundingClientRect(), to = box.getBoundingClientRect();
  const anim = box.animate([
    { clipPath: 'inset(0 0 0 0 round 18px)' },
    { clipPath: `inset(${from.top - to.top}px ${to.right - from.right}px ${to.bottom - from.bottom}px ${from.left - to.left}px round 16px)` },
  ], { duration: 380, easing: 'cubic-bezier(.4,0,.2,1)' });
  $('veil').animate([{ opacity: 1 }, { opacity: 0 }], { duration: 380 });
  anim.onfinish = finish;
}

function renderDetail() {
  const d = S.detail; if (!d) return;
  const p = d.p, a = S.anim?.plants[p], c = S.snap?.generation?.categories?.[p], { night } = sky();
  $('d-name').textContent = INFO[p].name;
  $('d-mw').textContent = a?.mw != null ? wan(a.mw) : '—';
  $('d-share').textContent = a?.share != null && a.state !== 'off' ? `${pct(a.share)}%` : '';
  const st = stateLabel(p, a, night), ds = $('d-state');
  ds.hidden = !st;
  if (st) ds.innerHTML = `<svg class="ic"><use href="${st[0]}"/></svg><span></span>`, ds.querySelector('span').textContent = st[1] + (st[1] === '未發電' ? '：可能是調度、檢修或其他原因' : '');
  $('d-cf').textContent = c?.cf != null ? `${pct(c.cf, 1)}%` : '—';
  $('d-units').textContent = c ? `${c.reporting}／${c.units}` : '—';
  $('d-intro').textContent = INFO[p].intro;
  renderSpark(p);
  // 工坊：各項目
  const comps = $('d-comps');
  comps.hidden = p !== 'other' || !c;
  if (p === 'other' && c) {
    comps.textContent = '';
    const entries = Object.entries(c.components || {}).sort((x, y) => y[1].mw - x[1].mw);
    const max = Math.max(1, ...entries.map(([, v]) => v.mw));
    for (const [k, v] of entries) comps.appendChild(compRow(COMP_NAME[k] || k, v.mw, v.mw / max));
    const load = S.snap.generation.storageLoad;
    if (load != null && load < -1) { const r = compRow('儲能充電／抽水（耗電，不計入發電）', load, 0); r.classList.add('charge'); comps.appendChild(r); }
  }
  // 機組
  const ol = $('d-list'); ol.textContent = '';
  for (const u of (c?.list || []).slice(0, 80)) {
    const li = document.createElement('li');
    const name = document.createElement('span'); name.textContent = u.n;
    if (u.r) { const em = document.createElement('em'); em.textContent = u.r; name.appendChild(em); }
    const v = document.createElement('b'); v.textContent = u.m == null ? '—' : `${u.m.toLocaleString('zh-TW', { maximumFractionDigits: 1 })} MW`;
    const bar = document.createElement('i'), fill = document.createElement('s');
    fill.style.width = u.c && u.m != null ? `${clamp(u.m / u.c, 0, 1) * 100}%` : '0';
    bar.appendChild(fill);
    li.append(name, v, bar);
    if (!u.m) li.classList.add('zero');
    ol.appendChild(li);
  }
}

function compRow(name, mw, k) {
  const row = document.createElement('div'); row.className = 'comp';
  const n = document.createElement('span'); n.textContent = name;
  const bar = document.createElement('i'), s = document.createElement('s'); s.style.width = `${clamp(k, 0, 1) * 100}%`; bar.appendChild(s);
  const v = document.createElement('b'); v.textContent = `${wan(mw)} 萬瓩`;
  row.append(n, bar, v); return row;
}

function renderSpark(p) {
  const svg = $('d-spark'), cap = $('d-trend-cap');
  svg.textContent = '';
  const pts = S.history.filter(h => h.gen?.[p] != null);
  if (pts.length < 2) { cap.innerHTML = '<span>最近變化：資料累積中</span>'; return; }
  const t0 = Date.parse(pts[0].t), t1 = Date.parse(pts[pts.length - 1].t);
  const vals = pts.map(h => h.gen[p]), lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || Math.max(1, hi * .1);
  const xy = pts.map(h => [((Date.parse(h.t) - t0) / Math.max(1, t1 - t0)) * 300, 64 - ((h.gen[p] - lo) / span) * 56]);
  const d = 'M' + xy.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L');
  const ns = 'http://www.w3.org/2000/svg';
  const area = document.createElementNS(ns, 'path'); area.setAttribute('d', `${d}L300 70L0 70Z`); area.setAttribute('class', 'spark-area');
  const line = document.createElementNS(ns, 'path'); line.setAttribute('d', d); line.setAttribute('class', 'spark-line');
  svg.append(area, line);
  const cov = coverage(pts);
  const before = ago(S.history, p, 60);
  const now = vals[vals.length - 1];
  const fmt = t => sameDay(t, clock()) ? hm(t) : mdhm(t);
  cap.textContent = '';
  const l = document.createElement('span'); l.textContent = `${fmt(Date.parse(cov.from))}–${fmt(Date.parse(cov.to))}・${cov.n} 筆${S.snap?.mode === 'demo' ? '（展示）' : ''}`;
  cap.appendChild(l);
  if (before != null) {
    const r = document.createElement('span'), diff = (now - before) / 10;
    r.innerHTML = '一小時 <b></b>';
    r.querySelector('b').textContent = `${diff >= 0 ? '+' : ''}${diff.toFixed(1)} 萬瓩`;
    cap.appendChild(r);
  }
}

/* ---------------- 說明 ---------------- */
function openAbout() {
  const s = S.snap?.supply, g = S.snap?.generation, list = $('about-list');
  list.textContent = '';
  const row = (icon, html) => { const dt = document.createElement('dt'); dt.innerHTML = `<svg class="ic"><use href="${icon}"/></svg>`; const dd = document.createElement('dd'); dd.innerHTML = html; list.append(dt, dd); };
  const esc = v => String(v ?? '—').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const time = t => t ? mdhm(Date.parse(t)) : '—';
  if (S.snap?.mode === 'demo' || S.mode === 'demo') row('#i-flask', `<b>目前顯示展示資料</b><small>固定的示範數字與情境，不是台電即時資料。${S.auto ? '這個網址沒有連上資料來源。' : ''}</small>`);
  row('#i-bolt', `<b>目前用電功率 ${esc($('load').textContent)} 萬瓩</b><small>某一時刻的電力「功率」（1 萬瓩＝10 MW），不是今天累積的用電度數。資料時間 ${esc(time(s?.at))}。</small>`);
  row('#i-gauge', `<b>供電使用率 ${esc(s?.util)}%</b><small>台電公布的目前供電使用率。</small>`);
  const lights = Object.entries(INDICATORS).map(([k, v]) => `<span class="legend" data-tone="${v.tone}"><i class="lamp"></i>${v.label}</span>`).join('');
  row('#i-peak', `<b>今日預估尖峰備轉容量率 ${esc(s?.peak?.rate)}%・${esc(s?.peak?.light?.label || s?.peak?.light?.code)}</b><small>台電對「今天尖峰時段${s?.peak?.hours ? `（${esc(s.peak.hours)}）` : ''}」的預估與官方燈號，不是此刻的狀態。本站照官方燈號顯示，不自行判斷。</small><small>${lights}</small>`);
  const total = g?.total;
  row('#i-layers', `<b>六座發電廠＝各機組淨發電量分類加總${total ? `，共 ${wan(total)} 萬瓩` : ''}</b><small>燃氣（含民營）、燃煤（含民營）、太陽能、風力、水力（慣常水力）、其他（儲能、汽電共生、燃料油、其它再生能源、核能）。每部機組只算一次，官方「小計」列不重複加總。占比的分母是六類合計，不是目前用電。兩者的資料時間與統計範圍不同，加總不一定相等。資料時間 ${esc(time(g?.at))}。</small>${g?.unclassified?.length ? `<small>未分類類型：${esc(g.unclassified.join('、'))}</small>` : ''}`);
  row('#i-play', '<b>動畫怎麼讀</b><small>機器、風車、水流、輸送帶的節奏只表示該能源「淨發電／裝置容量」的活躍程度，不是風速、水量或排放量。太陽與天色只跟臺灣時間有關。</small>');
  row('#i-source', `<b>資料來源：台灣電力公司</b><small><a href="https://data.gov.tw/dataset/8931" target="_blank" rel="noopener">各機組發電量</a>、<a href="https://data.gov.tw/dataset/162595" target="_blank" rel="noopener">今日電力資訊</a>（政府資料開放平臺）。官方約每 10 分鐘更新，本頁每 5 分鐘檢查一次。${S.snap?.delivery === 'github-actions' ? '此網址讀取 GitHub Actions 定期抓取的官方資料快照，可能晚幾分鐘。' : ''}</small>`);
  for (const b of $('mode').querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.v === (S.mode === 'demo' && !S.auto ? 'demo' : S.auto ? 'demo' : 'live')));
  openSheet($('about'));
}

let lastFocus = null;
function openSheet(el) { lastFocus = document.activeElement; $('veil').hidden = false; el.hidden = false; el.querySelector('[data-close]').focus({ preventScroll: true }); }
function closeSheet(el) { el.hidden = true; if (!S.detail) $('veil').hidden = true; lastFocus?.focus?.({ preventScroll: true }); }

/* ---------------- 操作 ---------------- */
function setEnjoy(v) { S.enjoy = v; document.body.classList.toggle('enjoy', v); $('enjoy').setAttribute('aria-pressed', String(v)); $('enjoy').querySelector('use').setAttribute('href', v ? '#i-eye-off' : '#i-eye'); store.set('enjoy', v); }

function bind() {
  $('enjoy').addEventListener('click', () => setEnjoy(!S.enjoy));
  $('full').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else document.documentElement.requestFullscreen?.().catch(() => toast('這個瀏覽器不支援全螢幕。'));
  });
  if (!document.documentElement.requestFullscreen) $('full').hidden = true;
  document.addEventListener('fullscreenchange', () => { const on = !!document.fullscreenElement; $('full').querySelector('use').setAttribute('href', on ? '#i-unfull' : '#i-full'); $('full').setAttribute('aria-label', on ? '離開全螢幕' : '全螢幕'); poke_idle(); });
  $('info').addEventListener('click', openAbout);
  $('refresh').addEventListener('click', () => refresh({ manual: true }));
  for (const b of $('mode').querySelectorAll('button')) b.addEventListener('click', () => {
    const v = b.dataset.v;
    S.mode = v; S.auto = false; store.set('mode', v);
    for (const x of $('mode').querySelectorAll('button')) x.setAttribute('aria-checked', String(x === b));
    sched.queue.length = 0; stopTalk(); refresh({ manual: true });
  });
  for (const b of $('demo').querySelectorAll('button')) b.addEventListener('click', () => { S.demo = b.dataset.v; sched.queue.length = 0; stopTalk(); refresh(); });
  $('demo').addEventListener('keydown', e => {
    const bs = [...$('demo').querySelectorAll('button')], i = bs.findIndex(x => x.dataset.v === S.demo);
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); const n = bs[(i + (e.key === 'ArrowRight' ? 1 : -1) + bs.length) % bs.length]; n.focus(); n.click(); }
  });
  $('detail').querySelector('[data-close]').addEventListener('click', closeDetail);
  $('about').querySelector('[data-close]').addEventListener('click', () => closeSheet($('about')));
  $('veil').addEventListener('click', () => { if (!$('about').hidden) closeSheet($('about')); else closeDetail(); });
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('about').hidden) closeSheet($('about')); else if (S.detail) closeDetail();
  });
  // 對話框內的 Tab 不跑出去
  for (const box of [$('detail'), $('about')]) box.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const f = [...box.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])')].filter(x => !x.hidden && x.offsetParent !== null);
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    last = performance.now(); dirty = true;
    if ((S.mode === 'live' || S.auto) && Date.now() - S.loadedAt > POLL) refresh();
  });
  motion.addEventListener?.('change', () => { dirty = true; });
  let rt = 0;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { dirty = true; if (S.talk) stopTalk(); }, 120); });
  // 全螢幕時，一陣子沒動作就把按鈕收起來
  for (const ev of ['pointermove', 'pointerdown', 'keydown']) addEventListener(ev, poke_idle, { passive: true });
}
let idleTimer = 0;
function poke_idle() {
  document.body.classList.remove('idle'); clearTimeout(idleTimer);
  if (document.fullscreenElement) idleTimer = setTimeout(() => document.body.classList.add('idle'), 4000);
}

/* ---------------- 開始 ---------------- */
if (SHOT) {
  document.body.classList.add('shot');
  const h = document.createElement('h1'); h.className = 'shot-title'; h.textContent = '台灣發電中！';
  $('app').insertBefore(h, $('grid'));
}
buildGrid(); bind(); setEnjoy(S.enjoy && !SHOT);
renderBoard(); renderTiles();
raf = requestAnimationFrame(frame);
refresh();

// 主控台小工具
window.power = { say: p => poke(p || PLANTS[Math.floor(Math.random() * 6)]), cast: CAST, state: () => S };
