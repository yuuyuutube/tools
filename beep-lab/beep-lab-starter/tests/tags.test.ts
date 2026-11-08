import {describe,it,expect} from 'vitest';
import {createMelody} from '../src/music-core/model';
import {STORAGE_KEY,writeLibrary} from '../src/music-core/storage';
import {TAGS_KEY,normalizeTags,readTags,saveSongTags,filterSongs,tagOptions} from '../src/music-core/tags';
function memory(){const values=new Map<string,string>();return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},values};}
const songs=()=>[{...createMelody('雨天的旋律'),id:'rain'},{...createMelody('Little Signals'),id:'signals'},{...createMelody('未命名'),id:'none'}];
describe('local collection tags',()=>{
  it('normalizes spacing, full-width and case duplicates, preserving the first display name',()=>{
    expect(normalizeTags([' 原創 ','ＷＩＰ','wip','想  送給朋友',''])).toEqual(['原創','ＷＩＰ','想 送給朋友']);
    expect(()=>normalizeTags(['字'.repeat(21)])).toThrow('20');expect(()=>normalizeTags(Array.from({length:9},(_,i)=>String(i)))).toThrow('8');
  });
  it('stores tags without changing library songs or their schema',()=>{
    const storage=memory();writeLibrary(storage,songs());const original=storage.getItem(STORAGE_KEY);
    saveSongTags(storage,'rain',['原創','未完成']);expect(readTags(storage).tags.get('rain')).toEqual(['原創','未完成']);expect(storage.getItem(STORAGE_KEY)).toBe(original);
    saveSongTags(storage,'rain',[]);expect(readTags(storage).tags.has('rain')).toBe(false);
  });
  it('merges another song’s newer tags and rejects conflicting changes to the same song',()=>{
    const storage=memory();saveSongTags(storage,'rain',['原創']);const expected=readTags(storage).tags.get('rain')!;
    saveSongTags(storage,'signals',['完成']);saveSongTags(storage,'rain',['原創','未完成'],expected);expect(readTags(storage).tags.get('signals')).toEqual(['完成']);
    expect(()=>saveSongTags(storage,'rain',['別的'],expected)).toThrow('其他分頁');expect(readTags(storage).tags.get('rain')).toEqual(['原創','未完成']);
  });
  it.each(['{','{"schemaVersion":2,"entries":[]}','{"schemaVersion":1,"entries":[{"songId":"rain","tags":["x","X"]}]}','{"schemaVersion":1,"entries":[{"songId":"rain","tags":[12]}]}'])('preserves unreadable raw data and disables writes',raw=>{
    const storage=memory();storage.setItem(TAGS_KEY,raw);expect(readTags(storage).writable).toBe(false);expect(()=>saveSongTags(storage,'rain',['新'])).toThrow();expect(storage.getItem(TAGS_KEY)).toBe(raw);
  });
  it('handles prohibited storage and quota failures without claiming success',()=>{
    expect(readTags({getItem(){throw new Error();},setItem(){}}).writable).toBe(false);
    expect(()=>saveSongTags({getItem:()=>null,setItem(){throw new Error();}},'rain',['原創'])).toThrow('儲存失敗');
  });
  it('combines title/tag search with exact tag and unclassified filters',()=>{
    const list=songs(),index=new Map([['rain',['原創','未完成']],['signals',['WIP']]]);
    expect(filterSongs(list,index,'雨天 原創').map(song=>song.id)).toEqual(['rain']);
    expect(filterSongs(list,index,'ＬＩＴＴＬＥ').map(song=>song.id)).toEqual(['signals']);
    expect(filterSongs(list,index,'wip').map(song=>song.id)).toEqual(['signals']);
    expect(filterSongs(list,index,'','')).toEqual([list[2]]);expect(filterSongs(list,index,'雨天','WIP')).toEqual([]);expect(filterSongs(list,index,'','未完成')).toEqual([list[0]]);
  });
  it('counts current songs only and merges tag aliases in filter options',()=>{
    const list=songs(),index=new Map([['rain',['WIP']],['signals',['wip']],['deleted',['不顯示']]]);
    expect(tagOptions(list,index)).toEqual([{key:'wip',name:'WIP',count:2}]);
  });
});
