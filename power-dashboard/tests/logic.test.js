// 動畫狀態、歷史、事件、台詞排程：資料不足時不產生事件，台詞不與資料矛盾。
import test from 'node:test';
import assert from 'node:assert/strict';
import { plantState, freshness, animationState, approach } from '../src/state.js';
import { addPoint, merge, ago, todayLoad, pointOf, dayStart } from '../src/history.js';
import { detectEvents } from '../src/events.js';
import { candidates, Scheduler, eventLines, readTime } from '../src/npc.js';
import { demoSnapshot, DEMO_KINDS } from '../src/demo.js';
import { indicator } from '../src/supply.js';

const T = Date.parse('2026-11-16T07:10:00Z');
const iso = m => new Date(T + m * 60000).toISOString();
const pt = (m, gen, load) => ({ t: iso(m), gen: { gas: 100, coal: 100, solar: 100, wind: 100, hydro: 100, other: 100, ...gen }, ...(load != null ? { load } : {}) });

test('狀態分級：缺值、未發電、低、中、高', () => {
  assert.equal(plantState({ mw: null }, 'gas').state, 'missing');
  assert.equal(plantState(undefined, 'gas').state, 'missing');
  assert.equal(plantState({ mw: 0, cap: 15000, cf: 0 }, 'solar').state, 'off');
  assert.equal(plantState({ mw: 300, cap: 15000, cf: .02 }, 'solar').state, 'low');
  assert.equal(plantState({ mw: 6000, cap: 15000, cf: .4 }, 'solar').state, 'normal');
  assert.equal(plantState({ mw: 3000, cap: 4000, cf: .75 }, 'wind').state, 'high');
  assert.ok(plantState({ mw: 3000, cap: 4000, cf: 1.4 }, 'wind').level <= 1);
});

test('新鮮度與平滑', () => {
  assert.equal(freshness(iso(0), T + 10 * 60000), 'fresh');
  assert.equal(freshness(iso(0), T + 45 * 60000), 'stale');
  assert.equal(freshness(iso(0), T + 4 * 3600000), 'gone');
  assert.equal(freshness(null), 'none');
  const v = approach(0, 1, 1, 8); assert.ok(v > 0 && v < .2);
});

test('animationState：排名、占比、充電；沒有資料時全部 missing', () => {
  const a = animationState(demoSnapshot('day', T), T);
  assert.equal(a.plants.gas.rank, 1);
  assert.equal(a.plants.other.charging, true);
  const empty = animationState(null, T);
  assert.ok(Object.values(empty.plants).every(p => p.state === 'missing'));
});

test('歷史：去重、排序、超過 26 小時丟掉；ago 找不到就是 null', () => {
  let h = addPoint([], pt(0), T);
  h = addPoint(h, pt(-10), T); h = addPoint(h, pt(0, { gas: 200 }), T);
  assert.equal(h.length, 2); assert.equal(h[1].gen.gas, 200);
  h = merge(h, [pt(-27 * 60)], T); assert.equal(h.length, 2);
  assert.equal(ago(h, 'gas', 60), null);
  assert.equal(ago(h, 'gas', 10), 100);
});

test('今日新高：觀測從午夜起連續才算完整', () => {
  const d0 = dayStart(T);
  const mk = (min, load) => ({ t: new Date(d0 + min * 60000).toISOString(), gen: {}, load });
  const full = []; for (let m = 10; m <= 900; m += 10) full.push(mk(m, 2500 + m / 10));
  assert.equal(todayLoad(full, d0 + 901 * 60000).complete, true);
  assert.equal(todayLoad(full.slice(5), d0 + 901 * 60000).complete, false);          // 從 01:00 才開始
  const gap = full.filter(p => !p.t.includes('T03:'));                                  // 中間斷了一段
  assert.equal(todayLoad(gap, d0 + 901 * 60000).complete, false);
  const ev = detectEvents({ history: full, now: d0 + 901 * 60000 });
  assert.ok(ev.some(e => e.type === 'loadHigh'));
  assert.ok(!detectEvents({ history: full.slice(5), now: d0 + 901 * 60000 }).some(e => e.type === 'loadHigh'));
});

test('事件：只有一筆資料不產生；占比上升、下降、燈號改變、太陽能收工', () => {
  assert.deepEqual(detectEvents({ history: [pt(0)] }).filter(e => e.type !== 'loadHigh'), []);
  const h = [pt(-60, { wind: 100 }), pt(-10, { wind: 300, gas: 400, solar: 50 }), pt(0, { wind: 400, gas: 200, solar: 0 })];
  const ev = detectEvents({ history: h, prevLight: 'G', light: 'Y', now: T });
  assert.ok(ev.some(e => e.type === 'shareUp' && e.plant === 'wind'));
  assert.ok(ev.some(e => e.type === 'drop' && e.plant === 'gas'));
  assert.ok(ev.some(e => e.type === 'light'));
  assert.ok(ev.some(e => e.type === 'solarRest'));
  assert.ok(!detectEvents({ history: h, prevLight: null, light: 'G' }).some(e => e.type === 'light'));
  for (const e of ev) assert.ok(eventLines(e)?.lines.length);
});

test('台詞：夜間太陽能歸零說下班，不說開工；燈號正常時不出現吃緊台詞', () => {
  const snap = demoSnapshot('night', T), a = animationState(snap, T);
  const ctx = { plants: a.plants, night: true, hour: 21, light: snap.supply.peak.light, fresh: 'fresh', charging: false };
  const ids = candidates(ctx).map(d => d.id);
  assert.ok(ids.includes('solar-n1'));
  assert.ok(!ids.includes('solar-1'));
  assert.ok(!ids.some(i => i.startsWith('tip-t')));
  const all = candidates(ctx).flatMap(d => d.lines.map(l => l.text)).join();
  assert.ok(!/壞|故障|停電|缺電/.test(all));
});

test('台詞：官方燈號吃緊時才出現明確節電提醒；資料過期只說等資料', () => {
  const snap = demoSnapshot('tight', T), a = animationState(snap, T);
  const ids = candidates({ plants: a.plants, night: false, hour: 15, light: indicator('Y'), fresh: 'fresh' }).map(d => d.id);
  assert.ok(ids.includes('tip-t1'));
  const stale = candidates({ plants: a.plants, night: false, hour: 15, light: indicator('G'), fresh: 'stale' });
  assert.ok(stale.every(d => d.id.startsWith('stale')));
});

test('排程器：同時一段、間隔、事件優先、15 分鐘內不重複', () => {
  let now = 0;
  const s = new Scheduler({ now: () => now, random: () => .5 });
  const list = [{ id: 'a', kind: 'daily', weight: 1, lines: [{ plant: 'gas', text: '一二三' }] }, { id: 'b', kind: 'daily', weight: 1, lines: [{ plant: 'coal', text: '四五六' }] }];
  assert.equal(s.tick(list, false), null);                  // 開場先安靜幾秒
  now = 7000; const first = s.tick(list, false); assert.ok(first);
  assert.equal(s.tick(list, false), null);                   // 間隔還沒到
  now += readTime('一二三') + 40000; const second = s.tick(list, false);
  assert.ok(second && second.id !== first.id);
  now += 60000; assert.equal(s.tick(list, false), null);     // 都說過了，冷卻中
  s.push({ id: 'ev', kind: 'event', lines: [{ plant: 'wind', text: '事件' }] });
  now += 1000; assert.equal(s.tick(list, false)?.id, 'ev');
  assert.equal(s.tick(list, true), null);                    // 忙碌時不插話
  assert.ok(s.poke('gas', list));                            // 點角色：說過也要回應
});

test('展示資料：每種情境都標成 demo，格式與即時快照一致', () => {
  for (const k of DEMO_KINDS.filter(k => k !== 'offline')) {
    const s = demoSnapshot(k, T);
    assert.equal(s.mode, 'demo'); assert.ok(s.generation.total > 0); assert.ok(pointOf(s));
  }
  assert.equal(demoSnapshot('night', T).generation.categories.solar.mw, 0);
  assert.equal(demoSnapshot('tight', T).supply.peak.light.code, 'Y');
});
