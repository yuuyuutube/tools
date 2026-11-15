/* 相遇卡、圖鑑小卡、照片（含沒有照片／載入失敗時的替代插圖） */
import { el, fmtDate } from './util.js';
import { icon } from './icons.js';
import { combo, placeholderSVG, stampSVG } from './art.js';
import { title, kindIcon, AGE, BODY, SEX, statusText } from './labels.js';

/* 圖片代理：官方照片沒有 CORS 標頭、檔案也偏大。縮圖與分享圖經由 wsrv.nl 取得同一張官方照片的縮小版；
   代理失敗時退回官方原圖，再失敗才顯示替代插圖。設成 '' 可完全停用代理。 */
export const IMG_PROXY = 'https://wsrv.nl/?url=';
export const proxied = (u, w, square) => `${IMG_PROXY}${encodeURIComponent(u)}&w=${w}${square ? `&h=${w}&fit=cover&a=attention` : ''}&output=webp&q=72`;

export function photoEl(a, { w = 360, square = true, eager = false } = {}) {
  const box = el('div', { class: 'ph' });
  const none = msg => { box.classList.add('ph--none'); box.innerHTML = placeholderSVG(a); box.append(el('span', { class: 'ph-note', text: msg })); };
  if (!a.photo) { none('無照片・毛色示意'); return box; }
  const srcs = IMG_PROXY ? [proxied(a.photo, w, square), a.photo] : [a.photo];
  const img = el('img', { alt: `${title(a)}的照片`, loading: eager ? 'eager' : 'lazy', decoding: 'async', referrerpolicy: 'no-referrer', draggable: 'false' });
  let i = 0;
  img.addEventListener('error', () => { if (++i < srcs.length) img.src = srcs[i]; else { img.remove(); none('照片暫無法顯示・毛色示意'); } });
  img.addEventListener('load', () => box.classList.add('ph--ok'));
  img.src = srcs[0];
  box.append(img);
  return box;
}

const stampDate = t => { const d = new Date(t), p = n => String(n).padStart(2, '0'); return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`; };

/* 色塊＋拱形照片窗＋錯版＋（收藏後才有的）相遇章 */
export function block(a, { fav = null, w = 700, eager = true } = {}) {
  const k = combo(a.id);
  const blk = el('div', { class: 'blk', style: `--c1:${k.a};--c2:${k.b};--cs:${k.s};--on:${k.on}` },
    el('span', { class: 'no', text: `No. ${a.id}` }),
    el('i', { class: 'arch-ghost' }),
    el('div', { class: 'arch' }, photoEl(a, { w, square: false, eager })),
    el('div', { class: 'stamp', hidden: !fav }));
  if (fav) blk.lastChild.innerHTML = stampSVG(stampDate(fav.t));
  return blk;
}
export function setStamp(blk, fav, animate) {
  const s = blk.querySelector('.stamp');
  s.hidden = !fav;
  s.innerHTML = fav ? stampSVG(stampDate(fav.t)) : '';
  if (fav && animate) { s.classList.remove('hit'); void s.offsetWidth; s.classList.add('hit'); }
}

export function tags(a, st) {
  return el('div', { class: 'tags' },
    a.sex && el('span', { class: 'tag', html: icon(a.sex === 'M' ? 'male' : 'female') }, el('span', { text: SEX[a.sex] })),
    a.age && el('span', { class: 'tag', text: AGE[a.age] }),
    a.body && el('span', { class: 'tag', text: BODY[a.body] }),
    el('span', { class: 'tag st st--' + st }, el('i'), el('span', { text: statusText(st, a) })));
}

export function meetCard(a, st, fav) {
  return el('article', { class: 'mcard', 'aria-label': title(a) },
    block(a, { fav }),
    el('div', { class: 'inf' },
      el('h2', { text: title(a) }),
      el('p', { class: 'where', html: icon('pin') }, el('span', { text: [a.county, a.shelter].filter(Boolean).join(' · ') })),
      tags(a, st),
      el('p', { class: 'sub', text: a.sub })));
}

export function tile(a, st, { fav = null } = {}) {
  const k = combo(a.id);
  return el('button', { type: 'button', class: 'tile', data: { id: a.id }, style: `--c1:${k.a};--cs:${k.s}`, 'aria-label': `${title(a)}，${a.county}，${statusText(st, a)}` },
    el('div', { class: 'tile-ph' }, photoEl(a, { w: 320 }), fav && el('div', { class: 'stamp', html: stampSVG(stampDate(fav.t)) })),
    el('div', { class: 'tile-cap' },
      el('i', { class: 'dot' }),
      el('span', { class: 'tile-t', text: a.county || a.shelter }),
      st !== 'open' && el('span', { class: 'tile-st', text: st === 'upcoming' ? fmtDate(a.open).slice(5) + ' 起' : '洽詢' }),
      el('span', { class: 'tile-ic', html: icon(kindIcon(a)) + (a.sex ? icon(a.sex === 'M' ? 'male' : 'female') : '') })));
}

/* 收藏裡找不到最新資料的動物：只用當時存下的最少資訊畫一張小卡 */
export function goneTile(f) {
  const a = { id: f.id, kind: f.kind, photo: '' };
  const t = el('button', { type: 'button', class: 'tile tile--gone', data: { id: f.id }, 'aria-label': `編號 ${f.sub || f.id}，目前無法在最新公開資料中找到` },
    el('div', { class: 'tile-ph' }, el('div', { class: 'ph ph--none', html: placeholderSVG(a) }), el('span', { class: 'gone-q', text: '?' })),
    el('div', { class: 'tile-cap' }, el('i', { class: 'dot' }), el('span', { class: 'tile-t', text: f.county || f.shelter || '' }), el('span', { class: 'tile-st', text: '未確認' })));
  return t;
}
