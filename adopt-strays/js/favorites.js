/* Favorites：我的相遇紀錄。只存辨識這隻動物所需的最少資訊，放在 LocalStorage。 */
const KEY = 'encounters.v1';

export function createFavorites(storage) {
  const read = () => {
    try {
      const v = JSON.parse(storage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(x => x && Number.isInteger(x.id)) : [];
    } catch { return []; }
  };
  const write = v => { try { storage.setItem(KEY, JSON.stringify(v)); } catch { /* 無痕模式：只留在這次瀏覽 */ } };
  let cache = read();
  return {
    list: () => cache.slice().sort((a, b) => b.t - a.t),
    has: id => cache.some(x => x.id === id),
    get: id => cache.find(x => x.id === id) || null,
    count: () => cache.length,
    add(a, now = Date.now()) {
      if (this.has(a.id)) return false;
      cache.push({ id: a.id, t: now, sub: a.sub, kind: a.kind, county: a.county, shelter: a.shelter, tel: a.tel, demo: a.demo ? 1 : undefined });
      write(cache); return true;
    },
    remove(id) { const n = cache.length; cache = cache.filter(x => x.id !== id); write(cache); return cache.length !== n; },
  };
}
