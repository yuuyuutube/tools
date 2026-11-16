// 用真實金鑰檢查官方回應：每片海的預報事件數、潮位站最新觀測時間、波浪測站。金鑰不會印出。
import { OceanService } from '../server/cwa.js';
import { COASTS } from '../src/coasts.js';
import { coastData } from '../src/marine.js';
import { STATE_TEXT } from '../src/tide.js';

if (!process.env.CWA_API_KEY) { console.error('請在 .env 設定 CWA_API_KEY'); process.exit(1); }
const snap = await new OceanService({ key: process.env.CWA_API_KEY }).snapshot();
for (const c of COASTS) {
  const d = coastData(snap, c);
  const o = k => d.obs[k] ? `${d.obs[k].value}（${d.obs[k].station.id} ${d.obs[k].at}）` : '—';
  console.log(`${c.name}｜預報事件 ${d.clean.events.length}｜${STATE_TEXT[d.tide.state] || '資料不足'}｜潮位 ${o('tide')}｜浪高 ${o('wave')}｜海溫 ${o('temp')}｜${d.status}`);
}
for (const i of snap.issues) console.log('問題：', i);
