#!/usr/bin/env node
/* 每日同步：抓官方全部資料 → 正規化 → 寫成站上的快照（data/animals.json、data/meta.json）
   用法：node scripts/sync.mjs      建議用排程（例如 GitHub Actions cron）每天跑一次。
   沒有快照或快照過期時，網站會自動改為直接呼叫官方 API。 */
import { writeFile, mkdir } from 'node:fs/promises';
import { fetchAll } from '../js/api.js';
import { normalizeAll, pack } from '../js/normalize.js';

const dir = new URL('../data/', import.meta.url);
const rows = await fetchAll({ concurrency: 2, onPage: (r, i) => console.log(`page ${i}: ${r.length}`) });
const list = normalizeAll(rows);
if (list.length < 100) { console.error(`only ${list.length} animals — refusing to overwrite snapshot`); process.exit(1); }
const fetchedAt = Date.now();
await mkdir(dir, { recursive: true });
await writeFile(new URL('animals.json', dir), JSON.stringify({ fetchedAt, ...pack(list) }));
await writeFile(new URL('meta.json', dir), JSON.stringify({ fetchedAt, count: list.length }));
console.log(`saved ${list.length} animals @ ${new Date(fetchedAt).toISOString()}`);
