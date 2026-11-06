import { isMelody, type Melody } from './model';
export const STORAGE_KEY = 'beep-lab:library:v1';
type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;
export type LibraryResult = { songs: Melody[]; warning?: string; writable: boolean };
export function readLibrary(storage: StorageLike): LibraryResult {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return { songs: [], writable: true };
    const data: unknown = JSON.parse(raw);
    if (!data || typeof data !== 'object' || (data as { schemaVersion?: unknown }).schemaVersion !== 1
      || !Array.isArray((data as { songs?: unknown }).songs)) {
      return { songs: [], warning: '收藏格式無法辨識；保留原始資料，本次暫停寫入。', writable: false };
    }
    const entries = (data as { songs: unknown[] }).songs;
    const seen = new Set<string>();
    const songs = entries.filter(isMelody).filter(song => {
      if (seen.has(song.id)) return false;
      seen.add(song.id); return true;
    });
    return { songs, writable: true, warning: songs.length !== entries.length ? '部分收藏損壞或重複，已略過；其他有效作品仍可載入。' : undefined };
  } catch {
    return { songs: [], warning: '無法讀取本機收藏（資料損壞或瀏覽器限制）；原始資料保持不變。', writable: false };
  }
}
export function writeLibrary(storage: StorageLike, songs: Melody[]): void {
  if (!songs.every(isMelody)) throw new Error('歌曲格式無效，未儲存。');
  try { storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, songs })); }
  catch { throw new Error('儲存失敗：本機空間不足或瀏覽器禁止儲存。請保留本頁後再試。'); }
}
