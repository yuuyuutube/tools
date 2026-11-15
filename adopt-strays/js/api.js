/* Animal API Client：農業部「動物認領養」開放資料
   已驗證：回傳 JSON 陣列、支援 $top / $skip 分頁（每批 1000 筆）、可用 animal_id 篩選、
   Access-Control-Allow-Origin: *（瀏覽器可直接呼叫）。 */
export const API = 'https://data.moa.gov.tw/Service/OpenData/TransService.aspx?UnitId=QcbUEzN6E6DL';
export const OFFICIAL = 'https://www.pet.gov.tw/AnimalApp/AnnounceMent.aspx?PageType=Adopt';
export const SOURCE = 'https://data.moa.gov.tw/open_detail.aspx?id=QcbUEzN6E6DL';
export const PAGE = 1000;

async function getJSON(url, { fetchImpl = fetch, timeout = 30000 } = {}) {
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), timeout);
  try {
    const r = await fetchImpl(url, { signal: ac.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    if (!Array.isArray(j)) throw new Error('unexpected payload');
    return j;
  } finally { clearTimeout(timer); }
}

export const fetchPage = (index, opt) => getJSON(`${API}&$top=${PAGE}&$skip=${index * PAGE}`, opt);

export async function fetchById(id, opt) {
  const rows = await getJSON(`${API}&animal_id=${encodeURIComponent(Number(id) || 0)}`, opt);
  return rows.find(r => Number(r.animal_id) === Number(id)) || null;   // 篩選若被忽略，也不會拿錯動物
}

/* 逐批抓完全部；have 是已經抓過的頁（index → rows），onPage 每抓到一頁就回報 */
export async function fetchAll({ have = new Map(), onPage, concurrency = 3, maxPages = 40, ...opt } = {}) {
  const pages = new Map(have);
  let next = 0, end = Infinity;
  for (const [i, rows] of pages) if (rows.length < PAGE) end = Math.min(end, i);
  async function worker() {
    for (;;) {
      while (pages.has(next)) next++;
      const i = next++;
      if (i > end || i >= maxPages) return;
      const rows = await fetchPage(i, opt);
      pages.set(i, rows);
      if (rows.length < PAGE) end = Math.min(end, i);
      if (rows.length) onPage?.(rows, i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  return [...pages].sort((a, b) => a[0] - b[0]).flatMap(([i, rows]) => (i <= end ? rows : []));
}
