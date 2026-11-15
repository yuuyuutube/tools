import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {CwaService} from '../server/cwa.js';
import {COUNTIES} from '../src/locations.js';
if(!process.env.CWA_API_KEY) throw Error('CWA_API_KEY is required');
const service=new CwaService({key:process.env.CWA_API_KEY});
const original=service.dataset.bind(service);
const cacheDir=new URL('../.weather-cache/',import.meta.url);await mkdir(cacheDir,{recursive:true});
service.dataset=async id=>{
 if(!id.startsWith('F-'))return original(id);
 const file=new URL(id+'.json',cacheDir);
 try{const cached=JSON.parse(await readFile(file,'utf8'));if(Date.now()-cached.time<6*3600000){service.cache.set(id,cached);return {data:cached.data,stale:false};}}catch{}
 const result=await original(id);if(!result.stale)await writeFile(file,JSON.stringify(service.cache.get(id)));return result;
};
const locations=[],weather=[];
for(const county of COUNTIES){
 const towns=await service.towns(county.name);if(!towns.length)throw Error('Empty county catalog');
 for(const town of towns){locations.push(town);weather.push(await service.weather(county.name,town.town));}
}
if(weather.length<350||!weather.some(w=>w.station))throw Error('Incomplete official weather snapshot');
const snapshot={version:1,generatedAt:new Date().toISOString(),locations,weather};
await writeFile(process.env.WEATHER_OUTPUT||'weather-live.json',JSON.stringify(snapshot));
console.log(`Published official weather for ${weather.length} areas; ${snapshot.generatedAt}`);
