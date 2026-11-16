// 資料測試：潮汐事件排序、漲退潮判斷、時區、缺失值、重複資料、潮高基準、測站對應、更新時間、無浪高、API 格式。
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cleanEvents, tideAt, upcoming } from '../src/tide.js';
import { normalizeForecast, normalizeObservations, mergeHistory, num } from '../server/normalize.js';
import { coastData, pickStation, freshness } from '../src/marine.js';
import { COASTS, coastById, stationIds } from '../src/coasts.js';
import { demoSnapshot } from '../src/demo.js';
import { sunPosition, sunTimes, skyPhase } from '../src/sun.js';
import { visualState } from '../src/visual.js';

const fx = name => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8'));
const H = 3600000;
const T = s => Date.parse(s);

test('事件依時間排序，打亂的輸入也一樣', () => {
  const c = cleanEvents([
    { time: '2026-11-16T15:22:00+08:00', type: 'high', height: 33 },
    { time: '2026-11-16T07:17:00+08:00', type: 'low', height: -53 },
    { time: '2026-11-16T22:09:00+08:00', type: 'low', height: -40 },
  ]);
  assert.deepEqual(c.events.map(e => e.type), ['low', 'high', 'low']);
  assert.equal(c.breaks.size, 0);
});

test('漲潮、退潮、接近滿潮、接近乾潮', () => {
  const c = cleanEvents([
    { time: '2026-11-16T07:00:00+08:00', type: 'low', height: -50 },
    { time: '2026-11-16T13:00:00+08:00', type: 'high', height: 50 },
    { time: '2026-11-16T19:00:00+08:00', type: 'low', height: -40 },
  ]);
  assert.equal(tideAt(c, T('2026-11-16T09:00:00+08:00')).state, 'rising');
  assert.equal(tideAt(c, T('2026-11-16T12:30:00+08:00')).state, 'nearHigh');
  assert.equal(tideAt(c, T('2026-11-16T15:00:00+08:00')).state, 'falling');
  assert.equal(tideAt(c, T('2026-11-16T18:20:00+08:00')).state, 'nearLow');
  const mid = tideAt(c, T('2026-11-16T10:00:00+08:00'));
  assert.ok(Math.abs(mid.level - .5) < .02, '餘弦插值在中點約 0.5');
  assert.equal(mid.interpolated, true, '插值必須標記為示意');
  assert.equal(upcoming(c, T('2026-11-16T10:00:00+08:00'))[0].type, 'high');
});

test('時區：+08:00 與 UTC 寫法是同一刻', () => {
  const a = cleanEvents([{ time: '2026-11-16T07:00:00+08:00', type: 'low' }, { time: '2026-11-16T13:00:00+08:00', type: 'high' }]);
  const b = cleanEvents([{ time: '2026-11-15T23:00:00Z', type: 'low' }, { time: '2026-11-16T05:00:00Z', type: 'high' }]);
  assert.deepEqual(a.events.map(e => e.t), b.events.map(e => e.t));
});

test('重複事件去除；同一時間又滿又乾、連續同型、間隔不合理都停止推算', () => {
  const dup = cleanEvents([{ time: '2026-11-16T07:00:00+08:00', type: 'low' }, { time: '2026-11-16T07:00:00+08:00', type: 'low' }, { time: '2026-11-16T13:00:00+08:00', type: 'high' }]);
  assert.equal(dup.events.length, 2); assert.ok(dup.problems.includes('duplicate'));
  const conflict = cleanEvents([{ time: '2026-11-16T07:00:00+08:00', type: 'low' }, { time: '2026-11-16T07:00:00+08:00', type: 'high' }, { time: '2026-11-16T13:00:00+08:00', type: 'high' }]);
  assert.equal(tideAt(conflict, T('2026-11-16T09:00:00+08:00')).status, 'insufficient');
  const same = cleanEvents([{ time: '2026-11-16T07:00:00+08:00', type: 'high' }, { time: '2026-11-16T13:00:00+08:00', type: 'high' }]);
  assert.equal(tideAt(same, T('2026-11-16T09:00:00+08:00')).reason, 'irregular');
  const gap = cleanEvents([{ time: '2026-11-16T07:00:00+08:00', type: 'low' }, { time: '2026-11-17T07:00:00+08:00', type: 'high' }]);
  assert.equal(tideAt(gap, T('2026-11-16T12:00:00+08:00')).status, 'insufficient');
  assert.equal(tideAt(cleanEvents([]), Date.now()).status, 'insufficient');
  assert.equal(cleanEvents([{ time: 'nope', type: 'high' }, { time: '2026-11-16T07:00:00+08:00', type: 'flood' }]).events.length, 0);
});

test('全日潮（一天一高一低）也能判斷，不假設一天兩次', () => {
  const c = cleanEvents([{ time: '2026-11-16T02:00:00+08:00', type: 'low', height: -60 }, { time: '2026-11-16T14:30:00+08:00', type: 'high', height: 70 }]);
  assert.equal(tideAt(c, T('2026-11-16T08:00:00+08:00')).state, 'rising');
});

test('F-A0021-001：REST 與檔案格式都能解析，潮高單位 cm 並保留三種基準', () => {
  const rest = normalizeForecast(fx('tide-rest.json')), file = normalizeForecast(fx('tide-file.json'));
  for (const c of COASTS) {
    assert.ok(rest[c.forecast.id], `REST 缺 ${c.forecast.id}`);
    assert.equal(rest[c.forecast.id].name, c.forecast.name, '預報地點名稱與對應表一致');
    assert.ok(rest[c.forecast.id].events.length >= 8);
  }
  const k = rest['10017010'].events[0];
  assert.equal(k.type, 'low'); assert.equal(k.heights.msl, -53); assert.equal(k.heights.twvd, -40); assert.equal(k.heights.chart, 48);
  assert.deepEqual(file['10017010'].events, rest['10017010'].events, '兩種格式結果相同');
  assert.throws(() => normalizeForecast({ records: {} }));
});

test('O-B0075-001：時間排序、缺測值（None、-）為 null、潮高由 m 轉 cm', () => {
  const st = normalizeObservations(fx('obs-rest.json'), stationIds());
  const t = st.C4T01; assert.ok(t.length >= 5);
  for (let i = 1; i < t.length; i++) assert.ok(Date.parse(t[i].t) > Date.parse(t[i - 1].t), '由舊到新');
  assert.ok(t.every(s => s.tide === null || Number.isInteger(s.tide)));
  assert.equal(st.C4T01[0].wave, null, '潮位站沒有浪高欄位');
  assert.ok(st['46699A'].some(s => s.wave != null && s.period != null));
  assert.ok(st['46699A'].every(s => s.tide === null), '浮標的 TideHeight = None');
  assert.equal(num('None'), null); assert.equal(num('-'), null); assert.equal(num(''), null); assert.equal(num('1.25'), 1.25);
  assert.equal(num('999', 0, 25), null, '超出範圍視為缺測');
});

test('測站對應：每片海都有預報地點，潮位不與其他測站混用', () => {
  const ids = new Set();
  for (const c of COASTS) {
    assert.match(c.forecast.id, /^\d{8}$/);
    assert.ok(c.tide.length <= 1, '潮位只用一個測站，不跨基準遞補');
    assert.ok(c.tide.every(s => s.datum));
    assert.ok(!ids.has(c.id)); ids.add(c.id);
  }
  assert.equal(coastById('tamsui').wave.length, 0, '淡水沒有波浪測站');
  assert.equal(coastById('penghu').tide[0].datum, '當地平均海平面', '離島潮位基準不同');
});

test('新鮮度與測站挑選：延遲、遞補、超過一天視為無資料', () => {
  const now = T('2026-11-16T12:00:00+08:00');
  assert.equal(freshness(30 * 60000), 'fresh'); assert.equal(freshness(2 * H), 'recent'); assert.equal(freshness(6 * H), 'delayed'); assert.equal(freshness(30 * H), 'none');
  const stations = {
    A: [{ t: new Date(now - 30 * H).toISOString(), wave: 1 }],
    B: [{ t: new Date(now - 4 * H).toISOString(), wave: .8 }],
    C: [{ t: new Date(now - 1 * H).toISOString(), wave: .5 }],
  };
  assert.equal(pickStation([{ id: 'A' }, { id: 'B' }], stations, 'wave', now).station.id, 'B');
  assert.equal(pickStation([{ id: 'A' }, { id: 'B' }], stations, 'wave', now).status, 'delayed');
  assert.equal(pickStation([{ id: 'B' }, { id: 'C' }], stations, 'wave', now).station.id, 'C', '新鮮的測站優先');
  assert.equal(pickStation([{ id: 'A' }], stations, 'wave', now), null);
});

test('無浪高資料、只有預報、API 完全失敗', () => {
  const now = T('2026-11-16T12:00:00+08:00');
  const snap = { mode: 'live', forecasts: normalizeForecast(fx('tide-rest.json')), stations: {} };
  const d = coastData(snap, coastById('tamsui'), now, now);
  assert.equal(d.obs.wave, null);
  assert.equal(d.status, 'forecastOnly');
  assert.equal(d.tide.status, 'ok');
  const v = visualState(d, now);
  assert.equal(v.waveKnown, false); assert.ok(v.wave > 0, '沒有浪高仍保留基礎波浪動畫');
  const none = coastData({ mode: 'live', forecasts: {}, stations: {} }, coastById('hualien'), now, now);
  assert.equal(none.status, 'error'); assert.equal(none.tide.status, 'insufficient');
  assert.equal(visualState(none, now).tide, .5, '不明時水位停在中間');
});

test('展示模式：形狀與正式資料相同，且各情境的狀態正確', () => {
  const now = T('2026-11-16T12:00:00+08:00');
  for (const tide of ['rising', 'falling', 'nearHigh', 'nearLow']) {
    const s = demoSnapshot({ tide, now });
    assert.equal(s.mode, 'demo');
    const d = coastData(s, coastById('hualien'), now, now);
    assert.equal(d.tide.state, tide, tide); assert.equal(d.status, 'demo');
  }
  const calm = coastData(demoSnapshot({ sea: 'calm', now }), coastById('hualien'), now, now), rough = coastData(demoSnapshot({ sea: 'rough', now }), coastById('hualien'), now, now);
  assert.ok(visualState(rough, now).wave > visualState(calm, now).wave);
  assert.ok(visualState(rough, now).wave <= 1, '浪高映射有上限');
});

test('歷史合併：保留 30 天、去重、只放實際出現的整點', () => {
  const now = T('2026-11-16T12:00:00+08:00');
  const old = { X: [{ t: new Date(now - 40 * 86400000).toISOString(), tide: 1 }, { t: new Date(now - 2 * H).toISOString(), tide: 2 }] };
  const fresh = { X: [{ t: new Date(now - 2 * H).toISOString(), tide: 3 }, { t: new Date(now - H).toISOString(), tide: 4 }] };
  const m = mergeHistory(old, fresh, now);
  assert.deepEqual(m.X.map(s => s.tide), [3, 4]);
});

test('太陽：日出日落隨季節變化，不是固定 06:00／18:00', () => {
  const lat = 25.03, lon = 121.5;
  const jun = sunTimes(T('2026-06-21T00:00:00+08:00'), lat, lon), dec = sunTimes(T('2026-12-21T00:00:00+08:00'), lat, lon);
  const hm = t => new Date(t + 8 * H).toISOString().slice(11, 16);
  assert.ok(hm(jun.rise) >= '04:55' && hm(jun.rise) <= '05:15', `夏至日出 ${hm(jun.rise)}`);
  assert.ok(hm(dec.rise) >= '06:25' && hm(dec.rise) <= '06:45', `冬至日出 ${hm(dec.rise)}`);
  assert.ok(hm(jun.set) > hm(dec.set));
  assert.equal(skyPhase(T('2026-11-16T12:00:00+08:00'), lat, lon).phase, 'day');
  assert.equal(skyPhase(T('2026-11-16T23:00:00+08:00'), lat, lon).phase, 'night');
  const noon = sunPosition(T('2026-06-21T12:00:00+08:00'), lat, lon);
  assert.ok(noon.elevation > 80, '夏至正午太陽接近天頂');
});
