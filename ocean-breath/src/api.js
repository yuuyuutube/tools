// 資料取得：本機有 Node 代理時走 ./api；GitHub Pages 讀 GitHub Actions 發布的官方資料快照；都沒有就回傳 null（展示模式）。
export const SNAPSHOT_URL = 'https://raw.githubusercontent.com/yuuyuutube/tools/weather-data/ocean-breath.json';
export const HISTORY_URL = 'https://raw.githubusercontent.com/yuuyuutube/tools/weather-data/ocean-breath-history.json';
const pages = location.hostname.endsWith('.github.io');
let noServer = false;

function valid(s) { return s && s.version === 1 && (s.mode === 'live' || s.mode === 'demo') && s.forecasts && s.stations && Number.isFinite(Date.parse(s.generatedAt)); }

async function get(url, { bust = false } = {}) {
  const r = await fetch(bust ? `${url}?t=${Math.floor(Date.now() / 60000)}` : url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(20000) });
  const type = r.headers.get('content-type') || '';
  if (!pages && !type.includes('json')) { const e = new Error('NO_SERVER'); e.noServer = true; throw e; }
  const data = await r.json().catch(() => null);
  if (!r.ok) throw new Error(data?.error || '海象資料暫時無法取得');
  return data;
}

export async function loadSnapshot() {
  if (noServer) return null;
  try {
    const s = pages ? await get(SNAPSHOT_URL, { bust: true }) : await get('./api/ocean');
    if (!valid(s)) throw new Error('海象資料格式錯誤');
    if (pages) s.delivery = 'github-actions';
    return s.mode === 'demo' ? null : s;
  } catch (e) {
    if (e.noServer || (!pages && e instanceof TypeError)) { noServer = true; return null; }
    throw e;
  }
}

export async function loadHistory() {
  return pages ? get(HISTORY_URL, { bust: true }) : get('./api/history');
}
