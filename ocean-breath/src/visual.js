// OceanData → VisualState：真實資料決定動畫狀態，映射都有上下限，美術決定它看起來多優雅。
// 潮汐（水位）與波浪（起伏）是兩套獨立的參數，不互相代替。
import { skyPhase } from './sun.js';
import { moonPhase } from './moon.js';
import { clamp } from './util.js';

export function visualState(data, t = Date.now()) {
  const c = data.coast;
  const sky = skyPhase(t, c.lat, c.lon);
  const tide = data.tide;
  const ok = tide.status === 'ok';
  // 潮差：當天實際高低差相對這片海的平常潮差，小潮時水位變化幅度也小一點
  const rangeK = ok && tide.range ? clamp(tide.range / c.typicalRange, .6, 1.15) : .8;
  const h = data.obs.wave?.value, p = data.obs.period, w = data.obs.wind?.value, temp = data.obs.temp?.value;
  return {
    t,
    phase: sky.phase, elevation: sky.elevation, azimuth: sky.azimuth, facing: c.facing,
    moon: moonPhase(t),
    tideKnown: ok || data.obsLevel != null,
    tide: ok ? .5 + (tide.level - .5) * rangeK : data.obsLevel != null ? .5 + (data.obsLevel - .5) * .9 : .5,   // 不明時停在中間，不假裝漲退
    // 浪高 0.2 m 幾乎平靜，3 m 以上接近上限；不會變成巨大尖峰
    wave: h == null ? .32 : clamp(.18 + .82 * (1 - Math.exp(-h / 1.5)), .18, 1),
    waveKnown: h != null,
    period: p == null ? 8 : clamp(p, 5, 14),
    wind: w == null ? .25 : clamp(1 - Math.exp(-w / 7), 0, 1),
    warm: temp == null ? 0 : clamp((temp - 24) / 6, -1, 1),
  };
}
