// 太陽位置（簡化的天文公式，誤差約 1°），用來決定天色與太陽在畫面的位置。
// 日出日落隨季節與經緯度變化，不使用固定的 06:00／18:00。
const R = Math.PI / 180;

/** 回傳太陽高度角與方位角（度，方位角由北順時針） */
export function sunPosition(t, lat, lon) {
  const n = (+t) / 86400000 + 2440587.5 - 2451545.0;
  const L = (280.460 + 0.9856474 * n) % 360;
  const g = ((357.528 + 0.9856003 * n) % 360) * R;
  const lambda = (L + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)) * R;
  const eps = (23.439 - 0.0000004 * n) * R;
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda));
  const dec = Math.asin(Math.sin(eps) * Math.sin(lambda));
  const gmst = (280.46061837 + 360.98564736629 * n) % 360;
  const H = (gmst + lon) * R - ra, phi = lat * R;
  const el = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const az = Math.atan2(-Math.sin(H), Math.tan(dec) * Math.cos(phi) - Math.sin(phi) * Math.cos(H));
  return { elevation: el / R, azimuth: (az / R + 360) % 360 };
}

/**
 * 天色：night／dawn／day／dusk 與 0–1 的連續權重。
 * 太陽在地平線下 8° 以下是夜，上方 10° 以上是白天，中間是晨昏（依上午或下午分 dawn／dusk）。
 */
export function skyPhase(t, lat, lon) {
  const { elevation, azimuth } = sunPosition(t, lat, lon);
  const morning = azimuth < 180;
  let phase;
  if (elevation < -8) phase = 'night';
  else if (elevation > 10) phase = 'day';
  else phase = morning ? 'dawn' : 'dusk';
  return { phase, elevation, azimuth };
}

/** 找出某天（臺灣時間）太陽高度穿過 -0.83° 的時刻：日出、日落 */
export function sunTimes(day0, lat, lon) {
  const out = { rise: null, set: null };
  let prev = sunPosition(day0, lat, lon).elevation;
  for (let m = 5; m <= 1440; m += 5) {
    const t = day0 + m * 60000, e = sunPosition(t, lat, lon).elevation;
    if (prev < -0.83 && e >= -0.83 && !out.rise) out.rise = t - 5 * 60000 * (e + 0.83) / (e - prev);
    if (prev >= -0.83 && e < -0.83 && !out.set) out.set = t - 5 * 60000 * (e + 0.83) / (e - prev);
    prev = e;
  }
  return out;
}
