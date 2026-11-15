/* 把正規化後的資料轉成顯示文字。只描述資料裡有的事實，不推測。 */
export const KIND = { dog: '狗狗', cat: '貓咪', other: '小動物' };
export const AGE = { child: '幼年', adult: '成年' };
export const SEX = { M: '公', F: '母' };
export const BODY = { S: '小型', M: '中型', L: '大型' };
export const STER = { T: '已絕育', F: '未絕育' };

/* 作品文案用的稱呼（不是正式名字）：「黑色的狗狗」 */
export function title(a) {
  const c = (a.colour || '').replace(/色$/, '');
  return `${c ? c + '色的' : ''}${KIND[a.kind] || KIND.other}`;
}
export const kindIcon = a => (a.kind === 'dog' ? 'dog' : a.kind === 'cat' ? 'cat' : 'paw');
export function statusText(st, a) {
  const md = (a.open || '').slice(5).replace('-', '/');
  return st === 'open' ? '開放認養' : st === 'upcoming' ? `${md} 起開放` : st === 'unknown' ? '請洽收容所' : '已不在開放名單';
}
