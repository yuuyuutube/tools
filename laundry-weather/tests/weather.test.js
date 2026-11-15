import test from 'node:test';import assert from 'node:assert/strict';
import {number,normalizeForecast,normalizeObservations,selectObservation,combineWeather,townCatalog} from '../server/normalize.js';
import {CwaService} from '../server/cwa.js';import {laundryScore} from '../src/score.js';import {demoWeather} from '../src/demo.js';
import {nearestForecast} from '../src/locations.js';import {NOW,forecastFixture,observationFixture} from './fixtures.js';
test('four demos produce distinct scenes and all four grades',()=>{
 assert.deepEqual(['sunny','cloudy','humid','rainy'].map(s=>laundryScore(demoWeather(s)).scene),['sunny','cloudy','humid','rainy']);
 assert.deepEqual(['sunny','cloudy','humid','rainy'].map(s=>laundryScore(demoWeather(s)).grade),['GREAT','GOOD','FAIR','POOR']);
});
test('current precipitation uses covering interval; upcoming risk remains distinct',()=>{
 const f=normalizeForecast(forecastFixture(),'中正區',NOW);assert.equal(f.pop,10);assert.equal(f.forecast[1].pop,80);assert.equal(f.windDirection,45);
 assert.equal(laundryScore(f).grade,'POOR');
 const gap=normalizeForecast(forecastFixture(),'中正區',Date.parse('2026-11-13T08:00:00+08:00'));assert.equal(gap.pop,null);assert.equal(gap.temperature,null);
});
test('interval end is exclusive and outdated data cannot masquerade as current',()=>{
 assert.equal(normalizeForecast(forecastFixture(),'中正區',Date.parse('2026-11-13T12:00:00+08:00')).pop,80);
 assert.equal(normalizeForecast(forecastFixture(),'中正區',NOW+24*3600000).pop,null);
});
test('documented WGS84, percent humidity and missing codes are normalized conservatively',()=>{
 const [o]=normalizeObservations(observationFixture());assert.equal(o.humidity,60);assert.equal(o.lat,25.03);
 for(const value of ['-99','X','T','',' ',null,'3-4'])assert.equal(number(value,0,100),null);
 assert.equal(number('≤1',0,100),1);assert.equal(number('0',0,100),0);
 const fixture=observationFixture();fixture.records.Station[0].WeatherElement.RelativeHumidity='0';assert.equal(normalizeObservations(fixture)[0].humidity,0);
});
test('daily accumulation is never classified as currently raining',()=>{
 const f=normalizeForecast(forecastFixture(),'中正區',NOW),o=selectObservation(normalizeObservations(observationFixture()),f,'臺北市',NOW);
 assert.ok(o);const combined=combineWeather(f,o,{county:'臺北市',town:'中正區'},NOW);
 assert.equal(combined.isRaining,false);assert.equal(combined.temperature,27);assert.equal(combined.origins.temperature,'觀測');
 assert.equal(combined.town,'中正區');assert.equal(combined.station.town,'大安區');
});
test('stale, distant and other-county observations are excluded',()=>{
 const list=normalizeObservations(observationFixture());assert.equal(selectObservation(list,{lat:25.03,lon:121.52},'新北市',NOW),null);
 assert.equal(selectObservation(list,{lat:24,lon:120},'臺北市',NOW),null);
 assert.equal(selectObservation(list,{lat:25.03,lon:121.52},'臺北市',NOW+3*3600000),null);
 const combined=combineWeather(normalizeForecast(forecastFixture(),'中正區',NOW),null,{county:'臺北市',town:'中正區'},NOW);
 assert.equal(combined.origins.temperature,'預報');assert.equal(combined.isRaining,null);
});
test('safety overrides: rain and strong wind; absent values do not earn a great grade',()=>{
 for(const patch of [{isRaining:true},{pop:80},{windSpeed:12}])assert.equal(laundryScore({...demoWeather(),...patch}).grade,'POOR');
 assert.equal(laundryScore({...demoWeather(),humidity:null}).sufficient,false);
 assert.equal(laundryScore({...demoWeather(),stale:true}).sufficient,false);
 assert.notEqual(laundryScore({...demoWeather(),pop:null,forecast:[]}).grade,'GREAT');
 assert.ok(laundryScore({...demoWeather(),windSpeed:2}).score>laundryScore({...demoWeather(),windSpeed:9}).score);
});
test('forecast coordinates determine location; out-of-coverage GPS has no fake match',()=>{
 const towns=townCatalog(forecastFixture(),'臺北市');assert.equal(nearestForecast({lat:25.03,lon:121.52},towns).town,'中正區');
 assert.equal(nearestForecast({lat:35,lon:139},towns),null);
});
test('schema changes fail visibly rather than fabricate defaults',()=>{
 assert.throws(()=>normalizeForecast({records:{locations:[]}},'中正區',NOW),/SCHEMA/);
 assert.throws(()=>normalizeObservations({records:{Station:{}}}),/SCHEMA/);
});
test('cache deduplicates requests, expires and only serves bounded stale fallback',async()=>{
 let now=NOW,calls=0,fail=false;const service=new CwaService({key:'private-test',now:()=>now,fetcher:async()=>{calls++;if(fail)throw Error('secret-url');return {ok:true,json:async()=>forecastFixture()};}});
 await Promise.all([service.dataset('F-D0047-061'),service.dataset('F-D0047-061')]);assert.equal(calls,1);
 now+=599999;await service.dataset('F-D0047-061');assert.equal(calls,1);
 now+=2;fail=true;assert.equal((await service.dataset('F-D0047-061')).stale,true);
 now+=3600000;await assert.rejects(service.dataset('F-D0047-061'),e=>!e.message.includes('secret')&&!e.message.includes('private-test'));
 assert.equal(service.pending.size,0);
});
test('observation failure preserves forecast with honest origins',async()=>{
 const service=new CwaService({key:'test',now:()=>NOW,fetcher:async url=>{if(url.pathname.includes('O-A0001'))throw Error('offline');return {ok:true,json:async()=>forecastFixture()};}});
 const w=await service.weather('臺北市','中正區');assert.equal(w.mode,'live');assert.equal(w.origins.temperature,'預報');assert.equal(w.station,null);assert.ok(w.issues.length);
});
