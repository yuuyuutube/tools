import test from 'node:test';import assert from 'node:assert/strict';import {geolocate,saveLocation,readSavedLocation} from '../src/locations.js';
test('browser GPS success, denial, timeout, unavailable, and city-only storage',async()=>{
 const old=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 const values=new Map();globalThis.localStorage={getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)};globalThis.isSecureContext=true;
 const setGeo=geolocation=>Object.defineProperty(globalThis,'navigator',{value:{geolocation},configurable:true});
 try {
  setGeo({getCurrentPosition:resolve=>resolve({coords:{latitude:25,longitude:121}})});assert.deepEqual(await geolocate(),{lat:25,lon:121});
  setGeo({getCurrentPosition:(_,reject)=>reject({code:1})});await assert.rejects(geolocate(),/未授權/);
  setGeo({getCurrentPosition:(_,reject)=>reject({code:3})});await assert.rejects(geolocate(),/暫時不可用/);
  setGeo(null);await assert.rejects(geolocate(),/無法定位/);
  saveLocation({county:'臺北市',town:'中正區',lat:25,lon:121});assert.ok(![...values.values()][0].includes('lat'));
  assert.equal(readSavedLocation().origin,'manual');values.set('laundry-city','broken');assert.equal(readSavedLocation(),null);
 } finally {if(old)Object.defineProperty(globalThis,'navigator',old);else delete globalThis.navigator;delete globalThis.localStorage;delete globalThis.isSecureContext;}
});
