/* 資料總管：決定資料從哪裡來，並通知畫面。
   順序：瀏覽器快取（6 小時內）→ 站上每日快照（30 小時內）→ 官方 API（先抓一頁就能開始轉蛋，其餘背景補齊）
   全部失敗：有舊快取就用舊的並標示；完全沒有才進展示模式。 */
import { fetchPage, fetchAll, fetchById } from './api.js';
import { normalize, normalizeAll, unpack } from './normalize.js';
import { taipeiToday } from './eligibility.js';
import { TTL, isFresh } from './freshness.js';
import { demoAnimals } from './demo.js';
import { kv } from './store.js';

const params = new URLSearchParams(location.search);
export const state = {
  animals: [], byId: new Map(), today: taipeiToday(),
  ready: false,      // 至少有一批資料可用
  complete: false,   // 全部資料到齊
  mode: 'loading',   // live | snapshot | cache | stale | demo
  fetchedAt: 0, error: null,
};
const subs = new Set();
export const subscribe = fn => { subs.add(fn); return () => subs.delete(fn); };
const emit = () => subs.forEach(fn => fn(state));

function set(list, patch) {
  state.animals = list;
  state.byId = new Map(list.map(a => [a.id, a]));
  Object.assign(state, { ready: list.length > 0 }, patch);
  emit();
}
export function whenReady() {
  return state.ready || state.error ? Promise.resolve() : new Promise(res => { const off = subscribe(s => { if (s.ready || s.error) { off(); res(); } }); });
}
export function whenComplete() {
  return state.complete ? Promise.resolve() : new Promise(res => { const off = subscribe(s => { if (s.complete) { off(); res(); } }); });
}

async function fromSnapshot() {
  const meta = await fetch('data/meta.json', { cache: 'no-cache' }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (!meta || !isFresh(meta.fetchedAt, TTL.SNAPSHOT_MS)) return null;
  const snap = await fetch(`data/animals.json?t=${meta.fetchedAt}`).then(r => (r.ok ? r.json() : null)).catch(() => null);
  const list = snap ? unpack(snap) : [];
  return list.length ? { list, fetchedAt: meta.fetchedAt } : null;
}

async function fromLive() {
  const guess = Math.max(1, Number(localStorage.getItem('enc.pages')) || 8);
  const have = new Map();
  let first = Math.floor(Math.random() * guess), rows = await fetchPage(first);   // 隨機先抓一頁：不會每次都從同一批開始
  if (!rows.length && first) { first = 0; rows = await fetchPage(0); }
  if (!rows.length) throw new Error('empty dataset');
  have.set(first, rows);
  set(normalizeAll(rows), { mode: 'live', fetchedAt: Date.now() });
  const all = await fetchAll({ have });
  try { localStorage.setItem('enc.pages', String(Math.ceil(all.length / 1000))); } catch { /* ignore */ }
  return { list: normalizeAll(all), fetchedAt: Date.now() };
}

export async function load() {
  if (params.has('demo')) return useDemo(null);
  const forceLive = params.has('live'), failApi = params.has('fail');   // ?fail：測試 API 失敗
  const cache = await kv.get('animals');
  if (!forceLive && !failApi && cache?.list?.length && isFresh(cache.t, TTL.CACHE_MS)) {
    return set(cache.list, { complete: true, mode: 'cache', fetchedAt: cache.t });
  }
  try {
    if (failApi) throw new Error('simulated failure');
    const snap = forceLive ? null : await fromSnapshot();
    const got = snap || await fromLive();
    set(got.list, { complete: true, mode: snap ? 'snapshot' : 'live', fetchedAt: got.fetchedAt });
    kv.set('animals', { t: got.fetchedAt, list: got.list });
  } catch (e) {
    if (cache?.list?.length && !params.has('nocache')) set(cache.list, { complete: true, mode: 'stale', fetchedAt: cache.t, error: e });
    else if (state.ready) set(state.animals, { complete: true, error: e });   // 只抓到部分：先用這些
    else useDemo(e);
  }
}

function useDemo(error) {
  set(demoAnimals(state.today), { complete: true, mode: 'demo', fetchedAt: 0, error });
}

/* 用編號直接問官方 API（分享連結、確認收藏的動物還在不在） */
export async function lookup(id) {
  if (state.byId.has(id)) return state.byId.get(id);
  if (state.mode === 'demo') return null;
  const row = await fetchById(id);
  return row ? normalize(row) : null;
}
