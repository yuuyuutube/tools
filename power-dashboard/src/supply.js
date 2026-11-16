// 台電「今日電力資訊」(d006020) → 目前用電功率、供電使用率、今日預估尖峰備轉與官方燈號。
// 單位：curr_load 與各容量欄位是「萬瓩」(= 10 MW)。

/** 官方燈號字母與台電公布的名稱；不在表內的字母原樣顯示，不自行解讀 */
export const INDICATORS = {
  G: { label: '供電充裕', tone: 'green' },
  Y: { label: '供電吃緊', tone: 'yellow' },
  O: { label: '供電警戒', tone: 'orange' },
  R: { label: '限電警戒', tone: 'red' },
  B: { label: '限電準備', tone: 'black' },
};
export const TIGHT = new Set(['Y', 'O', 'R', 'B']);

const n = v => { if (v === null || v === undefined) return null; const s = String(v).trim(); if (!s || s === '-') return null; const x = Number(s); return Number.isFinite(x) ? x : null; };

/** 「115.11.16(一)15:10」民國年 → ISO */
export function parseRoc(s) {
  const m = String(s ?? '').match(/(\d{2,3})[./-](\d{1,2})[./-](\d{1,2})(?:\([^)]*\))?\s*(\d{1,2}):(\d{2})?/);
  if (!m) return null;
  const y = +m[1] + 1911, pad = v => String(v).padStart(2, '0');
  const t = Date.parse(`${y}-${pad(m[2])}-${pad(m[3])}T${pad(m[4])}:${m[5] || '00'}:00+08:00`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}
export function parseRocDate(s) {
  const m = String(s ?? '').match(/(\d{2,3})[./-](\d{1,2})[./-](\d{1,2})/);
  return m ? `${+m[1] + 1911}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}` : null;
}

export function indicator(code) {
  const c = String(code ?? '').trim().toUpperCase();
  if (!c) return null;
  return { code: c, ...(INDICATORS[c] || { label: null, tone: 'unknown' }), tight: TIGHT.has(c) };
}

export function parseSupply(raw) {
  const recs = Array.isArray(raw?.records) ? raw.records : null;
  if (!recs) throw new Error('SUPPLY_FORMAT');
  const r = Object.assign({}, ...recs);
  const out = {
    at: parseRoc(r.publish_time),
    load: n(r.curr_load),                 // 萬瓩
    util: n(r.curr_util_rate),            // %
    peak: {
      rate: n(r.fore_peak_resv_rate),     // %
      reserve: n(r.fore_peak_resv_capacity),
      demand: n(r.fore_peak_dema_load),
      supply: n(r.fore_maxi_sply_capacity),
      hours: r.fore_peak_hour_range ? String(r.fore_peak_hour_range).trim() : null,
      light: indicator(r.fore_peak_resv_indicator),
    },
    yesterday: r.yday_date ? {
      date: parseRocDate(r.yday_date), rate: n(r.yday_peak_resv_rate), demand: n(r.yday_peak_dema_load), light: indicator(r.yday_peak_resv_indicator),
    } : null,
  };
  if (out.load === null && out.peak.rate === null) throw new Error('SUPPLY_EMPTY');
  return out;
}
