/* Adoption Eligibility：目前能不能列入展示／轉蛋。
   open     今天已開放認養（轉蛋只抽這一種）
   upcoming 開放日期在未來（例如仍在協尋飼主）
   unknown  沒有開放日期，需向收容所確認
   closed   狀態不是 OPEN 或已過截止日 */
export function statusOf(a, today) {
  if (!a || a.status !== 'OPEN') return 'closed';
  if (a.closed && a.closed < today) return 'closed';
  if (!a.open) return 'unknown';
  if (a.open > today) return 'upcoming';
  return 'open';
}
export const isEligible = (a, today) => statusOf(a, today) === 'open';
export const isListable = (a, today) => statusOf(a, today) !== 'closed';

export function taipeiToday(d = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei' }).format(d);
}
