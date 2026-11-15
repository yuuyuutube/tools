import { AGE, BODY, SEX, KIND } from './labels.js';

/* 相遇所店員的台詞。只講店裡的事與資料裡的事實，不替動物說話。 */
export const LINES = {
  welcome: ['啊！歡迎光臨！', '今天想認識誰呢？'],
  back: ['歡迎回來！', '今天想認識誰呢？'],
  idle: [
    '今天也有好多朋友想認識你。',
    '轉蛋裡裝的是相遇卡，朋友本人都在收容所喔。',
    '你可以先認識牠，不用急著做決定。',
    '我剛剛在發呆嗎？沒有喔。',
    '圖鑑我每天都會擦一遍。',
    '旋鈕轉起來的聲音，我很喜歡。',
    '每一顆轉蛋的機會都一樣大。',
    '小冊子可以記下你喜歡的相遇。',
    '左上角的牌子可以換地區。',
  ],
  poke: ['嗯？', '有什麼想問的嗎？', '我是這裡的相遇所店員。', '啊，被發現在發呆了。'],
  loading: '稍等，我去請朋友們準備一下。',
  open: '咦！有人來了！',
  meet: a => (a.county ? `今天遇見的是一位來自${a.county}的朋友。` : '今天遇見的是這位朋友。'),
  saved: '這次相遇，已經記在小冊子裡了。',
  unsaved: '好，先從小冊子裡拿下來。',
  again: '好呀！再去認識下一位朋友。',
  close: '今天的相遇就先到這裡。',
  empty: '這個條件下，現在沒有等待相遇的朋友。',
  reset: '這裡的朋友都見過一輪了，再從頭認識一次吧。',
  filter: '好，牌子換好了。',
  demo: '官方資料暫時連不上，先用展示資料示範。',
  stale: '官方資料暫時連不上，這是稍早的資料。',
  book: '慢慢翻，不急。',
};

export const BEFORE = [
  ['heart', '了解牠需要的照顧：飲食、醫療、運動與陪伴。'],
  ['home', '確認居住環境與同住家人都準備好了。'],
  ['clock', '這是十年以上的時間與經濟責任。'],
  ['phone', '向收容所確認牠的健康狀況與個性。'],
  ['check', '認養需要本人到收容所，依正式程序辦理。'],
];

/* 每次抽取輪替一組迎接方式；介紹只組合官方有提供的欄位。 */
const ARRIVALS = [
  ['喀噠！相遇卡出來了……讓我看看！', '好可愛唷！我融化了。先讓我把這張相遇卡放好。'],
  ['咕嚕、咕嚕……啊，今天的朋友登場！', '哎呀，這次相遇我也想好好記下來！'],
  ['來了來了！我幫你把相遇卡接住了。', '好可愛呀。差點忘了我是來幫忙介紹的，嘿嘿。'],
  ['噹！請收下今天的這場小小相遇。', '光是能在這裡認識牠，我就覺得今天很不錯呢！'],
];
const INVITATIONS = [
  '點「認識牠」，我們一起把這張相遇卡讀得更仔細一點。',
  '有一點心動嗎？可以先收藏起來，改天再回來看看牠。',
  '也可以把這張卡分享給朋友，讓更多人有機會認識牠。',
];
export function encounterLines(a, turn = 0) {
  const index = Math.abs(Math.trunc(turn) || 0);
  const [arrival, delight] = ARRIVALS[index % ARRIVALS.length];
  const species = a.kind === 'dog' ? '犬' : a.kind === 'cat' ? '貓' : '';
  const traits = `${BODY[a.body] ? BODY[a.body] + '的' : ''}${AGE[a.age] || ''}`;
  const identity = species ? `${SEX[a.sex] || ''}${species}` : KIND[a.kind] || KIND.other;
  const intro = `是一隻${traits}${identity}呢！${a.colour ? `資料上寫著，毛色是${a.colour}。` : ''}`;
  const lines = [
    { text: arrival, mood: 'wow' },
    { text: delight, mood: 'happy' },
    { text: a.demo ? '這位是展示模式裡的虛構朋友，我們先練習認識相遇卡吧。' : intro, mood: 'happy' },
  ];
  if (!a.demo && (a.county || a.shelter)) lines.push({
    text: a.shelter ? `牠目前在${a.county && !a.shelter.includes(a.county) ? a.county + '的' : ''}${a.shelter}。` : `牠目前在${a.county}的收容所。`, mood: '',
  });
  if (!a.photo) lines.push({ text: '這張卡還沒有照片，先用毛色示意圖和你打招呼。實際模樣，要等照片或親自去認識牠囉。', mood: '' });
  lines.push({ text: INVITATIONS[index % INVITATIONS.length], mood: 'happy' });
  return lines;
}
