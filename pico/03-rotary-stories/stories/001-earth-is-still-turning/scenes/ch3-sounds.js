// 第三章　聲音資料庫 — an audio archive workstation with a heavy jog wheel.
//
// Two levels, entered with a short press and left with a long press:
//   list  — turning picks a recording; press plays it
//   play  — turning scrubs backwards / forwards (sound follows the hand); press pauses
// Audio: recordings are rendered in 4-second chunks around the playhead (audio/soundscapes.js)
// and scheduled back to back; scrubbing plays short grains, reversed when turning back.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { DetentSelector } from '../../../src/interactions/models.js';
import { attachKnobSurface } from '../../../src/interactions/knob-surface.js';
import { shipSound } from '../audio/ship-sounds.js';
import { RECORDINGS, renderChunk, profile, soundsAt, SR } from '../audio/soundscapes.js';

const CHUNK = 4;

function fmt(t) {
  const s = Math.max(0, Math.floor(t));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

class TapePlayer {
  constructor(scene, rec) {
    this.scene = scene;
    this.rec = rec;
    this.audio = scene.audio;
    this.core = scene.ctx.core;
    this.chunks = new Map();
    this.pos = 0;
    this.playing = false;
    this.voices = [];
    this.scheduledUntil = 0;
  }

  get ctx() {
    return this.core.ctx;
  }

  chunk(i) {
    if (i < 0 || i * CHUNK >= this.rec.dur) return null;
    if (!this.chunks.has(i)) {
      const [L, R] = renderChunk(this.rec, i * CHUNK, Math.min(CHUNK, this.rec.dur - i * CHUNK));
      const data = [L, R];
      const buffer = this.ctx ? this.core.toBuffer([L.slice(), R.slice()], SR) : null;
      this.chunks.set(i, { data, buffer });
      while (this.chunks.size > 8) {
        const far = [...this.chunks.keys()].sort((a, b) => Math.abs(b - this.pos / CHUNK) - Math.abs(a - this.pos / CHUNK))[0];
        this.chunks.delete(far);
      }
    }
    return this.chunks.get(i);
  }

  get position() {
    if (!this.playing || !this.ctx) return this.pos;
    return Math.min(this.rec.dur, this.pos + (this.ctx.currentTime - this.t0));
  }

  play() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    if (this.pos >= this.rec.dur - 0.05) this.pos = 0;
    this.t0 = this.ctx.currentTime + 0.05;
    this.nextChunkAt = this.t0;
    this.nextIndex = Math.floor(this.pos / CHUNK);
    this.firstOffset = this.pos - this.nextIndex * CHUNK;
    this.schedule();
  }

  schedule() {
    if (!this.playing) return;
    while (this.nextChunkAt < this.ctx.currentTime + 1.2) {
      const c = this.chunk(this.nextIndex);
      if (!c) {
        this.endAt = this.nextChunkAt;
        break;
      }
      const off = this.firstOffset || 0;
      const v = this.audio.play(c.buffer, { bus: 'media', gain: 0.9, when: this.nextChunkAt, offset: off, duration: c.buffer.duration - off });
      if (v) this.voices.push(v);
      this.nextChunkAt += c.buffer.duration - off;
      this.firstOffset = 0;
      this.nextIndex += 1;
    }
    this.voices = this.voices.filter((v) => !v.stopped && v.startedAt + 6 > this.ctx.currentTime);
  }

  pause() {
    if (!this.playing) return;
    this.pos = this.position;
    this.playing = false;
    for (const v of this.voices) v.stop(0.03);
    this.voices = [];
    this.endAt = null;
  }

  // Move the playhead by `sec` and let the hand hear where it is.
  scrub(sec, speed) {
    this.pos = clamp(this.pos + sec, 0, this.rec.dur);
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.lastGrain && now - this.lastGrain < 0.05) return;
    this.lastGrain = now;
    const i = Math.floor(this.pos / CHUNK);
    const c = this.chunk(i);
    if (!c) return;
    const at = Math.round((this.pos - i * CHUNK) * SR);
    const len = Math.round(0.09 * SR);
    const back = sec < 0;
    const L = new Float32Array(len);
    const R = new Float32Array(len);
    for (let k = 0; k < len; k++) {
      const j = back ? at - k : at + k;
      if (j < 0 || j >= c.data[0].length) continue;
      const w = Math.sin((Math.PI * k) / len);
      L[k] = c.data[0][j] * w;
      R[k] = c.data[1][j] * w;
    }
    const rate = clamp(0.7 + Math.abs(speed) / 500, 0.7, 2.6);
    this.audio.play(this.core.toBuffer([L, R], SR), { bus: 'media', gain: 0.75, rate });
  }

  update() {
    if (this.playing) {
      this.schedule();
      // Keep the next chunk ready before it is needed.
      if (!this.chunks.has(this.nextIndex) && this.nextIndex * CHUNK < this.rec.dur) this.chunk(this.nextIndex);
      if (this.endAt && this.ctx.currentTime >= this.endAt) {
        this.pause();
        this.pos = this.rec.dur;
      }
    }
  }

  stop() {
    this.pause();
    this.chunks.clear();
  }
}

export default class Sounds extends Scene {
  async enter() {
    this.T = this.ctx.text.ch3;
    this.mode = 'list';
    this.items = [...RECORDINGS, { id: 'end' }];
    this.sel = new DetentSelector({ count: this.items.length, index: this.state.index || 0, stepDeg: 36, stiffness: 240, damping: 24 });
    this.jog = 0;
    this.lastTurn = 0;

    const root = this.root;
    root.classList.add('sounds');
    this.panel = h('div', { class: 'au-panel' });
    this.list = h('ol', { class: 'au-list' });
    this.card = h('pre', { class: 'au-card' });
    this.panel.append(h('div', { class: 'au-header' }, this.T.header), this.list, this.card);
    this.timeline = h('canvas', { class: 'au-timeline', 'aria-hidden': 'true' });
    this.readout = h('div', { class: 'au-readout' });
    this.status = h('div', { class: 'au-status' });
    this.wheel = h('div', { class: 'jog', role: 'slider', 'aria-label': '寸動輪', html: jogSVG() });
    this.wheelRot = this.wheel.querySelector('.jog-rotor');
    const right = h('div', { class: 'au-right' }, h('div', { class: 'au-meter' }, this.timeline, h('div', { class: 'au-readrow' }, this.status, this.readout)), this.wheel);
    root.append(h('div', { class: 'archive-lamp' }), h('div', { class: 'au-device' }, h('div', { class: 'vw-label' }, '音訊閱覽機　AV-4'), h('div', { class: 'au-body' }, this.panel, right)));
    this.d.add(attachKnobSurface(this.wheel, this.ctx.knob, { pressRadius: 0.28 }));
    this.buildList();
    this.showList();
    this.startAudio();
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
    this.room = this.audio.loop(shipSound(core, 'ventArchive'), { bus: 'room', gain: 0.22, fadeIn: 2 });
  }

  buildList() {
    this.list.innerHTML = '';
    let group = null;
    this.rows = this.items.map((it, i) => {
      if (it.id !== 'end' && it.id[0] !== group) {
        group = it.id[0];
        this.list.append(h('li', { class: 'au-group' }, this.T.groups[group]));
      }
      const li =
        it.id === 'end'
          ? h('li', { class: 'au-row end' }, this.T.end)
          : h('li', { class: 'au-row' }, h('span', { class: 'c-id' }, it.id), h('span', { class: 'c-site' }, it.site), h('span', { class: 'c-place' }, it.place), h('span', { class: 'c-what' }, it.what), h('span', { class: 'c-date' }, it.date));
      li.addEventListener('click', () => {
        if (this.mode !== 'list') return;
        if (i === this.sel.index) this.press('short');
        else {
          this.sel.jump(i);
          this.refreshList();
        }
      });
      this.list.append(li);
      return li;
    });
  }

  refreshList() {
    this.rows.forEach((li, i) => li.classList.toggle('active', i === this.sel.index));
    const active = this.rows[this.sel.index];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }

  showList() {
    this.mode = 'list';
    this.panel.classList.remove('playing');
    this.refreshList();
    this.readout.textContent = '';
    this.status.textContent = '';
    this.hint(this.T.hintList);
    this.prof = null;
  }

  showPlay(rec) {
    this.mode = 'play';
    this.panel.classList.add('playing');
    this.card.textContent = rec.card;
    this.prof = profile(rec, 5);
    this.hint(this.T.hintPlay);
  }

  rotate(deg, info) {
    this.jog += deg;
    if (this.mode === 'list') {
      for (const e of this.sel.turn(deg, info)) {
        if (e.type === 'step') {
          this.refreshList();
          this.audio.play(shipSound(this.ctx.core, 'focusTick'), { gain: 0.25, rate: 0.6 });
        } else if (e.type === 'limit') this.audio.play(shipSound(this.ctx.core, 'focusTick'), { gain: 0.35, rate: 0.35 });
      }
      return;
    }
    // Scrub: slow turning is fine-grained (a turn ≈ 10 s), a fast spin covers ground quickly.
    const sp = Math.abs(info.speed || 0);
    const sec = (deg / 36) * (1 + sp / 300);
    if (this.player.playing) {
      this.player.pause();
      this.resumeAfterScrub = true;
    }
    this.player.scrub(sec, info.speed || deg * 20);
    this.lastTurn = performance.now();
  }

  press(kind) {
    const core = this.ctx.core;
    if (this.mode === 'list') {
      if (kind !== 'short') return false;
      const it = this.items[this.sel.index];
      if (it.id === 'end') {
        this.next();
        return true;
      }
      this.state.index = this.sel.index;
      this.player = new TapePlayer(this, it);
      this.showPlay(it);
      core.unlock();
      this.player.play();
      return true;
    }
    if (kind === 'long') {
      this.player.stop();
      this.player = null;
      this.showList();
      return true;
    }
    if (this.player.playing) this.player.pause();
    else this.player.play();
    this.resumeAfterScrub = false;
    return true;
  }

  saveState() {
    return { index: this.sel.index };
  }

  frame(dt, t) {
    this.sel.update(dt);
    this.wheelRot.setAttribute('transform', `rotate(${this.jog.toFixed(1)} 100 100)`);
    if (this.mode === 'play' && this.player) {
      if (this.resumeAfterScrub && performance.now() - this.lastTurn > 180) {
        this.resumeAfterScrub = false;
        this.player.play();
      }
      this.player.update();
      const p = this.player.position;
      this.readout.textContent = `${fmt(p)} / ${fmt(this.player.rec.dur)}`;
      this.status.textContent = this.player.playing ? this.T.playing : this.T.paused;
      if (this.player.playing && (!this.capT || t - this.capT > 1.4)) {
        this.capT = t;
        for (const c of soundsAt(this.player.rec, p).slice(0, 3)) this.caption(c, 1800);
      }
    }
    this.drawTimeline();
  }

  drawTimeline() {
    const c = this.timeline;
    fitCanvas(c);
    const g = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    g.fillStyle = '#d8d2c2';
    g.fillRect(0, 0, W, H);
    if (!this.prof || !this.player) {
      g.fillStyle = 'rgba(42,41,37,0.25)';
      g.fillRect(0, H / 2, W, 1);
      return;
    }
    const n = this.prof.length;
    const bw = W / n;
    g.fillStyle = 'rgba(42,41,37,0.55)';
    for (let i = 0; i < n; i++) {
      const v = this.prof[i] * H * 0.42;
      g.fillRect(i * bw + 0.5, H / 2 - v, Math.max(1, bw - 1), v * 2);
    }
    const x = (this.player.position / this.player.rec.dur) * W;
    g.fillStyle = '#b8432c';
    g.fillRect(x - 1, 0, 2, H);
  }

  leave() {
    if (this.player) this.player.stop();
    super.leave();
  }
}

function jogSVG() {
  const ribs = Array.from({ length: 72 }, (_, i) => `<line x1="100" y1="6" x2="100" y2="15" transform="rotate(${i * 5} 100 100)"/>`).join('');
  return `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <defs><radialGradient id="jg" cx="45%" cy="38%" r="70%"><stop offset="0" stop-color="#8e8c85"/><stop offset="0.7" stop-color="#4e4d48"/><stop offset="1" stop-color="#2a2a27"/></radialGradient>
  <radialGradient id="jd" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2b2b28"/><stop offset="1" stop-color="#474641"/></radialGradient></defs>
  <circle cx="100" cy="100" r="98" fill="#1d1d1b"/>
  <g class="jog-rotor">
    <circle cx="100" cy="100" r="94" fill="url(#jg)"/>
    <g stroke="rgba(0,0,0,0.45)" stroke-width="1.6">${ribs}</g>
    <circle cx="100" cy="100" r="78" fill="none" stroke="rgba(255,255,255,0.06)"/>
    <circle cx="100" cy="52" r="13" fill="url(#jd)"/>
  </g>
  <circle cx="100" cy="100" r="94" fill="none" stroke="rgba(255,255,255,0.1)"/>
</svg>`;
}
