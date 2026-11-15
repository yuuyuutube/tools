import test from 'node:test';
import assert from 'node:assert/strict';
import { randomInt, shuffle, seeded } from '../src/engine/random.js';
import { buildDeck, createSession } from '../src/engine/draw.js';
import { CARDS, CARD_IDS } from '../src/data/cards.js';
import { ART } from '../src/art/index.js';
import { faceSVG, backSVG } from '../src/art/frame.js';

test('牌組資料：22 張、編號連續、RWS 編號', () => {
  assert.equal(CARDS.length, 22);
  CARDS.forEach((c, i) => assert.equal(c.number, i));
  assert.equal(new Set(CARD_IDS).size, 22);
  assert.equal(CARDS[8].id, 'strength');
  assert.equal(CARDS[8].romanNumeral, 'VIII');
  assert.equal(CARDS[11].id, 'justice');
  assert.equal(CARDS[11].romanNumeral, 'XI');
  for (const c of CARDS) {
    assert.ok(c.uprightKeywords.length >= 3 && c.uprightKeywords.length <= 5, c.id);
    assert.ok(c.reversedKeywords.length >= 3 && c.reversedKeywords.length <= 5, c.id);
    assert.ok(c.meaning && c.nameZh && c.nameEn);
  }
});

test('每張牌都有對應的插畫', () => {
  for (const c of CARDS) assert.equal(typeof ART[c.artwork]?.draw, 'function', c.id);
});

test('每張牌面與牌背都畫得出來，且沒有殘留的記號', () => {
  for (const c of CARDS) {
    const svg = faceSVG(c);
    assert.ok(svg.startsWith('<svg') && svg.endsWith('</svg>'), c.id);
    assert.ok(!svg.includes('{{') && !svg.includes('NaN') && !svg.includes('undefined'), c.id);
  }
  assert.ok(backSVG().startsWith('<svg'));
});

test('randomInt：範圍正確、分布沒有明顯偏差', () => {
  const n = 22, rounds = 44000, hit = new Array(n).fill(0);
  for (let i = 0; i < rounds; i++) {
    const v = randomInt(n);
    assert.ok(Number.isInteger(v) && v >= 0 && v < n);
    hit[v]++;
  }
  const expect = rounds / n;
  for (const h of hit) assert.ok(Math.abs(h - expect) < expect * 0.15, `偏差過大：${h}`);
  assert.throws(() => randomInt(0));
});

test('shuffle：是原陣列的排列，且不動原陣列', () => {
  const src = CARD_IDS.slice();
  const out = shuffle(src);
  assert.deepEqual(src, CARD_IDS);
  assert.deepEqual(out.slice().sort(), src.slice().sort());
});

test('shuffle：每張牌出現在每個位置的機會相近', () => {
  const rounds = 22000, first = new Map();
  for (let i = 0; i < rounds; i++) {
    const id = shuffle(CARD_IDS)[0];
    first.set(id, (first.get(id) || 0) + 1);
  }
  assert.equal(first.size, 22, '22 張牌都要能出現在第一張');
  const expect = rounds / 22;
  for (const [id, h] of first) assert.ok(Math.abs(h - expect) < expect * 0.2, `${id}: ${h}`);
});

test('關閉逆位：永遠只有正位', () => {
  for (let i = 0; i < 200; i++) {
    for (const d of buildDeck(CARD_IDS, { reversals: false })) assert.equal(d.orientation, 'upright');
  }
});

test('開啟逆位：正逆位都會出現，比例接近一半，且每張牌獨立', () => {
  let rev = 0, total = 0;
  const perCard = new Map();
  for (let i = 0; i < 1000; i++) {
    for (const d of buildDeck(CARD_IDS, { reversals: true })) {
      total++;
      if (d.orientation === 'reversed') { rev++; perCard.set(d.cardId, (perCard.get(d.cardId) || 0) + 1); }
    }
  }
  assert.ok(Math.abs(rev / total - 0.5) < 0.03, `逆位比例 ${rev / total}`);
  for (const id of CARD_IDS) {
    const r = (perCard.get(id) || 0) / 1000;
    assert.ok(r > 0.4 && r < 0.6, `${id} 逆位比例 ${r}`);
  }
});

test('單張模式：只能抽一張，抽到的就是該位置的牌', () => {
  const s = createSession(CARD_IDS, { count: 1 });
  const expected = s.deck[7];
  const d = s.pick(7);
  assert.equal(d.cardId, expected.cardId);
  assert.equal(d.orientation, expected.orientation);
  assert.equal(d.position, 0);
  assert.ok(s.done);
  assert.equal(s.pick(3), null);
  assert.equal(s.drawn.length, 1);
});

test('三張模式：不重複、順序等於抽牌順序、同一位置不能抽兩次', () => {
  for (let i = 0; i < 300; i++) {
    const s = createSession(CARD_IDS, { count: 3, reversals: true });
    const a = s.pick(20), dup = s.pick(20), b = s.pick(0), c = s.pick(11);
    assert.equal(dup, null);
    assert.deepEqual([a.position, b.position, c.position], [0, 1, 2]);
    assert.deepEqual(s.drawn.map(d => d.cardId), [s.deck[20].cardId, s.deck[0].cardId, s.deck[11].cardId]);
    assert.equal(new Set(s.drawn.map(d => d.cardId)).size, 3);
    assert.equal(s.pick(5), null);
    assert.equal(s.pick(99), null);
  }
});

test('牌堆建立後不會再變：重複讀取結果一致', () => {
  const s = createSession(CARD_IDS, { count: 3, reversals: true });
  const snapshot = JSON.stringify(s.deck);
  s.pick(1); s.pick(2);
  assert.equal(JSON.stringify(s.deck), snapshot);
});

test('重新抽牌會得到新的洗牌順序', () => {
  const orders = new Set();
  for (let i = 0; i < 20; i++) orders.add(createSession(CARD_IDS).deck.map(d => d.cardId).join());
  assert.ok(orders.size > 15);
});

test('22 張牌都抽得到', () => {
  const seen = new Set();
  for (let i = 0; i < 600 && seen.size < 22; i++) seen.add(createSession(CARD_IDS).pick(randomInt(22)).cardId);
  assert.equal(seen.size, 22);
});

test('seeded：同一個種子得到同一串數字', () => {
  const a = seeded(1234), b = seeded(1234), c = seeded(1235);
  const xs = [a(), a(), a()], ys = [b(), b(), b()], zs = [c(), c(), c()];
  assert.deepEqual(xs, ys);
  assert.notDeepEqual(xs, zs);
  for (const v of xs) assert.ok(v >= 0 && v < 1);
});
