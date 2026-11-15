import test from 'node:test';
import assert from 'node:assert/strict';
import { moonPhase, moonName, moonPath } from '../src/moon.js';

const near = (a, b, tol = .03) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b)) < tol;
test('月相對得上已知的新月、滿月與上下弦', () => {
  assert.ok(near(moonPhase(Date.UTC(2024, 3, 8, 18, 21)), 0), '2024-04-08 日全食是新月');
  assert.ok(near(moonPhase(Date.UTC(2024, 8, 18, 2, 34)), .5), '2024-09-18 滿月');
  assert.ok(near(moonPhase(Date.UTC(2025, 0, 6, 23, 56)), .25), '2025-01-06 上弦');
  assert.ok(near(moonPhase(Date.UTC(2025, 0, 21, 20, 31)), .75), '2025-01-21 下弦');
  assert.ok(near(moonPhase(Date.UTC(2026, 10, 24, 14, 53)), .5), '2026-11-24 滿月');
});
test('名稱與形狀', () => {
  assert.equal(moonName(.25), '上弦月'); assert.equal(moonName(.5), '滿月'); assert.equal(moonName(.75), '下弦月'); assert.equal(moonName(.99), '新月');
  assert.match(moonPath(.5), /A0\.000? 1|A1\.000 1/);
  for (let p = 0; p < 1; p += .01) assert.match(moonPath(p), /^M0-1A1 1 0 0 [01] 0 1A[\d.]+ 1 0 0 [01] 0-1Z$/);
  assert.notEqual(moonPath(.2), moonPath(.8));
});
