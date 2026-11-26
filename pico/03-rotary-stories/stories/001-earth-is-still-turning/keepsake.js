// The keepsake of RS 001: the photograph the reader took at station 001.
// Stored as parameters (bearing, focal length, focus, time); the image is re-rendered from
// them, and the PNG is also cached in IndexedDB when available.
import { ROLE, keepsake as KT, fin as FT } from './narrative/text.js';
import { getBlob, putBlob, downloadBlob } from '../../src/storage/photo-store.js';

const nameOf = (settings) => (settings && settings.name) || ROLE;

async function renderPhoto(params, { width = 2400 } = {}) {
  const { renderPlanetPhoto } = await import('./art/planet.js');
  return renderPlanetPhoto(params, { width });
}

async function renderCard(params, settings) {
  const photo = await renderPhoto(params, { width: 2000 });
  const W = 2000;
  const pad = 110;
  const ph = Math.round((photo.height / photo.width) * (W - pad * 2));
  const H = pad + ph + 640;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e0cf';
  g.fillRect(0, 0, W, H);
  g.drawImage(photo, pad, pad, W - pad * 2, ph);
  g.strokeStyle = '#24231f';
  g.lineWidth = 2;
  g.strokeRect(pad, pad, W - pad * 2, ph);
  await document.fonts.ready;
  const lines = FT.record({ name: nameOf(settings), time: params.time, az: params.az, mm: params.mm }).split('\n');
  const sent = FT.sent.split('\n');
  g.fillStyle = '#24231f';
  let y = pad + ph + 110;
  g.font = '500 44px "Noto Sans TC", sans-serif';
  g.fillText(lines[0], pad, y);
  y += 30;
  g.fillRect(pad, y, W - pad * 2, 2);
  y += 70;
  g.font = '34px "Noto Sans TC", sans-serif';
  const body = [...lines.slice(2).filter((l) => l.trim()), ...sent];
  const colW = (W - pad * 2) / 2;
  body.forEach((l, i) => {
    const col = i < 4 ? 0 : 1;
    const row = col === 0 ? i : i - 4;
    g.fillText(l, pad + col * colW, y + row * 62);
  });
  g.font = '26px "IBM Plex Mono", monospace';
  g.fillStyle = '#6b655b';
  g.textAlign = 'right';
  g.fillText(KT.colophon, W - pad, H - 60);
  return c;
}

function toBlob(canvas) {
  return new Promise((r) => canvas.toBlob(r, 'image/png'));
}

export const keepsake = {
  async photo(params, opts) {
    return renderPhoto(params, opts);
  },
  card(params, settings) {
    return renderCard(params, settings);
  },
  caption(params, settings) {
    return KT.caption(params, nameOf(settings));
  },
  async store(params) {
    const blob = await toBlob(await renderPhoto(params));
    await putBlob('eist.photo', blob);
    return blob;
  },
  async download(params, settings, kind) {
    if (kind === 'card') return downloadBlob(await toBlob(await renderCard(params, settings)), 'environmental-record-001.png');
    let blob = await getBlob('eist.photo');
    if (!blob) blob = await toBlob(await renderPhoto(params));
    downloadBlob(blob, 'environmental-image-001.png');
  },
};
