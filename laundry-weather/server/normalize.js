import { distance } from '../src/locations.js';
const arr=v=>Array.isArray(v)?v:[];
export function number(value,min=-60,max=100) {
 if(value==null || String(value).trim()==='') return null;
 const text=String(value).trim().replace(/^≤\s*/, '');
 if(!/^-?\d+(\.\d+)?$/.test(text)) return null;
 const n=Number(text); return n>=min && n<=max?n:null;
}
export function forecastLocations(data) {
 const groups=data?.records?.Locations;
 if(!Array.isArray(groups)) throw new Error('FORECAST_SCHEMA');
 const locations=groups.flatMap(g=>arr(g.Location));
 if(!locations.length) throw new Error('FORECAST_EMPTY');
 return locations;
}
export function townCatalog(data,county) {
 return forecastLocations(data).map(l=>({county,town:l.LocationName,lat:number(l.Latitude,-90,90),lon:number(l.Longitude,-180,180)}))
 .filter(l=>typeof l.town==='string'&&l.lat!==null&&l.lon!==null);
}
export function samples(location,name,key) {
 const element=arr(location.WeatherElement).find(e=>e.ElementName===name);
 return arr(element?.Time).map(t=>({start:t.StartTime||t.DataTime,end:t.EndTime||null,value:arr(t.ElementValue)[0]?.[key]}))
 .filter(t=>Number.isFinite(Date.parse(t.start))).sort((a,b)=>Date.parse(a.start)-Date.parse(b.start))
 .map((t,i,list)=>({...t,end:t.end || new Date(Math.min(Date.parse(list[i+1]?.start)||Infinity,Date.parse(t.start)+3*3600000)).toISOString()}));
}
export function atTime(list,now) {return list.find(t=>Date.parse(t.start)<=now && now<Date.parse(t.end)) || null;}
const directions={'北風':0,'東北風':45,'東風':90,'東南風':135,'南風':180,'西南風':225,'西風':270,'西北風':315,'偏北風':0,'偏東風':90,'偏南風':180,'偏西風':270};
function direction(value) {return directions[value]??number(value,0,360);}
export function normalizeForecast(data,town,now=Date.now()) {
 const l=forecastLocations(data).find(l=>l.LocationName===town);
 if(!l) throw new Error('TOWN_NOT_FOUND');
 const get=(name,key)=>atTime(samples(l,name,key),now)?.value;
 const pops=samples(l,'3小時降雨機率','ProbabilityOfPrecipitation');
 const current=atTime(pops,now);
 const forecast=pops.filter(p=>Date.parse(p.end)>now && Date.parse(p.start)<now+6*3600000).map(p=>({start:p.start,end:p.end,pop:number(p.value,0,100)}));
 let coverage=now;
 for(const p of forecast){if(p.pop===null||Date.parse(p.start)>coverage)break;coverage=Math.max(coverage,Date.parse(p.end));}
 return {forecastComplete:coverage>=now+6*3600000,temperature:number(get('溫度','Temperature')),humidity:number(get('相對濕度','RelativeHumidity'),0,100),
 windSpeed:number(get('風速','WindSpeed'),0,100),windDirection:direction(get('風向','WindDirection')),
 weather:get('天氣現象','Weather') || null,pop:number(current?.value,0,100),currentPeriod:current?{start:current.start,end:current.end}:null,
 forecast,lat:number(l.Latitude,-90,90),lon:number(l.Longitude,-180,180)};
}
export function normalizeObservations(data) {
 if(!Array.isArray(data?.records?.Station)) throw new Error('OBSERVATION_SCHEMA');
 return data.records.Station.map(s=>{
  const geo=s.GeoInfo||{},c=arr(geo.Coordinates).find(c=>c.CoordinateName==='WGS84')||{},w=s.WeatherElement||{};
  const weather=typeof w.Weather==='string'&&!/^-|^X$/.test(w.Weather)?w.Weather:null;
  return {id:s.StationId,name:s.StationName,county:geo.CountyName,town:geo.TownName,
   lat:number(c.StationLatitude,-90,90),lon:number(c.StationLongitude,-180,180),observedAt:s.ObsTime?.DateTime,
   temperature:number(w.AirTemperature),humidity:number(w.RelativeHumidity,0,100),windSpeed:number(w.WindSpeed,0,100),
   windDirection:number(w.WindDirection,0,360),weather,
   // Now.Precipitation is DAILY accumulation, never proof that it is raining now.
   dailyPrecipitation:number(w.Now?.Precipitation,0,2000)};
 }).filter(s=>s.lat!==null&&s.lon!==null);
}
export function selectObservation(stations,point,county,now=Date.now()) {
 return stations.filter(s=>s.county===county&&Date.parse(s.observedAt)>now-2*3600000&&Date.parse(s.observedAt)<=now+600000)
 .map(s=>({...s,distanceKm:distance(point,s)})).filter(s=>s.distanceKm<=25).sort((a,b)=>a.distanceKm-b.distanceKm)[0] || null;
}
export function combineWeather(forecast,observation,location,now=Date.now()) {
 const result={...forecast,mode:'live',county:location.county,town:location.town,fetchedAt:new Date(now).toISOString(),observedAt:observation?.observedAt||null,
  station:observation?{name:observation.name,id:observation.id,town:observation.town,distanceKm:Math.round(observation.distanceKm*10)/10}:null,origins:{},issues:[],isRaining:null};
 for(const key of ['temperature','humidity','windSpeed','windDirection','weather']) {
  const obs=observation?.[key]; result[key]=obs??forecast[key]; result.origins[key]=obs!=null?'觀測':'預報';
 }
 if(observation?.weather) result.isRaining=/雨|雷|雪/.test(observation.weather);
 const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',hour:'2-digit',hourCycle:'h23'}).format(now));
 result.isNight=hour<6||hour>=18;
 return result;
}
