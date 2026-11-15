/* 自訂的表單與對話元件：下拉選單、單選、勾選、確認／提示視窗、提示條。全部不用系統原生樣式，鍵盤與觸控都能操作。 */
import { el, $$ } from './util.js';
import { icon } from './icons.js';

export function iconBtn(name, label, props = {}) {
  return el('button', { type: 'button', 'aria-label': label, title: label, html: icon(name), ...props, class: 'round ' + (props.class || '') });
}

/* ---------- 下拉選單（listbox） ---------- */
let closeOpen = null;
export function select({ label, options, value = '', onChange }) {
  let opts = options, val = value;
  const text = el('span'), btn = el('button', { type: 'button', class: 'sel', 'aria-haspopup': 'listbox', 'aria-expanded': 'false', 'aria-label': label }, text, el('i', { html: icon('down') }));
  const cur = () => opts.find(o => String(o.value) === String(val));
  const paint = () => { const c = cur(); text.textContent = c && String(val) !== '' ? c.label : label; btn.classList.toggle('on', !!c && String(val) !== ''); };
  paint();

  function open() {
    closeOpen?.();
    const sheet = innerWidth < 600;
    const list = el('div', { class: 'pop' + (sheet ? ' pop--sheet' : ''), role: 'listbox', 'aria-label': label, tabindex: '-1' });
    const scrim = sheet ? el('div', { class: 'pop-scrim' }) : null;
    opts.forEach(o => list.append(el('div', {
      class: 'opt', role: 'option', tabindex: '-1', 'aria-selected': String(String(o.value) === String(val)), data: { v: o.value },
      html: icon('check'),
    }, el('span', { text: o.label }))));
    const items = () => $$('.opt', list);
    const close = (focus = true) => {
      list.remove(); scrim?.remove(); btn.setAttribute('aria-expanded', 'false'); closeOpen = null;
      document.removeEventListener('pointerdown', outside, true); removeEventListener('resize', onResize);
      if (focus) btn.focus();
    };
    const choose = n => { val = n.dataset.v; paint(); close(); onChange?.(val); };
    const outside = e => { if (!list.contains(e.target) && !btn.contains(e.target)) close(false); };
    const onResize = () => close(false);
    list.addEventListener('click', e => { const n = e.target.closest('.opt'); if (n) choose(n); });
    list.addEventListener('keydown', e => {
      const it = items(), i = it.indexOf(document.activeElement);
      const go = j => { e.preventDefault(); it[Math.max(0, Math.min(it.length - 1, j))]?.focus(); };
      if (e.key === 'ArrowDown') go(i + 1); else if (e.key === 'ArrowUp') go(i - 1);
      else if (e.key === 'Home') go(0); else if (e.key === 'End') go(it.length - 1);
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (i >= 0) choose(it[i]); }
      else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); }
      else if (e.key === 'Tab') close(false);
    });
    if (scrim) document.body.append(scrim);
    document.body.append(list);
    if (!sheet) {
      const r = btn.getBoundingClientRect(), below = innerHeight - r.bottom - 12, above = r.top - 12, up = below < 200 && above > below;
      list.style.minWidth = Math.max(r.width, 168) + 'px';
      list.style.maxHeight = Math.min(340, up ? above : below) + 'px';
      list.style.left = Math.max(8, Math.min(r.left, innerWidth - Math.max(list.offsetWidth, 168) - 8)) + 'px';
      if (up) list.style.bottom = innerHeight - r.top + 6 + 'px'; else list.style.top = r.bottom + 6 + 'px';
    }
    btn.setAttribute('aria-expanded', 'true');
    (items().find(n => n.getAttribute('aria-selected') === 'true') || items()[0])?.focus();
    setTimeout(() => document.addEventListener('pointerdown', outside, true));
    addEventListener('resize', onResize);
    closeOpen = close;
  }
  btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' ? closeOpen?.() : open()));
  btn.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); open(); } });
  return {
    el: btn,
    get value() { return val; },
    set(v) { val = v; paint(); },
    setOptions(o) { opts = o; if (!cur()) val = ''; paint(); },
  };
}

/* ---------- 單選（一排連在一起的按鈕） ---------- */
export function segmented({ label, options, value = '', onChange }) {
  let val = value;
  const root = el('div', { class: 'seg', role: 'radiogroup', 'aria-label': label });
  const btns = options.map(o => el('button', {
    type: 'button', role: 'radio', 'aria-label': o.label, title: o.icon ? o.label : null, data: { v: o.value },
    html: o.icon ? icon(o.icon) : null, text: o.icon ? null : o.label,
  }));
  const paint = () => btns.forEach(b => { const c = b.dataset.v === String(val); b.setAttribute('aria-checked', String(c)); b.tabIndex = c ? 0 : -1; });
  const pickBtn = b => { val = b.dataset.v; paint(); b.focus(); onChange?.(val); };
  root.append(...btns); paint();
  root.addEventListener('click', e => { const b = e.target.closest('button'); if (b) pickBtn(b); });
  root.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0;
    if (!d) return;
    e.preventDefault();
    pickBtn(btns[(btns.findIndex(b => b.dataset.v === String(val)) + d + btns.length) % btns.length]);
  });
  return { el: root, get value() { return val; }, set(v) { val = v; paint(); } };
}

/* ---------- 勾選 ---------- */
export function checkbox({ label, checked = false, onChange }) {
  let val = checked;
  const btn = el('button', { type: 'button', class: 'chk', role: 'checkbox', 'aria-checked': String(val) }, el('i', { html: icon('check') }), el('span', { text: label }));
  btn.addEventListener('click', () => { val = !val; btn.setAttribute('aria-checked', String(val)); onChange?.(val); });
  return { el: btn, get value() { return val; }, set(v) { val = !!v; btn.setAttribute('aria-checked', String(val)); } };
}

/* ---------- 視窗（取代 alert / confirm） ---------- */
export function modal(content, { label = '', dismiss = true, cls = '' } = {}) {
  const prev = document.activeElement;
  const box = el('div', { class: 'modal-box ' + cls, role: 'dialog', 'aria-modal': 'true', 'aria-label': label, tabindex: '-1' }, content);
  const root = el('div', { class: 'modal' }, box);
  let done;
  const closed = new Promise(r => { done = r; });
  function close(v) {
    root.classList.remove('in');
    document.removeEventListener('keydown', key, true);
    setTimeout(() => root.remove(), 180);
    prev?.focus?.();
    done(v);
  }
  function key(e) {
    if (e.key === 'Escape' && dismiss) { e.preventDefault(); e.stopPropagation(); close(); }
    if (e.key === 'Tab') {
      const f = $$('button,a[href],[tabindex="0"]', box).filter(n => !n.disabled && n.offsetParent);
      if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && (document.activeElement === first || document.activeElement === box)) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }
  root.addEventListener('pointerdown', e => { if (e.target === root && dismiss) close(); });
  document.addEventListener('keydown', key, true);
  document.body.append(root);
  requestAnimationFrame(() => { root.classList.add('in'); (box.querySelector('[data-focus]') || box).focus(); });
  return { close, closed, box };
}

export function confirmBox(text, { ok = '好', cancel = '取消' } = {}) {
  let m;
  const body = el('div', { class: 'ask' }, el('p', { text }), el('div', { class: 'ask-btns' },
    el('button', { type: 'button', class: 'ghost', text: cancel, onclick: () => m.close(false) }),
    el('button', { type: 'button', class: 'primary', text: ok, 'data-focus': true, onclick: () => m.close(true) })));
  m = modal(body, { label: text });
  return m.closed.then(v => v === true);
}
export function alertBox(text, { ok = '好' } = {}) {
  let m;
  const body = el('div', { class: 'ask' }, el('p', { text }), el('div', { class: 'ask-btns' },
    el('button', { type: 'button', class: 'primary', text: ok, 'data-focus': true, onclick: () => m.close(true) })));
  m = modal(body, { label: text });
  return m.closed;
}

/* ---------- 提示條 ---------- */
let toastEl, toastTimer;
export function toast(text) {
  toastEl ||= document.body.appendChild(el('div', { class: 'toast', role: 'status' }));
  toastEl.textContent = text;
  toastEl.classList.remove('in'); void toastEl.offsetWidth; toastEl.classList.add('in');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => toastEl.classList.remove('in'), 2600);
}
