import { shuffle, randomBool, randomUint32 } from './random.js';

// 抽牌引擎：與畫面完全分開。
// 一次抽牌（session）在建立時就把整副牌洗好、每張牌的正逆位也各自擲好，
// 之後畫面上第 n 張牌背就對應 deck[n]，使用者點哪一張就拿到哪一張。

// 洗好的牌堆：[{ cardId, orientation }]
export function buildDeck(cardIds, { reversals = false } = {}) {
  return shuffle(cardIds).map(cardId => ({
    cardId,
    orientation: reversals && randomBool() ? 'reversed' : 'upright',
  }));
}

export function createSession(cardIds, { count = 1, reversals = false, spread = 'time' } = {}) {
  if (count !== 1 && count !== 3) throw new RangeError('count 只能是 1 或 3');
  const deck = buildDeck(cardIds, { reversals });
  const taken = new Set();
  const drawn = [];

  return {
    count,
    reversals,
    spread,
    seed: randomUint32(),   // 這次結果的印刷細節（錯位、印章角度）用，與抽牌無關
    deck,
    drawn,
    get done() { return drawn.length >= count; },
    isTaken: index => taken.has(index),
    // 拿走牌堆第 index 張。已抽滿、已被拿走或位置不存在時回傳 null，不改變任何狀態
    pick(index) {
      if (drawn.length >= count || taken.has(index) || !deck[index]) return null;
      taken.add(index);
      const d = { ...deck[index], position: drawn.length, deckIndex: index };
      drawn.push(d);
      return d;
    },
  };
}
