import test from 'node:test';
import assert from 'node:assert/strict';
import { encounterLines } from '../js/copy.js';

test('相遇介紹使用已知資料，輪替反應與邀請', () => {
  const animal = { kind: 'dog', body: 'M', age: 'adult', sex: 'M', colour: '黑色', county: '臺北市', shelter: '臺北市動物之家', photo: 'photo.jpg' };
  const lines = encounterLines(animal, 0);
  assert.match(lines[2].text, /中型的成年公犬/);
  assert.match(lines[2].text, /黑色/);
  assert.equal(lines[3].text, '牠目前在臺北市動物之家。');
  assert.notEqual(lines[0].text, encounterLines(animal, 1)[0].text);
  assert.notEqual(lines.at(-1).text, encounterLines(animal, 1).at(-1).text);
  assert.deepEqual(lines.slice(0, 2).map(l => l.mood), ['wow', 'happy']);
});

test('缺資料不猜測；無照片與展示資料有說明', () => {
  const lines = encounterLines({ kind: 'cat' }, 0).map(l => l.text).join('');
  assert.match(lines, /是一隻貓呢/);
  assert.match(lines, /毛色示意圖/);
  assert.doesNotMatch(lines, /undefined|成年|公貓|母貓|親人|健康/);
  const demo = encounterLines({ kind: 'dog', demo: true, shelter: '虛構之家' }, 0).map(l => l.text).join('');
  assert.match(demo, /虛構朋友/);
  assert.doesNotMatch(demo, /目前在虛構之家/);
});
