// Small helpers for writing Bureau documents as HTML.

export const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export const pad2 = (n) => String(n).padStart(2, '0');

// One BSP-3 procedure step, e.g. R2·15. num may be a number or a placeholder string.
export function step(dir, turns, num) {
  const d = dir > 0 ? 'R' : 'L';
  const t = turns > 0 ? turns : '';
  const n = typeof num === 'number' ? pad2(num) : num;
  return `${d}${t}·${n}`;
}

export function proc(steps, { caption = '' } = {}) {
  const items = steps.map((s) => `<span class="proc-step">${s}</span>`).join('<span class="proc-sep">/</span>');
  return `<div class="proc">${caption ? `<div class="proc-cap">${caption}</div>` : ''}<div class="proc-line">${items}</div></div>`;
}

export const p = (text) => `<p>${text}</p>`;
export const note = (text) => `<p class="note">${text}</p>`;
export const redact = (w = 2) => `<span class="redact">${'█'.repeat(w)}</span>`;
export const mark = (text) => `<span class="stampmark">${text}</span>`;

export function table(rows, { cls = '' } = {}) {
  return `<table class="doc-table ${cls}">${rows
    .map((r) => `<tr>${r.map((c, i) => `<${i === 0 ? 'th' : 'td'}>${c}</${i === 0 ? 'th' : 'td'}>`).join('')}</tr>`)
    .join('')}</table>`;
}

export function memo(title, body, { cls = '', sign = '' } = {}) {
  return `<div class="memo ${cls}"><div class="memo-title">${title}</div>${body}${sign ? `<div class="memo-sign">${sign}</div>` : ''}</div>`;
}
