import { describe, expect, it } from 'vitest';
import { birthdayMelody, starterMelodies } from '../src/repertoire';
import { eventSeconds, formatEvent, isMelody } from '../src/music-core/model';
import { decodeShare, encodeShare } from '../src/music-core/share';
import { readLibrary, STORAGE_KEY, writeLibrary } from '../src/music-core/storage';
import { ensureStarterLibrary, STARTERS_KEY } from '../src/music-core/starter-library';
import { removedSongs, removeSong, restoreLastSong, REMOVED_KEY } from '../src/music-core/removed-songs';
function memory() {const data=new Map<string,string>();return {data,getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
describe('starter repertoire',()=>{
  it('provides four distinct canonical songs that round-trip through sharing',()=>{
    const songs=starterMelodies();expect(songs.map(song=>song.title)).toEqual(['生日快樂歌','叮叮噹','雪花隨風飄','結婚進行曲']);
    expect(new Set(songs.map(song=>song.id)).size).toBe(4);
    for(const song of songs){expect(isMelody(song)).toBe(true);expect(decodeShare(encodeShare(song)).events).toEqual(song.events);expect(song.events.reduce((sum,event)=>sum+eventSeconds(event,song.tempoBpm),0)).toBeGreaterThan(10);}
    expect(songs[1].events.reduce((sum,event)=>sum+eventSeconds(event,60),0)).toBe(64);
    expect(birthdayMelody().events.slice(0,6).map(formatEvent)).toEqual(['8.g1','16g1','4a1','4g1','4c2','2b1']);
  });
  it('adds starters once, preserving existing songs and edited starter IDs',()=>{
    const storage=memory();const edited={...birthdayMelody(),title:'我的生日改編'};
    const original={...birthdayMelody(),id:'personal',title:'我的作品'};writeLibrary(storage,[original,edited]);
    expect(ensureStarterLibrary(storage).songs.map(song=>song.title)).toEqual(['我的作品','我的生日改編','叮叮噹','雪花隨風飄','結婚進行曲']);
    expect(ensureStarterLibrary(storage).songs).toHaveLength(5);
    removeSong(storage,edited.id);expect(ensureStarterLibrary(storage).songs).toHaveLength(4);
  });
  it('does not overwrite unreadable or partially damaged collections',()=>{
    for(const raw of ['{bad',JSON.stringify({schemaVersion:2,songs:[]}),JSON.stringify({schemaVersion:1,songs:[{}]})]){
      const storage=memory();storage.setItem(STORAGE_KEY,raw);expect(ensureStarterLibrary(storage).warning).toBeTruthy();expect(storage.getItem(STORAGE_KEY)).toBe(raw);expect(storage.getItem(STARTERS_KEY)).toBeNull();
    }
  });
  it('retries a failed marker write without duplicating successful song writes',()=>{
    const storage=memory();const flaky={getItem:storage.getItem,setItem:(key:string,value:string)=>{if(key===STARTERS_KEY)throw new Error('quota');storage.setItem(key,value);}};
    expect(ensureStarterLibrary(flaky).songs).toHaveLength(4);expect(ensureStarterLibrary(storage).songs).toHaveLength(4);
  });
});
describe('recoverable collection removal',()=>{
  it('removes only the chosen ID, retains recovery data across reload and restores exact metadata',()=>{
    const storage=memory();const songs=starterMelodies();writeLibrary(storage,songs);
    removeSong(storage,songs[1].id);expect(readLibrary(storage).songs.map(song=>song.id)).toEqual([songs[0].id,songs[2].id,songs[3].id]);
    expect(removedSongs(storage)).toEqual([songs[1]]);expect(restoreLastSong(storage)).toEqual(songs[1]);expect(readLibrary(storage).songs).toHaveLength(4);expect(removedSongs(storage)).toEqual([]);
  });
  it('keeps the original when recovery storage fails, and preserves corrupt recovery data',()=>{
    const storage=memory();const songs=starterMelodies();writeLibrary(storage,songs);
    const blocked={getItem:storage.getItem,setItem:(key:string,value:string)=>{if(key===REMOVED_KEY)throw new Error('quota');storage.setItem(key,value);}};
    expect(()=>removeSong(blocked,songs[0].id)).toThrow();expect(readLibrary(storage).songs).toEqual(songs);
    storage.setItem(REMOVED_KEY,'bad');expect(()=>removeSong(storage,songs[0].id)).toThrow();expect(storage.getItem(REMOVED_KEY)).toBe('bad');
  });
  it('restores in reverse order and never overwrites an existing version',()=>{
    const storage=memory();const songs=starterMelodies();writeLibrary(storage,songs);
    removeSong(storage,songs[0].id);removeSong(storage,songs[1].id);expect(restoreLastSong(storage)?.id).toBe(songs[1].id);
    const edited={...songs[0],title:'新版'};writeLibrary(storage,[...readLibrary(storage).songs,edited]);expect(()=>restoreLastSong(storage)).toThrow('避免覆蓋');expect(readLibrary(storage).songs.at(-1)).toEqual(edited);expect(removedSongs(storage)).toEqual([songs[0]]);
  });
});
