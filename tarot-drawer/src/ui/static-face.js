// 整張牌面（插畫＋SVG 牌框與暈墨濾鏡）先畫成一張點陣圖。
// 減輕動態時翻開就是這張圖；一般模式在翻牌演出結束後也換成它，捲動與縮放就不必每次重算濾鏡。
import { faceSVG, loadFaces, CARD_W, CARD_H, svgDataURL } from '../art/frame.js';
import { readInkBleed } from '../art/ink-settings.js';

const cache = new Map();
const SCALE = 2.4;   // 720 × 1200：結果頁最大的牌在 3 倍螢幕上也夠清楚

export function staticFace(card) {
  const key = card.id + JSON.stringify(readInkBleed());
  if (!cache.has(key)) cache.set(key, render(card).catch(error => { cache.delete(key); throw error; }));
  return cache.get(key);
}

async function render(card) {
  await loadFaces([card.id]);
  const w = Math.round(CARD_W * SCALE), h = Math.round(CARD_H * SCALE);
  const img = new Image();
  img.src = svgDataURL(faceSVG(card, { printed: true, id: `s${card.number}_`, attrs: `width="${w}" height="${h}"` }));
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  canvas.getContext('2d').drawImage(img, 0, 0, w, h);
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', .92));
  if (!blob) throw new Error('牌面點陣圖輸出失敗');
  return URL.createObjectURL(blob);
}
