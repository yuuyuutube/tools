/* Animal Selector：轉蛋抽選。
   每一隻符合條件的動物機率完全相同（沒有稀有度、不看照片、不看外表），
   同一場瀏覽中抽過的先不再出現，全部抽完才重新開始。 */
import { isEligible } from './eligibility.js';

export function pool(list, f = {}, today) {
  return list.filter(a => isEligible(a, today)
    && (!f.kind || a.kind === f.kind)
    && (!f.area || a.area === Number(f.area)));
}

export function pick(list, f, { today, seen = new Set(), last = 0, rng = Math.random } = {}) {
  const p = pool(list, f, today);
  if (!p.length) return { animal: null, reset: false };
  let fresh = p.filter(a => !seen.has(a.id)), reset = false;
  if (!fresh.length) { reset = true; fresh = p.length > 1 ? p.filter(a => a.id !== last) : p; }
  return { animal: fresh[Math.min(fresh.length - 1, Math.floor(rng() * fresh.length))], reset };
}
