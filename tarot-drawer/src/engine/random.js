// 亂數來源：Web Crypto。瀏覽器與 Node 19+ 都有 globalThis.crypto

const buf = new Uint32Array(1);

export function randomUint32() {
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
}

// 0 <= 回傳值 < n 的整數。用拒絕取樣避開模數偏差：
// 2^32 不一定能被 n 整除，多出來的那一小段直接丟掉重抽
export function randomInt(n) {
  if (!Number.isInteger(n) || n <= 0 || n > 0x100000000) throw new RangeError('n 必須是 1 到 2^32 的整數');
  const limit = 0x100000000 - (0x100000000 % n);
  let v;
  do { v = randomUint32(); } while (v >= limit);
  return v % n;
}

export function randomBool() {
  return (randomUint32() & 1) === 1;
}

// Fisher–Yates：回傳新陣列，不動原陣列
export function shuffle(list) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// 有種子的小亂數（mulberry32）：只用在「同一次抽牌要保持一致」的印刷細節，不參與抽牌
export function seeded(seed) {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6D2B79F5) >>> 0;
    let x = Math.imul(t ^ (t >>> 15), 1 | t);
    x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x;
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
