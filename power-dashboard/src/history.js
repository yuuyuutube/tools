// 快照歷史：只保存真的收到過的資料點，不補值、不推估。
import { PLANTS } from './classify.js';

const MAX_AGE = 26 * 3600000;
const TZ = 'Asia/Taipei';
const ymd = t => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
export const dayStart = t => Date.parse(ymd(t) + 'T00:00:00+08:00');

/** 由一份快照取出歷史點：t 是發電資料時間，load 只有在用電資料時間相近（±15 分）時才附上 */
export function pointOf(snap) {
  const g = snap?.generation;
  if (!g?.at) return null;
  const gen = {};
  for (const p of PLANTS) gen[p] = g.categories?.[p]?.mw ?? null;
  const p = { t: g.at, gen };
  const s = snap.supply;
  if (s?.at && s.load !== null && Math.abs(Date.parse(s.at) - Date.parse(g.at)) <= 15 * 60000) p.load = s.load;
  return p;
}

export function addPoint(list, point, now = Date.now()) {
  const map = new Map((list || []).map(p => [p.t, p]));
  if (point?.t) map.set(point.t, { ...map.get(point.t), ...point });
  return [...map.values()].filter(p => now - Date.parse(p.t) <= MAX_AGE).sort((a, b) => Date.parse(a.t) - Date.parse(b.t));
}

export function merge(a, b, now = Date.now()) {
  let out = a || [];
  for (const p of b || []) out = addPoint(out, p, now);
  return out;
}

export function coverage(list) {
  if (!list?.length) return null;
  return { from: list[0].t, to: list[list.length - 1].t, n: list.length };
}

/** 某類 minutes 分鐘前（±12 分內最近的一點）的數值；沒有就回傳 null */
export function ago(list, key, minutes, tol = 12) {
  if (!list?.length) return null;
  const last = list[list.length - 1], target = Date.parse(last.t) - minutes * 60000;
  let best = null, bd = Infinity;
  for (const p of list) { const d = Math.abs(Date.parse(p.t) - target); if (d < bd) { bd = d; best = p; } }
  if (!best || bd > tol * 60000 || best === last) return null;
  const v = key === 'load' ? best.load : best.gen?.[key];
  return v === undefined ? null : v;
}

/**
 * 今天（臺灣時間）的用電觀測是否完整：第一點在 00:20 前、相鄰兩點間隔都不超過 25 分鐘。
 * 不完整時 complete=false，呼叫端不得宣稱「今日新高」。
 */
export function todayLoad(list, now = Date.now()) {
  const d0 = dayStart(now);
  const pts = (list || []).filter(p => p.load !== undefined && p.load !== null && Date.parse(p.t) >= d0);
  if (!pts.length) return { complete: false, max: null, n: 0 };
  let complete = Date.parse(pts[0].t) - d0 <= 20 * 60000;
  for (let i = 1; i < pts.length && complete; i++) if (Date.parse(pts[i].t) - Date.parse(pts[i - 1].t) > 25 * 60000) complete = false;
  const max = Math.max(...pts.map(p => p.load));
  return { complete, max, n: pts.length, from: pts[0].t };
}
