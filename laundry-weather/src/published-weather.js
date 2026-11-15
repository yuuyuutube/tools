import {nearestForecast} from './locations.js';
export const SNAPSHOT_URL='https://raw.githubusercontent.com/yuuyuutube/tools/weather-data/laundry-weather.json';
let cached,loadedAt=0;
export async function publishedApi(path,options={},fetcher=fetch,now=Date.now()){
 if(!cached||now-loadedAt>60000){
  const r=await fetcher(SNAPSHOT_URL+'?t='+Math.floor(now/60000),{signal:options.signal,cache:'no-store'});
  if(!r.ok)throw Error('氣象署資料暫時無法取得');
  const data=await r.json();
  if(data.version!==1||!Array.isArray(data.weather)||!Array.isArray(data.locations)||!Number.isFinite(Date.parse(data.generatedAt)))throw Error('氣象資料格式錯誤');
  cached=data;loadedAt=now;
 }
 const url=new URL(path,'https://local.invalid/');
 if(url.pathname.endsWith('/api/locations'))return {mode:'live',towns:cached.locations.filter(t=>t.county===url.searchParams.get('county'))};
 if(url.pathname.endsWith('/api/locate')){
  const point=JSON.parse(options.body),found=nearestForecast(point,cached.locations);
  if(!found)throw Error('附近沒有可用預報區，請手動選擇');
  return {...found,origin:'gps'};
 }
 if(!url.pathname.endsWith('/api/weather'))throw Error('Unknown weather route');
 const found=cached.weather.find(w=>w.county===url.searchParams.get('county')&&w.town===url.searchParams.get('town'));
 if(!found)throw Error('找不到此鄉鎮的官方預報');
 const w=structuredClone(found);
 w.stale=Boolean(w.stale)||now-Date.parse(cached.generatedAt)>45*60000||(w.observedAt&&now-Date.parse(w.observedAt)>2*3600000);
 w.publishedAt=cached.generatedAt;w.delivery='github-actions';
 w.issues=[...(w.issues||[]),'官方資料由 GitHub Actions 約每 20 分鐘更新，可能因排程延遲。'];
 if(w.stale)w.issues.push('資料較舊，請確認觀測及更新時間。');
 if(w.currentPeriod&&!(Date.parse(w.currentPeriod.start)<=now&&now<Date.parse(w.currentPeriod.end))){w.pop=null;w.currentPeriod=null;w.forecastComplete=false;}
 w.forecast=(w.forecast||[]).filter(p=>Date.parse(p.end)>now&&Date.parse(p.start)<now+6*3600000);
 const hour=+new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).format(new Date(now));w.isNight=hour<6||hour>=18;
 return w;
}
