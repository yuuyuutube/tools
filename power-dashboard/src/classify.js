// 台電「各機組發電量」(d006001) → 六座虛擬發電廠。純函式，伺服器、前端、測試共用。
// 分類規則見 docs/DATA_SOURCES.md：六類互斥、每一列機組只會落在一類，「小計」列一律略過以免重複計算。

export const PLANTS = ['gas', 'coal', 'solar', 'wind', 'hydro', 'other'];

/** 官方「機組類型」→ 虛擬發電廠；other 再細分成工坊裡的能源罐 */
const TYPE_MAP = {
  '燃氣': ['gas'], '民營電廠-燃氣': ['gas'],
  '燃煤': ['coal'], '民營電廠-燃煤': ['coal'],
  '太陽能': ['solar'],
  '風力': ['wind'],
  '水力': ['hydro'],                         // 慣常水力；抽蓄水力在「儲能」
  '核能': ['other', 'nuclear'],
  '燃料油': ['other', 'oil'], '燃油': ['other', 'oil'], '輕油': ['other', 'oil'], '民營電廠-燃油': ['other', 'oil'],
  '汽電共生': ['other', 'cogen'],
  '儲能': ['other', 'storage'],              // 抽蓄水力發電＋電池放電
  '其它再生能源': ['other', 'renew'], '其他再生能源': ['other', 'renew'],
};

export const COMPONENTS = ['nuclear', 'oil', 'cogen', 'storage', 'renew', 'misc'];

/** 去掉 HTML 標籤、英文括號註記與空白：「儲能負載(Energy Storage System Load)</b>」→「儲能負載」 */
export function cleanType(s) {
  return String(s ?? '').replace(/<[^>]*>/g, '').replace(/\([A-Za-z][^)]*\)/g, '').replace(/\s+/g, '').trim();
}

/** 官方數值欄位："677.3"、"-"、"N/A"、"91.194%"。缺值回傳 null，不當成 0 */
export function num(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(/[,%\s]/g, '');
  if (!s || s === '-' || s === '--' || /^n\/?a$/i.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 類型 → [plant, component]；儲能負載回傳 ['load'] */
export function classifyType(raw) {
  const t = cleanType(raw);
  if (t.includes('儲能負載') || t.includes('抽蓄負載')) return ['load'];
  if (TYPE_MAP[t]) return TYPE_MAP[t];
  // 未見過的類型：依關鍵字歸類，仍不重複；歸不進去的放進工坊並標記為未分類
  if (t.includes('燃氣')) return ['gas'];
  if (t.includes('燃煤')) return ['coal'];
  if (t.includes('太陽')) return ['solar'];
  if (t.includes('風')) return ['wind'];
  if (t.includes('抽蓄') || t.includes('儲能')) return ['other', 'storage'];
  if (t.includes('水力')) return ['hydro'];
  if (t.includes('核')) return ['other', 'nuclear'];
  if (t.includes('油')) return ['other', 'oil'];
  if (t.includes('再生') || t.includes('地熱') || t.includes('生質')) return ['other', 'renew'];
  return ['other', 'misc'];
}

const isSubtotal = name => /^(小計|合計|總計)/.test(cleanType(name));

/** 「2026-11-16T15:10:00」是臺灣時間，沒有時區 */
export function parseTaipei(s) {
  const m = String(s ?? '').match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (!m) return null;
  const t = Date.parse(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6] || '00'}+08:00`);
  return Number.isFinite(t) ? new Date(t).toISOString() : null;
}

/**
 * 正規化。回傳：
 * { at, total, categories: { gas: { mw, cap, capMw, cf, reporting, units, list, components? } … }, storageLoad, unclassified, check }
 * mw：該類淨發電功率（MW，只加總 ≥ 0 的數值）；null 表示整類都沒有數值（資料缺失，不是 0）。
 * cf：有裝置容量的機組「淨發電/裝置容量」加總比；用來決定動畫活躍度，不顯示成風速、水量等其他物理量。
 */
export function classify(raw) {
  const rows = Array.isArray(raw?.aaData) ? raw.aaData : null;
  if (!rows) throw new Error('GEN_FORMAT');
  const cat = Object.fromEntries(PLANTS.map(p => [p, { mw: null, cap: 0, capMw: 0, reporting: 0, units: 0, list: [] }]));
  cat.other.components = {};
  const subtotals = {}; let storageLoad = null; const unclassified = new Set(); let negative = 0;

  for (const r of rows) {
    const type = cleanType(r['機組類型']), name = cleanType(r['機組名稱']);
    const cap = num(r['裝置容量(MW)']), mw = num(r['淨發電量(MW)']), note = cleanType(r['備註']);
    if (isSubtotal(name)) { const v = num(String(r['淨發電量(MW)'] ?? '').replace(/\(.*$/, '')); if (v !== null) subtotals[type] = v; continue; }
    const [plant, comp] = classifyType(type);
    if (plant === 'load') { if (mw !== null) storageLoad = (storageLoad ?? 0) + Math.min(0, mw); continue; }
    const c = cat[plant];
    c.units++;
    c.list.push({ n: name, c: cap, m: mw, r: note || '', k: comp || null });
    if (comp === 'misc') unclassified.add(type);
    if (mw === null) continue;
    c.reporting++;
    // 負值是耗電（例如抽水、充電），不是發電：不進發電加總
    if (mw < 0) { negative += mw; continue; }
    c.mw = (c.mw ?? 0) + mw;
    if (cap !== null && cap > 0) { c.cap += cap; c.capMw += mw; }
    if (plant === 'other') {
      const k = comp || 'misc', o = c.components[k] ||= { mw: 0, cap: 0, units: 0 };
      o.mw += mw; o.units++; if (cap) o.cap += cap;
    }
  }

  let total = 0, any = false;
  for (const p of PLANTS) {
    const c = cat[p];
    c.cf = c.cap > 0 ? c.capMw / c.cap : null;
    if (c.mw !== null) { c.mw = round(c.mw); total += c.mw; any = true; }
    c.list.sort((a, b) => (b.m ?? -1) - (a.m ?? -1));
    delete c.capMw;
  }
  for (const o of Object.values(cat.other.components)) o.mw = round(o.mw);

  // 與官方小計交叉比對（容許四捨五入誤差）
  const check = [];
  const sumOf = types => types.reduce((s, t) => s + (subtotals[t] ?? 0), 0);
  for (const p of PLANTS) {
    const types = Object.keys(subtotals).filter(t => classifyType(t)[0] === p);
    if (!types.length || cat[p].mw === null) continue;
    const diff = Math.abs(sumOf(types) - cat[p].mw);
    if (diff > 1.5) check.push({ plant: p, official: round(sumOf(types)), computed: cat[p].mw });
  }

  return {
    at: parseTaipei(raw.DateTime), total: any ? round(total) : null, categories: cat,
    storageLoad: storageLoad === null && negative === 0 ? null : round((storageLoad ?? 0) + negative), unclassified: [...unclassified], check,
  };
}

/** 占比（0–1）。分母是六類淨發電加總，不是系統用電 */
export function shares(gen) {
  const out = {};
  for (const p of PLANTS) { const m = gen?.categories?.[p]?.mw; out[p] = m === null || m === undefined || !gen.total ? null : m / gen.total; }
  return out;
}

export const round = (n, d = 1) => Math.round(n * 10 ** d) / 10 ** d;
