/* 所有可調整的數值都在這裡 */
export const CONFIG = {
  F_MIN: 500,            // 掃頻起點 Hz
  F_MAX: 18000,          // 掃頻終點 Hz（測試上限）
  SWEEP_SEC: 35,         // 掃頻總長（秒），對數式上升

  GAIN: 0.06,            // 固定輸出增益：全程不變，不會為了高頻自動加大
  FADE_IN: 0.08,         // 淡入秒數（避免爆音）
  FADE_OUT: 0.06,        // 淡出秒數

  REF_HZ: 1000,          // 音量確認用的中頻
  REF_ON: 0.7,           // 音量確認：每一聲長度（秒）
  REF_GAP: 0.45,         //            間隔（秒）

  PROBE_SEC: 1.2,        // 細修時每次重播的固定長度（秒）
  STEP: 100,             // 細修：一般微調 Hz
  STEP_FINE: 25,         //       精細微調 Hz
  AB_FIRST: 1.08,        // A/B 比較：還沒有另一端時，往上／往下跳的倍率
  AB_DONE: 50,           // A/B 比較：上下界差距小於此 Hz 就算收斂

  NYQUIST_MARGIN: 0.92,  // 只信任取樣率一半的 92% 以下
};

/* 動物頻率譜：p 是對數進度 0–1 的「起點」，依序排列。
   只是頻率高低的視覺比喻，不代表動物實際的叫聲頻率 */
export const STAGES = [
  { id: 'whale',    p: 0.00 },
  { id: 'elephant', p: 0.14 },
  { id: 'bear',     p: 0.30 },
  { id: 'cat',      p: 0.46 },
  { id: 'bird',     p: 0.62 },
  { id: 'bee',      p: 0.77 },
  { id: 'mosquito', p: 0.89 },
];
