import { isMelody, type Melody } from './model';
import { readLibrary, writeLibrary } from './storage';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export const REMOVED_KEY='beep-lab:removed:v1';
export function removedSongs(storage:StorageLike):Melody[] {
  const raw=storage.getItem(REMOVED_KEY);
  if(!raw)return [];
  const data:unknown=JSON.parse(raw);
  if(!Array.isArray(data)||!data.every(isMelody))throw new Error('無法讀取已移除作品；暫停移除與復原，以保留原始資料。');
  return data;
}
export function removeSong(storage:StorageLike,id:string) {
  const library=readLibrary(storage);
  if(!library.writable||library.warning)throw new Error(library.warning??'無法寫入收藏。');
  const song=library.songs.find(value=>value.id===id);
  if(!song)return;
  const archive=removedSongs(storage).filter(value=>value.id!==id);
  // Save recovery data before changing the library; a failed write never loses the song.
  storage.setItem(REMOVED_KEY,JSON.stringify([...archive,song]));
  writeLibrary(storage,library.songs.filter(value=>value.id!==id));
}
export function restoreLastSong(storage:StorageLike):Melody|undefined {
  const library=readLibrary(storage);
  if(!library.writable||library.warning)throw new Error(library.warning??'無法寫入收藏。');
  const archive=removedSongs(storage);const song=archive.pop();
  if(!song)return;
  if(library.songs.some(value=>value.id===song.id))throw new Error('收藏已有同一首作品；請先確認現有版本，避免覆蓋。');
  writeLibrary(storage,[...library.songs,song]);
  storage.setItem(REMOVED_KEY,JSON.stringify(archive));
  return song;
}
