import fs from 'node:fs/promises';
import https from 'node:https';
import {synchronize,sourceURL} from './sync-core.mjs';
const root=new URL('../data/',import.meta.url);
function download(url){return new Promise((resolve,reject)=>{https.get(url,{headers:{'User-Agent':'StraitObservatory/1.0 (public historical data)'}},r=>{if(r.statusCode!==200){r.resume();reject(Error('HTTP '+r.statusCode));return;}let body='';r.setEncoding('utf8');r.on('data',s=>{body+=s;if(body.length>10e6)r.destroy(Error('source too large'));});r.on('error',reject);r.on('end',()=>resolve(body));}).on('error',reject).setTimeout(30000,function(){this.destroy(Error('timeout'));});});}
try{const out=await synchronize(()=>process.argv.includes('--local')?fs.readFile(new URL('records.csv',root),'utf8'):download(sourceURL),root);console.log(`${out.count} records; ${out.first} - ${out.latest}; ${out.checks.changedDates.length} changed`);}catch(e){console.error(e.message);process.exitCode=1;}
