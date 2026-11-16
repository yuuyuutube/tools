// 產生 GitHub Pages 用的官方資料快照：ocean-breath.json（潮汐預報＋48 小時觀測）與 ocean-breath-history.json（累積 30 天）。
// 歷史檔從上一次發布的版本接續（HISTORY_INPUT），只保存真的收到過的整點觀測。
import { readFile, writeFile } from 'node:fs/promises';
import { OceanService } from '../server/cwa.js';
import { mergeHistory } from '../server/normalize.js';
import { COASTS } from '../src/coasts.js';

if (!process.env.CWA_API_KEY) throw Error('CWA_API_KEY is required');
const out = process.env.OCEAN_OUTPUT || 'ocean-breath.json';
const histOut = process.env.HISTORY_OUTPUT || 'ocean-breath-history.json';
const service = new OceanService({ key: process.env.CWA_API_KEY });
const snap = await service.snapshot();

const missing = COASTS.filter(c => !snap.forecasts[c.forecast.id]?.events?.length).map(c => c.name);
if (missing.length === COASTS.length) throw Error('No tide forecast at all; keep the previous snapshot');
if (!Object.keys(snap.stations).length) console.warn('Warning: no marine observations in this run');

let previous = {};
try { previous = JSON.parse(await readFile(process.env.HISTORY_INPUT || histOut, 'utf8')).history || {}; } catch { /* 第一次發布 */ }
const keep = s => ({ t: s.t, tide: s.tide, wave: s.wave, temp: s.temp });
const fresh = Object.fromEntries(Object.entries(snap.stations).map(([id, list]) => [id, list.map(keep)]));
const history = mergeHistory(previous, fresh, Date.now(), 30);

await writeFile(out, JSON.stringify(snap));
await writeFile(histOut, JSON.stringify({ version: 1, generatedAt: snap.generatedAt, history }));
console.log(`Published ${Object.keys(snap.forecasts).length} forecasts, ${Object.keys(snap.stations).length} stations${missing.length ? `; missing forecast: ${missing.join(', ')}` : ''}; ${snap.generatedAt}`);
