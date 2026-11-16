// 展示資料：固定、明確標示為展示，用來在沒有資料時完整呈現各種狀態。不是台電即時資料。
import { PLANTS, round } from './classify.js';
import { indicator } from './supply.js';
import { dayStart } from './history.js';

export const DEMO_KINDS = ['day', 'night', 'windy', 'calm', 'tight', 'offline'];

const CAP = { gas: 23600, coal: 10260, solar: 15470, wind: 4190, hydro: 2110, other: 5710 };
const UNITS = {
  gas: ['示範燃氣 A1', '示範燃氣 A2', '示範燃氣 B1', '示範燃氣 B2', '示範燃氣 C1'],
  coal: ['示範燃煤 1', '示範燃煤 2', '示範燃煤 3'],
  solar: ['示範光電場甲', '示範光電場乙', '其它示範光電'],
  wind: ['示範離岸一號', '示範離岸二號', '示範陸域風場'],
  hydro: ['示範水庫一', '示範水庫二', '示範小水力'],
};
const BASE = {
  day:   { gas: 14600, coal: 8200, solar: 7600, wind: 1800, hydro: 620, oil: 180, cogen: 920, storage: 160, renew: 24, charge: -420, load: 3320, util: 81, light: 'G', rate: 17.6, clock: 12.5 },
  night: { gas: 17200, coal: 9300, solar: 0, wind: 2500, hydro: 880, oil: 260, cogen: 940, storage: 1150, renew: 23, charge: 0, load: 2940, util: 76, light: 'G', rate: 17.6, clock: 20.5 },
  windy: { gas: 12900, coal: 7900, solar: 6800, wind: 3650, hydro: 540, oil: 150, cogen: 910, storage: 120, renew: 24, charge: -380, load: 3180, util: 79, light: 'G', rate: 21.3, clock: 11 },
  calm:  { gas: 16200, coal: 8800, solar: 6900, wind: 140, hydro: 700, oil: 240, cogen: 930, storage: 210, renew: 24, charge: -150, load: 3290, util: 83, light: 'G', rate: 12.4, clock: 14 },
  tight: { gas: 19800, coal: 9600, solar: 5600, wind: 600, hydro: 1500, oil: 900, cogen: 950, storage: 1700, renew: 24, charge: 0, load: 3820, util: 94, light: 'Y', rate: 8.2, clock: 15.5 },
};

function category(p, mw, comps) {
  const names = UNITS[p];
  let list;
  if (p === 'other') {
    list = Object.entries(comps).map(([k, v]) => ({ n: { oil: '示範燃油', cogen: '示範汽電共生', storage: '示範儲能', renew: '示範地熱與生質' }[k], c: null, m: v, r: '', k }));
  } else {
    const w = names.map((_, i) => names.length - i);
    const s = w.reduce((a, b) => a + b, 0);
    list = names.map((n, i) => ({ n, c: round(CAP[p] / names.length), m: round(mw * w[i] / s), r: mw === 0 ? '' : '', k: null }));
  }
  const c = { mw: round(mw), cap: CAP[p], cf: mw / CAP[p], reporting: list.length, units: list.length, list };
  if (p === 'other') c.components = Object.fromEntries(Object.entries(comps).map(([k, v]) => [k, { mw: v, cap: 0, units: 1 }]));
  return c;
}

function generation(b, at) {
  const comps = { oil: b.oil, cogen: b.cogen, storage: b.storage, renew: b.renew };
  const vals = { gas: b.gas, coal: b.coal, solar: b.solar, wind: b.wind, hydro: b.hydro, other: b.oil + b.cogen + b.storage + b.renew };
  const categories = Object.fromEntries(PLANTS.map(p => [p, category(p, vals[p], comps)]));
  const total = round(PLANTS.reduce((s, p) => s + vals[p], 0));
  return { at, total, categories, storageLoad: b.charge, unclassified: [], check: [] };
}

/** kind：day｜night｜windy｜calm｜tight；回傳一份與即時快照同格式、mode 為 demo 的資料 */
export function demoSnapshot(kind = 'day', now = Date.now()) {
  const b = BASE[kind] || BASE.day;
  const clock = dayStart(now) + b.clock * 3600000;
  const at = new Date(Math.floor(clock / 600000) * 600000).toISOString();
  const history = [];
  for (let i = 17; i >= 0; i--) {
    const t = Date.parse(at) - i * 600000, wob = k => 1 + Math.sin(i * .7 + k) * .04 + (i / 17) * (k % 2 ? .06 : -.05);
    const g = { gas: b.gas * wob(1), coal: b.coal * wob(2), solar: b.solar * wob(3), wind: b.wind * wob(4), hydro: b.hydro * wob(5), other: (b.oil + b.cogen + b.storage + b.renew) * wob(6) };
    for (const p in g) g[p] = round(g[p]);
    history.push({ t: new Date(t).toISOString(), gen: g, load: round(b.load * (1 - i * .004)) });
  }
  return {
    version: 1, mode: 'demo', demo: kind, clock, generatedAt: new Date(now).toISOString(),
    generation: generation(b, at),
    supply: {
      at, load: b.load, util: b.util,
      peak: { rate: b.rate, reserve: round(b.load * b.rate / 100), demand: b.load + 60, supply: round((b.load + 60) * (1 + b.rate / 100)), hours: '13:00-15:00', light: indicator(b.light) },
      yesterday: null,
    },
    issues: [], history,
  };
}
