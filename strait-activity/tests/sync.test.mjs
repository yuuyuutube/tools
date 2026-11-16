import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';import {synchronize} from '../scripts/sync-core.mjs';
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'strait-tests-')),root=pathToFileURL(dir+path.sep),header='date,aircraft_total,median_line_cross,ships_total\n';let count=0;
const opts={today:'2026-11-16',now:'2026-11-16T06:00:00Z'};
const valid=header+'2026-11-14,10,3,2\n2026-11-15,0,0,3\n2026-11-16,4,4,10\n';
try{
 await synchronize(async()=>valid,root,opts);
 const retained=await fs.readFile(new URL('records.json',root),'utf8');
 for(const [name,loader] of [['download unavailable',async()=>{throw Error('HTTP 503');}],['schema changed',async()=>'date,total\n2026-11-16,5'],['latest regressed',async()=>header+'2026-11-14,10,3,2'],['empty response',async()=>header],['invalid value',async()=>header+'2026-11-16,NaN,0,0']]){
  await assert.rejects(()=>synchronize(loader,root,opts));assert.equal(await fs.readFile(new URL('records.json',root),'utf8'),retained);assert.equal(JSON.parse(await fs.readFile(new URL('status.json',root),'utf8')).ok,false);console.log('PASS retains cache: '+name);count++;
 }
 const corrected=await synchronize(async()=>valid.replace('10,3,2','12,3,2'),root,opts);assert.equal(corrected.records[0].aircraft_total,12);assert.deepEqual(corrected.checks.changedDates,['2026-11-14']);assert.equal(corrected.statistics.aircraft_total.total,16);assert.equal(await fs.readFile(new URL('records.csv',root),'utf8'),valid.replace('10,3,2','12,3,2'));console.log('PASS history correction and CSV synchronized');count++;
 const unchanged=await synchronize(async()=>valid.replace('10,3,2','12,3,2'),root,opts);assert.equal(unchanged.checks.changedDates.length,0);assert.equal(JSON.parse(await fs.readFile(new URL('status.json',root),'utf8')).newLatest,false);console.log('PASS no new announcement reported correctly');count++;
 const missing=await synchronize(async()=>valid.replace('10,3,2','12,3,2').replace('0,0,3','0,0,'),root,opts);assert.equal(missing.records[1].ships_total,null);console.log('PASS empty field retained as null');count++;
 console.log(`${count} sync tests passed`);
}finally{await fs.rm(dir,{recursive:true,force:true});}
