// 共用的小工具：SVG 建立、數學、色彩混合、平滑雜訊。
export const NS = 'http://www.w3.org/2000/svg';
export const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = t => t * t * (3 - 2 * t);
export const frac = n => n - Math.floor(n);

export function el(tag, cls, parent, attrs) {
  const n = document.createElementNS(NS, tag);
  if (cls) n.setAttribute('class', cls);
  if (attrs) set(n, attrs);
  parent?.appendChild(n);
  return n;
}
export function set(n, attrs) { for (const k in attrs) n.setAttribute(k, attrs[k]); return n; }

/** 每次開啟都一樣的亂數，讓同一片海的石頭與草每次都長在同樣位置 */
export function seeded(seed = 1) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** 一維平滑雜訊，-1..1 */
const hash = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return (x - Math.floor(x)) * 2 - 1; };
export function noise(x) { const i = Math.floor(x), f = x - i; return lerp(hash(i), hash(i + 1), smooth(f)); }

/** #rrggbb 之間的線性混合 */
export function mix(a, b, t) {
  const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const A = p(a), B = p(b);
  return '#' + A.map((v, i) => Math.round(lerp(v, B[i], t)).toString(16).padStart(2, '0')).join('');
}

/** 由取樣點畫出平滑曲線（中點二次貝茲），收尾封到畫面底部 */
export function wavePath(pts, bottom) {
  let d = `M${pts[0][0].toFixed(1)} ${bottom}L${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], mx = (x + pts[i + 1][0]) / 2, my = (y + pts[i + 1][1]) / 2;
    d += `Q${x.toFixed(1)} ${y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const z = pts[pts.length - 1];
  return d + `L${z[0].toFixed(1)} ${z[1].toFixed(1)}L${z[0].toFixed(1)} ${bottom}Z`;
}
/** 只有線、不封口 */
export function linePath(pts) {
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[i], mx = (x + pts[i + 1][0]) / 2, my = (y + pts[i + 1][1]) / 2;
    d += `Q${x.toFixed(1)} ${y.toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  }
  const z = pts[pts.length - 1];
  return d + `L${z[0].toFixed(1)} ${z[1].toFixed(1)}`;
}
export const poly = pts => 'M' + pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('L') + 'Z';

const TZ = 'Asia/Taipei';
export const hm = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(new Date(t));
export const md = t => new Intl.DateTimeFormat('zh-TW', { timeZone: TZ, month: 'numeric', day: 'numeric' }).format(new Date(t));
export const ymd = t => new Intl.DateTimeFormat('sv-SE', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(t));
/** 臺灣時間當天 00:00 的時間戳 */
export const dayStart = t => Date.parse(ymd(t) + 'T00:00:00+08:00');
export const taipeiHour = t => +new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hourCycle: 'h23' }).format(new Date(t));
