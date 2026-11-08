import type { Melody } from './model';
export const TAGS_KEY='beep-lab:tags:v1';
export const MAX_TAGS=8;
export const MAX_TAG_LENGTH=20;
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export type TagIndex=Map<string,string[]>;
export type TagResult={tags:TagIndex;writable:boolean;warning?:string};
export function searchKey(value:string) {return value.normalize('NFKC').trim().replace(/\s+/g,' ').toLowerCase();}
export function normalizeTags(values:string[]) {
  const tags:string[]=[],seen=new Set<string>();
  for(const value of values){
    if(typeof value!=='string')throw new Error('標籤格式無效。');
    const text=value.trim().replace(/\s+/g,' ');if(!text)continue;
    if(text.length>MAX_TAG_LENGTH)throw new Error(`每個標籤最多 ${MAX_TAG_LENGTH} 字。`);
    const key=searchKey(text);if(!seen.has(key)){seen.add(key);tags.push(text);}
  }
  if(tags.length>MAX_TAGS)throw new Error(`每首最多 ${MAX_TAGS} 個標籤。`);
  return tags;
}
export function readTags(storage:StorageLike):TagResult {
  const tags:TagIndex=new Map();
  try{
    const raw=storage.getItem(TAGS_KEY);if(!raw)return {tags,writable:true};
    const data:unknown=JSON.parse(raw);
    if(!data||typeof data!=='object'||(data as {schemaVersion?:unknown}).schemaVersion!==1||!Array.isArray((data as {entries?:unknown}).entries))throw new Error();
    for(const entry of (data as {entries:unknown[]}).entries){
      if(!entry||typeof entry!=='object')throw new Error();
      const value=entry as {songId?:unknown;tags?:unknown};
      if(typeof value.songId!=='string'||!value.songId.length||value.songId.length>100||tags.has(value.songId)||!Array.isArray(value.tags))throw new Error();
      const normalized=normalizeTags(value.tags);
      if(normalized.length!==value.tags.length)throw new Error();
      tags.set(value.songId,normalized);
    }
    return {tags,writable:true};
  }catch{return {tags,writable:false,warning:'標籤資料無法讀取；保留原始資料，暫停修改標籤。旋律仍可使用。'};}
}
export function saveSongTags(storage:StorageLike,songId:string,values:string[],expected?:string[]) {
  if(!songId||songId.length>100)throw new Error('作品識別碼無效。');
  const tags=normalizeTags(values),current=readTags(storage);
  if(!current.writable)throw new Error(current.warning);
  if(expected&&JSON.stringify(current.tags.get(songId)??[])!==JSON.stringify(expected))throw new Error('標籤已在其他分頁更新，請關閉後重新開啟再修改。');
  if(tags.length)current.tags.set(songId,tags);else current.tags.delete(songId);
  try{storage.setItem(TAGS_KEY,JSON.stringify({schemaVersion:1,entries:[...current.tags].map(([songId,tags])=>({songId,tags}))}));}
  catch{throw new Error('標籤儲存失敗：本機空間不足或瀏覽器禁止儲存。');}
}
export function tagOptions(songs:Melody[],index:TagIndex) {
  const options=new Map<string,{key:string;name:string;count:number}>();
  for(const song of songs)for(const name of index.get(song.id)??[]){const key=searchKey(name);const previous=options.get(key);if(previous)previous.count++;else options.set(key,{key,name,count:1});}
  return [...options.values()].sort((a,b)=>a.name.localeCompare(b.name,'zh-Hant'));
}
export function filterSongs(songs:Melody[],index:TagIndex,query='',tag:string|null=null) {
  const words=searchKey(query).split(' ').filter(Boolean);
  return songs.filter(song=>{
    const tags=index.get(song.id)??[];
    if(tag!==null&&(tag===''?tags.length>0:!tags.some(name=>searchKey(name)===searchKey(tag))))return false;
    const searchable=searchKey([song.title,...tags].join(' '));return words.every(word=>searchable.includes(word));
  });
}
