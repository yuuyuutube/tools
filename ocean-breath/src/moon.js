// 月相：用平均朔望月從一次已知的新月往後推。誤差約半天以內，拿來畫月亮的形狀足夠。
const NEW_MOON = Date.UTC(2000, 0, 6, 18, 14);        // 2000-01-06 18:14 UTC 的新月
const SYNODIC = 29.530588853 * 86400000;

/** 0 新月 → .25 上弦 → .5 滿月 → .75 下弦 → 1 新月 */
export function moonPhase(now = Date.now()) {
  const p = ((now - NEW_MOON) / SYNODIC) % 1;
  return p < 0 ? p + 1 : p;
}

export function moonName(p) {
  return ['新月', '眉月', '上弦月', '盈凸月', '滿月', '虧凸月', '下弦月', '殘月'][Math.round(p * 8) % 8];
}

/** 亮面的路徑，畫在半徑 1 的圓裡。北半球看到的樣子：上弦亮右邊，下弦亮左邊 */
export function moonPath(p) {
  const waning = p > .5, q = Math.min(Math.max(waning ? 1 - p : p, .035), .5);   // 新月前後留一道細眉，不讓月亮消失
  const rx = Math.abs(Math.cos(2 * Math.PI * q)).toFixed(3), side = waning ? -1 : 1;
  // 外緣是半個圓，明暗交界是半個橢圓：不到半月往亮面凹，超過半月往暗面凸
  return `M0-1A1 1 0 0 ${waning ? 0 : 1} 0 1A${rx} 1 0 0 ${(q < .25) === (side > 0) ? 0 : 1} 0-1Z`;
}
