/* 瀏覽器端快取：IndexedDB 的極簡 key-value；不能用時安靜地退回「不快取」 */
const DB = 'little-encounters', STORE = 'kv';
let dbp;
function open() {
  return dbp ||= new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function tx(mode, fn) {
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), q = fn(t.objectStore(STORE));
    t.oncomplete = () => res(q.result);
    t.onerror = t.onabort = () => rej(t.error);
  });
}
export const kv = {
  get: k => tx('readonly', s => s.get(k)).catch(() => undefined),
  set: (k, v) => tx('readwrite', s => s.put(v, k)).catch(() => undefined),
  del: k => tx('readwrite', s => s.delete(k)).catch(() => undefined),
};
