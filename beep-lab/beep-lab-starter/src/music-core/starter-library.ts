import { starterMelodies } from '../repertoire';
import { readLibrary, writeLibrary, type LibraryResult } from './storage';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export const STARTERS_KEY='beep-lab:starters:v1';
/** Seed once; never replace a user's edited copy or resurrect a deleted starter. */
export function ensureStarterLibrary(storage:StorageLike):LibraryResult {
  const library=readLibrary(storage);
  if(!library.writable||library.warning)return library;
  try {
    if(storage.getItem(STARTERS_KEY)==='1')return library;
    const ids=new Set(library.songs.map(song=>song.id));
    const added=starterMelodies().filter(song=>!ids.has(song.id));
    const songs=[...library.songs,...added];
    if(added.length)writeLibrary(storage,songs);
    storage.setItem(STARTERS_KEY,'1');
    return {...library,songs};
  }catch {
    return {...readLibrary(storage),warning:'示範歌曲尚未完整加入，請確認瀏覽器允許儲存後重新整理。'};
  }
}
