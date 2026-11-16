// Marine Observation：從快照裡為每片海挑出可用的測站數值，並判斷資料新鮮度。
import { cleanEvents, tideAt, upcoming } from './tide.js';
import { distanceKm } from './coasts.js';

const MIN = 60000;
export const FRESH = 90 * MIN, RECENT = 3 * 60 * MIN, DELAYED = 24 * 60 * MIN;

export function freshness(age) {
  if (age == null || !Number.isFinite(age)) return 'none';
  return age <= FRESH ? 'fresh' : age <= RECENT ? 'recent' : age <= DELAYED ? 'delayed' : 'none';
}

/** 依序挑第一個 3 小時內有數值的測站；都沒有就用最新的一筆（標示延遲），超過一天視為無資料 */
export function pickStation(candidates, stations, field, now, origin) {
  let best = null;
  for (const st of candidates || []) {
    const series = stations?.[st.id] || [];
    let latest = null;
    for (let i = series.length - 1; i >= 0; i--) {
      const s = series[i], t = Date.parse(s.t);
      if (s[field] != null && t <= now + 10 * MIN) { latest = s; break; }
    }
    if (!latest) continue;
    const age = now - Date.parse(latest.t);
    const found = { station: st, sample: latest, value: latest[field], at: latest.t, age, status: freshness(age), series, distanceKm: origin ? Math.round(distanceKm(origin, st) * 10) / 10 : null };
    if (found.status === 'none') continue;
    if (found.status !== 'delayed') return found;
    if (!best || found.age < best.age) best = found;
  }
  return best;
}

/** 某時刻附近（±40 分鐘）的實際觀測，給時間軸回放用 */
export function sampleAt(series, field, t) {
  let best = null, gap = 40 * MIN;
  for (const s of series || []) { const d = Math.abs(Date.parse(s.t) - t); if (s[field] != null && d <= gap) { best = s; gap = d; } }
  return best;
}

/** 一片海在某時刻的完整資料狀態 */
export function coastData(snapshot, coast, t = Date.now(), now = Date.now()) {
  const fc = snapshot?.forecasts?.[coast.forecast.id] || null;
  const clean = cleanEvents((fc?.events || []).map(e => ({ time: e.time, type: e.type, height: e.heights?.msl ?? null })));
  const tide = tideAt(clean, t);
  const next = upcoming(clean, t, 1)[0] || null;
  const st = snapshot?.stations || {};
  const origin = { lat: coast.lat, lon: coast.lon };
  const live = t >= now - 30 * MIN;       // 正在看「現在」；拖到過去時改用當時的觀測
  const pick = (list, field) => {
    if (live) return pickStation(list, st, field, now, origin);
    for (const s of list || []) { const hit = sampleAt(st[s.id], field, t); if (hit) return { station: s, sample: hit, value: hit[field], at: hit.t, age: now - Date.parse(hit.t), status: 'history', series: st[s.id], distanceKm: Math.round(distanceKm(origin, s) * 10) / 10 }; }
    return null;
  };
  const obs = { tide: pick(coast.tide, 'tide'), wave: pick(coast.wave, 'wave'), temp: pick(coast.temp, 'temp'), wind: pick(coast.wind, 'wind') };
  if (obs.wave) { const p = obs.wave.sample.period; obs.period = p ?? null; }
  // 預報範圍外（例如拖到前幾天）但有潮位觀測：用當時前後一天的實測高低正規化成水位，這是真實觀測而非插值
  let obsLevel = null;
  if (tide.status !== 'ok' && obs.tide?.series) {
    const t0 = Date.parse(obs.tide.at), win = obs.tide.series.filter(s => s.tide != null && Math.abs(Date.parse(s.t) - t0) < 13 * 3600000).map(s => s.tide);
    if (win.length > 6) { const lo = Math.min(...win), hi = Math.max(...win); if (hi - lo > 5) obsLevel = (obs.tide.value - lo) / (hi - lo); }
  }

  let status;
  if (snapshot?.mode === 'demo') status = 'demo';
  else if (!fc?.events?.length && !Object.keys(st).length) status = 'error';
  else if (!obs.tide && !obs.wave && !obs.temp) status = fc?.events?.length ? 'forecastOnly' : 'noData';
  else status = [obs.tide, obs.wave, obs.temp].filter(Boolean).some(o => o.status === 'fresh') ? 'live' : [obs.tide, obs.wave, obs.temp].filter(Boolean).some(o => o.status === 'recent') ? 'recent' : 'delayed';

  return { coast, forecast: fc, clean, tide, next, obs, obsLevel, status, problems: clean.problems };
}
