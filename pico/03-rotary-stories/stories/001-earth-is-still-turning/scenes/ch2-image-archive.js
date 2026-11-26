// 第二章　影像檔案室 — turn the year wheel of an image viewer through sixty years of one place.
//
// Rendering: layered Canvas paintings generated per year (art/earth.js), cross-faded like a slide
// projector while the wheel is between two years. Interaction: DetentSelector, one detent = one
// year; empty years on the scale are skipped with a hollow click.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { DetentSelector } from '../../../src/interactions/models.js';
import { shipSound } from '../audio/ship-sounds.js';
import { renderEntry } from '../art/earth.js';
import { e017Entries, e031Entries, CONFLICTS, DRAFT_W03 } from '../data/archive.js';

const SITES = {
  'E-017': { label: '觀測點 E-017　頭汕漁港北堤　方位 128°', entries: () => e017Entries() },
  'E-031': { label: '觀測點 E-031　汕尾溪口北岸　方位 236°', entries: () => e031Entries() },
};
const FLAG_LABEL = { B04: 'conflict', T01: 'missing', MOUNT: 'mount', W03: 'draft' };
const accel = (speed) => (speed > 1100 ? 3 : speed > 600 ? 2 : 1);

export function weatherWord(e) {
  if (e.weather === 'rain') return '雨';
  if (e.weather === 'monsoon') return '陰，東北季風';
  if (e.site === 'E-031') return '晴，退潮';
  return e.season === 'spring' ? '晴，薄霧' : e.season === 'summer' ? '晴' : e.season === 'autumn' ? '晴' : '多雲';
}

export default class ImageArchive extends Scene {
  async enter() {
    this.T = this.ctx.text.ch2;
    const shared = this.ctx.shared;
    shared.queue = shared.queue || {};
    this.site = this.state.site || 'E-017';
    this.cache = new Map();
    this.noteOpen = false;
    this.slipOpen = !this.state.slipSeen;

    const root = this.root;
    root.classList.add('archive');
    this.head1 = h('div', { class: 'vw-head1' });
    this.head2 = h('div', { class: 'vw-head2' });
    this.canvas = h('canvas', { class: 'vw-canvas', 'aria-hidden': 'true' });
    this.annot = h('div', { class: 'vw-annot', 'aria-hidden': 'true' });
    this.tags = h('div', { class: 'vw-tags' });
    this.endCard = h('pre', { class: 'vw-end' });
    this.note = h('div', { class: 'vw-note', role: 'dialog', 'aria-label': '影像附註' }, h('pre', {}));
    this.screen = h('div', { class: 'vw-screen' }, this.canvas, this.annot, this.tags, this.endCard, this.note);
    this.scale = h('div', { class: 'vw-scale' });
    this.thumb = h('div', { class: 'vw-thumb', role: 'slider', 'aria-label': '年份滾輪', html: '<div class="knurl"></div>' });
    this.knurl = this.thumb.querySelector('.knurl');
    const device = h(
      'div',
      { class: 'viewer' },
      h('div', { class: 'vw-label' }, '環境影像閱覽機　EV-2'),
      h('div', { class: 'vw-display' }, this.head1, this.head2, this.screen),
      h('div', { class: 'vw-controls' }, this.scale, this.thumb),
    );
    this.slip = h('div', { class: 'archive-slip paper' }, h('pre', {}, this.T.assignment), h('div', { class: 'slip-hint' }, '按下　收起'));
    root.append(h('div', { class: 'archive-lamp' }), device, this.slip);
    if (!this.slipOpen) this.slip.classList.add('away');

    this.loadSite(this.site, this.state.index);
    this.bindThumb();
    this.d.on(this.slip, 'click', () => this.press('short'));
    this.d.on(this.screen, 'click', (e) => {
      if (e.target.closest('.vw-note')) return;
      this.press('short');
    });
    this.startAudio();
    this.updateHint();
  }

  startAudio() {
    const core = this.ctx.core;
    if (!core.ctx) {
      const off = core.onState((ok) => {
        if (ok && !this.room) {
          off();
          this.startAudio();
        }
      });
      this.d.add(off);
      return;
    }
    this.room = this.audio.loop(shipSound(core, 'ventArchive'), { bus: 'room', gain: 0.35, fadeIn: 2 });
  }

  loadSite(site, index) {
    this.site = site;
    this.entries = SITES[site].entries();
    const count = this.entries.length + 1; // + the end card
    const start = index ?? 0;
    this.sel = new DetentSelector({
      count,
      index: clamp(start, 0, count - 1),
      stepDeg: 18,
      accel,
      stiffness: 210,
      damping: 24,
      skip: (i) => i < this.entries.length && this.entries[i].empty,
    });
    this.cache.clear();
    this.buildScale();
    this.shownIndex = -1;
    this.refreshText();
  }

  buildScale() {
    this.scale.innerHTML = '';
    const n = this.entries.length;
    this.ticks = this.entries.map((e, i) => {
      const t = h('i', { class: `tick${e.empty ? ' empty' : ''}${e.year % 10 === 0 && !(i > 0 && this.entries[i - 1].year === e.year) ? ' decade' : ''}` });
      t.style.left = `${(i / n) * 100}%`;
      if (e.year % 10 === 0 && !(i > 0 && this.entries[i - 1].year === e.year)) t.dataset.y = String(e.year);
      t.addEventListener('click', () => {
        if (e.empty) return;
        this.sel.jump(i);
        this.onIndex();
      });
      this.scale.append(t);
      return t;
    });
    this.pointer = h('b', { class: 'pointer' });
    this.scale.append(this.pointer, h('i', { class: 'tick end', style: 'left:100%' }));
  }

  bindThumb() {
    // A thumbwheel is turned by sliding a finger across its edge.
    let last = null;
    const down = (e) => {
      last = e.clientX;
      this.thumb.setPointerCapture(e.pointerId);
      this.thumb.classList.add('turning');
      e.preventDefault();
    };
    const move = (e) => {
      if (last === null) return;
      const dx = e.clientX - last;
      last = e.clientX;
      if (dx) this.ctx.knob.angle(dx * 0.9, 'pointer');
    };
    const up = () => {
      last = null;
      this.thumb.classList.remove('turning');
      for (const ev of this.sel.release()) this.handle(ev);
    };
    this.d.on(this.thumb, 'pointerdown', down);
    this.d.on(this.thumb, 'pointermove', move);
    this.d.on(this.thumb, 'pointerup', up);
    this.d.on(this.thumb, 'pointercancel', up);
  }

  get entry() {
    return this.entries[this.sel.index] || null;
  }

  get atEnd() {
    return this.sel.index >= this.entries.length;
  }

  rotate(deg, info) {
    if (this.slipOpen) return;
    if (this.noteOpen) {
      this.note.scrollTop += deg * 1.2;
      return;
    }
    this.knurlAngle = (this.knurlAngle || 0) + deg;
    for (const ev of this.sel.turn(deg, info)) this.handle(ev);
  }

  handle(ev) {
    const core = this.ctx.core;
    if (ev.type === 'step') {
      this.audio.play(shipSound(core, 'yearDetent'), { gain: 0.5, rate: 0.97 + Math.random() * 0.06, pan: 0.1 });
      this.caption(this.T.cap.detent, 1200);
      this.onIndex();
    } else if (ev.type === 'skip') {
      this.audio.play(shipSound(core, 'yearDetentEmpty'), { gain: 0.35, pan: 0.1 });
    } else if (ev.type === 'limit') {
      this.audio.play(shipSound(core, 'yearLimit'), { gain: 0.6 });
      this.caption(this.T.cap.end, 1500);
    }
  }

  onIndex() {
    this.refreshText();
    this.updateHint();
  }

  refreshText() {
    const e = this.entry;
    const site = SITES[this.site];
    if (!e) {
      this.head1.textContent = site.label;
      this.head2.textContent = '';
      this.tags.innerHTML = '';
      this.annot.innerHTML = '';
      const n = Object.keys(CONFLICTS).length;
      this.endCard.textContent = this.site === 'E-017' ? this.T.endE017(n) : this.T.endE031;
      this.endCard.classList.add('on');
      return;
    }
    this.endCard.classList.remove('on');
    if (e.empty) {
      this.head1.textContent = `${site.label}　${e.year}`;
      this.head2.textContent = this.T.noImage;
      this.tags.innerHTML = '';
      return;
    }
    this.head1.textContent = `${site.label}　${e.date} ${e.time}　拍攝：${e.observer}`;
    this.head2.textContent = e.baseline ? this.T.baseline : this.T.received(e.shipYear);
    this.tags.innerHTML = '';
    for (const f of e.flags) {
      const kind = FLAG_LABEL[f];
      const queued = this.ctx.shared.queue[f];
      const label = queued && kind !== 'draft' ? this.T.flag.queued : this.T.flag[kind];
      this.tags.append(h('span', { class: `tag ${kind}${queued ? ' queued' : ''}` }, label));
    }
    this.ticks.forEach((t, i) => t.classList.toggle('here', i === this.sel.index));
  }

  updateHint() {
    if (this.slipOpen) return this.hint(null);
    if (this.noteOpen) return this.hint(this.noteAction ? null : this.T.hintNote);
    this.hint(this.T.hint);
  }

  // ---- notes ----------------------------------------------------------------------------------

  noteText(e) {
    const lines = [];
    if (e.site === 'E-017') {
      lines.push(`E-017　${e.date} ${e.time}`, `${weatherWord(e)}。拍攝：${e.observer}`);
      lines.push(e.flags.length ? `地物標註 18 項。` : '地物標註 18 項，與基準版一致。');
    } else {
      lines.push(`E-031　${e.date} ${e.time}`, `${weatherWord(e)}。拍攝：${e.observer}`);
      if (e.count) lines.push(`黑面琵鷺 ${e.count} 隻（地球端計數）。`);
    }
    let text = lines.join('\n');
    if (e.note) text += `\n\n${e.note}`;
    const pending = [];
    for (const f of e.flags) {
      if (f === 'W03') text += `\n\n${DRAFT_W03}`;
      else {
        text += `\n\n${CONFLICTS[f].text}`;
        if (!this.ctx.shared.queue[f]) pending.push(f);
      }
    }
    return { text, pending };
  }

  openNote() {
    const e = this.entry;
    const { text, pending } = this.noteText(e);
    this.noteAction = pending.length ? pending : null;
    this.note.querySelector('pre').textContent = text + (pending.length ? `\n\n${this.T.addToQueue}` : '');
    this.note.scrollTop = 0;
    this.note.classList.add('on');
    this.noteOpen = true;
    this.audio.play(shipSound(this.ctx.core, 'paper'), { gain: 0.4 });
    this.updateHint();
  }

  closeNote() {
    this.note.classList.remove('on');
    this.noteOpen = false;
    this.noteAction = null;
    this.updateHint();
  }

  press(kind) {
    if (this.slipOpen) {
      if (kind !== 'short') return false;
      this.slipOpen = false;
      this.slip.classList.add('away');
      this.state.slipSeen = true;
      this.audio.play(shipSound(this.ctx.core, 'paper'), { gain: 0.5 });
      this.updateHint();
      return true;
    }
    if (this.noteOpen) {
      if (kind === 'short' && this.noteAction) {
        for (const f of this.noteAction) this.ctx.shared.queue[f] = true;
        this.ctx.saveShared();
        this.audio.play(shipSound(this.ctx.core, 'stamp'), { gain: 0.5 });
        this.refreshText();
      }
      this.closeNote();
      return true;
    }
    if (kind !== 'short') return false;
    if (this.atEnd) {
      if (this.site === 'E-017') {
        this.audio.play(shipSound(this.ctx.core, 'slideChange'), { gain: 0.6 });
        this.screen.classList.add('loading');
        setTimeout(() => this.screen.classList.remove('loading'), 700);
        this.loadSite('E-031', 0);
        this.updateHint();
      } else this.next();
      return true;
    }
    if (this.entry && !this.entry.empty) this.openNote();
    return true;
  }

  saveState() {
    return { site: this.site, index: this.sel.index, slipSeen: !this.slipOpen };
  }

  // ---- drawing --------------------------------------------------------------------------------

  imageFor(i) {
    const e = this.entries[i];
    if (!e || e.empty) return null;
    const key = `${this.site}:${i}`;
    if (this.cache.has(key)) {
      const c = this.cache.get(key);
      this.cache.delete(key);
      this.cache.set(key, c); // LRU touch
      return c;
    }
    return null;
  }

  renderOne(i) {
    const e = this.entries[i];
    if (!e || e.empty) return;
    const key = `${this.site}:${i}`;
    if (this.cache.has(key)) return;
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const W = Math.min(1600, Math.round(r.width * dpr));
    const H = Math.round(W * 0.625);
    this.cache.set(key, renderEntry(e, W, H));
    while (this.cache.size > 14) this.cache.delete(this.cache.keys().next().value);
  }

  frame(dt) {
    this.sel.update(dt);
    const pos = clamp(this.sel.pos, 0, this.entries.length);
    // Paint at most two missing pictures per frame: the one in view first, then its neighbours.
    let budget = 2;
    const want = [Math.round(pos), Math.floor(pos), Math.ceil(pos), this.sel.index + 1, this.sel.index - 1];
    for (const i of want) {
      if (budget <= 0) break;
      const e = this.entries[i];
      if (e && !e.empty && !this.imageFor(i)) {
        this.renderOne(i);
        budget -= 1;
      }
    }
    this.draw(pos);
    this.pointer.style.left = `${(pos / this.entries.length) * 100}%`;
    this.knurl.style.backgroundPositionX = `${-(this.knurlAngle || 0) * 0.6}px`;
  }

  nearestImage(i, dir) {
    for (let k = i; k >= 0 && k < this.entries.length; k += dir) {
      const c = this.imageFor(k);
      if (c) return c;
      if (!this.entries[k].empty) return null;
    }
    return null;
  }

  draw(pos) {
    const c = this.canvas;
    fitCanvas(c);
    const g = c.getContext('2d');
    g.fillStyle = '#1b1a17';
    g.fillRect(0, 0, c.width, c.height);
    if (pos >= this.entries.length - 0.001) {
      this.annot.innerHTML = '';
      return;
    }
    const i0 = Math.floor(pos);
    const t = pos - i0;
    const a = this.nearestImage(i0, -1) || this.nearestImage(i0, 1);
    const b = this.nearestImage(i0 + 1, 1);
    if (a) g.drawImage(a, 0, 0, c.width, c.height);
    if (b && b !== a && t > 0.02) {
      // Slide-projector change: the next picture comes up through a quick dip.
      g.globalAlpha = clamp((t - 0.15) / 0.7, 0, 1);
      g.drawImage(b, 0, 0, c.width, c.height);
      g.globalAlpha = 1;
    }
    const dip = Math.sin(Math.PI * clamp(t, 0, 1));
    if (dip > 0.02) {
      g.fillStyle = `rgba(16,15,13,${dip * 0.35})`;
      g.fillRect(0, 0, c.width, c.height);
    }
    // Annotation codes for the picture that is settled in view.
    const settled = Math.abs(pos - Math.round(pos)) < 0.04;
    const idx = Math.round(pos);
    if (settled && idx !== this.shownIndex) {
      this.shownIndex = idx;
      const img = this.imageFor(idx);
      this.annot.innerHTML = '';
      if (img && img.anchors) {
        for (const [k, p] of Object.entries(img.anchors)) {
          if (!p) continue;
          const el = h('i', {}, k);
          el.style.left = `${(p[0] / img.width) * 100}%`;
          el.style.top = `${(p[1] / img.height) * 100}%`;
          this.annot.append(el);
        }
      }
      if (img && this.lastShown !== img) {
        if (this.lastShown) this.audio.play(shipSound(this.ctx.core, 'slideChange'), { gain: 0.25, rate: 1.1 });
        this.lastShown = img;
      }
    } else if (!settled && this.shownIndex !== -1) {
      this.shownIndex = -1;
      this.annot.innerHTML = '';
    }
  }

  resize() {
    this.cache.clear();
    this.shownIndex = -1;
  }
}
