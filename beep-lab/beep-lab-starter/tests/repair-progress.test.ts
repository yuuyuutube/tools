import {describe,it,expect} from 'vitest';
import {drawRepairPraise,repairPraises} from '../src/repair-praise';
import {readRepairProgress,saveRepairProgress,REPAIR_PROGRESS_KEY} from '../src/music-core/repair-progress';
function memory(){const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);}};}
describe('random completion praise',()=>{
  it('draws from a varied pool and excludes the previous celebration',()=>{
    expect(new Set(repairPraises).size).toBeGreaterThanOrEqual(15);
    for(const previous of repairPraises)for(const sample of [0,.25,.5,.999,1,-1,NaN]){
      const result=drawRepairPraise(previous,()=>sample);expect(repairPraises).toContain(result);expect(result).not.toBe(previous);
    }
  });
});
describe('repair progress',()=>{
  it('persists the selected level and completed IDs across reloads, without duplicate completions',()=>{
    const storage=memory();expect(readRepairProgress(storage)).toMatchObject({completed:[],current:'nokia',writable:true});
    saveRepairProgress(storage,'ode-to-joy',['nokia']);saveRepairProgress(storage,'fate',['nokia','ode-to-joy']);
    expect(readRepairProgress(storage)).toMatchObject({completed:['nokia','ode-to-joy'],current:'fate'});
  });
  it('merges completions written by another tab without discarding future level IDs',()=>{
    const storage=memory();saveRepairProgress(storage,'nokia',['future-level']);saveRepairProgress(storage,'fate',['nokia']);
    expect(readRepairProgress(storage).completed).toEqual(['future-level','nokia']);
  });
  it.each(['bad','{}','null',JSON.stringify({schemaVersion:2,completed:[],current:'nokia'}),JSON.stringify({schemaVersion:1,completed:[3],current:'nokia'})])('preserves unsupported progress %s',raw=>{
    const storage=memory();storage.setItem(REPAIR_PROGRESS_KEY,raw);expect(readRepairProgress(storage).writable).toBe(false);
    expect(()=>saveRepairProgress(storage,'nokia',['nokia'])).toThrow();expect(storage.getItem(REPAIR_PROGRESS_KEY)).toBe(raw);
  });
  it('reports blocked or full storage without changing the previous progress',()=>{
    const storage=memory();saveRepairProgress(storage,'nokia',[]);
    const blocked={getItem:storage.getItem,setItem:()=>{throw new Error('quota');}};
    expect(()=>saveRepairProgress(blocked,'fate',['nokia'])).toThrow('仍可繼續');expect(readRepairProgress(storage).completed).toEqual([]);
    expect(readRepairProgress({getItem:()=>{throw new Error('blocked');},setItem:storage.setItem}).writable).toBe(false);
  });
});
