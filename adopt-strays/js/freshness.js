/* Data Freshness：資料多久算新、怎麼描述更新時間 */
export const TTL = {
  CACHE_MS: 6 * 3600e3,       // 瀏覽器裡的快取：6 小時內不重新下載
  SNAPSHOT_MS: 30 * 3600e3,   // 站上的每日快照：超過 30 小時就改抓官方 API
};
export const isFresh = (t, ttl, now = Date.now()) => Number.isFinite(t) && now - t >= 0 && now - t < ttl;

export function describe(t) {
  if (!t) return '';
  const d = new Date(t), p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}
