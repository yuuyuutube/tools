// County F-D0047 three-day feeds; representative points are only demo defaults.
export const COUNTIES = [
 ['臺北市','061','中正區',25.0324,121.5199],['新北市','069','板橋區',25.0114,121.4623],
 ['桃園市','005','桃園區',24.9936,121.301],['臺中市','073','西區',24.1438,120.6637],
 ['臺南市','077','中西區',22.99,120.198],['高雄市','065','苓雅區',22.625,120.312],
 ['基隆市','049','仁愛區',25.128,121.743],['新竹市','053','東區',24.801,120.971],
 ['嘉義市','057','東區',23.481,120.458],['新竹縣','009','竹北市',24.839,121.009],
 ['苗栗縣','013','苗栗市',24.56,120.821],['彰化縣','017','彰化市',24.075,120.545],
 ['南投縣','021','南投市',23.909,120.685],['雲林縣','025','斗六市',23.709,120.544],
 ['嘉義縣','029','太保市',23.459,120.332],['屏東縣','033','屏東市',22.671,120.487],
 ['宜蘭縣','001','宜蘭市',24.754,121.753],['花蓮縣','041','花蓮市',23.976,121.607],
 ['臺東縣','037','臺東市',22.756,121.145],['澎湖縣','045','馬公市',23.566,119.579],
 ['金門縣','085','金城鎮',24.432,118.317],['連江縣','081','南竿鄉',26.154,119.93]
].map(([name,feed,town,lat,lon])=>({name,feed:`F-D0047-${feed}`,town,lat,lon}));
export const DEFAULT_LOCATION = { county:'臺北市', town:'中正區', origin:'default' };
export function distance(a, b) {
 const rad = Math.PI / 180, dlat = (b.lat-a.lat)*rad, dlon=(b.lon-a.lon)*rad;
 const h=Math.sin(dlat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dlon/2)**2;
 return 6371*2*Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
}
export function nearestForecast(point, towns, maximumKm=35) {
 const found = towns.map(t=>({...t,distanceKm:distance(point,t)})).sort((a,b)=>a.distanceKm-b.distanceKm)[0];
 return found && found.distanceKm <= maximumKm ? found : null;
}
export function readSavedLocation() {
 try { const value=JSON.parse(localStorage.getItem('laundry-city')); if(COUNTIES.some(c=>c.name===value?.county) && typeof value.town==='string' && value.town.length<20) return {...value,origin:'manual'}; } catch {}
 return null;
}
export function saveLocation(location) {
 try { localStorage.setItem('laundry-city',JSON.stringify({county:location.county,town:location.town})); } catch {}
}
export function geolocate() {
 return new Promise((resolve,reject)=>{
  if(!isSecureContext || !navigator.geolocation) return reject(new Error('目前瀏覽器無法定位，請手動選擇地點。'));
  navigator.geolocation.getCurrentPosition(p=>resolve({lat:p.coords.latitude,lon:p.coords.longitude}),error=>reject(new Error(error.code===1?'定位未授權，請手動選擇地點。':'定位暫時不可用，請手動選擇地點。')),{enableHighAccuracy:false,timeout:10000,maximumAge:300000});
 });
}
