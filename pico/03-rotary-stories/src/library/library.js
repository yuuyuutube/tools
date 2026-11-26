// The library: one shelf of books on a shallow arc. The current book faces you; the others
// turn their spines. Turning the knob moves along the shelf with a sprung settle; spinning
// fast skips ahead. Below, a thin index ring doubles as a click wheel on touch screens.
import { h, clamp } from '../engine/dom.js';
import { Disposer } from '../engine/disposer.js';
import { DetentSelector } from '../interactions/models.js';
import { attachKnobSurface } from '../interactions/knob-surface.js';
import { CATALOGUE, draftSpine } from './registry.js';
import { librarySounds } from './sounds.js';

const accel = (speed) => (speed > 900 ? 3 : speed > 520 ? 2 : 1);

export class LibraryPage {
  constructor(app, { index } = {}) {
    this.app = app;
    const last = app.progress.data.lastStory;
    const fallback = Math.max(0, CATALOGUE.findIndex((b) => b.id === last));
    this.sel = new DetentSelector({ count: CATALOGUE.length, index: index ?? fallback, stepDeg: 36, accel, stiffness: 170, damping: 19 });
    this.d = new Disposer();
    this.audio = app.audio.scope();
    this.d.add(() => this.audio.dispose(0.2));
    this.idle = 0;
  }

  enter(root) {
    root.className = 'view library';
    root.innerHTML = '';
    this.root = root;
    const mast = h(
      'header',
      { class: 'lib-mast' },
      h('div', { class: 'lib-mark' }, h('span', { class: 'lib-en' }, 'Rotary Stories'), h('span', { class: 'lib-zh' }, '旋轉式故事圖書館')),
      h('div', { class: 'lib-sub' }, h('span', {}, 'Stories you don’t just read, but turn.'), h('span', { class: 'lib-lab' }, 'WEIRD LAB / 03')),
    );
    this.shelf = h('div', { class: 'shelf', 'aria-label': '書架' });
    this.books = CATALOGUE.map((b) => {
      const ready = b.status === 'ready';
      const spine = ready ? b.spine() : draftSpine(b);
      const el = h(
        'div',
        { class: `book ${ready ? 'ready' : 'draft'}` },
        h('div', { class: 'face front', html: ready ? b.cover() : '' }),
        h('div', { class: 'face spine left', html: spine }),
        h('div', { class: 'face spine right', html: spine }),
      );
      el.addEventListener('click', () => {
        const i = CATALOGUE.indexOf(b);
        if (i === this.sel.index) this.press('short');
        else {
          this.sel.jump(i);
          this.onStep();
        }
      });
      this.shelf.append(el);
      return el;
    });
    this.info = h('div', { class: 'lib-info' });
    this.note = h('div', { class: 'lib-note', 'aria-live': 'polite' });
    this.ring = this.makeRing();
    const foot = h('footer', { class: 'lib-foot' }, h('span', {}, '轉動　瀏覽'), h('span', {}, '按下　取出'));
    root.append(mast, this.shelf, h('div', { class: 'lib-lower' }, this.info, this.ring), this.note, foot);
    this.d.add(attachKnobSurface(this.ring, this.app.knob, { pressRadius: 0.42 }));
    this.renderInfo();
    this.layout(true);
  }

  makeRing() {
    const n = CATALOGUE.length;
    const ticks = CATALOGUE.map((b, i) => {
      const a = (i / n) * 360 - 90;
      const rad = (a * Math.PI) / 180;
      const x1 = 60 + Math.cos(rad) * 46;
      const y1 = 60 + Math.sin(rad) * 46;
      const x2 = 60 + Math.cos(rad) * 54;
      const y2 = 60 + Math.sin(rad) * 54;
      return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${b.status === 'ready' ? 'tick ready' : 'tick'}"/>`;
    }).join('');
    const el = h('div', {
      class: 'lib-ring',
      role: 'slider',
      'aria-label': '書架索引：沿圓圈轉動以瀏覽',
      html: `<svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="54" class="rim"/><circle cx="60" cy="60" r="34" class="hub"/>${ticks}<g class="needle"><line x1="60" y1="60" x2="60" y2="12"/></g><circle cx="60" cy="60" r="3" class="pin"/></svg>`,
    });
    this.needle = el.querySelector('.needle');
    return el;
  }

  // Buffers can only be made once audio is unlocked by a gesture, so build them lazily.
  get sounds() {
    if (!this._sounds || !this._sounds.step) this._sounds = librarySounds(this.app.audio);
    return this._sounds;
  }

  get current() {
    return CATALOGUE[this.sel.index];
  }

  renderInfo() {
    const b = this.current;
    this.note.textContent = '';
    this.note.classList.remove('on');
    if (b.status === 'ready') {
      const rec = this.app.progress.story(b.id);
      const state = rec ? (rec.completed ? '已讀完' : '閱讀中') : '';
      this.info.innerHTML = `<div class="li-num">${b.number}</div><div class="li-title">${b.title}</div><div class="li-meta">${b.genre}　${b.length}${state ? `　<em>${state}</em>` : ''}</div>`;
    } else {
      this.info.innerHTML = `<div class="li-num">${b.number}</div><div class="li-title muted">${b.title}</div><div class="li-meta">籌備中</div>`;
    }
    this.ring.setAttribute('aria-valuenow', String(this.sel.index + 1));
    this.ring.setAttribute('aria-valuetext', `${b.number} ${b.title}`);
  }

  onStep() {
    this.idle = 0;
    this.renderInfo();
  }

  rotate(deg, info) {
    const events = this.sel.turn(deg, info);
    let stepped = false;
    for (const e of events) {
      if (e.type === 'step') {
        stepped = true;
        this.audio.play(e.index % 2 ? this.sounds.step : this.sounds.stepB, { gain: 0.7, rate: 0.96 + Math.random() * 0.08 });
      } else if (e.type === 'limit') this.audio.play(this.sounds.limit, { gain: 0.8 });
    }
    if (stepped) this.onStep();
    this.idle = 0;
  }

  press(kind) {
    if (kind !== 'short') return;
    const b = this.current;
    if (b.status !== 'ready') {
      this.note.textContent = '這本書還在寫。';
      this.note.classList.add('on');
      this.audio.play(this.sounds.limit, { gain: 0.4, rate: 1.4 });
      return;
    }
    this.audio.play(this.sounds.slide, { gain: 0.8 });
    this.books[this.sel.index].classList.add('lifting');
    this.app.go('book', { id: b.id });
  }

  frame(dt) {
    this.sel.update(dt);
    this.idle += dt;
    this.layout(false);
  }

  layout() {
    const pos = this.sel.pos;
    const w = this.shelf.clientWidth;
    const coverW = clamp(Math.min(w * 0.36, this.shelf.clientHeight * 0.62), 150, 330);
    const spineW = coverW * 0.11;
    this.shelf.style.setProperty('--cover-w', `${coverW}px`);
    this.shelf.style.setProperty('--spine-w', `${spineW}px`);
    const gap = coverW * 0.16;
    this.books.forEach((el, i) => {
      const d = i - pos;
      const ad = Math.abs(d);
      const s = Math.sign(d) || 1;
      let x;
      if (ad <= 1) x = d * (coverW / 2 + gap + spineW / 2);
      else x = s * (coverW / 2 + gap + spineW / 2 + (ad - 1) * (spineW + 8));
      const rot = clamp(d, -1, 1) * -88;
      const z = -Math.min(ad, 1) * coverW * 0.35 - Math.max(0, ad - 1) * 6;
      const breathe = i === this.sel.index && this.idle > 6 && !this.app.reducedMotion ? Math.sin((this.idle - 6) * 0.6) * 0.5 + 0.5 : 0;
      el.style.transform = `translate3d(${x}px,0,${z}px) rotateY(${rot}deg)`;
      el.style.zIndex = String(100 - Math.round(ad * 10));
      el.style.setProperty('--shade', String(clamp(ad * 0.25, 0, 0.45)));
      // Past half a turn the cover is edge-on; hide it so perspective cannot smear it.
      el.style.setProperty('--front', String(clamp(1.6 - ad * 1.6, 0, 1)));
      el.style.setProperty('--breathe', breathe.toFixed(3));
    });
    if (this.needle) this.needle.setAttribute('transform', `rotate(${(pos / CATALOGUE.length) * 360} 60 60)`);
  }

  leave() {
    this.d.run();
  }
}
