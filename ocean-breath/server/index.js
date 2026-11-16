// HTTP 伺服器：公開檔案白名單＋ /api/ocean、/api/history。沒有金鑰時回傳展示資料。
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { OceanService } from './cwa.js';
import { demoSnapshot } from '../src/demo.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json; charset=utf-8' };

export function createServer({ key = process.env.CWA_API_KEY, demo = process.env.DEMO_MODE === 'true', service, snapshotFile = process.env.OCEAN_SNAPSHOT_FILE } = {}) {
  // OCEAN_SNAPSHOT_FILE：開發驗證用，直接回傳一份事先存好的官方資料快照（例如 scripts/publish-ocean.js 的輸出）
  if (snapshotFile) service = { snapshot: async () => JSON.parse(await readFile(snapshotFile, 'utf8')), historySnapshot: async () => ({ version: 1, history: {} }) };
  const live = (Boolean(key) || Boolean(snapshotFile)) && !demo;
  const ocean = service || new OceanService({ key, historyFile: path.join(root, '.ocean-cache', 'history.json') });
  const json = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
  return http.createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self'; script-src 'self'; img-src 'self' data: blob:; connect-src 'self' https://raw.githubusercontent.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname.startsWith('/api/')) {
        if (req.method !== 'GET') return json(res, 405, { error: '不支援' });
        if (url.pathname === '/api/ocean') return json(res, 200, live ? await ocean.snapshot() : demoSnapshot());
        if (url.pathname === '/api/history') return json(res, 200, live ? await ocean.historySnapshot() : { version: 1, generatedAt: new Date().toISOString(), history: {}, demo: true });
        return json(res, 404, { error: '找不到此功能' });
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
      // 只開放 index.html、src、assets；.env、server、tests、docs 都不對外
      let relative; try { relative = decodeURIComponent(url.pathname).replace(/^\/+/, ''); } catch { res.writeHead(400); return res.end(); }
      if (!relative) relative = 'index.html';
      if (relative !== 'index.html' && !/^(src|assets)\/[a-zA-Z0-9_./-]+$/.test(relative)) { res.writeHead(404); return res.end('Not found'); }
      const file = path.resolve(root, relative);
      if (!file.startsWith(root) || relative.split('/').some(p => p.startsWith('.'))) { res.writeHead(404); return res.end('Not found'); }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(req.method === 'HEAD' ? undefined : body);
    } catch (error) {
      if (error.code === 'ENOENT') { res.writeHead(404); return res.end('Not found'); }
      return json(res, 502, { error: '暫時無法取得海象資料，請稍後重試。' });
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.PORT) || 4318, host = process.env.HOST || '127.0.0.1';
  createServer().listen(port, host, () => console.log(`海洋呼吸觀測所 → http://${host}:${port}\n${process.env.CWA_API_KEY && process.env.DEMO_MODE !== 'true' ? '氣象署模式' : '展示模式（未設定 CWA_API_KEY）'}`));
}
