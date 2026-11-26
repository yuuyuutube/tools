// A book taken off the shelf: the cover, the blurb, and what you can do with it.
import { h } from '../engine/dom.js';
import { Disposer } from '../engine/disposer.js';
import { MenuOverlay } from '../engine/ui.js';
import { byId } from './registry.js';
import { librarySounds } from './sounds.js';

export class BookPage {
  constructor(app, { id }) {
    this.app = app;
    this.book = byId(id);
    this.d = new Disposer();
    this.audio = app.audio.scope();
    this.d.add(() => this.audio.dispose(0.2));
    this.panel = null;
  }

  async enter(root) {
    this.root = root;
    root.className = 'view bookpage';
    root.innerHTML = '';
    const b = this.book;
    this.m = (await b.load()).default;
    const T = this.m.text.book;
    const rec = this.app.progress.story(b.id);
    const cover = h('div', { class: 'bp-cover', html: b.cover({ id: 'bp' }) });
    const text = h(
      'div',
      { class: 'bp-text' },
      h('div', { class: 'bp-num' }, b.number),
      h('h1', { class: 'bp-title' }, T.title),
      h('div', { class: 'bp-en' }, T.titleEn),
      h('div', { class: 'bp-meta' }, T.meta),
      h('pre', { class: 'bp-blurb' }, T.blurb),
      rec && rec.completed ? h('p', { class: 'bp-done' }, T.done) : null,
    );
    this.list = h('ul', { class: 'bp-options', role: 'listbox' });
    text.append(this.list);
    root.append(h('div', { class: 'bp-wrap' }, cover, text), h('footer', { class: 'lib-foot' }, h('span', {}, '轉動　選擇'), h('span', {}, '按下　確定'), h('span', {}, '長按　回到書架')));
    this.buildOptions(rec);
    requestAnimationFrame(() => root.classList.add('in'));
  }

  buildOptions(rec) {
    const m = this.m;
    const opts = [];
    const ch = rec ? rec.chapter || 0 : 0;
    const finishedHere = rec && rec.completed && ch >= m.chapters.length - 1;
    const started = rec && !finishedHere && (ch > 0 || Object.keys(rec.scenes || {}).length > 0);
    if (!started) opts.push({ label: finishedHere ? '再讀一次' : '開始閱讀', act: () => this.read(0, true) });
    else {
      const c = m.chapters[ch];
      opts.push({ label: `繼續閱讀　${c.card.num === '終' ? '終章' : `第${c.card.num}章`}　${c.card.title}`, act: () => this.read(ch, false) });
      opts.push({ label: '從頭開始', act: () => this.read(0, true) });
    }
    if (rec && rec.keepsake) opts.push({ label: m.text.book.keepsakeLabel, act: () => this.openKeepsake() });
    opts.push({ label: '回到書架', act: () => this.back() });
    this.opts = opts;
    this.index = 0;
    this.acc = 0;
    this.list.innerHTML = '';
    this.rows = opts.map((o, i) => {
      const li = h('li', { role: 'option' }, o.label);
      li.addEventListener('click', () => {
        this.index = i;
        this.refresh();
        o.act();
      });
      this.list.append(li);
      return li;
    });
    this.refresh();
  }

  refresh() {
    this.rows.forEach((li, i) => {
      li.classList.toggle('active', i === this.index);
      li.setAttribute('aria-selected', String(i === this.index));
    });
  }

  get sounds() {
    if (!this._s || !this._s.step) this._s = librarySounds(this.app.audio);
    return this._s;
  }

  read(chapter, fresh) {
    if (fresh) this.app.progress.restartStory(this.book.id);
    this.app.go('read', { id: this.book.id, chapter });
  }

  back() {
    this.app.go('library', { id: this.book.id });
  }

  rotate(deg) {
    if (this.panel) return this.panel.rotate(deg);
    this.acc += deg;
    const n = Math.trunc(this.acc / 30);
    if (!n) return;
    this.acc -= n * 30;
    const next = Math.max(0, Math.min(this.opts.length - 1, this.index + n));
    if (next !== this.index) {
      this.index = next;
      this.refresh();
      this.audio.play(this.sounds.step, { gain: 0.5, rate: 1.2 });
    } else this.audio.play(this.sounds.limit, { gain: 0.4, rate: 1.3 });
  }

  press(kind) {
    if (this.panel) return this.panel.press(kind);
    if (kind === 'long') return this.back();
    this.opts[this.index].act();
  }

  async openKeepsake() {
    const rec = this.app.progress.story(this.book.id);
    const ks = this.m.keepsake;
    const T = this.m.text.book;
    const canvas = await ks.photo(rec.keepsake, { width: 960 });
    const fig = h('figure', { class: 'ks-photo' }, canvas, h('figcaption', {}, ks.caption(rec.keepsake, this.app.progress.settings)));
    const items = [
      { label: T.downloadPhoto, action: () => ks.download(rec.keepsake, this.app.progress.settings, 'photo') },
      { label: T.downloadCard, action: () => ks.download(rec.keepsake, this.app.progress.settings, 'card') },
      { label: '返回', action: () => this.closeKeepsake() },
    ];
    const menu = new MenuOverlay({ items, onClose: () => this.closeKeepsake(), className: 'keepsake' });
    menu.panel.prepend(fig);
    this.panel = menu;
    this.root.append(menu.el);
    requestAnimationFrame(() => menu.el.classList.add('on'));
  }

  closeKeepsake() {
    const p = this.panel;
    this.panel = null;
    if (p) {
      p.el.classList.remove('on');
      setTimeout(() => p.el.remove(), 300);
    }
  }

  frame() {}

  leave() {
    this.d.run();
  }
}
