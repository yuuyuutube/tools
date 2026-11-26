// IndexedDB store for image blobs (keepsake photographs). Every call fails soft: if the
// browser has no IndexedDB (private mode, old Safari), callers fall back to re-rendering.

const DB = 'rotary-stories';
const STORE = 'blobs';

function open() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('no indexedDB'));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const store = t.objectStore(STORE);
    const req = fn(store);
    t.oncomplete = () => {
      db.close();
      resolve(req && req.result);
    };
    t.onerror = () => {
      db.close();
      reject(t.error);
    };
  });
}

export async function putBlob(key, blob) {
  try {
    await tx('readwrite', (s) => s.put(blob, key));
    return true;
  } catch {
    return false;
  }
}

export async function getBlob(key) {
  try {
    return (await tx('readonly', (s) => s.get(key))) || null;
  } catch {
    return null;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
