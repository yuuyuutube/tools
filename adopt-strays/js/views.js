/* 各個頁面：圖鑑、我的相遇紀錄、動物故事頁、關於、分享視窗、相遇條件 */
import { el, $, fmtDate, reduced } from './util.js';
import { icon } from './icons.js';
import { state, subscribe, lookup } from './data.js';
import { statusOf } from './eligibility.js';
import * as search from './search.js';
import { block, setStamp, tile, goneTile, tags } from './card.js';
import { title, KIND, AGE, SEX, BODY, STER } from './labels.js';
import { select, segmented, checkbox, iconBtn, modal, confirmBox, toast } from './ui.js';
import { OFFICIAL, SOURCE } from './api.js';
import { describe } from './freshness.js';
import { BEFORE, LINES } from './copy.js';
import { emptySVG } from './art.js';
import { makeShareImage, shareUrl, download, copyText, canShareFile } from './share.js';
import { DEMO_GONE } from './demo.js';
import { sfx } from './sound.js';

const KIND_OPTS = [{ value: '', label: '不限' }, { value: 'dog', label: '狗狗', icon: 'dog' }, { value: 'cat', label: '貓咪', icon: 'cat' }];
const bar = (app, ...right) => el('header', { class: 'bar' }, iconBtn('back', '返回', { onclick: app.back }), el('div', { class: 'bar-r' }, right));

/* ============================== 圖鑑 ============================== */
const B = { f: { area: '', kind: '', age: '', sex: '', body: '', sid: '', photo: false }, sort: 'open', page: 1 };

export function bookView(app) {
  const count = el('span', { class: 'count', 'aria-live': 'polite' });
  const leaf = el('div', { class: 'leaf' }), grid = el('div', { class: 'grid' });
  const pageNo = el('span', { class: 'pno' });
  const prev = iconBtn('left', '上一頁', { onclick: () => turn(-1) }), next = iconBtn('right', '下一頁', { onclick: () => turn(1) });
  const change = (k, v) => { B.f[k] = v; B.page = 1; render(); };

  const sArea = select({ label: '地區', options: [], value: B.f.area, onChange: v => { B.f.area = v; B.f.sid = ''; B.page = 1; fillOptions(); render(); } });
  const sShelter = select({ label: '收容所', options: [], value: B.f.sid, onChange: v => change('sid', v) });
  const sKind = segmented({ label: '動物類型', options: [...KIND_OPTS, { value: 'other', label: '其他', icon: 'paw' }], value: B.f.kind, onChange: v => change('kind', v) });
  const sAge = select({ label: '年齡', options: [{ value: '', label: '年齡不限' }, { value: 'child', label: '幼年' }, { value: 'adult', label: '成年' }], value: B.f.age, onChange: v => change('age', v) });
  const sSex = select({ label: '性別', options: [{ value: '', label: '性別不限' }, { value: 'M', label: '公' }, { value: 'F', label: '母' }], value: B.f.sex, onChange: v => change('sex', v) });
  const sBody = select({ label: '體型', options: [{ value: '', label: '體型不限' }, { value: 'S', label: '小型' }, { value: 'M', label: '中型' }, { value: 'L', label: '大型' }], value: B.f.body, onChange: v => change('body', v) });
  const cPhoto = checkbox({ label: '有照片', checked: B.f.photo, onChange: v => change('photo', v) });
  const sSort = select({ label: '排序', options: [{ value: 'open', label: '最新開放認養' }, { value: 'update', label: '最近更新' }], value: B.sort, onChange: v => { B.sort = v || 'open'; B.page = 1; render(); } });
  sSort.set(B.sort);

  function fillOptions() {
    sArea.setOptions([{ value: '', label: '全台' }, ...search.areas(state.animals)]);
    sShelter.setOptions([{ value: '', label: '全部收容所' }, ...search.shelters(state.animals, B.f.area)]);
    sArea.set(B.f.area); sShelter.set(B.f.sid);
  }
  const pageSize = () => { const w = leaf.clientWidth || innerWidth; const cols = w < 520 ? 2 : w < 860 ? 3 : w < 1100 ? 4 : 6; leaf.style.setProperty('--cols', cols); leaf.classList.toggle('spread', cols >= 4); return cols === 2 ? 8 : 12; };

  let res = null, lastSize = 0;
  function render(dir = 0) {
    const size = lastSize = pageSize();
    grid.setAttribute('aria-busy', String(!state.ready));
    if (!state.ready) {
      count.textContent = '';
      grid.replaceChildren(...Array.from({ length: size }, () => el('div', { class: 'tile tile--sk' }, el('div', { class: 'tile-ph' }), el('div', { class: 'tile-cap' }))));
      pageNo.textContent = ''; prev.disabled = next.disabled = true; return;
    }
    const list = search.sort(search.filter(state.animals, B.f, state.today), B.sort, state.today);
    res = search.paginate(list, B.page, size); B.page = res.page;
    count.textContent = `${res.total.toLocaleString()} 位${state.complete ? '' : '，載入中'}`;
    pageNo.textContent = `${res.page} / ${res.pages}`;
    prev.disabled = res.page <= 1; next.disabled = res.page >= res.pages;
    const fill = () => {
      if (!res.items.length) {
        grid.replaceChildren(el('div', { class: 'empty' }, el('div', { html: emptySVG() }), el('p', { text: state.complete ? '沒有符合條件的朋友。' : '還在載入，請稍候。' }),
          el('button', { type: 'button', class: 'ghost', text: '清除條件', onclick: reset })));
      } else grid.replaceChildren(...res.items.map(a => tile(a, statusOf(a, state.today), { fav: app.favs.get(a.id) })));
    };
    if (dir && !reduced()) {
      sfx('page');
      grid.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateX(${-dir * 26}px) rotateY(${dir * 8}deg)` }], { duration: 130, easing: 'ease-in' }).finished.then(() => {
        fill(); leaf.scrollIntoView({ block: 'nearest' });
        grid.animate([{ opacity: 0, transform: `translateX(${dir * 26}px) rotateY(${-dir * 8}deg)` }, { opacity: 1, transform: 'none' }], { duration: 200, easing: 'cubic-bezier(.2,.9,.3,1)' });
      });
    } else fill();
  }
  function reset() { Object.assign(B.f, { area: '', kind: '', age: '', sex: '', body: '', sid: '', photo: false }); B.page = 1; [sAge, sSex, sBody].forEach(s => s.set('')); sKind.set(''); cPhoto.set(false); fillOptions(); render(); }
  function turn(d) { if (!res || B.page + d < 1 || B.page + d > res.pages) return; B.page += d; render(d); }

  grid.addEventListener('click', e => { const t = e.target.closest('.tile[data-id]'); if (t) app.go('a/' + t.dataset.id); });
  // 觸控：左右滑翻頁
  let sw = null;
  leaf.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') sw = { x: e.clientX, y: e.clientY }; });
  leaf.addEventListener('pointerup', e => { if (!sw) return; const dx = e.clientX - sw.x, dy = e.clientY - sw.y; sw = null; if (Math.abs(dx) > 56 && Math.abs(dy) < 44) turn(dx < 0 ? 1 : -1); });
  leaf.addEventListener('pointercancel', () => { sw = null; });
  const onKey = e => { if (e.target.closest?.('.pop,.seg,.modal')) return; if (e.key === 'ArrowLeft') turn(-1); if (e.key === 'ArrowRight') turn(1); };
  document.addEventListener('keydown', onKey);
  const off = subscribe(() => { fillOptions(); render(); });
  const ro = new ResizeObserver(() => { if (pageSize() !== lastSize) render(); });

  leaf.append(grid, el('div', { class: 'pager' }, prev, pageNo, next));
  const root = el('section', { class: 'book', 'aria-label': '動物圖鑑' },
    bar(app, count),
    el('div', { class: 'filters' }, sArea.el, sKind.el, sAge.el, sSex.el, sBody.el, sShelter.el, cPhoto.el, sSort.el),
    leaf);
  queueMicrotask(() => { fillOptions(); render(); ro.observe(leaf); });
  return { el: root, destroy() { off(); ro.disconnect(); document.removeEventListener('keydown', onKey); } };
}

/* ============================== 我的相遇紀錄 ============================== */
export function albumView(app) {
  const grid = el('div', { class: 'grid' });
  function render() {
    const demo = state.mode === 'demo';
    let list = app.favs.list().filter(f => !!f.demo === demo);
    if (demo) list = [...list, DEMO_GONE];
    if (!list.length) return grid.replaceChildren(el('div', { class: 'empty' }, el('div', { html: emptySVG() }), el('p', { text: '還沒有收藏的相遇。' })));
    grid.replaceChildren(...list.map((f, i) => {
      const a = state.byId.get(f.id);
      const t = a ? tile(a, statusOf(a, state.today), { fav: f }) : state.complete ? goneTile(f) : el('div', { class: 'tile tile--sk' }, el('div', { class: 'tile-ph' }), el('div', { class: 'tile-cap' }));
      t.style.setProperty('--rot', ((i * 37) % 5 - 2) * 0.7 + 'deg');
      return t;
    }));
  }
  grid.addEventListener('click', e => { const t = e.target.closest('.tile[data-id]'); if (t) app.go('a/' + t.dataset.id); });
  const off = subscribe(render);
  render();
  return { el: el('section', { class: 'book album', 'aria-label': '我的相遇紀錄' }, bar(app), el('div', { class: 'leaf', style: '--cols:' + (innerWidth < 520 ? 2 : innerWidth < 860 ? 3 : 4) }, grid)), destroy: off };
}

/* ============================== 動物故事頁 ============================== */
export function detailView(app, id) {
  const body = el('div', { class: 'detail' });
  const root = el('section', { class: 'dpage', 'aria-label': '動物介紹' }, body);
  let alive = true;
  const fav0 = app.favs.get(id);

  function loading() { body.replaceChildren(bar(app), el('div', { class: 'd-load', 'aria-busy': 'true' }, el('i'), el('i'), el('i'))); }

  function gone(err) {
    const f = fav0 || (state.mode === 'demo' && id === DEMO_GONE.id ? DEMO_GONE : null);
    body.replaceChildren(bar(app), el('div', { class: 'd-gone' },
      el('div', { html: emptySVG() }),
      el('h1', { text: err ? '現在連不上官方資料，無法確認這位朋友的狀態。' : '目前無法在最新公開資料中找到這位朋友。' }),
      el('p', { text: err ? '請稍後再試，或直接向收容所確認。' : '牠可能已經離開收容所，或資料有所變更。實際情況請向收容所確認。' }),
      f && el('dl', { class: 'facts' },
        f.shelter && el('div', {}, el('dt', { text: '收容所' }), el('dd', { text: f.shelter })),
        f.sub && el('div', {}, el('dt', { text: '收容編號' }), el('dd', { text: f.sub })),
        f.tel && el('div', {}, el('dt', { text: '電話' }), el('dd', {}, el('a', { href: 'tel:' + f.tel.replace(/[^\d+]/g, ''), text: f.tel })))),
      el('div', { class: 'd-gone-btns' },
        el('a', { class: 'ghost', href: OFFICIAL, target: '_blank', rel: 'noopener noreferrer', html: icon('ext') }, el('span', { text: '官方認養查詢' })),
        fav0 && el('button', { type: 'button', class: 'ghost', text: '從小冊子拿下來', onclick: async () => { if (await confirmBox('要把這次相遇從小冊子拿下來嗎？', { ok: '拿下來' })) { app.favs.remove(id); app.favChanged(); app.back(); } } }))));
  }

  function show(a) {
    const st = statusOf(a, state.today);
    const blk = block(a, { fav: app.favs.get(a.id), w: 900 });
    const saveBtn = iconBtn('bookmarkO', '收藏這次相遇', { 'aria-pressed': 'false', onclick: () => { const on = app.toggleFav(a); paintSave(); setStamp(blk, app.favs.get(a.id), on); toast(on ? LINES.saved : LINES.unsaved); } });
    const paintSave = () => { const on = app.favs.has(a.id); saveBtn.innerHTML = icon(on ? 'bookmark' : 'bookmarkO'); saveBtn.setAttribute('aria-pressed', String(on)); saveBtn.classList.toggle('on', on); };
    paintSave();
    const where = a.shelter.startsWith(a.county) || !a.county ? a.shelter : `${a.county}的${a.shelter}`;
    const fact = (k, v) => v && el('div', {}, el('dt', { text: k }), el('dd', { text: v }));
    const more = el('ul', { class: 'before', hidden: true, id: 'before' }, BEFORE.map(([ic, t]) => el('li', { html: icon(ic) }, el('span', { text: t }))));
    const moreBtn = el('button', { type: 'button', class: 'disc', 'aria-expanded': 'false', 'aria-controls': 'before', onclick: () => { more.hidden = !more.hidden; moreBtn.setAttribute('aria-expanded', String(!more.hidden)); } }, el('span', { text: '帶牠回家之前' }), el('i', { html: icon('down') }));

    body.replaceChildren(
      bar(app, saveBtn, iconBtn('share', '分享這位朋友', { onclick: () => openShare(a) })),
      el('div', { class: 'd-cols' },
        el('div', { class: 'd-hero' }, blk),
        el('div', { class: 'd-text' },
          el('h1', { text: title(a) }),
          tags(a, st),
          el('div', { class: 'story' },
            el('p', { text: `牠目前在${where}。` }),
            el('p', { text: `牠是一隻${a.age ? AGE[a.age] + '的' : ''}${a.colour || ''}${KIND[a.kind]}。` }),
            st === 'open' && el('p', { text: `自 ${fmtDate(a.open)} 開放認養。` }),
            st === 'upcoming' && el('p', { text: `預計 ${fmtDate(a.open)} 起開放認養，實際情況以收容所為準。` }),
            st === 'unknown' && el('p', { text: '開放認養的日期沒有登記，請向收容所確認。' }),
            st === 'closed' && el('p', { text: '牠目前不在開放認養的名單中，請向收容所確認。' }),
            !a.remark && el('p', { text: '想知道牠的個性嗎？可以向收容所詢問。' })),
          a.remark && el('figure', { class: 'remark' }, el('blockquote', { text: a.remark }), el('figcaption', { text: '收容所備註（農業部公開資料原文）' })),
          el('section', { class: 'shelter', 'aria-label': '我想進一步認識牠' },
            el('h2', { text: a.shelter }),
            a.addr && el(a.demo ? 'p' : 'a', { class: 'row', href: a.demo ? null : 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(a.addr), target: '_blank', rel: 'noopener noreferrer', html: icon('pin') }, el('span', { text: a.addr })),
            a.tel && el('a', { class: 'row', href: 'tel:' + a.tel.replace(/[^\d+]/g, ''), html: icon('phone') }, el('span', { text: a.tel })),
            !a.demo && el('a', { class: 'row', href: OFFICIAL, target: '_blank', rel: 'noopener noreferrer', html: icon('ext') }, el('span', { text: '官方認養查詢' })),
            el('button', { type: 'button', class: 'row', html: icon('copy'), 'aria-label': `複製收容編號 ${a.sub}`, onclick: async () => toast((await copyText(a.sub)) ? '已複製收容編號' : '無法複製，請手動選取') }, el('span', { class: 'mono', text: a.sub })),
            el('p', { class: 'hint', text: a.demo ? '展示模式／非真實認養資料' : '聯絡收容所或在官方網站查詢時，請提供這組收容編號。認養需本人到收容所辦理。' })),
          moreBtn, more,
          el('dl', { class: 'facts' },
            fact('性別', SEX[a.sex] || '未登記'), fact('年齡', AGE[a.age] || '未登記'), fact('體型', BODY[a.body] || '未登記'),
            fact('毛色', a.colour), fact('品種登記', a.variety), fact('絕育', STER[a.ster] || '未登記'),
            fact('尋獲地', a.found), fact('資料更新', fmtDate(a.update))),
          el('p', { class: 'src' }, el('span', { text: a.demo ? '展示模式／非真實認養資料' : '資料來源：' }), !a.demo && el('a', { href: SOURCE, target: '_blank', rel: 'noopener noreferrer', text: '農業部動物認領養開放資料' }),
            state.fetchedAt ? el('span', { text: `　取得於 ${describe(state.fetchedAt)}` }) : null))));
  }

  (async () => {
    let a = state.byId.get(id);
    if (!a) {
      loading();
      try { a = await lookup(id); } catch (e) { if (alive) gone(e); return; }
    }
    if (!alive) return;
    a ? show(a) : gone();
  })();
  return { el: root, destroy() { alive = false; } };
}

/* ============================== 分享 ============================== */
export function openShare(a) {
  const url = shareUrl(a);
  const pic = el('div', { class: 'share-pic', 'aria-busy': 'true' });
  const dl = iconBtn('download', '儲存圖片', { disabled: true }), sh = iconBtn('share', '分享', { disabled: true, hidden: true });
  const cp = iconBtn('link', '複製連結', { 'data-focus': true, onclick: async () => toast((await copyText(url)) ? '已複製連結' : '無法複製連結') });
  const m = modal(el('div', { class: 'share' }, pic, el('div', { class: 'share-btns' }, dl, sh, cp), iconBtn('close', '關閉', { class: 'x', onclick: () => m.close() })), { label: '分享這位朋友', cls: 'modal-box--share' });
  makeShareImage(a).then(({ blob, photo }) => {
    const src = URL.createObjectURL(blob);
    pic.replaceChildren(el('img', { src, alt: `${title(a)}的相遇紀念卡`, draggable: 'false' }));
    pic.removeAttribute('aria-busy');
    m.closed.then(() => URL.revokeObjectURL(src));
    if (a.photo && !photo) toast('照片無法匯出，分享圖改用插圖。');
    const name = `encounter-${a.id}.png`, file = new File([blob], name, { type: 'image/png' });
    dl.disabled = false; dl.onclick = () => download(blob, name);
    const text = `${title(a)}｜${a.shelter}｜收容編號 ${a.sub}`;
    if (canShareFile(file)) { sh.hidden = false; sh.disabled = false; sh.onclick = () => navigator.share({ files: [file], title: '小小相遇所', text, url }).catch(() => {}); }
    else if (navigator.share) { sh.hidden = false; sh.disabled = false; sh.onclick = () => navigator.share({ title: '小小相遇所', text, url }).catch(() => {}); }
  }).catch(() => { pic.removeAttribute('aria-busy'); pic.replaceChildren(el('p', { text: '分享圖製作失敗，仍可複製連結。' })); });
}

/* ============================== 相遇條件（牌子） ============================== */
export function openFilter(filter, onDone) {
  const f = { ...filter };
  const kind = segmented({ label: '動物類型', options: KIND_OPTS, value: f.kind, onChange: v => { f.kind = v; } });
  const area = select({ label: '全台', options: [{ value: '', label: '全台' }, ...search.areas(state.animals)], value: f.area, onChange: v => { f.area = v; } });
  let m;
  m = modal(el('div', { class: 'cond' }, kind.el, area.el,
    el('button', { type: 'button', class: 'primary', 'data-focus': true, html: icon('check'), 'aria-label': '完成', onclick: () => m.close(true) })), { label: '相遇條件' });
  m.closed.then(ok => { if (ok) onDone(f); });
}

/* ============================== 關於 ============================== */
export function aboutView(app) {
  const p = t => el('p', { text: t });
  const mode = { live: '農業部開放資料（即時）', snapshot: '農業部開放資料（每日快照）', cache: '農業部開放資料（瀏覽器快取）', stale: '較早取得的農業部資料（目前連不上官方）', demo: '展示模式／非真實認養資料', loading: '載入中' }[state.mode];
  return {
    el: el('section', { class: 'dpage about', 'aria-label': '關於本站' }, el('div', { class: 'detail' }, bar(app),
      el('div', { class: 'about-in' },
        el('h1', { text: '小小相遇所' }),
        p('每一顆轉蛋裡，是一隻真正在台灣收容所等待被認識的動物。'),
        p('這裡不是收容所，也無法線上認養。認養需要本人到收容所，依正式程序辦理。'),
        p('每一隻動物被抽到的機會完全相同；沒有稀有度，也不依外表排序。'),
        p('動物資訊與照片皆來自官方公開資料原文，本站不推測個性、不編寫身世。資料消失不代表已被認養。'),
        el('dl', { class: 'facts' },
          el('div', {}, el('dt', { text: '目前資料' }), el('dd', { text: mode })),
          state.fetchedAt ? el('div', {}, el('dt', { text: '取得時間' }), el('dd', { text: describe(state.fetchedAt) })) : null,
          el('div', {}, el('dt', { text: '動物數量' }), el('dd', { text: state.animals.length.toLocaleString() }))),
        el('div', { class: 'about-links' },
          el('a', { class: 'ghost', href: SOURCE, target: '_blank', rel: 'noopener noreferrer', html: icon('ext') }, el('span', { text: '農業部動物認領養開放資料' })),
          el('a', { class: 'ghost', href: OFFICIAL, target: '_blank', rel: 'noopener noreferrer', html: icon('ext') }, el('span', { text: '官方認養查詢' })),
          el('a', { class: 'ghost', href: state.mode === 'demo' ? location.pathname : '?demo=1' }, el('span', { text: state.mode === 'demo' ? '離開展示模式' : '展示模式' })))))),
    destroy() {},
  };
}
