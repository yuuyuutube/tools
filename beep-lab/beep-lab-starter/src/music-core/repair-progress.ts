export const REPAIR_PROGRESS_KEY='beep-lab:repair-progress:v1';
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
export type RepairProgress={completed:string[];current:string;writable:boolean;warning?:string};
const empty=():RepairProgress=>({completed:[],current:'nokia',writable:true});
export function readRepairProgress(storage:StorageLike):RepairProgress {
  try{
    const raw=storage.getItem(REPAIR_PROGRESS_KEY);if(!raw)return empty();
    const data:unknown=JSON.parse(raw);
    if(!data||typeof data!=='object')throw new Error();
    const value=data as Record<string,unknown>;
    if(value.schemaVersion!==1||!Array.isArray(value.completed)||!value.completed.every(id=>typeof id==='string'&&id.length>0&&id.length<=100)||typeof value.current!=='string'||!value.current||value.current.length>100)throw new Error();
    return {completed:[...new Set(value.completed as string[])],current:value.current,writable:true};
  }catch{return {...empty(),writable:false,warning:'無法讀取本機闖關進度；仍可遊玩，原始資料保持不變。'};}
}
export function saveRepairProgress(storage:StorageLike,current:string,completed:string[]):RepairProgress {
  const previous=readRepairProgress(storage);
  if(!previous.writable)throw new Error(previous.warning);
  const next={schemaVersion:1,current,completed:[...new Set([...previous.completed,...completed])]};
  try{storage.setItem(REPAIR_PROGRESS_KEY,JSON.stringify(next));}
  catch{throw new Error('無法儲存闖關進度；本次仍可繼續遊玩。');}
  return {...next,writable:true};
}
