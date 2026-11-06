import { cp, mkdir, readdir, rm } from 'node:fs/promises';

const dist = new URL('../dist/', import.meta.url);
const destination = new URL('../../', import.meta.url);
const expected = new Set(['index.html', 'assets', 'favicon.svg', 'favicon.ico', 'favicon-16.png', 'favicon-32.png', 'apple-touch-icon.png', 'og-image.png', 'og-image.svg']);
const entries = await readdir(dist);
if (entries.length !== expected.size || entries.some(entry => !expected.has(entry))) {
  throw new Error('Unexpected build contents; release was not copied.');
}
// Only the generated assets directory is replaced; source and other project files stay intact.
await mkdir(destination, { recursive: true });
await rm(new URL('assets/', destination), { recursive: true, force: true });
for (const entry of entries) await cp(new URL(entry, dist), new URL(entry, destination), { recursive: true });
console.log('Prepared static release in beep-lab/');
