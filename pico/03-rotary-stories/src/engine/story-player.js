// Runs one story: chapter cards, scene lifecycle, pause menu, saving.
//
// A story is a manifest (see stories/*/manifest.js) listing chapters; each chapter lazily
// imports its own scene module. The player knows nothing about any particular story.
import { h } from './dom.js';
import { Disposer } from './disposer.js';
import { MenuOverlay } from './ui.js';

export class StoryPlayer {
  constructor(app, manifest, { chapter = 0 } = {}) {
    this.app = app;
    this.m = manifest;
    this.index = Math.max(0, Math.min(manifest.chapters.length - 1, chapter));
    this.scene = null;
    this.menu = null;
    this.card = null;
    this.busy = false;
    this.d = new Disposer();
  }

  get record() {
    return this.app.progress.story(this.m.id) || {};
  }

  get shared() {
    if (!this._shared) this._shared = { ...(this.record.shared || {}) };
    return this._shared;
  }

  saveShared() {
    this.app.progress.updateStory(this.m.id, { shared: this.shared });
  }

  async enter(root) {
    this.root = root;
    root.innerHTML = '';
    root.className = `view story story-${this.m.slug}`;
    this.stage = h('div', { class: 'story-stage' });
    this.hintEl = h('div', { class: 'story-hint', 'aria-live': 'polite' });
    root.append(this.stage, this.hintEl);
    if (this.m.stylesheet) this.d.add(this.app.useStylesheet(this.m.stylesheet));
    this.d.on(window, 'pagehide', () => this.persist());
    this.d.on(window, 'resize', () => this.scene && this.scene.resize());
    await this.startChapter(this.index, { card: true });
  }

  chapter(i = this.index) {
    return this.m.chapters[i];
  }

  persist() {
    if (!this.scene) return;
    let state = null;
    try {
      state = this.scene.saveState();
    } catch (err) {
      console.warn(err);
    }
    this.app.progress.updateStory(this.m.id, { chapter: this.index, scenes: { [this.chapter().id]: state }, shared: this.shared });
  }

  async startChapter(i, { card = true } = {}) {
    this.busy = true;
    if (this.scene) {
      this.persist();
      this.scene.leave();
      this.scene = null;
    }
    this.index = i;
    this.app.progress.updateStory(this.m.id, { chapter: i });
    const ch = this.chapter();
    this.hint(null);
    this.app.captions.clear();
    this.stage.innerHTML = '';
    const sceneRoot = h('div', { class: `scene scene-${ch.id}` });
    this.stage.append(sceneRoot);
    if (card && ch.card) this.showCard(ch.card);
    const mod = await ch.load();
    const SceneClass = mod.default;
    const audio = this.app.audio.scope();
    const ctx = {
      app: this.app,
      player: this,
      root: sceneRoot,
      knob: this.app.knob,
      core: this.app.audio,
      audio,
      text: this.m.text,
      chapter: ch,
      state: this.app.progress.sceneState(this.m.id, ch.id),
      shared: this.shared,
      saveShared: () => this.saveShared(),
      settings: this.app.progress.settings,
      reduced: () => this.app.reducedMotion,
      hint: (t) => this.hint(t),
      caption: (t, hold) => this.app.captions.show(t, hold),
      next: () => this.next(),
      finish: (patch) => this.finish(patch),
      toLibrary: () => this.app.go('book', { id: this.m.id }),
    };
    this.scene = new SceneClass(ctx);
    await this.scene.enter();
    this.busy = false;
  }

  showCard(card) {
    const title = h(
      'div',
      { class: 'cc-block' },
      h('div', { class: 'cc-num' }, card.num),
      h('div', { class: 'cc-title' }, card.title),
      h('div', { class: 'cc-en' }, card.en),
      h('div', { class: 'cc-when' }, card.when),
    );
    const el = h('div', { class: 'chapter-card' });
    this.root.append(el);
    let hold = this.app.reducedMotion ? 2000 : 3400;
    // A prelude: log lines, one every two seconds, on black, before the title.
    if (card.prelude && card.prelude.length) {
      const pre = h('div', { class: 'cc-prelude' });
      el.append(pre);
      card.prelude.forEach((line, i) => this.d.timeout(() => pre.append(h('div', { class: 'cc-line' }, line)), 600 + i * 2000));
      const t = 600 + card.prelude.length * 2000 + 1600;
      this.d.timeout(() => {
        pre.classList.add('out');
        this.d.timeout(() => {
          pre.remove();
          el.append(title);
        }, 900);
      }, t);
      hold += t + 900;
    } else el.append(title);
    this.card = el;
    const hide = () => {
      if (this.card !== el) return;
      this.card = null;
      el.classList.add('out');
      setTimeout(() => el.remove(), 1400);
    };
    el.hide = hide;
    this.d.timeout(hide, hold);
  }

  hint(text) {
    if (!this.hintEl) return;
    if (!text) {
      this.hintEl.classList.remove('on');
      return;
    }
    this.hintEl.textContent = text;
    this.hintEl.classList.add('on');
  }

  rotate(deg, info) {
    if (this.menu) return this.menu.rotate(deg, info);
    if (this.busy || !this.scene) return;
    this.scene.rotate(deg, info);
  }

  press(kind) {
    if (this.menu) return this.menu.press(kind);
    if (this.card) {
      this.card.hide();
      return;
    }
    if (this.busy || !this.scene) return;
    const handled = this.scene.press(kind);
    if (!handled && kind === 'long') this.openMenu();
  }

  frame(dt, t) {
    if (this.scene && !this.busy) this.scene.frame(dt, t);
  }

  openMenu() {
    const app = this.app;
    const s = app.progress.settings;
    const ch = this.chapter();
    const items = [
      { id: 'resume', label: '繼續', action: () => this.closeMenu() },
      ch.final ? null : { id: 'next', label: '前往下一處', action: () => this.closeMenu().then(() => this.next()) },
      { id: 'library', label: '回到圖書館', action: () => this.closeMenu().then(() => app.go('book', { id: this.m.id })) },
      { id: 'captions', label: '字幕', value: () => (s.captions ? '開' : '關'), action: () => app.setCaptions(!s.captions) },
      { id: 'volume', label: '音量', value: () => String(Math.round(s.volume * 100)), adjust: (n) => app.setVolume(s.volume + n * 0.05) },
    ].filter(Boolean);
    this.menu = new MenuOverlay({ title: '暫離', items, onClose: () => this.closeMenu() });
    this.root.append(this.menu.el);
    requestAnimationFrame(() => this.menu && this.menu.el.classList.add('on'));
  }

  closeMenu() {
    const m = this.menu;
    this.menu = null;
    if (m) {
      m.el.classList.remove('on');
      setTimeout(() => m.el.remove(), 300);
    }
    return Promise.resolve();
  }

  async next() {
    if (this.busy) return;
    this.busy = true;
    if (this.scene && this.scene.beforeNext) {
      try {
        await this.scene.beforeNext();
      } catch (err) {
        console.warn(err);
      }
    }
    this.busy = false;
    const i = this.index + 1;
    if (i >= this.m.chapters.length) return this.finish();
    await this.startChapter(i, { card: true });
  }

  finish(patch = {}) {
    this.app.progress.updateStory(this.m.id, { completed: true, completedAt: Date.now(), ...patch });
  }

  leave() {
    this.persist();
    if (this.scene) this.scene.leave();
    this.scene = null;
    this.menu = null;
    this.d.run();
    this.app.captions.clear();
  }
}
