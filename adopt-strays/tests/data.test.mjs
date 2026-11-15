import test from 'node:test';
import assert from 'node:assert/strict';
import { normalize, normalizeAll, photoUrl, clean, pack, unpack } from '../js/normalize.js';
import { statusOf, isEligible } from '../js/eligibility.js';
import { pick, pool } from '../js/selector.js';
import * as search from '../js/search.js';
import { createFavorites } from '../js/favorites.js';
import { isFresh, TTL } from '../js/freshness.js';
import { fetchAll, fetchById } from '../js/api.js';

const raw = (o = {}) => ({ animal_id: 1, animal_subid: 'A1', animal_area_pkid: 4, animal_shelter_pkid: 48, animal_kind: '狗', animal_Variety: '混種犬   ', animal_sex: 'M', animal_bodytype: 'BIG', animal_colour: '白色', animal_age: 'ADULT', animal_sterilization: 'N', animal_status: 'OPEN', animal_remark: '', animal_opendate: '2026-10-14', animal_closeddate: '2999-12-31', animal_update: '2026/11/15', shelter_name: '基隆市寵物銀行', album_file: 'https://www.pet.gov.tw/upload/pic/1.png', shelter_address: 'x', shelter_tel: '02-24560148', ...o });
const T = '2026-11-15';
const mk = (id, o = {}) => normalize(raw({ animal_id: id, ...o }));

test('normalize: 欄位清理', () => {
  const a = mk(7);
  assert.equal(a.kind, 'dog'); assert.equal(a.variety, '混種犬'); assert.equal(a.county, '基隆市');
  assert.equal(a.body, 'L'); assert.equal(a.ster, ''); assert.equal(a.update, '2026-11-15');
  assert.equal(normalize(raw({ animal_id: 'x' })), null);
  assert.equal(normalize(null), null);
});
test('normalize: 外部文字不可信', () => {
  assert.equal(clean('<img src=x onerror=alert(1)>民 眾\u0000好'), '民眾好');
  assert.equal(photoUrl('http://www.pet.gov.tw/a.png'), '');
  assert.equal(photoUrl('javascript:alert(1)'), '');
  assert.equal(photoUrl('https://evil.example/a.png'), '');
  assert.equal(photoUrl('https://www.pet.gov.tw/a.png'), 'https://www.pet.gov.tw/a.png');
});
test('normalizeAll 去重；pack/unpack 來回一致', () => {
  const list = normalizeAll([raw(), raw(), raw({ animal_id: 2, album_file: '' })]);
  assert.equal(list.length, 2);
  assert.deepEqual(unpack(JSON.parse(JSON.stringify(pack(list)))), list);
});
test('eligibility', () => {
  assert.equal(statusOf(mk(1), T), 'open');
  assert.equal(statusOf(mk(1, { animal_opendate: '2026-11-22' }), T), 'upcoming');
  assert.equal(statusOf(mk(1, { animal_opendate: '' }), T), 'unknown');
  assert.equal(statusOf(mk(1, { animal_status: 'ADOPTED' }), T), 'closed');
  assert.equal(statusOf(mk(1, { animal_closeddate: '2026-11-01' }), T), 'closed');
  assert.equal(isEligible(mk(1, { animal_opendate: '2026-11-15' }), T), true);
});
test('selector: 只抽開放認養、不重複、抽完才重來、沒有照片也會出現', () => {
  const list = [mk(1), mk(2, { album_file: '' }), mk(3, { animal_kind: '貓' }), mk(4, { animal_opendate: '2027-01-01' })];
  assert.deepEqual(pool(list, {}, T).map(a => a.id), [1, 2, 3]);
  assert.deepEqual(pool(list, { kind: 'cat' }, T).map(a => a.id), [3]);
  assert.deepEqual(pool(list, { area: '9' }, T), []);
  const seen = new Set(), got = [];
  for (let i = 0; i < 3; i++) { const { animal, reset } = pick(list, {}, { today: T, seen }); assert.equal(reset, false); seen.add(animal.id); got.push(animal.id); }
  assert.deepEqual(got.sort(), [1, 2, 3]);
  const again = pick(list, {}, { today: T, seen, last: 2 });
  assert.equal(again.reset, true); assert.notEqual(again.animal.id, 2);
  assert.equal(pick(list, { area: 9 }, { today: T }).animal, null);
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (let i = 0; i < 6000; i++) counts[pick(list, {}, { today: T }).animal.id]++;
  for (const k of [1, 2, 3]) assert.ok(counts[k] > 1700 && counts[k] < 2300, `uniform ${k}:${counts[k]}`);
});
test('search: 篩選、排序、分頁', () => {
  const list = [mk(1), mk(2, { animal_sex: 'F', album_file: '', animal_opendate: '2026-11-10' }), mk(3, { animal_area_pkid: 2, animal_shelter_pkid: 49, shelter_name: '臺北市動物之家' }), mk(4, { animal_status: 'X' }), mk(5, { animal_opendate: '2026-12-01' })];
  assert.deepEqual(search.filter(list, { sex: 'F' }, T).map(a => a.id), [2]);
  assert.deepEqual(search.filter(list, { photo: true, area: '4' }, T).map(a => a.id), [1, 5]);
  assert.deepEqual(search.sort(search.filter(list, {}, T), 'open', T).map(a => a.id), [2, 3, 1, 5]);
  const p = search.paginate([1, 2, 3, 4, 5], 9, 2);
  assert.deepEqual([p.page, p.pages, p.items], [3, 3, [5]]);
  assert.deepEqual(search.areas(list).map(a => a.label), ['臺北市', '基隆市']);
  assert.equal(search.shelters(list, 2).length, 1);
});
test('favorites: 只存最少資訊', () => {
  const mem = new Map(), st = { getItem: k => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v) };
  const f = createFavorites(st);
  assert.equal(f.add(mk(9), 5), true); assert.equal(f.add(mk(9)), false);
  assert.deepEqual(Object.keys(JSON.parse(mem.get('encounters.v1'))[0]).sort(), ['county', 'id', 'kind', 'shelter', 'sub', 't', 'tel']);
  assert.equal(createFavorites(st).has(9), true);
  assert.equal(f.remove(9), true); assert.equal(f.count(), 0);
  mem.set('encounters.v1', '{bad'); assert.equal(createFavorites(st).count(), 0);
});
test('freshness', () => {
  assert.equal(isFresh(1000, TTL.CACHE_MS, 1000 + TTL.CACHE_MS - 1), true);
  assert.equal(isFresh(1000, TTL.CACHE_MS, 1000 + TTL.CACHE_MS), false);
  assert.equal(isFresh(undefined, TTL.CACHE_MS), false);
});
test('api: 分頁抓到不足一頁為止；失敗會丟錯；fetchById 不會拿錯動物', async () => {
  const calls = [];
  const fake = sizes => async url => { const skip = Number(/\$skip=(\d+)/.exec(url)[1]); calls.push(skip); const n = sizes[skip / 1000] ?? 0; return { ok: true, json: async () => Array.from({ length: n }, (_, i) => ({ animal_id: skip + i + 1 })) }; };
  const all = await fetchAll({ fetchImpl: fake([1000, 1000, 300]), concurrency: 2 });
  assert.equal(all.length, 2300); assert.ok(calls.length <= 5);
  await assert.rejects(fetchAll({ fetchImpl: async () => ({ ok: false, status: 500 }) }));
  await assert.rejects(fetchAll({ fetchImpl: async () => ({ ok: true, json: async () => ({ error: 1 }) }) }));
  assert.equal(await fetchById(5, { fetchImpl: async () => ({ ok: true, json: async () => [{ animal_id: 6 }] }) }), null);
});
