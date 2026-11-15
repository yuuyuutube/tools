import { COUNTIES,nearestForecast } from '../src/locations.js';
import { forecastLocations,townCatalog,normalizeForecast,normalizeObservations,selectObservation,combineWeather } from './normalize.js';
export class CwaService {
 constructor({key,fetcher=fetch,now=()=>Date.now()}={}) {this.key=key;this.fetcher=fetcher;this.now=now;this.cache=new Map();this.pending=new Map();}
 async dataset(id) {
  const previous=this.cache.get(id), now=this.now();
  if(previous&&now-previous.time<600000) return {data:previous.data,stale:false};
  if(this.pending.has(id)) return this.pending.get(id);
  const task=(async()=>{
   try {
    const url=new URL(`https://opendata.cwa.gov.tw/api/v1/rest/datastore/${id}`);
    url.searchParams.set('Authorization',this.key);url.searchParams.set('format','JSON');
    const response=await this.fetcher(url,{signal:AbortSignal.timeout(15000),headers:{Accept:'application/json'}});
    if(!response.ok) throw new Error('CWA_HTTP');
    const data=await response.json();
    if(data.success!==true&&data.success!=='true') throw new Error('CWA_REJECTED');
    if(id==='O-A0001-001') normalizeObservations(data);else forecastLocations(data);
    this.cache.set(id,{time:this.now(),data});return {data,stale:false};
   } catch {
    if(previous&&now-previous.time<3600000) return {data:previous.data,stale:true};
    // Never include an upstream URL or raw error: these can contain the API key.
    throw new Error('氣象署資料暫時無法取得，請稍後重試。');
   }
  })().finally(()=>this.pending.delete(id));
  this.pending.set(id,task);return task;
 }
 county(name) {const c=COUNTIES.find(c=>c.name===name);if(!c) throw new Error('請選擇有效縣市。');return c;}
 async towns(county) {const c=this.county(county);const {data}=await this.dataset(c.feed);return townCatalog(data,county);}
 async locate(point) {
  // Full national forecast-area coordinates, NOT observation-station coordinates.
  // Bounded concurrency for first catalog load; subsequent calls use 10-minute cache.
  const all=[];let index=0;
  await Promise.all(Array.from({length:3},async()=>{while(index<COUNTIES.length){const c=COUNTIES[index++];all.push(...await this.towns(c.name));}}));
  const found=nearestForecast(point,all);
  if(!found) throw new Error('附近沒有可用的臺灣鄉鎮預報區，請手動選擇。');
  return {county:found.county,town:found.town,distanceKm:Math.round(found.distanceKm*10)/10,origin:'gps'};
 }
 async weather(county,town) {
  const c=this.county(county),now=this.now();
  const [f,o]=await Promise.allSettled([this.dataset(c.feed),this.dataset('O-A0001-001')]);
  if(f.status==='rejected') throw f.reason;
  const forecast=normalizeForecast(f.value.data,town,now);
  let observation=null;
  if(o.status==='fulfilled'&&!o.value.stale) observation=selectObservation(normalizeObservations(o.value.data),forecast,county,now);
  const result=combineWeather(forecast,observation,{county,town},now);
  result.feed=c.feed;result.stale=f.value.stale;
  if(f.value.stale) result.issues.push('預報連線失敗，暫用一小時內的快取。');
  if(!observation) result.issues.push('附近沒有新鮮且可用的參考觀測，數值改用預報。');
  if(result.pop===null) result.issues.push('目前時段的降雨機率不足。');
  result.cacheAt=new Date(this.cache.get(c.feed).time).toISOString();
  return result;
 }
}
