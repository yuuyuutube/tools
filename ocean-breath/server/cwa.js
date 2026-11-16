// Ocean API：向中央氣象署要資料、快取、組成前端用的快照。金鑰只在這裡使用，不回傳、不寫進錯誤訊息。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { COASTS, stationIds } from '../src/coasts.js';
import { normalizeForecast, normalizeObservations, mergeHistory } from './normalize.js';

const BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore/';
const TTL = { 'F-A0021-001': 6 * 3600000, 'O-B0075-001': 10 * 60000 };

export class OceanService {
  constructor({ key, fetcher = fetch, now = () => Date.now(), historyFile = null } = {}) {
    this.key = key; this.fetcher = fetcher; this.now = now; this.historyFile = historyFile;
    this.cache = new Map(); this.pending = new Map(); this.history = null;
  }

  async dataset(id, params) {
    const prev = this.cache.get(id), now = this.now();
    if (prev && now - prev.time < TTL[id]) return { ...prev, stale: false };
    if (this.pending.has(id)) return this.pending.get(id);
    const task = (async () => {
      try {
        const url = new URL(BASE + id);
        url.searchParams.set('Authorization', this.key); url.searchParams.set('format', 'JSON');
        for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
        const r = await this.fetcher(url, { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error('HTTP');
        const raw = await r.json();
        if (String(raw.success ?? raw.Success) !== 'true') throw new Error('REJECTED');
        const data = id === 'F-A0021-001' ? normalizeForecast(raw) : normalizeObservations(raw, stationIds());
        const entry = { time: this.now(), data };
        this.cache.set(id, entry); return { ...entry, stale: false };
      } catch {
        if (prev && now - prev.time < 12 * 3600000) return { ...prev, stale: true };
        // 不要把上游網址或原始錯誤往外丟：裡面可能有金鑰
        throw new Error(`${id === 'F-A0021-001' ? '潮汐預報' : '海象觀測'}暫時無法取得`);
      }
    })().finally(() => this.pending.delete(id));
    this.pending.set(id, task); return task;
  }

  async loadHistory() {
    if (this.history || !this.historyFile) return this.history ||= {};
    try { this.history = JSON.parse(await readFile(this.historyFile, 'utf8')).history || {}; } catch { this.history = {}; }
    return this.history;
  }

  /** 全部海岸的快照：潮汐預報（各地點）＋各測站 48 小時觀測 */
  async snapshot() {
    const now = this.now();
    const [f, o] = await Promise.allSettled([
      this.dataset('F-A0021-001', { LocationId: COASTS.map(c => c.forecast.id).join(','), sort: 'DateTime' }),
      this.dataset('O-B0075-001', { StationID: stationIds().join(',') }),
    ]);
    if (f.status === 'rejected' && o.status === 'rejected') throw f.reason;
    const issues = [];
    if (f.status === 'rejected') issues.push('潮汐預報暫時無法取得。');
    else if (f.value.stale) issues.push('潮汐預報連線失敗，暫用先前取得的資料。');
    if (o.status === 'rejected') issues.push('海象觀測暫時無法取得。');
    else if (o.value.stale) issues.push('海象觀測連線失敗，暫用先前取得的資料。');
    if (o.status === 'fulfilled') {
      this.history = mergeHistory(await this.loadHistory(), o.value.data, now);
      if (this.historyFile) {
        try { await mkdir(path.dirname(this.historyFile), { recursive: true }); } catch { /* 已存在 */ }
        writeFile(this.historyFile, JSON.stringify({ history: this.history })).catch(() => {});
      }
    }
    return {
      version: 1, mode: 'live', generatedAt: new Date(now).toISOString(),
      forecastAt: f.status === 'fulfilled' ? new Date(f.value.time).toISOString() : null,
      observedFetchedAt: o.status === 'fulfilled' ? new Date(o.value.time).toISOString() : null,
      forecasts: f.status === 'fulfilled' ? f.value.data : {},
      stations: o.status === 'fulfilled' ? o.value.data : {},
      issues,
    };
  }

  /** 最近 30 天累積的觀測（只有實際收到過的整點） */
  async historySnapshot() {
    const h = await this.loadHistory(), out = {};
    for (const [id, list] of Object.entries(h)) out[id] = list.map(s => ({ t: s.t, tide: s.tide, wave: s.wave, temp: s.temp }));
    return { version: 1, generatedAt: new Date(this.now()).toISOString(), history: out };
  }
}
