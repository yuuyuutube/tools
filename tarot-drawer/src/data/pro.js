// 專業模式的資料：大阿爾克那的三幕、元素、牌間關係與月相。
// 只描述「牌與牌之間有什麼關係」，不寫解讀；網站維持純抽牌。
// 牌間關係的規則整理自 tarot-skill（MIT License, © 2026 tarot-skill contributors），
// 元素依 Golden Dawn 的星座／行星對應；行星牌（魔術師、女祭司、皇后、命運之輪、高塔、太陽、世界）的元素各家略有不同。

// 愚者之旅三幕：0–7 建立自我、8–14 內在修正、15–21 陰影與整合
export const ACTS = [
  { no: 1, zh: '第一幕', name: '建立自我', en: 'ACT I' },
  { no: 2, zh: '第二幕', name: '內在修正', en: 'ACT II' },
  { no: 3, zh: '第三幕', name: '陰影與整合', en: 'ACT III' },
];
export const actOf = n => ACTS[n <= 7 ? 0 : n <= 14 ? 1 : 2];

// 元素：fire 火、water 水、air 風、earth 土
export const ELEMENTS = {
  fire: { zh: '火', en: 'FIRE' },
  water: { zh: '水', en: 'WATER' },
  air: { zh: '風', en: 'AIR' },
  earth: { zh: '土', en: 'EARTH' },
};
const E = 'air air water earth fire earth air water fire earth fire air water water fire earth fire air water fire fire earth'.split(' ');
export const elementOf = n => E[n];

// 鍊金術元素符號以 SVG 畫，不依賴字型（三角形；風、土多一條橫線）
export function elementIcon(el, size = 14, stroke = 'currentColor', sw = 1.6) {
  const up = el === 'fire' || el === 'air', s = size, h = s * .86;
  const tri = up ? `M${s / 2} ${(s - h) / 2}L${s} ${(s + h) / 2}H0Z` : `M0 ${(s - h) / 2}H${s}L${s / 2} ${(s + h) / 2}Z`;
  const bar = el === 'air' ? `M${s * .2} ${s * .62}H${s * .8}` : el === 'earth' ? `M${s * .2} ${s * .38}H${s * .8}` : '';
  return `<svg class="el" width="${s}" height="${s}" viewBox="-1 -1 ${s + 2} ${s + 2}" aria-hidden="true"><path d="${tri}${bar}" fill="none" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

// 元素相性（牌性）
const PAIR = {
  'fire+air': '火風相助', 'water+earth': '水土相助',
  'fire+water': '火水相消', 'air+earth': '風土僵化',
  'fire+earth': '火土需落地', 'water+air': '水風情思交纏',
};
export function elementRelation(a, b) {
  if (a === b) return `同元素・${ELEMENTS[a].zh}的力量加乘`;
  return PAIR[`${a}+${b}`] || PAIR[`${b}+${a}`];
}

// 愚者之旅的順序：往上是推進，往下是回頭補課；同一幕是強化，跨幕代表跨度大
export function journeyRelation(a, b) {
  const sameAct = actOf(a).no === actOf(b).no;
  if (a === b) return '同一張';
  const dir = b > a ? '推進' : '回頭補課';
  return sameAct ? `${dir}・同幕強化` : `${dir}・跨幕，跨度大`;
}

// 對位牌：編號相加 21，互為鏡像
export const isMirror = (a, b) => a + b === 21;

// 經典組合（只收大阿爾克那之間的組合）
const COMBOS = [
  [13, 17, '死神＋星星：結束之後的療癒'],
  [16, 17, '高塔＋星星：崩塌之後的重建'],
  [13, 20, '死神＋審判：重新評估方向'],
  [18, 19, '月亮＋太陽：幻象被照亮'],
  [15, 8, '惡魔＋力量：馴服陰影'],
  [2, 1, '女祭司＋魔術師：直覺與行動對時'],
  [9, 6, '隱者＋戀人：獨處影響連結'],
  [4, 10, '皇帝＋命運之輪：掌控被變化考驗'],
  [11, 10, '正義＋命運之輪：選擇遇上時機'],
];
export const comboOf = (a, b) => COMBOS.find(([x, y]) => (x === a && y === b) || (x === b && y === a))?.[2] || null;

// 一組抽牌結果的牌間關係：相鄰兩張（依牌陣順序）＋任意兩張的對位與經典組合
export function relationsOf(numbers) {
  const steps = [];
  for (let i = 0; i < numbers.length - 1; i++) {
    const a = numbers[i], b = numbers[i + 1];
    steps.push({ from: i, to: i + 1, journey: journeyRelation(a, b), element: elementRelation(elementOf(a), elementOf(b)) });
  }
  const notes = [];
  for (let i = 0; i < numbers.length; i++) for (let j = i + 1; j < numbers.length; j++) {
    const a = numbers[i], b = numbers[j];
    if (isMirror(a, b)) notes.push({ a: i, b: j, kind: 'mirror', text: '對位牌（編號相加 21）：彼此是鏡像的兩端' });
    const c = comboOf(a, b);
    if (c) notes.push({ a: i, b: j, kind: 'combo', text: c });
  }
  // 元素分布：三張以上才看
  const count = {};
  for (const n of numbers) count[elementOf(n)] = (count[elementOf(n)] || 0) + 1;
  const missing = Object.keys(ELEMENTS).filter(k => !count[k]);
  const lead = Object.entries(count).filter(([, c]) => c >= 3).map(([k]) => k);
  return { steps, notes, count, lead, missing };
}

// 月相：0 新月、1 上弦、2 滿月、3 下弦（離今天最近的那一個）
export function moonPhaseIndex(date = new Date()) {
  const synodic = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14);
  const age = ((date.getTime() - ref) / 864e5) % synodic;
  const frac = (age < 0 ? age + synodic : age) / synodic;
  return Math.floor(frac * 4 + .5) % 4;
}

export const CLOSING = '牌顯示的是當下的狀態，你的選擇隨時可以改變走向。';
