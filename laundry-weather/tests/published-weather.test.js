import test from 'node:test';import assert from 'node:assert/strict';
import {weatherFreshness,DAY} from '../src/freshness.js';
import {laundryScore} from '../src/score.js';
import {publishedApi} from '../src/published-weather.js';
const now=Date.parse('2026-11-15T03:30:00+08:00');
const data={version:1,generatedAt:new Date(now).toISOString(),locations:[{county:'臺北市',town:'中正區',lat:25.0324,lon:121.5199}],weather:[{mode:'live',county:'臺北市',town:'中正區',temperature:25,humidity:65,windSpeed:2,pop:20,fetchedAt:new Date(now).toISOString(),forecastComplete:true,observedAt:new Date(now-1800000).toISOString(),currentPeriod:{start:new Date(now-3600000).toISOString(),end:new Date(now+3600000).toISOString()},forecast:[],issues:[]}]};
const fetcher=async()=>({ok:true,json:async()=>structuredClone(data)});
test('Pages uses official data for weather, full locations and local GPS matching',async()=>{
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{},fetcher,now);assert.equal(w.mode,'live');assert.equal(w.pop,20);assert.equal(w.isNight,true);assert.equal(w.stale,false);
 const towns=await publishedApi('./api/locations?county=臺北市',{},fetcher,now);assert.equal(towns.towns.length,1);
 const point=await publishedApi('./api/locate',{body:JSON.stringify({lat:25.03,lon:121.52})},fetcher,now);assert.equal(point.town,'中正區');
});
test('old data within one day retains a recommendation and labels historical rain periods',async()=>{
 const later=now+3*3600000;
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{refresh:true},fetcher,later);
 assert.equal(w.stale,true);assert.equal(w.pop,20);assert.deepEqual(w.currentPeriod,data.weather[0].currentPeriod);
 assert.equal(w.historicalForecast,true);assert.equal(w.forecastComplete,false);
 const score=laundryScore(w,later);assert.equal(score.sufficient,true);assert.match(score.detail,/較舊資料/);assert.doesNotMatch(score.title,/資料不足/);
 assert.equal(laundryScore(w,now+23*3600000).sufficient,true);
 assert.equal(laundryScore({...w,humidity:null},later).sufficient,false);
 assert.equal(laundryScore({...w,referenceForecastComplete:false},later).sufficient,false);
});
test('data over one day stops recommendations without hiding measurements',async()=>{
 const later=now+25*3600000;
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{refresh:true},fetcher,later);
 const score=laundryScore(w,later);assert.equal(score.sufficient,false);assert.equal(score.expired,true);
 assert.match(score.detail,/超過一天/);assert.equal(w.temperature,25);assert.equal(w.pop,20);
 assert.match(laundryScore({...w,pop:90},later).title,/資料不足/);
});
test('manual refresh bypasses the minute cache and advances to a covering forecast period',async()=>{
 let calls=0;
 const current={start:new Date(now-60000).toISOString(),end:new Date(now+3600000).toISOString(),pop:40};
 const next=async()=>{calls++;const updated=structuredClone(data);updated.weather[0].forecast=[current];return {ok:true,json:async()=>updated};};
 const w=await publishedApi('./api/weather?county=臺北市&town=中正區',{refresh:true},next,now);
 assert.equal(calls,1);assert.equal(w.pop,40);assert.equal(w.historicalForecast,undefined);
 await publishedApi('./api/weather?county=臺北市&town=中正區',{},next,now+1000);assert.equal(calls,1);
 await publishedApi('./api/weather?county=臺北市&town=中正區',{refresh:true},next,now+2000);assert.equal(calls,2);
});

test('24-hour boundary uses original timestamps even after reloading',()=>{
 const w={mode:'live',observedAt:new Date(now).toISOString(),fetchedAt:new Date(now+DAY).toISOString(),stale:true};
 assert.equal(weatherFreshness(w,now+DAY).expired,false);
 assert.equal(weatherFreshness(w,now+DAY+1).expired,true);
});
