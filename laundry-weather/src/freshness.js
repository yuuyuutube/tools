// 保留原始時間；讀取或重新整理不會延長資料壽命。
export const DAY = 24 * 60 * 60 * 1000;
export function weatherFreshness(w, now = Date.now()) {
 const dates = [w.observedAt, w.fetchedAt, w.publishedAt].map(Date.parse).filter(Number.isFinite);
 const age = dates.length ? Math.max(0, now - Math.min(...dates)) : Infinity;
 const expired = w.mode !== 'demo' && age > DAY;
 const stale = !!w.stale || !!w.historicalForecast || expired
  || (w.publishedAt && now - Date.parse(w.publishedAt) > 45 * 60000)
  || (w.observedAt && now - Date.parse(w.observedAt) > 2 * 3600000 && w.mode !== 'demo');
 return {stale: !!stale, expired, withinDay: age <= DAY};
}
