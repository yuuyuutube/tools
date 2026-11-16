// 潮汐狀態：只根據官方預報的滿潮／乾潮事件判斷，資料不完整就明說，不自行推測。
// 事件之間的連續水位是「視覺示意」的餘弦插值，不能當作官方潮位顯示。
export const HOUR = 3600000;
const MIN_GAP = 1.5 * HOUR;     // 相鄰極值太近：資料重複或錯誤
const MAX_GAP = 16 * HOUR;      // 全日潮一天也只有一高一低，超過這個間隔視為缺資料

/**
 * 整理事件：排序、去除完全重複、標記不合理的區段。
 * raw: [{ time, type: 'high'|'low', height?: number(cm) }]
 * 回傳 { events: [{ t, type, height }], breaks: Set<i>（第 i 與 i+1 之間不可推算）, problems: [] }
 */
export function cleanEvents(raw) {
  const problems = [];
  const list = [];
  for (const e of Array.isArray(raw) ? raw : []) {
    const t = Date.parse(e?.time);
    if (!Number.isFinite(t) || (e.type !== 'high' && e.type !== 'low')) { problems.push('invalid'); continue; }
    const height = typeof e.height === 'number' && Number.isFinite(e.height) ? e.height : null;
    list.push({ t, type: e.type, height });
  }
  list.sort((a, b) => a.t - b.t);
  const events = [];
  const conflicts = new Set();
  for (const e of list) {
    const last = events[events.length - 1];
    if (last && last.t === e.t) {
      if (last.type === e.type) { problems.push('duplicate'); continue; }
      conflicts.add(events.length - 1); problems.push('conflict');     // 同一時間又滿又乾：兩邊都不能信
    }
    events.push(e);
  }
  const breaks = new Set();
  for (let i = 0; i < events.length - 1; i++) {
    const a = events[i], b = events[i + 1], gap = b.t - a.t;
    if (conflicts.has(i) || conflicts.has(i + 1) || conflicts.has(i - 1)) { breaks.add(i); continue; }
    if (a.type === b.type) { breaks.add(i); problems.push('same-type'); continue; }
    if (gap < MIN_GAP || gap > MAX_GAP) { breaks.add(i); problems.push('gap'); }
  }
  return { events, breaks, problems };
}

/**
 * 某一刻的潮汐狀態。
 * state: rising 漲潮中／falling 退潮中／nearHigh 接近滿潮／nearLow 接近乾潮
 * level: 0（乾潮）–1（滿潮）的視覺水位，依附近一天的高低潮正規化
 */
export function tideAt(clean, t) {
  const ev = clean?.events || [];
  let i = -1;
  for (let k = 0; k < ev.length - 1; k++) if (ev[k].t <= t && t < ev[k + 1].t) { i = k; break; }
  if (i < 0) return { status: 'insufficient', reason: ev.length < 2 ? 'empty' : 'range' };
  if (clean.breaks.has(i)) return { status: 'insufficient', reason: 'irregular' };
  const prev = ev[i], next = ev[i + 1], gap = next.t - prev.t;
  const rising = prev.type === 'low';
  const progress = (t - prev.t) / gap;
  const near = next.t - t <= Math.min(HOUR, gap * 0.2);
  const state = rising ? (near ? 'nearHigh' : 'rising') : (near ? 'nearLow' : 'falling');
  const ease = (1 - Math.cos(Math.PI * progress)) / 2;

  // 以前後約一天的極值當作水位範圍；高度缺漏時退回 0／1
  const win = ev.filter(e => Math.abs(e.t - t) < 18 * HOUR && e.height !== null).map(e => e.height);
  let level;
  if (prev.height !== null && next.height !== null && win.length >= 2) {
    const lo = Math.min(...win), hi = Math.max(...win), h = prev.height + (next.height - prev.height) * ease;
    level = hi - lo > 1 ? (h - lo) / (hi - lo) : (rising ? ease : 1 - ease);
  } else level = rising ? ease : 1 - ease;
  const range = win.length >= 2 ? Math.max(...win) - Math.min(...win) : null;
  return { status: 'ok', state, rising, prev, next, progress, level: Math.min(1, Math.max(0, level)), range, interpolated: true };
}

/** 某時刻之後的下一個（或下 n 個）潮汐事件 */
export function upcoming(clean, t, n = 1) {
  return (clean?.events || []).filter(e => e.t > t).slice(0, n);
}

export const STATE_TEXT = { rising: '漲潮中', falling: '退潮中', nearHigh: '接近滿潮', nearLow: '接近乾潮' };
export const TYPE_TEXT = { high: '滿潮', low: '乾潮' };
