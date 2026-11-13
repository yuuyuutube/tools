import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {CwaService} from './cwa.js';
import {COUNTIES,nearestForecast} from '../src/locations.js';
import {demoWeather} from '../src/demo.js';
const root=fileURLToPath(new URL('../',import.meta.url));
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};
export function createServer({key=process.env.CWA_API_KEY,demo=process.env.DEMO_MODE==='true',service}={}) {
 const live=Boolean(key)&&!demo,cwa=service||new CwaService({key});
 const json=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
 return http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
  res.setHeader('Content-Security-Policy',"default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  try {
   const url=new URL(req.url,'http://localhost');
   if(url.pathname.startsWith('/api/')) {
    if(req.method==='GET'&&url.pathname==='/api/locations') {
     const county=url.searchParams.get('county')||'臺北市';
     const c=COUNTIES.find(c=>c.name===county);if(!c)return json(res,400,{error:'無效縣市'});
     return json(res,200,{mode:live?'live':'demo',towns:live?await cwa.towns(county):[{county,town:c.town,lat:c.lat,lon:c.lon}]});
    }
    if(req.method==='GET'&&url.pathname==='/api/weather') {
     const county=url.searchParams.get('county')||'臺北市',c=COUNTIES.find(c=>c.name===county),town=url.searchParams.get('town')||c?.town;
     if(!c||!town||town.length>20)return json(res,400,{error:'無效地點'});
     if(!live)return json(res,200,demoWeather('sunny',{county,town}));
     return json(res,200,await cwa.weather(county,town));
    }
    if(req.method==='POST'&&url.pathname==='/api/locate') {
     // POST coordinates never appear in URLs/access logs. There is no request logging.
     let body='';for await(const part of req){body+=part;if(body.length>512)return json(res,413,{error:'資料過大'});}
     let point;try{point=JSON.parse(body);}catch{return json(res,400,{error:'無效定位'});}
     if(typeof point.lat!=='number'||typeof point.lon!=='number'||!Number.isFinite(point.lat)||!Number.isFinite(point.lon)||Math.abs(point.lat)>90||Math.abs(point.lon)>180)return json(res,400,{error:'無效定位'});
     if(live)return json(res,200,await cwa.locate(point));
     const found=nearestForecast(point,COUNTIES.map(c=>({county:c.name,town:c.town,lat:c.lat,lon:c.lon})));
     return found?json(res,200,{county:found.county,town:found.town,origin:'gps-demo'}):json(res,422,{error:'展示地點離目前位置較遠，請手動選擇。'});
    }
    return json(res,404,{error:'找不到此功能'});
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);return res.end();}
   // Explicit public allowlist, never serve .env, server sources, tests or docs.
   let relative;try{relative=decodeURIComponent(url.pathname).replace(/^\/+/, '');}catch{res.writeHead(400);return res.end();}
   if(!relative||relative==='index.html') relative='index.html';
   if(relative!=='index.html'&&!/^(src|assets)\/[a-zA-Z0-9_./-]+$/.test(relative)){res.writeHead(404);return res.end('Not found');}
   const file=path.resolve(root,relative);
   if(!file.startsWith(root)||relative.split('/').some(p=>p.startsWith('.'))){res.writeHead(404);return res.end('Not found');}
   const contents=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:contents);
  } catch(error) {
   if(error.code==='ENOENT'){res.writeHead(404);return res.end('Not found');}
   return json(res,502,{error:'暫時無法取得氣象資料。請稍後重試，或切換展示天氣。'});
  }
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const port=Number(process.env.PORT)||4317,host=process.env.HOST||'127.0.0.1';
 createServer().listen(port,host,()=>console.log(`晾晾日和 → http://${host}:${port}\n${process.env.CWA_API_KEY&&process.env.DEMO_MODE!=='true'?'氣象署模式（等待首次資料請求）':'展示模式 · 尚未使用即時天氣'}`));
}
