// 共用小工具：SVG 建立、數學、平滑雜訊、臺灣時間格式。
export const NS = 'http://www.w3.org/2000/svg';
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);

export function el(tag, attrs, parent) {
  const n = document.createElementNS(NS, tag);
  if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) n.setAttribute(k, attrs[k]);
  parent?.appendChild(n);
  return n;
}
export const g = (parent, attrs) => el('g', attrs, parent);
export const path = (parent, d, fill, attrs = {}) => el('path', { d, fill, ...attrs }, parent);
export const rect = (parent, x, y, w, h, fill, rx = 0, attrs = {}) => el('rect', { x, y, width: w, height: h, rx, fill, ...attrs }, parent);
export const circle = (parent, cx, cy, r, fill, attrs = {}) => el('circle', { cx, cy, r, fill, ...attrs }, parent);
export const line = (parent, d, stroke, w, attrs = {}) => el('path', { d, fill: 'none', stroke, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', ...attrs }, parent);
export const tf = (n, s) => n.setAttribute('transform', s);

/** 每次都一樣的亂數，讓草和雜點固定在同樣位置 */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
/** 一維平滑雜訊，-1..1 */
export function noise(x) { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)); }

export function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}

const TZ = 'Asia/Taipei';
export const hm = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
export const mdhm = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
export const taipeiHours = t => { const p = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(t)); const v = k => +p.find(x => x.type === k).value; return v('hour') + v('minute') / 60; };
export const sameDay = (a, b) => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(a)) === new Intl.DateTimeFormat('sv-SE', { timeZone: TZ }).format(new Date(b));

/** MW → 萬瓩，固定一位小數、千分位 */
export const wan = mw => mw === null || mw === undefined ? '—' : (mw / 10).toLocaleString('zh-TW', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const pct = (v, d = 1) => v === null || v === undefined ? '—' : (v * 100).toFixed(d);
