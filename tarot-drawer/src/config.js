// 站名、牌陣與動畫參數集中在這裡，改名只需要改這個檔案（以及 index.html 的 <title>）
export const SITE = {
  nameZh: '小小塔羅印刷所',
  nameEn: 'THE LITTLE TAROT PRESS',
};

// 三張牌陣：位置只是結果的標籤
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
};

export const DEFAULTS = { count: 1, reversals: false, spread: 'time' };

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
  gather: 420,
};

export const EASE = {
  out: 'cubic-bezier(.2,.8,.2,1)',
  back: 'cubic-bezier(.2,1.25,.4,1)',
  soft: 'cubic-bezier(.3,1.08,.4,1)',
  in: 'cubic-bezier(.5,0,.9,.4)',
  flip: 'cubic-bezier(.35,.05,.25,1)',
};
