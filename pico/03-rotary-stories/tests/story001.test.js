// RS 001: the facts the story depends on, checked by machine.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { distanceAt, receivedShipYear, decimalYear, e017Entries, e031Entries, ledger, formatDelay, formatShipDate, formatEarthDate, CONFLICTS, spoonbills } from '../stories/001-earth-is-still-turning/data/archive.js';
import * as T from '../stories/001-earth-is-still-turning/narrative/text.js';
import { RECORDINGS, renderChunk, prepare } from '../stories/001-earth-is-still-turning/audio/soundscapes.js';

const screenplay = readFileSync(fileURLToPath(new URL('../stories/001-earth-is-still-turning/design/screenplay.md', import.meta.url)), 'utf8').replace(/\r\n/g, '\n');

test('voyage: 4.37 light years, about 63.8 years, never faster than 0.072c', () => {
  assert.ok(Math.abs(distanceAt(63.79) - 4.37) < 0.03, `arrive at ${distanceAt(63.79)}`);
  for (let n = 0.5; n < 63.7; n += 0.5) assert.ok(distanceAt(n + 0.5) - distanceAt(n) <= 0.072 * 0.5 + 1e-9);
});

test('no Earth data arrives before light could carry it', () => {
  for (const e of [...e017Entries({ includeLatest: true }), ...e031Entries()].filter((x) => !x.empty && !x.baseline)) {
    const te = decimalYear(e.date);
    const N = receivedShipYear(te, 0);
    const earthAtShip = 2074.3 + N * 1.0026;
    assert.ok(earthAtShip - te >= distanceAt(N) - 0.01, `${e.site} ${e.date}`);
  }
});

test('the dates written in the documents match the light-time model', () => {
  const byYear = Object.fromEntries(e017Entries({ includeLatest: true }).filter((e) => !e.empty).map((e) => [e.year, e]));
  assert.equal(byYear[2088].shipYear, 15, 'the conflict is first flagged in year 15');
  assert.ok(byYear[2101].shipYear <= 29, 'the water tower check in year 29 comes after the image arrives');
  assert.equal(byYear[2111].shipYear, 40, 'the mount check in year 40');
  assert.ok(byYear[2117].shipYear >= 46, 'the 2117 houses are signed by 方雅文 (after 蔡沛涵 retires in year 46)');
  assert.equal(e017Entries().find((e) => e.year === 2110).empty, true, '2110: no image while the mount is rebuilt');
  assert.equal(byYear[2086].flags.includes('B04'), false, 'Earth still labelled the closed school 頭汕國小 in 2086');
});

test('reception ledger: 478 packets, monthly then quarterly, the last one as written', () => {
  const L = ledger();
  assert.equal(L.length, 478);
  const last = L[L.length - 1];
  assert.equal(last.id, 'EP-0478');
  assert.equal(formatEarthDate(last.te), '2133-07-19');
  assert.equal(formatShipDate(last.recv), '第 63 年第 196 日');
  assert.equal(formatDelay(last), '4 年 5 個月');
  for (let i = 1; i < L.length; i++) assert.ok(L[i].recv >= L[i - 1].recv, 'received in order');
  assert.ok(screenplay.includes('EP-0478　2133-07-19　第 63 年第 196 日　4 年 5 個月'));
});

test('E-031: empty years 2074–2090, winter images after, spoonbill counts as written', () => {
  const E = e031Entries();
  assert.equal(E.filter((e) => e.empty).length, 17);
  assert.equal(spoonbills(2091), 12);
  assert.equal(spoonbills(2099), 34);
  assert.equal(spoonbills(2132), 61);
  for (const e of E.filter((x) => !x.empty && x.year > 2090)) assert.equal(e.season, 'winter');
});

test('every player-facing document in text.js is the one in the screenplay', () => {
  const docs = [T.ch1.notice, T.ch1.plate, T.ch2.assignment, T.ch4.tag, T.ch4.log, T.ch4.record, T.ch5.note, T.ch5.rule, T.ch5.stationRecord, T.ch5.submitted, T.fin.plate, T.fin.sent, T.book.blurb, ...T.interlude, CONFLICTS.B04.text, CONFLICTS.MOUNT.text, CONFLICTS.T01.text, ...RECORDINGS.map((r) => r.card)];
  for (const d of docs) assert.ok(screenplay.includes(d), `missing from screenplay:\n${d.slice(0, 80)}`);
});

test('player-facing text avoids the words the brief warned about', () => {
  const all = JSON.stringify(T) + RECORDINGS.map((r) => r.card).join('');
  for (const w of ['溫柔', '宇宙', '時間的重量', '恭喜', '通關', '成就', '稀有']) assert.ok(!all.includes(w), w);
});

test('recordings: deterministic, finite, below full scale, and chunks join smoothly', () => {
  for (const rec of RECORDINGS) {
    prepare(rec);
    const [a] = renderChunk(rec, 120, 1);
    const [b] = renderChunk(rec, 120, 1);
    assert.deepEqual(a.slice(0, 64), b.slice(0, 64), `${rec.id} deterministic`);
    let peak = 0;
    for (const v of a) {
      assert.ok(Number.isFinite(v));
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(peak < 1, `${rec.id} peak ${peak}`);
    // The tail of one chunk and the head of the next should have similar loudness.
    const [x] = renderChunk(rec, 200, 4);
    const [y] = renderChunk(rec, 204, 4);
    const rms = (arr) => Math.sqrt(arr.reduce((s, v) => s + v * v, 0) / arr.length);
    const r1 = rms(x.subarray(x.length - 3200));
    const r2 = rms(y.subarray(0, 3200));
    assert.ok(Math.abs(r1 - r2) < Math.max(r1, r2) * 0.8 + 0.02, `${rec.id} seam ${r1} vs ${r2}`);
  }
});
