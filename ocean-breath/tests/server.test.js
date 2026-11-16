// 伺服器：沒有金鑰時是展示資料；私有檔案不外流；上游失敗不洩漏金鑰；快照組合正確。
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from '../server/index.js';
import { OceanService } from '../server/cwa.js';

const fx = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
async function withServer(options, run) {
  const server = createServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(r => server.close(r)); }
}

test('沒有金鑰：展示資料與靜態檔案', () => withServer({ key: '' }, async base => {
  const s = await (await fetch(base + '/api/ocean')).json();
  assert.equal(s.mode, 'demo');
  const html = await fetch(base); assert.equal(html.status, 200); assert.match(await html.text(), /海洋呼吸觀測所/);
  assert.equal((await fetch(base + '/src/app.js')).status, 200);
}));

test('私有檔案、點檔、路徑穿越都不提供', () => withServer({ key: 'private-test', demo: true }, async base => {
  for (const p of ['/.env', '/.env.example', '/server/cwa.js', '/package.json', '/tests/data.test.js', '/src/../server/cwa.js', '/src/%2e%2e%2fserver/cwa.js', '/.ocean-cache/history.json']) {
    const r = await fetch(base + p); assert.equal(r.status, 404, p); assert.ok(!(await r.text()).includes('private-test'));
  }
}));

test('上游失敗：誠實回報且不含金鑰', () => withServer({ key: 'private-test', service: { snapshot: async () => { throw Error('private-test'); } } }, async base => {
  const r = await fetch(base + '/api/ocean'); assert.equal(r.status, 502); assert.ok(!(await r.text()).includes('private-test'));
}));

test('OceanService：用 LocationId／StationID 篩選，組成快照；觀測失敗時保留預報並列出問題', async () => {
  const urls = [];
  const ok = { 'F-A0021-001': fx('tide-rest.json'), 'O-B0075-001': fx('obs-rest.json') };
  const fetcher = async url => { urls.push(String(url)); const id = String(url).match(/datastore\/([^?]+)/)[1]; return { ok: true, json: async () => ok[id] }; };
  const s = await new OceanService({ key: 'k', fetcher }).snapshot();
  assert.equal(s.mode, 'live'); assert.ok(s.forecasts['10015010']); assert.ok(s.stations.C4T01.length);
  assert.ok(urls.some(u => u.includes('LocationId=') && u.includes('10015010')));
  assert.ok(urls.some(u => u.includes('StationID=') && u.includes('C4T01')));
  const half = async url => String(url).includes('O-B0075') ? { ok: false } : { ok: true, json: async () => ok['F-A0021-001'] };
  const s2 = await new OceanService({ key: 'k', fetcher: half }).snapshot();
  assert.ok(Object.keys(s2.forecasts).length); assert.deepEqual(s2.stations, {}); assert.ok(s2.issues.some(i => i.includes('海象觀測')));
  const bad = async () => ({ ok: true, json: async () => ({ success: 'false' }) });
  await assert.rejects(new OceanService({ key: 'secret-key', fetcher: bad }).snapshot(), e => !String(e.message).includes('secret-key'));
});
