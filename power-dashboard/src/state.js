// PowerData → AnimationState：把台電數字換成每座發電廠「有多忙」。純函式，可測試。
//
// 三層動畫（docs/ART_SPEC.md）：
//  A 基礎環境：水波、呼吸、草擺動 —— 不看資料
//  B 資料驅動：level（0–1）決定渦輪、輸送帶、風車、水流、燈的節奏 —— 這裡算
//  C 事件：占比變化、明顯下降、燈號改變、今日新高 —— src/events.js
//
// level 用「淨發電／裝置容量」再除以各能源的滿載參考值，而不是 MW 本身：
// 燃氣 15000 MW 和水力 200 MW 不能放在同一把尺上比快慢。
import { PLANTS, shares } from './classify.js';

/** 容量因數達到這個值就算「全力運轉」（本作品的美術參考值，不是工程標準） */
export const CF_FULL = { gas: .9, coal: .95, solar: .62, wind: .72, hydro: .6, other: .6 };
export const HIGH = .7, LOW = .22;
export const STALE_MIN = 30, GONE_MIN = 180;

/** 單類狀態：missing（沒有數值）｜off（未發電／待命）｜low｜normal｜high */
export function plantState(c, plant) {
  if (!c || c.mw === null || c.mw === undefined) return { state: 'missing', level: 0 };
  const floor = Math.max(1, (c.cap || 0) * .003);
  if (c.mw < floor) return { state: 'off', level: 0 };
  const cf = c.cf ?? null;
  const level = cf === null ? .5 : Math.min(1, Math.max(.04, cf / CF_FULL[plant]));
  return { state: level >= HIGH ? 'high' : level < LOW ? 'low' : 'normal', level };
}

/** 資料新鮮度：fresh｜stale（超過 30 分）｜gone（超過 3 小時）｜none */
export function freshness(at, now = Date.now()) {
  if (!at) return 'none';
  const m = (now - Date.parse(at)) / 60000;
  return m > GONE_MIN ? 'gone' : m > STALE_MIN ? 'stale' : 'fresh';
}

export function animationState(snap, now = Date.now()) {
  const gen = snap?.generation || null;
  const sh = shares(gen);
  const rank = PLANTS.filter(p => sh[p] !== null).sort((a, b) => sh[b] - sh[a]);
  const fresh = snap?.mode === 'demo' ? 'fresh' : freshness(gen?.at, now);
  const plants = {};
  for (const p of PLANTS) {
    const c = gen?.categories?.[p];
    const s = gen ? plantState(c, p) : { state: 'missing', level: 0 };
    // 太舊的資料：動畫放慢到休息節奏，畫面標示「資料過期」，但不把數值當成 0
    const level = fresh === 'gone' ? s.level * .25 : s.level;
    plants[p] = { ...s, level, mw: c?.mw ?? null, share: sh[p], rank: rank.indexOf(p) + 1 || null, cf: c?.cf ?? null };
  }
  const o = gen?.categories?.other;
  plants.other.components = o?.components || {};
  plants.other.charging = (gen?.storageLoad ?? 0) < -1;
  return { plants, fresh, total: gen?.total ?? null };
}

/** 平滑：每座發電廠的動畫 level 以 τ 秒的時間常數靠近目標，資料更新不會讓風車突然加速 */
export function approach(cur, target, dt, tau = 8) {
  return cur + (target - cur) * (1 - Math.exp(-dt / tau));
}
