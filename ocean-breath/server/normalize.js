// 把中央氣象署的原始回應整理成前端用的精簡格式。
// REST 與檔案下載（cwaopendata）兩種格式都接受；大小寫不同、單一元素不是陣列、時間欄位 DateTime／DataTime 都要能讀。
const arr = v => Array.isArray(v) ? v : v == null ? [] : [v];

/** 數值欄位："None"、"-"、空字串、超出合理範圍都視為缺測（null） */
export function num(value, min = -1e6, max = 1e6) {
  if (value == null) return null;
  const text = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return n >= min && n <= max ? n : null;
}

const TIDE_TYPE = { '滿潮': 'high', '乾潮': 'low' };

/** F-A0021-001 → { [LocationId]: { id, name, lat, lon, events, days } } */
export function normalizeForecast(data) {
  const records = data?.records ?? data?.Records ?? data?.cwaopendata?.Resources?.Resource?.Data;
  const list = arr(records?.TideForecasts);
  if (!list.length) throw new Error('FORECAST_SCHEMA');
  const out = {};
  for (const item of list) {
    const l = item?.Location; if (!l?.LocationId) continue;
    const events = [], days = [];
    for (const d of arr(l.TimePeriods?.Daily)) {
      if (d?.Date) days.push({ date: d.Date, range: ['大', '中', '小'].includes(d.TideRange) ? d.TideRange : null });
      for (const t of arr(d?.Time)) {
        const type = TIDE_TYPE[t?.Tide];
        if (!type || !Number.isFinite(Date.parse(t.DateTime))) continue;
        const h = t.TideHeights || {};
        events.push({ time: t.DateTime, type, heights: { twvd: num(h.AboveTWVD, -1000, 1000), msl: num(h.AboveLocalMSL, -1000, 1000), chart: num(h.AboveChartDatum, -1000, 2000) } });
      }
    }
    events.sort((a, b) => Date.parse(a.time) - Date.parse(b.time));
    out[l.LocationId] = { id: l.LocationId, name: l.LocationName, lat: num(l.Latitude, -90, 90), lon: num(l.Longitude, -180, 180), events, days };
  }
  return out;
}

/** 單筆觀測 → 統一單位：潮高 cm（原始為 m）、浪高 m、週期 s、溫度 °C、風速 m/s、方向為來向（度） */
function sample(o) {
  const w = o?.WeatherElements || {}, a = w.PrimaryAnemometer || {};
  const t = o?.DateTime ?? o?.DataTime;
  const tideM = num(w.TideHeight, -10, 10);
  return {
    t,
    tide: tideM === null ? null : Math.round(tideM * 100),
    level: w.TideLevel === '漲潮' ? 'rising' : w.TideLevel === '退潮' ? 'falling' : null,
    wave: num(w.WaveHeight, 0, 25),
    period: num(w.WavePeriod, 0, 30),
    waveDir: num(w.WaveDirection, 0, 360),
    temp: num(w.SeaTemperature, -2, 40),
    wind: num(a.WindSpeed, 0, 80),
    windDir: num(a.WindDirection, 0, 360),
  };
}

/** O-B0075-001／-002 → { [StationID]: [sample...]（時間由舊到新） } */
export function normalizeObservations(data, only = null) {
  const records = data?.Records ?? data?.records ?? data?.cwaopendata?.Resources?.Resource?.Data;
  const list = arr(records?.SeaSurfaceObs?.Location);
  if (!records?.SeaSurfaceObs) throw new Error('OBSERVATION_SCHEMA');
  const out = {};
  for (const loc of list) {
    const id = loc?.Station?.StationID; if (!id || (only && !only.includes(id))) continue;
    const seen = new Map();
    for (const o of arr(loc.StationObsTimes?.StationObsTime)) {
      const s = sample(o); const ts = Date.parse(s.t);
      if (!Number.isFinite(ts)) continue;
      seen.set(ts, { ...s, t: new Date(ts).toISOString() });          // 同一時間重複出現：保留最後一筆
    }
    out[id] = [...seen.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
  }
  return out;
}

/** 把新的 48 小時觀測併入既有歷史，保留最近 days 天；只保存真的有出現過的時間點 */
export function mergeHistory(history = {}, fresh = {}, now = Date.now(), days = 30) {
  const cut = now - days * 86400000, out = {};
  for (const id of new Set([...Object.keys(history), ...Object.keys(fresh)])) {
    const m = new Map();
    for (const s of [...(history[id] || []), ...(fresh[id] || [])]) { const t = Date.parse(s.t); if (Number.isFinite(t) && t >= cut && t <= now + 3600000) m.set(t, s); }
    out[id] = [...m.entries()].sort((a, b) => a[0] - b[0]).map(e => e[1]);
  }
  return out;
}
