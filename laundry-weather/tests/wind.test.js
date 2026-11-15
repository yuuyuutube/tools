import test from 'node:test';
import assert from 'node:assert/strict';
import { windParams, gust, createBody, step, LIMIT } from '../src/wind.js';

function run(speed, direction, seconds = 600, heavy = 1) {
  const p = windParams(speed, direction), bodies = [0, 1, 2].map(i => createBody({ x: i / 3, seed: i * 1.9, stiff: 7 + i * 2 }));
  let max = 0, sum = 0, n = 0; const trace = bodies.map(() => []);
  for (let t = 0; t < seconds; t += 1 / 60) bodies.forEach((b, i) => { const m = step(b, p, t, 1 / 60, heavy); max = Math.max(max, Math.abs(m.angle)); sum += m.angle; n++; trace[i].push(m.angle); assert.ok(Math.abs(m.shear) <= 9); });
  return { max, mean: sum / n, trace };
}

test('無風幾乎不動，微風輕擺，強風有上限', () => {
  const calm = run(0, 270), breeze = run(2.5, 270), strong = run(18, 270), absurd = run(300, 270);
  assert.ok(calm.max < 1.2, `calm ${calm.max}`);
  assert.ok(breeze.max > calm.max * 2 && breeze.max < 14, `breeze ${breeze.max}`);
  assert.ok(strong.max > breeze.max && strong.max <= LIMIT);
  assert.ok(absurd.max <= LIMIT);
});
test('風向決定往哪邊歪，缺風向時仍有合理預設', () => {
  assert.ok(run(5, 270).mean > 1); assert.ok(run(5, 90).mean < -1);
  assert.ok(Math.abs(windParams(5, 0).lean) < Math.abs(windParams(5, 270).lean));
  assert.ok(Number.isFinite(windParams(undefined, null).lean));
});
test('每件衣服的節奏不同，不會同步', () => {
  const { trace } = run(3, 270, 120); let same = 0;
  for (let i = 0; i < trace[0].length; i++) if (Math.abs(trace[0][i] - trace[1][i]) < .05) same++;
  assert.ok(same / trace[0].length < .2);
});
test('濕衣服擺得比較小；陣風值有界；長時間不發散', () => {
  assert.ok(run(4, 270, 300, .6).max < run(4, 270, 300, 1).max);
  for (let t = 0; t < 5000; t += 7.3) assert.ok(Math.abs(gust(t, .4, 2)) <= 1.0001);
  const b = createBody(), p = windParams(6, 200); let m;
  for (let t = 0; t < 3600; t += 1 / 30) m = step(b, p, t, 1 / 30);
  assert.ok(Number.isFinite(m.angle) && Math.abs(m.angle) <= LIMIT);
});
