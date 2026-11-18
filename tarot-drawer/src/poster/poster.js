// 分享海報：用 SVG 重新排一張直式的印刷品（不是網站截圖），再畫到 Canvas 輸出 PNG。
// 所有素材都是同一份文件裡的向量圖與系統字體，沒有外部圖片，Canvas 不會被跨網域污染。
// 版面裡會變的東西（錯位、印章角度、紙張顆粒）都由這次抽牌的 seed 決定，重複下載會得到同一張圖。
import { SITE } from '../config.js';
import { keywordsOf } from '../data/cards.js';
import { faceSVG, loadFaces, FONT } from '../art/frame.js';
import { P, N, O, Y, B, K, burst } from '../art/kit.js';
import { seeded } from '../engine/random.js';

export const POSTER_W = 1080, POSTER_H = 1620;
const PAPER = '#f4eedf';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const pad = n => String(n).padStart(2, '0');
export const dateText = d => `${d.getFullYear()}.${pad(d.getMonth() + 1)}.${pad(d.getDate())}`;
const serial = seed => (seed >>> 0).toString(16).toUpperCase().padStart(8, '0').slice(0, 6);

const T = (x, y, size, str, o = {}) =>
  `<text x="${o.anchor && o.anchor !== 'middle' ? x : x + (o.ls || 0) / 2}" y="${y}" font-family="${FONT}" text-anchor="${o.anchor || 'middle'}" font-size="${size}" font-weight="${o.weight || 500}" letter-spacing="${o.ls || 0}" fill="${o.fill || N}"${o.opacity ? ` opacity="${o.opacity}"` : ''}>${esc(str)}</text>`;

// 套色錯位的大字：粉、藍各偏一點，墨色壓在最上面
const riso = (x, y, size, str, ls, d = 3) =>
  `<g style="mix-blend-mode:multiply">${T(x + d, y + d * .7, size, str, { weight: 800, ls, fill: K, opacity: .55 })}</g>` +
  `<g style="mix-blend-mode:multiply">${T(x - d * .7, y + d, size, str, { weight: 800, ls, fill: B, opacity: .45 })}</g>` +
  T(x, y, size, str, { weight: 800, ls });

// 對位標記
const mark = (x, y) => `<g fill="none" stroke="${N}" stroke-width="2"><circle cx="${x}" cy="${y}" r="11"/><path d="M${x - 20} ${y}h40M${x} ${y - 20}v40"/></g>`;

// 正逆位的小牌子：正位空心、逆位實心，再加箭頭與文字，不只靠方向辨識
function orientationTag(cx, y, orientation, s = 1) {
  const rev = orientation === 'reversed', w = (rev ? 290 : 262) * s, h = 50 * s, x = cx - w / 2;
  const fg = rev ? P : N, ax = x + 32 * s, ay = y + h / 2;
  const arrow = rev
    ? `M${ax} ${ay - 10 * s}v${20 * s}M${ax - 7 * s} ${ay + 3 * s}l${7 * s} ${7 * s}l${7 * s} ${-7 * s}`
    : `M${ax} ${ay + 10 * s}v${-20 * s}M${ax - 7 * s} ${ay - 3 * s}l${7 * s} ${-7 * s}l${7 * s} ${7 * s}`;
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${h / 2}" fill="${rev ? N : 'none'}" stroke="${N}" stroke-width="2.5"/>` +
    `<path d="${arrow}" fill="none" stroke="${fg}" stroke-width="${3 * s}" stroke-linecap="round" stroke-linejoin="round"/>` +
    T(x + 54 * s, y + h / 2 + 8 * s, 22 * s, rev ? '逆位 REVERSED' : '正位 UPRIGHT', { anchor: 'start', ls: 3 * s, fill: fg, weight: 600 });
}

// 日期印章：單色、微微歪一點
function stamp(cx, cy, date, rot) {
  const id = 'stampArc';
  return `<g transform="rotate(${rot.toFixed(1)} ${cx} ${cy})" style="mix-blend-mode:multiply" opacity=".92">` +
    `<defs><path id="${id}" d="M${cx - 70} ${cy}A70 70 0 0 1 ${cx + 70} ${cy}"/></defs>` +
    `<circle cx="${cx}" cy="${cy}" r="92" fill="none" stroke="${O}" stroke-width="5"/>` +
    `<circle cx="${cx}" cy="${cy}" r="56" fill="none" stroke="${O}" stroke-width="2"/>` +
    `<text font-family="${FONT}" font-size="14.5" font-weight="700" letter-spacing="3.6" fill="${O}" text-anchor="middle"><textPath xlink:href="#${id}" href="#${id}" startOffset="50%">${esc(SITE.nameEn)}</textPath></text>` +
    T(cx, cy + 9, 25, date, { fill: O, weight: 800, ls: 1 }) +
    T(cx, cy + 82, 13, SITE.nameZh, { fill: O, weight: 700, ls: 3 }) +
    `${burst(cx - 82, cy, 5, 2, 4)} fill="${O}"/>${burst(cx + 82, cy, 5, 2, 4)} fill="${O}"/>` +
    `${burst(cx, cy + 34, 7, 2.6, 4)} fill="${O}"/>` +
    `</g>`;
}

const colorBar = (x, y) => [O, Y, B, K, N].map((c, i) => `<rect x="${x + i * 26}" y="${y}" width="20" height="20" fill="${c}"/>`).join('');

// 牌後面一塊錯位的網點色塊，像沒對準的底色版
const cardShadow = (x, y, w, h, d, ox, oy) =>
  `<rect x="${x + d * ox}" y="${y + d * oy}" width="${w}" height="${h}" rx="${w * .054}" fill="url(#bigdots)" style="mix-blend-mode:multiply"/>`;

function placeCard(item, x, y, w, i, offsets) {
  const h = w * 5 / 3;
  const svg = faceSVG(item.card, { offsets, id: `p${i}_`, attrs: `x="${x}" y="${y}" width="${w}" height="${h}"`, printed: true });
  // 逆位的牌在海報上也維持逆位
  return item.orientation === 'reversed' ? `<g transform="rotate(180 ${x + w / 2} ${y + h / 2})">${svg}</g>` : svg;
}

export function posterSVG(res) {
  const rnd = seeded(res.seed ^ 0x9e3779b9);
  const rot = (rnd() - .5) * 18, sx = rnd() < .5 ? -1 : 1, sy = 1;
  const W = POSTER_W, H = POSTER_H, date = dateText(res.date);
  let s = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
    `<defs><pattern id="bigdots" width="13" height="13" patternUnits="userSpaceOnUse" patternTransform="rotate(32)"><circle cx="6.5" cy="6.5" r="3.4" fill="${B}"/></pattern></defs>` +
    `<rect width="${W}" height="${H}" fill="${PAPER}"/>` +
    mark(64, 64) + mark(W - 64, 64) + mark(64, H - 64) + mark(W - 64, H - 64) +
    T(118, 73, 22, SITE.nameZh, { anchor: 'start', ls: 7, weight: 700 }) +
    T(W - 118, 72, 18, `No. ${serial(res.seed)}`, { anchor: 'end', ls: 3, opacity: .7 }) +
    colorBar(118, H - 74);

  if (res.cards.length === 1) {
    const it = res.cards[0], w = 560, h = w * 5 / 3, x = (W - w) / 2, y = 124;
    const kw = keywordsOf(it.card, it.orientation), kwText = kw.join(' · ');
    const kwSize = Math.min(34, Math.floor(820 / (kwText.length * 1.08)));
    s += cardShadow(x, y, w, h, 16, sx, sy) + placeCard(it, x, y, w, 0, res.offsets) +
      T(540, 1142, 30, it.card.romanNumeral, { ls: 9 }) +
      riso(540, 1242, 88, it.card.nameZh, 18) +
      T(540, 1296, 23, it.card.nameEn.toUpperCase(), { ls: 9, opacity: .75 }) +
      orientationTag(540, 1334, it.orientation) +
      T(540, 1452, kwSize, kwText, { ls: 4 }) +
      stamp(884, 1098, date, rot);
  } else {
    const w = 300, h = 500, gap = 30, x0 = (W - w * 3 - gap * 2) / 2, y = 318;
    const cx = i => x0 + i * (w + gap) + w / 2;
    // 一條線串起三張：這是同一次抽牌
    s += `<g transform="translate(0 64)"><path d="M${cx(0) + 30} 176H${cx(1) - 30}M${cx(1) + 30} 176H${cx(2) - 30}" stroke="${N}" stroke-width="2" stroke-dasharray="2 9" stroke-linecap="round"/>`;
    res.cards.forEach((it, i) => {
      const x = x0 + i * (w + gap), kw = keywordsOf(it.card, it.orientation);
      const zh = it.card.nameZh, zs = zh.length > 3 ? 44 : 52;
      s += `<circle cx="${cx(i)}" cy="176" r="22" fill="${PAPER}" stroke="${N}" stroke-width="2.5"/>` + T(cx(i), 184, 22, i + 1, { weight: 700 }) +
        T(cx(i), 254, 34, it.label.zh, { weight: 800, ls: 10 }) +
        T(cx(i), 286, 14, it.label.en, { ls: 5, opacity: .7 }) +
        cardShadow(x, y, w, h, 9, sx, sy) + placeCard(it, x, y, w, i, res.offsets) +
        T(cx(i), 884, 21, it.card.romanNumeral, { ls: 6 }) +
        riso(cx(i), 944, zs, zh, zh.length > 3 ? 6 : 9, 2) +
        T(cx(i), 978, 13, it.card.nameEn.toUpperCase(), { ls: 4, opacity: .75 }) +
        orientationTag(cx(i), 1006, it.orientation, .8) +
        kw.map((k, j) => T(cx(i), 1108 + j * 42, 25, k, { ls: 2 })).join('');
    });
    s += '</g>';
    s += stamp(884, 1452, date, rot);
  }
  return s + '</svg>';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('海報圖片載入失敗'));
    img.src = src;
  });
}

// 紙張顆粒：直接點在 Canvas 上（有種子，所以每次都一樣），不靠 SVG 濾鏡，Safari 才不會漏畫
function grain(g, seed) {
  const rnd = seeded(seed ^ 0x51ed270b);
  for (let i = 0; i < 15000; i++) {
    const x = rnd() * POSTER_W, y = rnd() * POSTER_H, dark = rnd() < .6;
    g.fillStyle = dark ? `rgba(60,48,30,${.03 + rnd() * .05})` : `rgba(255,252,244,${.08 + rnd() * .12})`;
    g.fillRect(x, y, 1 + rnd() * 1.6, 1 + rnd() * 1.6);
  }
  for (let i = 0; i < 260; i++) {       // 幾根細細的紙纖維
    const x = rnd() * POSTER_W, y = rnd() * POSTER_H, a = rnd() * Math.PI, len = 6 + rnd() * 16;
    g.strokeStyle = `rgba(90,74,50,${.04 + rnd() * .05})`; g.lineWidth = .8;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len); g.stroke();
  }
}

async function render(res) {
  await loadFaces(res.cards.map(it => it.card.id));
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(posterSVG(res)));
  const cv = document.createElement('canvas');
  cv.width = POSTER_W; cv.height = POSTER_H;
  const g = cv.getContext('2d');
  g.drawImage(img, 0, 0, POSTER_W, POSTER_H);
  grain(g, res.seed);
  const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
  if (!blob) throw new Error('海報輸出失敗');
  return blob;
}

// 同一次結果只算一次：重複按下載拿到的是同一張圖
export function posterBlob(res) {
  return res.poster ||= render(res).catch(e => { res.poster = null; throw e; });
}

export const posterName = res => `tarot-${dateText(res.date).replace(/\./g, '')}-${serial(res.seed)}.png`;

// 手機走系統分享面板（iOS 可以直接「儲存影像」到相簿），桌機直接下載
export async function savePoster(res) {
  const blob = await posterBlob(res), name = posterName(res);
  const touch = matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare) {
    const file = new File([blob], name, { type: 'image/png' });
    if (navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file] }); return 'shared'; }
      catch (e) { if (e.name === 'AbortError') return 'cancelled'; }   // 其他錯誤就改用下載
    }
  }
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; a.rel = 'noopener';
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
  return 'downloaded';
}
