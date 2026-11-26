// Shared interface pieces: icons, a knob-driven menu overlay, captions and hints.
import { h, clamp } from './dom.js';
import { springStep } from '../interactions/models.js';

export const ICONS = {
  plug: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><path d="M9 3v5M15 3v5M6.5 8h11v3a5.5 5.5 0 0 1-11 0zM12 16.5V21"/></svg>',
  sound: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>',
  mute: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/></svg>',
  ccw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 15.5A7 7 0 1 0 7 7.4"/><path d="M6.5 3.5v4.2h4.2"/></svg>',
  cw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M18.5 15.5A7 7 0 1 1 17 7.4"/><path d="M17.5 3.5v4.2h-4.2"/></svg>',
  press: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="2" fill="currentColor"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6.5L4 11.5l5 5"/><path d="M4.5 11.5H14a6 6 0 0 1 0 12h-2" transform="translate(0 -3)"/></svg>',
};

// ---------------------------------------------------------------------------------------------
// A vertical list chosen with the knob. Items: { id, label, value?(), adjust?(dir), disabled?() }.
// Items with adjust() enter an adjusting state on press; turning then changes the value.

export class MenuOverlay {
  constructor({ title = '', items, onClose, className = '' }) {
    this.items = items;
    this.onClose = onClose || (() => {});
    this.index = 0;
    this.pos = 0;
    this.vel = 0;
    this.acc = 0;
    this.adjusting = false;
    this.el = h('div', { class: `menu-overlay ${className}`, role: 'dialog', 'aria-label': title || '選單' });
    this.panel = h('div', { class: 'menu-panel' });
    if (title) this.panel.append(h('div', { class: 'menu-title' }, title));
    this.list = h('ul', { class: 'menu-list', role: 'listbox' });
    this.panel.append(this.list, h('div', { class: 'menu-hint' }, '轉動　選擇　　按下　確定　　長按　關閉'));
    this.el.append(this.panel);
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el) this.close();
    });
    this.render();
    this.skipDisabled(1);
  }

  render() {
    this.list.innerHTML = '';
    this.rows = this.items.map((it, i) => {
      const li = h('li', { class: 'menu-item', role: 'option' }, h('span', { class: 'menu-label' }, it.label), h('span', { class: 'menu-value' }));
      li.addEventListener('click', () => {
        if (i === this.index) this.press('short');
        else {
          this.index = i;
          this.refresh();
        }
      });
      this.list.append(li);
      return li;
    });
    this.refresh();
  }

  refresh() {
    this.rows.forEach((li, i) => {
      const it = this.items[i];
      li.classList.toggle('active', i === this.index);
      li.classList.toggle('adjusting', i === this.index && this.adjusting);
      li.classList.toggle('disabled', Boolean(it.disabled && it.disabled()));
      li.setAttribute('aria-selected', String(i === this.index));
      li.querySelector('.menu-value').textContent = it.value ? it.value() : '';
    });
  }

  skipDisabled(dir) {
    let guard = 0;
    while (this.items[this.index].disabled && this.items[this.index].disabled() && guard++ < this.items.length) {
      this.index = clamp(this.index + dir, 0, this.items.length - 1);
      if (this.index === 0 || this.index === this.items.length - 1) dir = -dir;
    }
  }

  rotate(deg) {
    if (this.adjusting) {
      this.acc += deg;
      const n = Math.trunc(this.acc / 18);
      if (n) {
        this.acc -= n * 18;
        this.items[this.index].adjust(n);
        this.refresh();
      }
      return;
    }
    this.acc += deg;
    const n = Math.trunc(this.acc / 30);
    if (!n) return;
    this.acc -= n * 30;
    let i = this.index;
    for (let k = 0; k < Math.abs(n); k++) {
      let j = i + Math.sign(n);
      while (j >= 0 && j < this.items.length && this.items[j].disabled && this.items[j].disabled()) j += Math.sign(n);
      if (j < 0 || j >= this.items.length) break;
      i = j;
    }
    if (i !== this.index) {
      this.index = i;
      this.refresh();
      this.onMove && this.onMove();
    }
  }

  press(kind) {
    if (kind === 'long') {
      if (this.adjusting) {
        this.adjusting = false;
        this.refresh();
      } else this.close();
      return;
    }
    const it = this.items[this.index];
    if (it.disabled && it.disabled()) return;
    if (it.adjust) {
      this.adjusting = !this.adjusting;
      this.acc = 0;
      this.refresh();
      return;
    }
    if (it.action) it.action();
    this.refresh();
  }

  close() {
    this.onClose();
  }
}

// ---------------------------------------------------------------------------------------------
// Captions: text stand-ins for sound. Shown only when the reader turns them on.

export class Captions {
  constructor(el, enabled) {
    this.el = el;
    this.enabled = enabled;
    this.lines = new Map();
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) {
      this.el.innerHTML = '';
      this.lines.clear();
    }
  }

  // Same text within `hold` ms just refreshes its timer, so continuous sounds do not flood.
  show(text, hold = 2600) {
    if (!this.enabled || !text) return;
    let line = this.lines.get(text);
    if (!line) {
      line = { el: h('div', { class: 'caption-line' }, text), timer: null };
      this.el.append(line.el);
      this.lines.set(text, line);
      while (this.el.children.length > 3) {
        const first = this.el.firstChild;
        for (const [k, v] of this.lines) if (v.el === first) this.lines.delete(k);
        first.remove();
      }
    }
    clearTimeout(line.timer);
    line.timer = setTimeout(() => {
      line.el.remove();
      this.lines.delete(text);
    }, hold);
  }

  clear() {
    for (const l of this.lines.values()) clearTimeout(l.timer);
    this.lines.clear();
    this.el.innerHTML = '';
  }
}

// A bouncy scalar for small UI flourishes.
export class Spring {
  constructor(x = 0, stiffness = 220, damping = 22) {
    this.x = x;
    this.v = 0;
    this.target = x;
    this.k = stiffness;
    this.c = damping;
  }
  update(dt) {
    [this.x, this.v] = springStep(this.x, this.v, this.target, dt, this.k, this.c);
    return this.x;
  }
}
