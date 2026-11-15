import test from 'node:test';import assert from 'node:assert/strict';
import {publishedApi} from '../src/published-weather.js';
const now=Date.parse('2026-11-15T03:30:00+08:00');
const data={version:1,generatedAt:new Date(now).toISOString(),locations:[{county:'臺北市',town:'中正區',lat:25.0324,lon:121.5199}],weather:[{mode:'live',county:'臺北市',town:'中正區',pop:20,forecastComplete:true,observedAt:new Date(now-1800000).toISOString(),currentPeriod:{start:new Date(now-3600000).toISOString(),end:new Date(now+3600000).toISOString()},forecast:[],issues:[]}]};
const fetcher=async()=>({ok:true,json:async()=>structuredClone(data)});
test('Pages uses official data for weather, full locations and local GPS matching',async()=>{
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{},fetcher,now);assert.equal(w.mode,'live');assert.equal(w.pop,20);assert.equal(w.isNight,true);assert.equal(w.stale,false);
 const towns=await publishedApi('./api/locations?county=臺北市',{},fetcher,now);assert.equal(towns.towns.length,1);
 const point=await publishedApi('./api/locate',{body:JSON.stringify({lat:25.03,lon:121.52})},fetcher,now);assert.equal(point.town,'中正區');
});
test('old published data is marked stale and expired rain intervals are never reused',async()=>{
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{},fetcher,now+3*3600000);assert.equal(w.stale,true);assert.equal(w.pop,null);assert.equal(w.currentPeriod,null);assert.equal(w.forecastComplete,false);
});
