// Layer C 事件：只用實際收到的兩個以上資料點比較；資料不足就不產生事件。
import { PLANTS } from './classify.js';
import { ago, todayLoad } from './history.js';

const shareOf = (pt, p) => {
  if (!pt?.gen) return null;
  const vals = PLANTS.map(k => pt.gen[k]).filter(v => v !== null && v !== undefined);
  const total = vals.reduce((a, b) => a + b, 0), v = pt.gen[p];
  return v === null || v === undefined || !total ? null : v / total;
};

/** history：已含目前這一點；prevLight：上一份快照的官方燈號代碼 */
export function detectEvents({ history = [], prevLight = null, light = null, now = Date.now() }) {
  const out = [];
  const last = history[history.length - 1];
  if (!last) return out;

  // 占比一小時內明顯增加（≥ 3 個百分點）
  for (const p of PLANTS) {
    const hourAgo = history.find(pt => Math.abs(Date.parse(pt.t) - (Date.parse(last.t) - 60 * 60000)) <= 12 * 60000 && pt !== last);
    const a = shareOf(hourAgo, p), b = shareOf(last, p);
    if (a !== null && b !== null && b - a >= .03) out.push({ type: 'shareUp', plant: p, key: `shareUp:${p}:${last.t}`, delta: b - a });
  }

  // 與前一筆（10–30 分鐘前）相比明顯下降：只說「降下來了」，不說故障
  const prev = history.length > 1 ? history[history.length - 2] : null;
  if (prev && Date.parse(last.t) - Date.parse(prev.t) <= 30 * 60000) {
    for (const p of PLANTS) {
      const a = prev.gen?.[p], b = last.gen?.[p];
      if (a == null || b == null) continue;
      if (a - b >= 80 && b <= a * .75) out.push({ type: 'drop', plant: p, key: `drop:${p}:${last.t}` });
      if (p === 'solar' && a >= 5 && b < 1) out.push({ type: 'solarRest', plant: p, key: `solarRest:${last.t}` });
      if (p === 'solar' && a < 1 && b >= 5) out.push({ type: 'solarWake', plant: p, key: `solarWake:${last.t}` });
    }
  }

  // 官方燈號改變（必須兩份快照都有燈號）
  if (prevLight && light && prevLight !== light) out.push({ type: 'light', from: prevLight, to: light, key: `light:${prevLight}>${light}:${last.t}` });

  // 今日用電新高：只有今天 00:20 起的觀測連續完整時才成立
  const day = todayLoad(history, now);
  if (day.complete && last.load != null && day.n >= 3) {
    const before = history.filter(p => p !== last && p.load != null && Date.parse(p.t) >= Date.parse(day.from));
    if (before.length && last.load > Math.max(...before.map(p => p.load))) out.push({ type: 'loadHigh', key: `loadHigh:${last.t}`, load: last.load });
  }
  return out;
}

export { ago };
