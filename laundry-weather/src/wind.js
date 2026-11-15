// 風 → 衣物擺動。純數學，不碰 DOM，可單獨測試。
// 真實風速決定趨勢，所有輸出都有飽和上限，強風也不會瘋狂甩動。

const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
export const LIMIT = 24;          // 任何衣物的最大擺角（度）

/** 風速 (m/s)、風向（氣象來向，度）→ 擺動參數 */
export function windParams(speed, direction) {
  const s = clamp(Number.isFinite(speed) ? speed : 0, 0, 30);
  // 來向 90（東風）往西吹 → 衣服往左（負）。南北風只剩一點點側向分量
  let side = 1;
  if (Number.isFinite(direction)) {
    const x = -Math.sin(direction * Math.PI / 180);
    side = (x < 0 ? -1 : 1) * Math.max(.35, Math.abs(x));
  }
  return {
    lean: side * 13 * (1 - Math.exp(-s / 4.5)),        // 被風推歪的平均角度
    flutter: .5 + 6.5 * (1 - Math.exp(-s / 3.5)),      // 來回擺動的幅度
    tempo: .75 + .5 * (1 - Math.exp(-s / 6)),          // 節奏，風大只快一點點
    ripple: 1 - Math.exp(-s / 3),                      // 布邊波動 0–1
  };
}

/** 平滑陣風，約 -1–1。x 是衣物在繩上的位置（0–1），讓陣風像波一樣掃過整條繩 */
export function gust(t, x, seed, tempo = 1) {
  const u = t * tempo;
  const swell = .62 + .38 * Math.sin(u * .11 + seed * .7);     // 一陣一陣
  return swell * (
    .55 * Math.sin(u * .63 - x * 2.4 + seed) +
    .30 * Math.sin(u * 1.09 - x * 3.9 + seed * 1.7) +
    .15 * Math.sin(u * 2.31 + seed * 2.9)
  );
}

/** 一件衣物的狀態。stiff 越小越重、越慢；drag 越大越快停 */
export function createBody({ x = .5, seed = 0, stiff = 9, drag = 2.6, gain = 1 } = {}) {
  return { x, seed, stiff, drag, gain, a: 0, v: 0, b: 0 };
}

/** 前進 dt 秒。回傳 { angle, shear }：angle 是整件的擺角，shear 是下襬落後的量 */
export function step(body, p, t, dt, heavy = 1) {
  dt = clamp(dt, 0, .05);
  const target = (p.lean + p.flutter * gust(t, body.x, body.seed, p.tempo)) * body.gain * heavy;
  const k = body.stiff * (.55 + .45 * heavy);
  body.v += ((target - body.a) * k - body.v * body.drag) * dt;
  body.a = clamp(body.a + body.v * dt, -LIMIT, LIMIT);
  body.b += (body.a - body.b) * (1 - Math.exp(-dt * 3.2));       // 下襬慢半拍
  return { angle: body.a, shear: clamp((body.b - body.a) * .9, -9, 9) };
}
