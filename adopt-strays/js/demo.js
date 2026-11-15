/* Demo Mode：全部是虛構資料，只用來示範介面。每一筆都帶 demo:true，畫面上會標示「展示模式／非真實認養資料」。 */
const base = { area: 0, county: '展示市', sid: 9001, shelter: '展示用相遇所（虛構）', addr: '展示市示範路 1 號（虛構地址）', tel: '', status: 'OPEN', closed: '2999-12-31', photo: '', found: '', variety: '', demo: true };
const rows = [
  ['dog', '黑色', 'M', 'M', 'adult', 'T', ''], ['cat', '虎斑色', 'F', 'S', 'child', 'F', ''],
  ['dog', '黃色', 'F', 'L', 'adult', 'T', '（展示用備註）這是一段示範文字，不是真實動物的描述。'],
  ['cat', '三花色', 'F', 'S', 'adult', 'T', ''], ['dog', '白色', 'M', 'S', 'child', 'F', ''],
  ['cat', '黑白色', 'M', 'M', 'adult', '', ''], ['dog', '黑黃色', 'F', 'M', 'adult', 'T', ''],
  ['other', '白色', '', 'S', '', '', ''], ['cat', '黃色', 'M', 'M', 'child', 'F', ''],
  ['dog', '棕色', 'M', 'L', 'adult', 'F', ''], ['cat', '灰色', 'F', 'S', 'adult', 'T', ''],
  ['dog', '花色', 'F', 'M', 'child', 'F', ''],
];
export function demoAnimals(today) {
  return rows.map(([kind, colour, sex, body, age, ster, remark], i) => ({
    ...base, id: 990001 + i, sub: `DEMO-${String(i + 1).padStart(3, '0')}`, kind, colour, sex, body, age, ster, remark,
    open: i === 11 ? '2999-01-01' : today, update: today,
    sid: i % 2 ? 9002 : 9001, shelter: i % 2 ? '展示用第二相遇所（虛構）' : base.shelter,
  }));
}
/* 示範「收藏的動物已不在資料裡」的狀態：只存在記憶體，不寫入收藏 */
export const DEMO_GONE = { id: 990099, t: 0, sub: 'DEMO-099', kind: 'dog', county: '展示市', shelter: base.shelter, tel: '', demo: 1 };
