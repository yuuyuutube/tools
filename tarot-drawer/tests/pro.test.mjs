import test from 'node:test';
import assert from 'node:assert/strict';
import { actOf, elementOf, relationsOf, journeyRelation, elementRelation, comboOf, moonPhaseIndex } from '../src/data/pro.js';
import { SPREADS, SPREAD_INFO } from '../src/config.js';
import { createSession } from '../src/engine/draw.js';
import { CARD_IDS } from '../src/data/cards.js';

test('三幕與元素涵蓋 22 張大阿爾克那', () => {
  assert.deepEqual([0, 7, 8, 14, 15, 21].map(n => actOf(n).no), [1, 1, 2, 2, 3, 3]);
  const els = Array.from({ length: 22 }, (_, n) => elementOf(n));
  assert.equal(els.filter(Boolean).length, 22);
  assert.deepEqual([0, 12, 20].map(elementOf), ['air', 'water', 'fire']);   // 三張母字母牌
  assert.deepEqual([4, 13].map(elementOf), ['fire', 'water']);              // 牡羊、天蠍
});

test('牌間關係：順序、元素、對位與經典組合', () => {
  assert.equal(journeyRelation(16, 17), '推進・同幕強化');
  assert.equal(journeyRelation(10, 2), '回頭補課・跨幕，跨度大');
  assert.equal(elementRelation('fire', 'air'), '火風相助');
  assert.equal(elementRelation('earth', 'water'), '水土相助');
  assert.ok(comboOf(17, 16).includes('崩塌'));
  const r = relationsOf([1, 9, 20]);
  assert.equal(r.steps.length, 2);
  assert.ok(r.notes.some(n => n.kind === 'mirror' && n.a === 0 && n.b === 2));
});

test('專業牌陣的張數與抽牌引擎一致；月相落在 0–3', () => {
  for (const [id, labels] of Object.entries(SPREADS)) {
    assert.ok(SPREAD_INFO[id]);
    const s = createSession(CARD_IDS, { count: labels.length, spread: id });
    for (let i = 0; i < labels.length; i++) assert.ok(s.pick(i));
    assert.ok(s.done);
  }
  assert.throws(() => createSession(CARD_IDS, { count: 2 }));
  for (let d = 0; d < 30; d++) { const i = moonPhaseIndex(new Date(2026, 10, d + 1)); assert.ok(i >= 0 && i <= 3); }
  assert.equal(moonPhaseIndex(new Date(Date.UTC(2000, 0, 6, 18, 14))), 0);
});
