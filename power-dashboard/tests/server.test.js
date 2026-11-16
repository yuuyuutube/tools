// 伺服器：私有檔案不外流、上游失敗誠實回報、短暫失敗沿用快取並標示、快照帶歷史。
import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { createServer } from '../server/index.js';
import { PowerService, SOURCES } from '../server/taipower.js';

const raw = name => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8');
async function withServer(options, run) {
  const server = createServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await run(`http://127.0.0.1:${server.address().port}`); } finally { await new Promise(r => server.close(r)); }
}
const ok = { [SOURCES.generation]: raw('gen.json'), [SOURCES.supply]: raw('load.json') };
const fetcher = async url => ({ ok: true, status: 200, text: async () => ok[url] });

test('DEMO_MODE：展示資料與靜態檔案', () => withServer({ demo: true }, async base => {
  const s = await (await fetch(base + '/api/power')).json();
  assert.equal(s.mode, 'demo');
  const html = await fetch(base); assert.equal(html.status, 200); assert.match(await html.text(), /台灣發電中/);
  assert.equal((await fetch(base + '/src/app.js')).status, 200);
}));

test('私有檔案、點檔、路徑穿越都不提供', () => withServer({ demo: true }, async base => {
  for (const p of ['/server/index.js', '/package.json', '/tests/data.test.js', '/docs/prompt.md', '/src/../server/index.js', '/src/%2e%2e%2fserver/index.js', '/.power-cache/history.json']) {
    assert.equal((await fetch(base + p)).status, 404, p);
  }
}));

test('即時：兩個端點都解析，快照帶發電、供需與歷史', () => withServer({ service: new PowerService({ fetcher }) }, async base => {
  const s = await (await fetch(base + '/api/power')).json();
  assert.equal(s.mode, 'live');
  assert.equal(s.generation.total, 32974.1);
  assert.equal(s.supply.load, 3295);
  assert.equal(s.history.length, 1); assert.equal(s.history[0].load, 3295);
  assert.deepEqual(s.issues, []);
}));

test('上游全失敗：502 且不洩漏內部錯誤', () => withServer({ service: new PowerService({ fetcher: async () => { throw Error('secret-internal'); } }) }, async base => {
  const r = await fetch(base + '/api/power'); assert.equal(r.status, 502); assert.ok(!(await r.text()).includes('secret-internal'));
}));

test('只有一個端點失敗：另一半照常，列出問題；之後失敗沿用快取並標示', async () => {
  let now = 0, fail = new Set([SOURCES.supply]);
  const f = async url => fail.has(url) ? { ok: false, status: 500, text: async () => '' } : fetcher(url);
  const svc = new PowerService({ fetcher: f, now: () => now });
  const a = await svc.snapshot();
  assert.ok(a.generation && !a.supply); assert.deepEqual(a.issues, ['supply-unavailable']);
  now = 10 * 60000; fail = new Set([SOURCES.generation]);
  const b = await svc.snapshot();
  assert.ok(b.generation && b.supply); assert.ok(b.issues.includes('generation-cached'));
});
