import {BalconyScene} from './scene.js';
import {COUNTIES,DEFAULT_LOCATION,readSavedLocation,saveLocation,geolocate} from './locations.js';
import {demoWeather} from './demo.js';
import {laundryScore} from './score.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const scene=new BalconyScene();
let location=readSavedLocation()||DEFAULT_LOCATION,weather,mode='demo',demoScene='sunny',weatherRequest,locationRequest,locating=false,loadSequence=0;
const status=text=>{$('#status').textContent=text;};
const time=value=>value?new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value)):'—';
async function api(path,options={}) {
 const response=await fetch(path,{...options,signal:options.signal||AbortSignal.timeout(25000)});
 if(!response.ok) throw new Error('氣象資料暫時無法取得');
 return response.json();
}
function render(w) {
 weather=w;mode=w.mode;const result=laundryScore(w);scene.setWeather(w,result);
 $('#location-name').textContent=`${location.county} · ${location.town}`;
 $('#advice-title').textContent=result.title;
 $('#advice-detail').textContent=result.detail;$('#advice-detail').hidden=!result.detail;
 const origin={default:'預設地點',gps:'鄰近預報區','gps-demo':'鄰近展示地點'}[location.origin];
 $('#source-tag').textContent=`${w.mode==='demo'?'展示資料':w.stale?'較舊資料':'中央氣象署'}${origin?' · '+origin:''}`;
 for(const [selector,key] of [['temperature','temperature'],['humidity','humidity'],['wind','windSpeed'],['rain','pop']]) {
  const v=w[key];$(`#${selector}`).textContent=v==null?'—':key==='windSpeed'?Number(v).toFixed(1):Math.round(v);
 }
 $('#rain-period').textContent=w.currentPeriod?`降雨 ${time(w.currentPeriod.start)}–${time(w.currentPeriod.end)}`:'目前時段無降雨機率';
 $('#updated').textContent=w.mode==='demo'?'11/13 09:00（非即時）':`${w.observedAt?`觀測 ${time(w.observedAt)} · `:''}擷取 ${time(w.cacheAt||w.fetchedAt)}${w.stale?'（快取）':''}`;
 $('#demo-controls').hidden=w.mode!=='demo';
 $$('[data-demo]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.demo===demoScene)));
 $('#source-detail').textContent=w.mode==='demo'?'目前為固定展示資料（2026/11/13），不是此地的即時天氣。':`預報區：${w.county}${w.town} · ${w.feed}。溫度／濕度／風速依序來自${w.origins.temperature}／${w.origins.humidity}／${w.origins.windSpeed}。${w.issues.join(' ')}`;
 $('#station-detail').textContent=w.station?`參考測站：${w.station.name}（${w.station.id}，${w.station.town}），距預報座標約 ${w.station.distanceKm} km。測站不是行政區的定位依據。`:'目前沒有參考測站；展示數值或預報不代表即時觀測。';
 $('#score-detail').textContent=`晾衣適宜度 ${result.score}/100 · ${result.grade}。權重：降雨 45、濕度 30、風速 15、溫度 10；風險參考未來六小時可用預報。${!result.sufficient?'部分數值、未來預報不足或資料較舊，採保守建議。':''}高降雨、正在下雨或強風會優先降低等級。`;
}
async function refresh({silent=false}={}) {
 weatherRequest?.abort();weatherRequest=new AbortController();const request=weatherRequest,seq=++loadSequence;
 $('#refresh').disabled=true;if(!silent)status('');
 try {
  const w=await api(`/api/weather?${new URLSearchParams({county:location.county,town:location.town})}`,{signal:AbortSignal.any([request.signal,AbortSignal.timeout(25000)])});
  if(seq!==loadSequence)return;
  render(w.mode==='demo'?demoWeather(demoScene,location):w);
  if(!silent)status(w.mode==='live'&&w.issues.length?w.issues[0]:'');
 } catch(error) {
  if(request.signal.aborted)return;
  if(weather?.mode==='live'&&weather.county===location.county&&weather.town===location.town)render({...weather,stale:true});
  else render(demoWeather(demoScene,location));
  $('#demo-controls').hidden=false;status('天氣連線失敗；目前顯示較舊資料或標示的展示資料，可重新整理。');
 } finally {if(seq===loadSequence)$('#refresh').disabled=false;}
}
function populateCounties() {$('#county').replaceChildren(...COUNTIES.map(c=>new Option(c.name,c.name)));$('#county').value=location.county;}
async function populateTowns(county,selected) {
 locationRequest?.abort();locationRequest=new AbortController();const request=locationRequest;
 const town=$('#town'),submit=$('#location-form button[type=submit]');town.disabled=true;submit.disabled=true;
 $('#location-help').textContent='載入中…';
 try {
  const data=await api(`/api/locations?${new URLSearchParams({county})}`,{signal:AbortSignal.any([request.signal,AbortSignal.timeout(20000)])});
  town.replaceChildren(...data.towns.map(t=>new Option(t.town,t.town)));
  if(data.towns.some(t=>t.town===selected))town.value=selected;
  $('#location-help').textContent=data.mode==='demo'?'展示模式僅提供代表地點。':'';
 } catch {
  if(request.signal.aborted)return;
  if(mode==='demo') {const c=COUNTIES.find(c=>c.name===county);town.replaceChildren(new Option(c.town,c.town));$('#location-help').textContent='連線失敗，目前只提供展示代表地點。';}
  else {town.replaceChildren();$('#location-help').textContent='鄉鎮清單載入失敗，請重新選縣市再試。';}
 } finally {if(!request.signal.aborted){town.disabled=false;submit.disabled=!town.options.length;}}
}
function openLocation() {populateCounties();populateTowns(location.county,location.town);if(!$('#location-dialog').open)$('#location-dialog').showModal();}
async function locate({automatic=false}={}) {
 if(locating)return;locating=true;$('#locate').disabled=true;status('定位中…');const seq=loadSequence;
 try {
  const point=await geolocate();
  const found=await api('/api/locate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(point),signal:AbortSignal.timeout(90000)});
  if(seq!==loadSequence)return;
  location=found;$('#location-dialog').close();await refresh();
  status('');
 } catch(error) {
  if(seq!==loadSequence)return;
  status(error.message.includes('定位')?error.message:'附近預報區暫時無法取得，請手動選擇。');
  if(automatic)openLocation();else $('#location-help').textContent=$('#status').textContent;
 } finally {locating=false;$('#locate').disabled=false;}
}
$('#location-open').addEventListener('click',openLocation);
$('#county').addEventListener('change',e=>populateTowns(e.target.value));
$('#location-form').addEventListener('submit',e=>{e.preventDefault();location={county:$('#county').value,town:$('#town').value,origin:'manual'};saveLocation(location);$('#location-dialog').close();refresh();});
$('#locate').addEventListener('click',()=>locate());
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));
$$('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)d.close();}}));
$('#about-open').addEventListener('click',()=>$('#about-dialog').showModal());
$('#refresh').addEventListener('click',()=>refresh());
$('#info-toggle').addEventListener('click',()=>{const quiet=document.body.classList.toggle('quiet');$('#info-toggle').setAttribute('aria-pressed',String(!quiet));$('#info-toggle').setAttribute('aria-label',quiet?'顯示天氣數值':'隱藏天氣數值');$('#info-toggle').title=quiet?'顯示天氣數值':'隱藏天氣數值';});
$('#fullscreen').addEventListener('click',async()=>{try {if(document.fullscreenElement)await document.exitFullscreen();else if(document.documentElement.requestFullscreen)await document.documentElement.requestFullscreen();else status('此瀏覽器不支援全螢幕，可以隱藏資訊欣賞。');}catch{status('目前無法進入全螢幕，請使用瀏覽器的全螢幕功能。');}});
document.addEventListener('fullscreenchange',()=>$('#fullscreen').setAttribute('aria-label',document.fullscreenElement?'離開全螢幕':'進入全螢幕'));
$$('[data-demo]').forEach(b=>b.addEventListener('click',()=>{weatherRequest?.abort();++loadSequence;$('#refresh').disabled=false;demoScene=b.dataset.demo;render(demoWeather(demoScene,location));status('');$('#about-dialog').close();}));
let interval;
function schedule() {clearInterval(interval);if(!document.hidden)interval=setInterval(()=>{if(mode==='live')refresh({silent:true});},600000);}
document.addEventListener('visibilitychange',schedule);
window.addEventListener('pagehide',()=>{clearInterval(interval);weatherRequest?.abort();locationRequest?.abort();scene.destroy();});
window.addEventListener('pageshow',e=>{if(e.persisted)window.location.reload();});
try {await scene.init($('#scene'));render(demoWeather(demoScene,location));await refresh();schedule();if(location.origin==='default')locate({automatic:true});}catch {status('插畫載入失敗，請重新整理頁面。');}
