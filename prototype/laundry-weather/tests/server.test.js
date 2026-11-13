import test from 'node:test';import assert from 'node:assert/strict';import {once} from 'node:events';import {createServer} from '../server/index.js';
async function withServer(options,run){const server=createServer(options);server.listen(0,'127.0.0.1');await once(server,'listening');try{await run(`http://127.0.0.1:${server.address().port}`);}finally{await new Promise(resolve=>server.close(resolve));}}
test('demo API and static files work without a key',async()=>withServer({key:''},async base=>{
 const w=await(await fetch(base+'/api/weather')).json();assert.equal(w.mode,'demo');assert.equal(w.fetchedAt,null);
 const html=await fetch(base);assert.equal(html.status,200);assert.match(await html.text(),/晾晾日和/);
 const art=await fetch(base+'/assets/balcony.svg');assert.equal(art.status,200);
 const locations=await(await fetch(base+'/api/locations?county='+encodeURIComponent('高雄市'))).json();assert.equal(locations.towns[0].town,'苓雅區');
}));
test('private files, dotfiles and traversal are not served',async()=>withServer({key:'private-test',demo:true},async base=>{
 for(const path of ['/.env','/.env.example','/server/cwa.js','/package.json','/src/../server/cwa.js','/src/%2e%2e%2fserver/cwa.js']){
  const r=await fetch(base+path);assert.equal(r.status,404,path);assert.ok(!(await r.text()).includes('private-test'));
 }
}));
test('GPS endpoint has success and out-of-coverage paths and validates payloads',async()=>withServer({key:''},async base=>{
 const locate=point=>fetch(base+'/api/locate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(point)});
 assert.equal((await(await locate({lat:25.0324,lon:121.5199})).json()).town,'中正區');
 assert.equal((await locate({lat:35,lon:139})).status,422);assert.equal((await locate({lat:'25',lon:121})).status,400);
 assert.equal((await locate({lat:200,lon:121})).status,400);
}));
test('upstream failure is honest and never exposes keys',async()=>withServer({key:'private-test',service:{weather:async()=>{throw Error('private-test');}}},async base=>{
 const r=await fetch(base+'/api/weather');assert.equal(r.status,502);assert.ok(!(await r.text()).includes('private-test'));
}));
