// 展示模式：沒有金鑰或資料失敗時使用的固定測試資料。畫面一定標示「展示模式」，不冒充真實觀測。
import { COASTS } from './coasts.js';

const M2 = 12.42 * 3600000, K1 = 23.93 * 3600000, H = 3600000;
export const DEMO_TIDES = ['rising', 'falling', 'nearHigh', 'nearLow'];
export const DEMO_SEAS = ['calm', 'rough'];
const SHIFT = { nearHigh: .5 * H, nearLow: .5 * H - M2 / 2, rising: 3.1 * H, falling: -3.1 * H };

/** 回傳與正式 API 相同形狀的快照（mode: 'demo'） */
export function demoSnapshot({ tide = 'rising', sea = 'calm', now = Date.now() } = {}) {
  const forecasts = {}, stations = {};
  COASTS.forEach((c, i) => {
    const A = c.typicalRange / 2, t0 = now + SHIFT[tide], t1 = t0 + i * 2 * H;
    const h = t => A * Math.cos(2 * Math.PI * (t - t0) / M2) + A * .12 * Math.cos(2 * Math.PI * (t - t1) / K1);
    const events = [];
    const step = 2 * 60000;
    for (let t = now - 3 * 86400000; t < now + 4 * 86400000; t += step) {
      const a = h(t - step), b = h(t), d = h(t + step);
      if ((b > a && b >= d) || (b < a && b <= d)) {
        const iso = new Date(Math.round(t / 60000) * 60000).toISOString();
        events.push({ time: iso, type: b > a ? 'high' : 'low', heights: { twvd: Math.round(b), msl: Math.round(b), chart: Math.round(b + 120) } });
      }
    }
    forecasts[c.forecast.id] = { id: c.forecast.id, name: c.forecast.name, lat: c.lat, lon: c.lon, events, days: [] };
    const rough = sea === 'rough';
    const ids = new Set([...c.tide, ...c.wave, ...c.temp, ...c.wind].map(s => s.id));
    for (const id of ids) {
      const list = [];
      for (let k = 48; k >= 0; k--) {
        const t = Math.floor(now / H) * H - k * H, j = Math.sin(t / 5e6 + i);
        list.push({
          t: new Date(t).toISOString(),
          tide: c.tide.some(s => s.id === id) ? Math.round(h(t) + j * 4) : null,
          level: null,
          wave: c.wave.some(s => s.id === id) ? +((rough ? 2.6 : .45) + j * (rough ? .3 : .08)).toFixed(1) : null,
          period: c.wave.some(s => s.id === id) ? +((rough ? 10.5 : 6.2) + j * .4).toFixed(1) : null,
          waveDir: null,
          temp: c.temp.some(s => s.id === id) ? +(25.4 - i * .6 + j * .3).toFixed(1) : null,
          wind: c.wind.some(s => s.id === id) ? +((rough ? 11.5 : 2.4) + j).toFixed(1) : null,
          windDir: 45,
        });
      }
      stations[id] = list;
    }
  });
  return { version: 1, mode: 'demo', generatedAt: new Date(now).toISOString(), forecastAt: null, observedFetchedAt: null, forecasts, stations, issues: [], demo: { tide, sea } };
}
