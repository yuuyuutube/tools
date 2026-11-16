// 向台電開放資料要「各機組發電量」與「今日電力資訊」，快取、正規化、累積歷史。
// 兩個端點都是公開檔案，不需要金鑰；但沒有 CORS 標頭，所以瀏覽器必須透過這個代理（或 GitHub Pages 快照）取得。
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { classify } from '../src/classify.js';
import { parseSupply } from '../src/supply.js';
import { addPoint, merge, pointOf } from '../src/history.js';

export const SOURCES = {
  generation: 'https://service.taipower.com.tw/data/opendata/apply/file/d006001/001.json',
  supply: 'https://service.taipower.com.tw/data/opendata/apply/file/d006020/001.json',
};
const TTL = 4 * 60000;           // 官方約每 10 分鐘更新；4 分鐘內重複請求直接用快取
const KEEP_STALE = 6 * 3600000;  // 上游失敗時，最多沿用 6 小時內取得的資料（會標示）

/** 台電檔案開頭有 UTF-8 BOM */
export const parseJson = text => JSON.parse(String(text).replace(/^﻿/, ''));

export class PowerService {
  constructor({ fetcher = fetch, now = () => Date.now(), historyFile = null } = {}) {
    this.fetcher = fetcher; this.now = now; this.historyFile = historyFile;
    this.cache = new Map(); this.pending = new Map(); this.history = null;
  }

  async source(id) {
    const prev = this.cache.get(id), now = this.now();
    if (prev && now - prev.time < TTL) return { ...prev, stale: false };
    if (this.pending.has(id)) return this.pending.get(id);
    const task = (async () => {
      try {
        const r = await this.fetcher(SOURCES[id], { signal: AbortSignal.timeout(20000), headers: { Accept: 'application/json' } });
        if (!r.ok) throw new Error('HTTP ' + r.status);
        const raw = parseJson(await r.text());
        const data = id === 'generation' ? classify(raw) : parseSupply(raw);
        const entry = { time: this.now(), data };
        this.cache.set(id, entry); return { ...entry, stale: false };
      } catch {
        if (prev && now - prev.time < KEEP_STALE) return { ...prev, stale: true };
        throw new Error(id === 'generation' ? '機組發電資料暫時無法取得' : '今日電力資訊暫時無法取得');
      }
    })().finally(() => this.pending.delete(id));
    this.pending.set(id, task); return task;
  }

  async loadHistory() {
    if (this.history || !this.historyFile) return this.history ||= [];
    try { this.history = JSON.parse(await readFile(this.historyFile, 'utf8')).history || []; } catch { this.history = []; }
    return this.history;
  }

  async snapshot() {
    const [g, s] = await Promise.allSettled([this.source('generation'), this.source('supply')]);
    if (g.status === 'rejected' && s.status === 'rejected') throw g.reason;
    const issues = [];
    if (g.status === 'rejected') issues.push('generation-unavailable');
    else if (g.value.stale) issues.push('generation-cached');
    if (s.status === 'rejected') issues.push('supply-unavailable');
    else if (s.value.stale) issues.push('supply-cached');
    const snap = {
      version: 1, mode: 'live', generatedAt: new Date(this.now()).toISOString(),
      generation: g.status === 'fulfilled' ? g.value.data : null,
      supply: s.status === 'fulfilled' ? s.value.data : null,
      issues,
    };
    if (snap.generation?.check?.length) issues.push('subtotal-mismatch');
    const history = addPoint(await this.loadHistory(), pointOf(snap), this.now());
    this.history = history;
    if (this.historyFile) {
      mkdir(path.dirname(this.historyFile), { recursive: true }).then(() => writeFile(this.historyFile, JSON.stringify({ history }))).catch(() => {});
    }
    snap.history = history;
    return snap;
  }
}

export { merge };
