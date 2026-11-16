// 實際呼叫台電兩個端點，印出 HTTP、CORS、時間、分類結果與官方小計比對。
import { SOURCES, parseJson } from '../server/taipower.js';
import { classify, PLANTS, shares } from '../src/classify.js';
import { parseSupply } from '../src/supply.js';

for (const [id, url] of Object.entries(SOURCES)) {
  const r = await fetch(url, { signal: AbortSignal.timeout(20000) });
  console.log(`\n${id}: HTTP ${r.status} ${r.headers.get('content-type')}  Last-Modified ${r.headers.get('last-modified')}  CORS ${r.headers.get('access-control-allow-origin') ?? '(無)'}`);
  const raw = parseJson(await r.text());
  if (id === 'generation') {
    const g = classify(raw), s = shares(g);
    console.log(`  資料時間 ${g.at}  合計 ${g.total} MW  儲能負載 ${g.storageLoad} MW  小計比對 ${g.check.length ? JSON.stringify(g.check) : 'OK'}  未分類 ${g.unclassified.join('、') || '無'}`);
    for (const p of PLANTS) { const c = g.categories[p]; console.log(`  ${p.padEnd(6)} ${String(c.mw).padStart(8)} MW  ${(s[p] * 100).toFixed(1).padStart(5)}%  cf ${c.cf?.toFixed(3)}  ${c.reporting}/${c.units}`); }
    console.log('  工坊：', JSON.stringify(g.categories.other.components));
  } else {
    const s = parseSupply(raw);
    console.log(`  ${s.at}  目前用電 ${s.load} 萬瓩  使用率 ${s.util}%  尖峰備轉 ${s.peak.rate}% ${s.peak.light?.code} ${s.peak.light?.label}  尖峰 ${s.peak.hours}`);
  }
}
