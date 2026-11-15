/* Animal Search：圖鑑的篩選、排序、分頁（全部在已載入的資料上做，不重新下載） */
import { isListable } from './eligibility.js';

export function filter(list, f = {}, today) {
  const area = Number(f.area) || 0, sid = Number(f.sid) || 0;
  return list.filter(a => isListable(a, today)
    && (!area || a.area === area)
    && (!f.kind || a.kind === f.kind)
    && (!f.age || a.age === f.age)
    && (!f.sex || a.sex === f.sex)
    && (!f.body || a.body === f.body)
    && (!sid || a.sid === sid)
    && (!f.photo || !!a.photo));
}

export function sort(list, by = 'open', today) {
  const key = by === 'update'
    ? a => a.update || ''
    : a => (a.open && a.open <= today ? a.open : '');   // 尚未開放的排在後面
  return list.slice().sort((x, y) => (key(y) > key(x) ? 1 : key(y) < key(x) ? -1 : y.id - x.id));
}

export function paginate(list, page, size) {
  const pages = Math.max(1, Math.ceil(list.length / size));
  const p = Math.min(Math.max(1, page | 0), pages);
  return { page: p, pages, total: list.length, items: list.slice((p - 1) * size, p * size) };
}

export function shelters(list, area) {
  const m = new Map(), ar = Number(area) || 0;
  for (const a of list) if (a.sid && (!ar || a.area === ar) && !m.has(a.sid)) m.set(a.sid, a.shelter);
  return [...m].map(([value, label]) => ({ value, label })).sort((x, y) => x.label.localeCompare(y.label, 'zh-Hant'));
}

export function areas(list) {
  const m = new Map();
  for (const a of list) if (a.area && a.county) m.set(a.area, a.county);
  return [...m].map(([value, label]) => ({ value, label })).sort((x, y) => x.value - y.value);
}
