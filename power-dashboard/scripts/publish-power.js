// 產生 GitHub Pages 用的台電資料快照 power-dashboard.json（含最近 26 小時實際收到的歷史點）。
// 歷史從上一次發布的檔案接續（PREVIOUS_INPUT），只保存真的抓到過的資料，不補值。
import { readFile, writeFile } from 'node:fs/promises';
import { PowerService } from '../server/taipower.js';
import { merge } from '../src/history.js';

const out = process.env.POWER_OUTPUT || 'power-dashboard.json';
const snap = await new PowerService().snapshot();
if (!snap.generation && !snap.supply) throw Error('Both Taipower sources failed; keep the previous snapshot');

let previous = [];
try { previous = JSON.parse(await readFile(process.env.PREVIOUS_INPUT || out, 'utf8')).history || []; } catch { /* 第一次發布 */ }
snap.history = merge(previous, snap.history, Date.now());

await writeFile(out, JSON.stringify(snap));
console.log(`Published generation ${snap.generation?.at ?? '—'}, supply ${snap.supply?.at ?? '—'}, history ${snap.history.length} points${snap.issues.length ? `; issues: ${snap.issues.join(', ')}` : ''}`);
