// A drum of entries turning past a fixed red index — the same index as on the safe dial.
// Position is a spring: each detent moves the target by one row, the drum overshoots a hair
// and settles, which is what makes menu travel feel like a precision mechanism.

const K = 300; // stiffness
const C = 27; // damping (slightly under-damped: a small, quick settle)

export class RotaryList {
  constructor({ items, index = 0, render, onSelect, onFocus, onBump, itemH = 58, className = '' }) {
    this.items = items;
    this.index = Math.max(0, Math.min(items.length - 1, index));
    this.f = this.index;
    this.v = 0;
    this.render = render;
    this.onSelect = onSelect || (() => {});
    this.onFocus = onFocus || (() => {});
    this.onBump = onBump || (() => {});
    this.itemH = itemH;
    this.el = document.createElement('div');
    this.el.className = `rlist ${className}`;
    this.el.innerHTML = '<div class="rlist-band"><i></i></div><div class="rlist-track"></div>';
    this.track = this.el.querySelector('.rlist-track');
    this.el.style.setProperty('--row', `${itemH}px`);
    this.build();
    this.attachPointer();
  }

  build() {
    this.track.innerHTML = '';
    this.rows = this.items.map((item, i) => {
      const row = document.createElement('div');
      row.className = 'rrow';
      row.innerHTML = this.render(item, i);
      row.addEventListener('click', () => {
        if (this.dragged) return;
        if (i === this.index) this.onSelect(this.index, this.items[this.index]);
        else this.focus(i, true);
      });
      this.track.appendChild(row);
      return row;
    });
    this.layoutRows(true);
  }

  refresh(items = this.items) {
    this.items = items;
    this.index = Math.min(this.index, items.length - 1);
    this.build();
  }

  get current() {
    return this.items[this.index];
  }

  // Returns the number of rows actually moved.
  move(steps) {
    const before = this.index;
    const next = Math.max(0, Math.min(this.items.length - 1, this.index + steps));
    if (next === before) {
      this.v += Math.sign(steps) * 7;
      this.onBump();
      return 0;
    }
    this.index = next;
    this.onFocus(this.index, this.items[this.index], next - before);
    return next - before;
  }

  focus(i, fromPointer = false) {
    const d = i - this.index;
    this.index = i;
    this.onFocus(i, this.items[i], d, fromPointer);
  }

  frame(dt) {
    const s = Math.min(dt, 50) / 1000;
    const a = K * (this.index - this.f) - C * this.v;
    this.v += a * s;
    this.f += this.v * s;
    if (Math.abs(this.index - this.f) < 0.001 && Math.abs(this.v) < 0.01) {
      this.f = this.index;
      this.v = 0;
    }
    this.layoutRows();
  }

  layoutRows(force = false) {
    if (!force && this.lastF === this.f && this.lastI === this.index) return;
    this.lastF = this.f;
    this.lastI = this.index;
    const h = this.itemH;
    for (let i = 0; i < this.rows.length; i++) {
      const d = i - this.f;
      const row = this.rows[i];
      const ad = Math.abs(d);
      if (ad > 7) {
        if (row.style.visibility !== 'hidden') row.style.visibility = 'hidden';
        continue;
      }
      row.style.visibility = 'visible';
      // Rows curve away from the reading line like labels on a drum.
      const angle = Math.max(-70, Math.min(70, d * -11));
      row.style.transform = `translate3d(0, ${d * h}px, 0) rotateX(${angle}deg)`;
      row.style.opacity = String(Math.max(0, 1 - ad * 0.2));
      row.classList.toggle('focus', i === this.index);
    }
  }

  // Touch / mouse drag up and down the drum.
  attachPointer() {
    let start = null;
    this.el.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      start = { y: e.clientY, acc: 0, id: e.pointerId };
      this.dragged = false;
    });
    this.el.addEventListener('pointermove', (e) => {
      if (!start || e.pointerId !== start.id) return;
      const dy = e.clientY - start.y;
      if (!this.dragged && Math.abs(dy) < 8) return;
      if (!this.dragged) {
        this.dragged = true;
        try {
          this.el.setPointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      start.y = e.clientY;
      start.acc += dy;
      const steps = Math.trunc(-start.acc / (this.itemH * 0.8));
      if (steps) {
        start.acc += steps * this.itemH * 0.8;
        this.onDragSteps && this.onDragSteps(steps);
      }
    });
    const end = () => {
      start = null;
      setTimeout(() => (this.dragged = false), 0);
    };
    this.el.addEventListener('pointerup', end);
    this.el.addEventListener('pointercancel', end);
  }
}
