// 資料取得：本機有 Node 代理時走 ./api/power；GitHub Pages 讀 Actions 發布的台電快照；都沒有就回傳 null（展示模式）。
export const SNAPSHOT_URL = 'https://raw.githubusercontent.com/yuuyuutube/tools/weather-data/power-dashboard.json';
const pages = location.hostname.endsWith('.github.io');
let noServer = false;

const valid = s => s && s.version === 1 && (s.mode === 'live' || s.mode === 'demo') && (s.generation || s.supply);

export async function loadSnapshot() {
  if (noServer) return null;
  try {
    const url = pages ? `${SNAPSHOT_URL}?t=${Math.floor(Date.now() / 60000)}` : './api/power';
    const r = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20000) });
    const type = r.headers.get('content-type') || '';
    if (!pages && !type.includes('json')) { noServer = true; return null; }
    const s = await r.json().catch(() => null);
    if (!r.ok) throw new Error(s?.error || 'HTTP');
    if (!valid(s)) throw new Error('FORMAT');
    if (pages) s.delivery = 'github-actions';
    return s;
  } catch (e) {
    if (!pages && e instanceof TypeError) { noServer = true; return null; }
    throw e;
  }
}
