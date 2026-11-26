// Zero-dependency static server for the pico/ sites (Node 14+).
//
// It serves the whole pico/ folder so that a site can import ../shared/... exactly as it
// will on the static host, and redirects "/" to the site's own folder.
// Web Serial needs a secure context; http://localhost counts as one.
import http from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { extname, join, normalize, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PICO_ROOT = normalize(join(dirname(fileURLToPath(import.meta.url)), '..'));

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.ico': 'image/x-icon',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.woff2': 'font/woff2',
};

export function serveSite({ site, port, label = site }) {
  const root = PICO_ROOT;
  const server = http.createServer((req, res) => {
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    } catch {
      res.writeHead(400).end();
      return;
    }
    if (path === '/' || path === '') {
      res.writeHead(302, { location: `/${site}/` }).end();
      return;
    }
    let file = normalize(join(root, path));
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end();
      return;
    }
    try {
      if (statSync(file).isDirectory()) {
        // Relative URLs inside a page only resolve correctly under a trailing slash.
        if (!path.endsWith('/')) {
          res.writeHead(301, { location: `${path}/` }).end();
          return;
        }
        file = join(file, 'index.html');
      }
      statSync(file);
    } catch {
      res.writeHead(404, { 'content-type': 'text/plain' }).end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    createReadStream(file).pipe(res);
  });
  server.listen(port, '127.0.0.1', () => console.log(`${label} → http://localhost:${port}/${site}/`));
  return server;
}
