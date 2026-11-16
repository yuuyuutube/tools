import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {normalize,taipeiDate,summary,fields} from '../data-core.mjs';
export const sourceURL='https://pla-tracker.skyfaring.net/data/records.csv';
export async function synchronize(loader,root,{today=taipeiDate(),now=new Date().toISOString()}={}){
 try{
  const csv=await loader(),records=normalize(csv,today);
  if(!records.length)throw Error('沒有有效資料');
  let old;try{old=JSON.parse(await fs.readFile(new URL('records.json',root),'utf8'));}catch(e){if(e.code!=='ENOENT')throw Error('既有快取無法讀取');}
  if(old&&records.at(-1).date<old.latest)throw Error('來源日期倒退');
  if(old&&records.length<old.records.length*.95)throw Error('來源資料大量減少');
  const previous=new Map(old?.records.map(r=>[r.date,r])||[]);
  const changed=records.filter(r=>JSON.stringify(r)!==JSON.stringify(previous.get(r.date))).map(r=>r.date);
  const out={source:sourceURL,fetchedAt:now,lastSuccess:now,latest:records.at(-1).date,first:records[0].date,count:records.length,version:createHash('sha256').update(csv).digest('hex').slice(0,16),checks:{valid:true,missingValues:Object.fromEntries(fields.map(f=>[f,records.filter(r=>r[f]===null).length])),changedDates:changed},statistics:Object.fromEntries(fields.map(f=>[f,summary(records,f)])),records};
  await fs.writeFile(new URL('records.json.tmp',root),JSON.stringify(out));
  await fs.writeFile(new URL('records.csv.tmp',root),csv);
  await fs.rename(new URL('records.csv.tmp',root),new URL('records.csv',root));
  await fs.rename(new URL('records.json.tmp',root),new URL('records.json',root));
  await fs.writeFile(new URL('status.json',root),JSON.stringify({ok:true,attemptedAt:now,newLatest:!old||old.latest!==out.latest}));
  return out;
 }catch(e){await fs.writeFile(new URL('status.json',root),JSON.stringify({ok:false,attemptedAt:now,error:e.message}));throw e;}
}
