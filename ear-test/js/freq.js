/* 頻率 ↔ 對數進度（0–1） */
import { CONFIG, STAGES } from './config.js';

let fMax = CONFIG.F_MAX;
export const setMax = f => { fMax = f; };
export const maxHz = () => fMax;

export const toP = f => Math.log(f / CONFIG.F_MIN) / Math.log(fMax / CONFIG.F_MIN);
export const toF = p => CONFIG.F_MIN * Math.pow(fMax / CONFIG.F_MIN, p);
export const clampF = f => Math.min(fMax, Math.max(CONFIG.F_MIN, f));

export function stageAt(f) {
  const p = toP(f);
  let s = STAGES[0];
  for (const st of STAGES) if (p >= st.p) s = st;
  return s.id;
}

export const fmt = f => Math.round(f).toLocaleString('en-US');
