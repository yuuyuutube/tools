// 分類、單位、時間、燈號：用 2026-11-16 15:10 實際抓到的台電檔案（tests/fixtures）驗證。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classify, classifyType, cleanType, num, shares, parseTaipei, PLANTS } from '../src/classify.js';
import { parseSupply, parseRoc, indicator } from '../src/supply.js';
import { parseJson } from '../server/taipower.js';

const gen = parseJson(readFileSync(new URL('./fixtures/gen.json', import.meta.url), 'utf8'));
const load = parseJson(readFileSync(new URL('./fixtures/load.json', import.meta.url), 'utf8'));

test('官方類型 → 六座發電廠，民營併入同燃料，抽蓄在儲能、不在水力', () => {
  assert.deepEqual(classifyType('燃氣'), ['gas']);
  assert.deepEqual(classifyType('民營電廠-燃氣'), ['gas']);
  assert.deepEqual(classifyType('民營電廠-燃煤'), ['coal']);
  assert.deepEqual(classifyType('水力'), ['hydro']);
  assert.deepEqual(classifyType('儲能'), ['other', 'storage']);
  assert.deepEqual(classifyType('汽電共生'), ['other', 'cogen']);
  assert.deepEqual(classifyType('核能'), ['other', 'nuclear']);
  assert.deepEqual(classifyType('儲能負載(Energy Storage System Load)</b>'), ['load']);
  assert.deepEqual(classifyType('抽蓄水力'), ['other', 'storage']);
  assert.deepEqual(classifyType('某種新能源'), ['other', 'misc']);
  assert.equal(cleanType(' <b>燃煤</b> '), '燃煤');
});

test('數值：缺值是 null 不是 0；百分比與千分位', () => {
  assert.equal(num('-'), null); assert.equal(num('N/A'), null); assert.equal(num(''), null); assert.equal(num(' '), null);
  assert.equal(num('0.0'), 0); assert.equal(num('91.194%'), 91.194); assert.equal(num('1,234.5'), 1234.5); assert.equal(num('-23.9'), -23.9);
});

test('真實檔案：各類加總等於官方小計，小計列不重複計算', () => {
  const g = classify(gen);
  assert.equal(g.at, '2026-11-16T07:10:00.000Z');          // 15:10 臺灣時間
  assert.equal(g.categories.gas.mw, 15807.9);               // 12514.0 + 3293.9
  assert.equal(g.categories.coal.mw, 8298);                 // 7111.4 + 1186.6
  assert.equal(g.categories.solar.mw, 3780.3);
  assert.equal(g.categories.wind.mw, 3097.5);
  assert.equal(g.categories.hydro.mw, 232.9);
  assert.equal(g.categories.other.mw, 1757.5);              // 966.1 + 168.9 + 600.8 + 21.7
  assert.deepEqual(g.check, []);
  assert.equal(g.total, 32974.1);
  assert.equal(g.storageLoad, -23.9);                        // 充電是耗電，不算發電
  assert.ok(!g.categories.gas.list.some(u => u.n.startsWith('小計')));
  const s = shares(g);
  assert.ok(Math.abs(PLANTS.reduce((a, p) => a + s[p], 0) - 1) < 1e-9);
  // 工坊的項目互斥且加總等於工坊
  const comps = g.categories.other.components;
  assert.equal(Math.round((comps.cogen.mw + comps.oil.mw + comps.storage.mw + comps.renew.mw) * 10) / 10, 1757.5);
  assert.equal(comps.nuclear, undefined);                    // 這份資料沒有核能機組，就不憑空出現
});

test('N/A 機組算進機組數但不算回報；容量 "-" 的機組不進容量因數', () => {
  const g = classify(gen);
  assert.equal(g.categories.hydro.units, 52);
  assert.equal(g.categories.hydro.reporting, 51);
  assert.ok(g.categories.gas.cf > 0 && g.categories.gas.cf < 1);
});

test('負值、整類缺值、未知類型', () => {
  const g = classify({ DateTime: '2026-01-01T00:00:00', aaData: [
    { '機組類型': '水力', '機組名稱': 'A', '裝置容量(MW)': '10', '淨發電量(MW)': 'N/A', '備註': '' },
    { '機組類型': '儲能', '機組名稱': 'B', '裝置容量(MW)': '100', '淨發電量(MW)': '-50', '備註': '' },
    { '機組類型': '核能', '機組名稱': 'C', '裝置容量(MW)': '950', '淨發電量(MW)': '900', '備註': '' },
    { '機組類型': '海洋能', '機組名稱': 'D', '裝置容量(MW)': '1', '淨發電量(MW)': '0.5', '備註': '' },
  ] });
  assert.equal(g.categories.hydro.mw, null);                 // 缺值，不是 0
  assert.equal(g.categories.solar.mw, null);
  assert.equal(g.categories.other.mw, 900.5);                // 負的儲能不算發電
  assert.equal(g.storageLoad, -50);
  assert.equal(g.categories.other.components.nuclear.mw, 900);
  assert.deepEqual(g.unclassified, ['海洋能']);
  assert.equal(parseTaipei('2026-01-01T00:00:00'), '2025-12-31T16:00:00.000Z');
  assert.throws(() => classify({}), /GEN_FORMAT/);
});

test('今日電力資訊：萬瓩、民國年時間、官方燈號', () => {
  const s = parseSupply(load);
  assert.equal(s.load, 3295);
  assert.equal(s.util, 82);
  assert.equal(s.at, '2026-11-16T07:10:00.000Z');
  assert.equal(s.peak.rate, 25.19);
  assert.equal(s.peak.hours, '13:00-15:00');
  assert.deepEqual(s.peak.light, { code: 'G', label: '供電充裕', tone: 'green', tight: false });
  assert.equal(s.yesterday.date, '2026-11-15');
  assert.equal(parseRoc('115.01.02(五)09:05'), '2026-01-02T01:05:00.000Z');
  assert.equal(indicator('Y').tight, true);
  assert.equal(indicator('Q').label, null);                  // 不認識的燈號不自行解讀
  assert.throws(() => parseSupply({}), /SUPPLY_FORMAT/);
});
