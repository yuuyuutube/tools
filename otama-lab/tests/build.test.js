import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Script } from 'node:vm';
const root = new URL('../', import.meta.url);

test('entry uses a parseable classic script with no module loading requirement', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /<script defer src="\.\/app\.bundle\.js\?v=[a-f0-9]{12}"><\/script>/);
  assert.doesNotMatch(html, /type="module"/);
  const bundle = await readFile(new URL('app.bundle.js', root), 'utf8');
  assert.doesNotThrow(() => new Script(bundle));
});

test('share metadata points to real text-free image assets at expected sizes', async () => {
  const html = await readFile(new URL('index.html', root), 'utf8');
  assert.match(html, /property="og:image" content="https:\/\/yuuyuutube\.github\.io\/tools\/otama-lab\/assets\/og\.png"/);
  for (const [file, width, height] of [['og.png', 1200, 630], ['favicon-32.png', 32, 32], ['apple-touch-icon.png', 180, 180]]) {
    const png = await readFile(new URL(`assets/${file}`, root));
    assert.equal(png.toString('hex', 0, 8), '89504e470d0a1a0a');
    assert.equal(png.readUInt32BE(16), width); assert.equal(png.readUInt32BE(20), height);
  }
  for (const file of ['og.svg', 'favicon.svg']) {
    const svg = await readFile(new URL(`assets/${file}`, root), 'utf8');
    assert.doesNotMatch(svg, /<text\b|<image\b|\p{Extended_Pictographic}/u);
  }
});

test('live entry, worker and styles are packaged with subpath-safe, versioned URLs', async () => {
  const html = await readFile(new URL('dist/live.html', root), 'utf8');
  assert.match(html, /src="\.\/live\.bundle\.js\?v=[a-f0-9]{12}"/);
  assert.match(html, /href="\.\/src\/live\/styles\.css\?v=[a-f0-9]{12}"/);
  for (const file of ['live.bundle.js', 'pitch-worker.js']) {
    const code = await readFile(new URL(`dist/${file}`, root), 'utf8');
    assert.doesNotThrow(() => new Script(code));
    if (file === 'live.bundle.js') assert.match(code, /\.\/pitch-worker\.js\?v=[a-f0-9]{12}/);
  }
  assert.doesNotMatch(html, /\p{Extended_Pictographic}/u);
});
