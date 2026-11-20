// 站名、牌陣與動畫參數集中在這裡，改名只需要改這個檔案（以及 index.html 的 <title>）
export const SITE = {
  nameZh: '抽牌所',
  nameEn: 'TAROT DRAW',
};

// 牌陣：陣列長度就是張數；位置只是結果的標籤（hint 是位置的小註解）
// 單張不在這裡。pro: true 的只在專業模式出現
export const SPREADS = {
  time: [
    { zh: '過去', en: 'PAST' },
    { zh: '現在', en: 'PRESENT' },
    { zh: '未來', en: 'FUTURE' },
  ],
  advice: [
    { zh: '現況', en: 'SITUATION' },
    { zh: '阻礙', en: 'OBSTACLE' },
    { zh: '建議', en: 'ADVICE' },
  ],
  relation: [
    { zh: '你', en: 'YOU' },
    { zh: '對方', en: 'THE OTHER' },
    { zh: '關係', en: 'RELATIONSHIP' },
  ],
  action: [
    { zh: '情況', en: 'SITUATION' },
    { zh: '行動', en: 'ACTION' },
    { zh: '結果', en: 'OUTCOME' },
  ],
  moon: [
    { zh: '新月', en: 'NEW MOON', hint: '意圖' },
    { zh: '上弦', en: 'FIRST QUARTER', hint: '行動' },
    { zh: '滿月', en: 'FULL MOON', hint: '覺察' },
    { zh: '下弦', en: 'LAST QUARTER', hint: '釋放' },
  ],
  diamond: [
    { zh: '核心', en: 'CORE' },
    { zh: '根源', en: 'ROOT' },
    { zh: '阻力', en: 'RESISTANCE' },
    { zh: '潛力', en: 'POTENTIAL' },
    { zh: '建議', en: 'ADVICE' },
  ],
};
export const SPREAD_INFO = {
  single: { name: '單張', note: '當下的指引', pro: false },
  time: { name: '過去・現在・未來', note: '時間線', pro: false },
  advice: { name: '現況・阻礙・建議', note: '面對一個處境', pro: false },
  relation: { name: '你・對方・關係', note: '兩人之間', pro: true },
  action: { name: '情況・行動・結果', note: '做決定之前', pro: true },
  moon: { name: '月相四張', note: '新月意圖・上弦行動・滿月覺察・下弦釋放', pro: true },
  diamond: { name: '菱形五張', note: '核心・根源・阻力・潛力・建議，適合卡住的決定', pro: true },
};

export const DEFAULTS = { count: 1, reversals: false, spread: 'time', pro: false };

// 動畫時間（毫秒）與緩動：洗牌活潑、展牌有秩序、選牌立即、翻牌慎重
export const MOTION = {
  shuffleOut: 170,
  shuffleIn: 250,
  shuffleRounds: 2,
  spread: 560,
  spreadStagger: 13,
  hover: 160,
  pick: 460,
  toResult: 620,
  flip: 780,
  flipGap: 380,
  faceRevealAt: .6,    // 正面露出時，先讓圖窗外框展開
  faceRevealDuration: 640,
  windowRevealDuration: 420,
  windowRevealStartRatio: .94,
  metaRevealGap: 40,   // 卡內牌名完成後，才顯示牌外資訊
  metaRevealDuration: 450,
  gather: 420,
};

export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  back: 'cubic-bezier(.2,1.25,.4,1)',
  soft: 'cubic-bezier(.3,1.08,.4,1)',
  in: 'cubic-bezier(.5,0,.9,.4)',
  flip: 'cubic-bezier(.35,.05,.25,1)',
};
