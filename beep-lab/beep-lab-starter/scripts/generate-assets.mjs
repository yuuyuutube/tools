import { Resvg } from '@resvg/resvg-js';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const asset = name => new URL(`../public/${name}`, import.meta.url);
const favicon = await readFile(asset('favicon.svg'), 'utf8');
const png = (svg, width) => new Resvg(svg, { fitTo: { mode: 'width', value: width } }).render().asPng();
for (const size of [16, 32, 180]) {
  await writeFile(asset(size === 180 ? 'apple-touch-icon.png' : `favicon-${size}.png`), png(favicon, size));
}
const iconImages = [16, 32].map(size => ({ size, data: png(favicon, size) }));
const header = Buffer.alloc(6 + iconImages.length * 16);
header.writeUInt16LE(1, 2); header.writeUInt16LE(iconImages.length, 4);
let offset = header.length;
iconImages.forEach(({size, data}, index) => {
  const start = 6 + index * 16;
  header[start] = size; header[start + 1] = size;
  header.writeUInt16LE(1, start + 4); header.writeUInt16LE(32, start + 6);
  header.writeUInt32LE(data.length, start + 8); header.writeUInt32LE(offset, start + 12);
  offset += data.length;
});
await writeFile(asset('favicon.ico'), Buffer.concat([header, ...iconImages.map(image => image.data)]));

// Vector source stays editable; the social image contains no text or font assets.
const keycaps = Array.from({ length: 12 }, (_, index) => {
  const column = index % 3;
  const row = Math.floor(index / 3);
  const x = 720 + column * 76;
  const y = 188 + row * 70;
  const active = index === 1 || index === 5 || index === 6;
  return `<rect x="${x}" y="${y + 3}" width="60" height="54" rx="9" fill="#b6beab"/>
    <rect x="${x}" y="${y}" width="60" height="54" rx="9" fill="${active ? '#c5d49e' : '#f6f6ed'}" stroke="#bec5b4"/>
    <circle cx="${x + 30}" cy="${y + 27}" r="4" fill="${active ? '#304226' : '#89927e'}"/>`;
}).join('\n');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f2f1e9"/>
  <rect x="192" y="127" width="816" height="388" rx="28" fill="#d5dace"/>
  <rect x="192" y="115" width="816" height="388" rx="28" fill="#e3e6dc" stroke="#bfc3b6" stroke-width="2"/>
  <rect x="232" y="155" width="440" height="232" rx="12" fill="#c5d49e" stroke="#7c8b64" stroke-width="2"/>
  <path d="M270 280h44v-62h74v62h60v-62h74v62h56v-62h56" fill="none" stroke="#304226" stroke-width="12" stroke-linejoin="round"/>
  <path d="M270 343h80m24 0h118m24 0h52" stroke="#829767" stroke-width="9" stroke-linecap="round"/>
  <rect x="232" y="411" width="280" height="52" rx="8" fill="#282b25"/>
  <path d="m365 425 20 12-20 12Z" fill="#c5d49e"/>
  <rect x="528" y="411" width="64" height="52" rx="8" fill="#f6f6ed" stroke="#bec5b4"/>
  <rect x="552" y="429" width="16" height="16" rx="2" fill="#282b25"/>
  <rect x="608" y="411" width="64" height="52" rx="8" fill="#bd4828"/>
  <path d="M628 436h24m-12-12v24" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
  ${keycaps}
</svg>`;
await writeFile(asset('og-image.svg'), svg);
await writeFile(asset('og-image.png'), png(svg, 1200));
console.log(`Generated SVG/PNG/ICO assets in ${fileURLToPath(new URL('../public/', import.meta.url))}`);
