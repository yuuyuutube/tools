// 第五章　通訊站 — sign the reception ledger, open the last packet, file the contradictions as history.
//
// Phases: ledger → image → record → consolidate (4 items) → submitted → official → next.
// Rotation is different in each: a heavy ledger roll that coasts (Flywheel), nothing while
// reading, a month-by-month segment marker that clicks into documented months, and finally the
// year wheel again over the official record.
import { Scene } from '../../../src/engine/scene.js';
import { h, fitCanvas, clamp } from '../../../src/engine/dom.js';
import { Flywheel, DetentSelector } from '../../../src/interactions/models.js';
import { shipSound } from '../audio/ship-sounds.js';
import { renderEntry } from '../art/earth.js';
import { ledger, formatEarthDate, formatShipDate, formatDelay, LEDGER_NOTES, e017Entries } from '../data/archive.js';

const Y0 = 2073;
const MONTHS = (2133 - Y0 + 1) * 12;
const mIndex = (y, m) => (y - Y0) * 12 + (m - 1);
const mLabel = (i) => `${Y0 + Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`;

const ITEMS = [
  {
    id: 'B04',
    title: 'E017-B04　標註衝突',
    record: `地球端地物異動紀錄　E017-B04
2086-07-31　頭汕國小停辦，學生併入北寮國小。
2086-08-01　校舍移交北寮鄉公所，暫停使用。
2087-08-01　啟用為頭汕社區活動中心。升旗台、旗桿保留。`,
    bounds: [mIndex(2086, 8), mIndex(2087, 8)],
    alias: { [mIndex(2086, 7)]: mIndex(2086, 8), [mIndex(2087, 7)]: mIndex(2087, 8) },
    names: ['頭汕國小', '校舍（暫停使用）', '頭汕社區活動中心'],
    head: 'E017-B04',
  },
  {
    id: 'MOUNT',
    title: 'E-017 機位　影像比對異常',
    record: `E-017 站點紀錄
2109-06-02　北堤延長工程，原燈桿機位拆除。
2109-06-20　新堤頭支架完成。方位依原設定補正。
　　　　　　舊機位影像不重新校正。`,
    bounds: [mIndex(2109, 6)],
    alias: {},
    names: ['北堤燈桿', '新堤頭支架'],
    head: 'E-017 機位',
  },
  {
    id: 'T01',
    title: 'E017-T01　地物缺失',
    record: `地球端地物異動紀錄　E017-T01
2101-03-15　水塔拆除。自來水改由加壓站供水。`,
    bounds: [mIndex(2101, 3)],
    alias: {},
    names: ['水塔', '（已拆除）'],
    head: 'E017-T01',
  },
  {
    id: 'W03',
    title: 'E031-W03　分段草案（蔡沛涵，第 41 年）',
    draft: true,
    bounds: [mIndex(2096, 1), mIndex(2126, 1)],
    names: ['魚塭', '魚塭（漁電共生光電板）', '潮間帶濕地'],
    signers: ['', '蔡沛涵　第 41 年', '方雅文　第 56 年'],
    head: 'E031-W03　分段草案',
  },
];

function segmentText(item, bounds) {
  const b = [...bounds].sort((a, z) => a - z);
  if (item.draft) {
    return `${item.head}\n${item.names.map((n, i) => `${i === 0 ? '2073' : String(Y0 + Math.floor(b[i - 1] / 12))} –　　 　${n}${item.signers[i] ? `　　${item.signers[i]}` : ''}`).join('\n')}`;
  }
  const rows = item.names.map((n, i) => {
    const from = i === 0 ? '2073-03' : mLabel(b[i - 1]);
    const to = i < b.length ? mLabel(b[i] - 1) : '';
    return to ? `${from} – ${to}　${n}` : `${from} –　　　　　${n}`;
  });
  return `${item.head}\n${rows.join('\n')}`;
}

export default class DistantSignal extends Scene {
  async enter() {
    this.T = this.ctx.text.ch5;
    this.phase = this.state.phase || 'ledger';
    this.rows = ledger();
    this.wheel = new Flywheel({ length: this.rows.length - 1, pos: this.state.ledgerPos || 0, unitsPerDeg: 1 / 18, friction: 1.6, markEvery: 1 });
    this.done = { ...(this.state.done || {}) };
    this.item = this.state.item || 0;
    this.placed = [];
    this.marker = mIndex(2080, 1);
    this.markerAcc = 0;

    const root = this.root;
    root.classList.add('signal');
    this.stage = h('div', { class: 'sg-stage' });
    root.append(h('div', { class: 'sg-glow' }), this.stage);
    this.enterPhase(this.phase);
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
    this.room = this.audio.loop(shipSound(core, 'racks'), { bus: 'room', gain: 0.4, fadeIn: 2 });
    this.roller = this.audio.loop(shipSound(core, 'roller'), { bus: 'device', gain: 0, fadeIn: 0 });
    this.caption(this.T.cap.fans, 3000);
  }

  enterPhase(p) {
    this.phase = p;
    this.state.phase = p;
    this.stage.innerHTML = '';
    this.stage.className = `sg-stage phase-${p}`;
    this.hint(null);
    if (p === 'ledger') this.buildLedger();
    else if (p === 'image') this.buildImage();
    else if (p === 'consolidate') this.buildConsolidate();
    else if (p === 'submitted') this.buildSubmitted();
    else if (p === 'official') this.buildOfficial();
  }

  // ---- ledger ---------------------------------------------------------------------------------

  buildLedger() {
    const note = h('div', { class: 'sg-note paper' }, h('pre', {}, this.T.note), h('i', { class: 'tape t1' }));
    this.ledgerEl = h('div', { class: 'sg-ledger' });
    this.ledgerRows = h('div', { class: 'lg-rows' });
    this.ledgerFoot = h('pre', { class: 'lg-foot' });
    this.ledgerEl.append(
      h('div', { class: 'lg-title' }, this.T.ledgerTitle),
      h('div', { class: 'lg-head' }, ...this.T.ledgerHead.map((c) => h('span', {}, c))),
      h('div', { class: 'lg-window' }, this.ledgerRows, h('div', { class: 'lg-cursor' })),
      this.ledgerFoot,
    );
    this.drum = h('div', { class: 'lg-drum', html: '<div class="knurl"></div>' });
    this.stage.append(note, h('div', { class: 'lg-wrap' }, this.ledgerEl, this.drum));
    this.bindDrum();
    this.hint(this.T.hintLedger);
    this.lastRow = -1;
  }

  bindDrum() {
    let last = null;
    this.d.on(this.drum, 'pointerdown', (e) => {
      last = e.clientY;
      this.drum.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.d.on(this.drum, 'pointermove', (e) => {
      if (last === null) return;
      const dy = e.clientY - last;
      last = e.clientY;
      if (dy) this.ctx.knob.angle(dy * 1.4, 'pointer');
    });
    const up = () => (last = null);
    this.d.on(this.drum, 'pointerup', up);
    this.d.on(this.drum, 'pointercancel', up);
    this.d.on(this.ledgerEl, 'click', () => {
      if (this.wheel.pos > this.rows.length - 1.6) this.press('short');
    });
  }

  renderLedger() {
    const pos = this.wheel.pos;
    const center = Math.round(pos);
    if (center === this.lastRow && !this.signedNow) return;
    this.signedNow = false;
    this.lastRow = center;
    const frag = document.createDocumentFragment();
    const lo = Math.max(0, center - 9);
    const hi = Math.min(this.rows.length - 1, center + 9);
    let prevYear = lo > 0 ? Math.floor(this.rows[lo - 1].recv) : -1;
    for (let i = lo; i <= hi; i++) {
      const r = this.rows[i];
      const yr = Math.floor(r.recv);
      if (yr !== prevYear) {
        frag.append(h('div', { class: 'lg-year' }, `第 ${yr} 年`));
        prevYear = yr;
      }
      const signed = r.last ? (this.done.signed ? `通訊 3／${this.T.signedBy}` : '通訊 3／') : `通訊 ${(r.n % 4) + 1}／資料 ${((r.n * 7) % 9) + 1}`;
      const row = h('div', { class: `lg-row${i === center ? ' here' : ''}${r.last ? ' last' : ''}` }, h('span', {}, r.id), h('span', {}, formatEarthDate(r.te)), h('span', {}, formatShipDate(r.recv)), h('span', {}, formatDelay(r)), h('span', {}, signed));
      frag.append(row);
      if (LEDGER_NOTES[r.n]) frag.append(h('div', { class: 'lg-memo' }, `${r.id}　備註　${LEDGER_NOTES[r.n]}`));
    }
    this.ledgerRows.innerHTML = '';
    this.ledgerRows.append(frag);
    const here = this.ledgerRows.querySelector('.here');
    if (here) this.ledgerRows.style.transform = `translateY(${-here.offsetTop + this.ledgerRows.parentElement.clientHeight / 2 - here.offsetHeight / 2}px)`;
    const atEnd = center >= this.rows.length - 1;
    this.ledgerFoot.textContent = atEnd && !this.done.signed ? this.T.sign : '';
  }

  // ---- image + station record ------------------------------------------------------------------

  buildImage() {
    const entry = e017Entries({ includeLatest: true }).find((e) => e.year === 2133);
    this.imgCanvas = h('canvas', { class: 'sg-image' });
    this.recordEl = h('pre', { class: 'sg-record' }, this.T.stationRecord + `\n\n${this.T.pressOn}`);
    const head = h('div', { class: 'vw-display sg-imgwrap' }, h('div', { class: 'vw-head1' }, `觀測點 E-017　頭汕漁港北堤　方位 128°　${entry.date} ${entry.time}　拍攝：${entry.observer}`), h('div', { class: 'vw-head2' }, '更新庫　第 63 年接收'), h('div', { class: 'sg-imgbox' }, this.imgCanvas, this.recordEl));
    this.stage.append(head);
    this.entry2133 = entry;
    this.imgStep = 0;
    requestAnimationFrame(() => {
      const r = this.imgCanvas.getBoundingClientRect();
      const W = Math.min(1800, Math.round(r.width * Math.min(2, window.devicePixelRatio || 1)));
      const pic = renderEntry(entry, W, Math.round(W * 0.625));
      this.imgCanvas.width = pic.width;
      this.imgCanvas.height = pic.height;
      this.imgCanvas.getContext('2d').drawImage(pic, 0, 0);
    });
    this.hint(this.T.pressOn);
  }

  // ---- consolidation --------------------------------------------------------------------------

  buildConsolidate() {
    this.ruleEl = h('pre', { class: 'cs-rule' }, this.T.rule);
    this.queueEl = h('ol', { class: 'cs-queue' });
    this.axis = h('canvas', { class: 'cs-axis' });
    this.recEl = h('pre', { class: 'cs-record' });
    this.segEl = h('pre', { class: 'cs-segments' });
    this.msgEl = h('div', { class: 'cs-msg', 'aria-live': 'polite' });
    this.stage.append(h('div', { class: 'cs-sheet' }, this.ruleEl, h('div', { class: 'cs-grid' }, h('div', {}, h('div', { class: 'cs-qtitle' }), this.queueEl), h('div', { class: 'cs-work' }, this.axis, this.msgEl, h('div', { class: 'cs-lower' }, this.recEl, this.segEl)))));
    this.thumbs = new Map();
    this.loadItem();
  }

  get pending() {
    return ITEMS.filter((it) => !this.done[it.id]).length;
  }

  loadItem() {
    while (this.item < ITEMS.length && this.done[ITEMS[this.item].id]) this.item += 1;
    this.stage.querySelector('.cs-qtitle').textContent = this.T.queueTitle(this.pending);
    this.queueEl.innerHTML = '';
    ITEMS.forEach((it, i) => this.queueEl.append(h('li', { class: `${this.done[it.id] ? 'done' : ''}${i === this.item ? ' here' : ''}` }, it.title)));
    this.msgEl.textContent = '';
    if (this.item >= ITEMS.length) {
      this.recEl.textContent = '';
      this.segEl.textContent = this.T.submit;
      this.hint(null);
      return;
    }
    const it = ITEMS[this.item];
    this.placed = it.draft ? [...it.bounds] : [];
    this.marker = it.draft ? it.bounds[0] : clamp(it.bounds[0] - 30, 0, MONTHS - 1);
    this.recEl.textContent = it.draft ? '' : it.record;
    this.updateSegments();
    this.hint(it.draft ? this.T.hintDraft : this.T.hintSegment);
  }

  updateSegments() {
    const it = ITEMS[this.item];
    if (!it) return;
    const complete = this.placed.length === it.bounds.length;
    this.hint(complete ? this.T.register : it.draft ? this.T.hintDraft : this.T.hintSegment);
    this.segEl.textContent = complete ? `${segmentText(it, this.placed)}\n\n${this.T.register}` : `${it.head}\n${mLabel(this.marker)}`;
  }

  // ---- submitted / official ---------------------------------------------------------------------

  buildSubmitted() {
    this.stage.append(h('pre', { class: 'cs-submitted' }, this.T.submitted));
    this.hint(null);
  }

  buildOfficial() {
    this.entries = e017Entries({ includeLatest: true });
    this.sel = new DetentSelector({ count: this.entries.length + 1, index: 0, stepDeg: 18, accel: (s) => (s > 1100 ? 3 : s > 600 ? 2 : 1), skip: (i) => i < this.entries.length && this.entries[i].empty });
    this.offCanvas = h('canvas', { class: 'vw-canvas' });
    this.offLabels = h('div', { class: 'of-labels' });
    this.offEnd = h('pre', { class: 'vw-end' }, this.T.endOfficial);
    this.offHead = h('div', { class: 'vw-head2' });
    this.stage.append(h('div', { class: 'vw-display sg-imgwrap' }, h('div', { class: 'vw-head1' }, this.T.officialHeader), this.offHead, h('div', { class: 'vw-screen' }, this.offCanvas, this.offLabels, this.offEnd)));
    this.offCache = new Map();
    this.hint('轉動　年份');
  }

  officialLabels(e) {
    const y = e.year;
    const m = Number(e.date.slice(5, 7));
    const at = mIndex(y, m);
    const b04 = at < mIndex(2086, 8) ? '頭汕國小' : at < mIndex(2087, 8) ? '校舍（暫停使用）' : '頭汕社區活動中心';
    const t01 = at < mIndex(2101, 3) ? '水塔' : '（已拆除）';
    const mount = at < mIndex(2109, 6) ? '北堤燈桿' : '新堤頭支架';
    return `${e.date}　機位 ${mount}\nB04　${b04}　　T01　${t01}`;
  }

  // ---- input ----------------------------------------------------------------------------------

  rotate(deg, info) {
    const core = this.ctx.core;
    const sp = Math.abs(info.speed || 0);
    if (this.phase === 'ledger') {
      const mult = clamp(1 + Math.pow(sp / 260, 1.6), 1, 14);
      for (const e of this.wheel.turn(deg * mult, { speed: (info.speed || 0) * mult })) this.ledgerEvent(e);
      return;
    }
    if (this.phase === 'consolidate') {
      const it = ITEMS[this.item];
      if (!it) return;
      const mult = it.draft ? 1 : clamp(1 + Math.pow(sp / 300, 1.5), 1, 10);
      this.markerAcc += (deg / 18) * mult;
      let n = Math.trunc(this.markerAcc);
      if (!n) return;
      this.markerAcc -= n;
      const before = this.marker;
      this.marker = clamp(this.marker + n, 0, MONTHS - 1);
      // Documented months catch the marker when it passes slowly.
      const docs = it.draft ? it.bounds : [...it.bounds, ...Object.keys(it.alias).map(Number)];
      for (const d of docs) {
        if ((before < d && this.marker >= d) || (before > d && this.marker <= d)) {
          if (mult < 2.2) {
            this.marker = d;
            this.markerAcc = 0;
          }
          this.audio.play(shipSound(core, 'rollerTick'), { gain: 0.5, rate: 1.3 });
          this.caption(this.T.cap.snap, 1200);
        }
      }
      if (this.marker !== before) this.audio.play(shipSound(core, 'focusTick'), { gain: 0.18, rate: 0.8 });
      this.msgEl.textContent = '';
      this.updateSegments();
      return;
    }
    if (this.phase === 'official') {
      for (const e of this.sel.turn(deg, info)) {
        if (e.type === 'step') this.audio.play(shipSound(core, 'yearDetent'), { gain: 0.45, rate: 0.97 + Math.random() * 0.06 });
        else if (e.type === 'skip') this.audio.play(shipSound(core, 'yearDetentEmpty'), { gain: 0.3 });
        else if (e.type === 'limit') this.audio.play(shipSound(core, 'yearLimit'), { gain: 0.55 });
      }
    }
  }

  ledgerEvent(e) {
    if (e.type === 'mark') {
      const r = this.rows[Math.round(this.wheel.pos)];
      const prev = this.rows[Math.max(0, Math.round(this.wheel.pos) - e.dir)];
      if (r && prev && Math.floor(r.recv) !== Math.floor(prev.recv)) this.audio.play(shipSound(this.ctx.core, 'rollerTick'), { gain: 0.35 });
    } else if (e.type === 'limit') this.audio.play(shipSound(this.ctx.core, 'yearLimit'), { gain: 0.5 });
  }

  press(kind) {
    const core = this.ctx.core;
    if (kind !== 'short') return false;
    if (this.phase === 'ledger') {
      if (Math.round(this.wheel.pos) < this.rows.length - 1) return true;
      this.done.signed = true;
      this.signedNow = true;
      this.audio.play(shipSound(core, 'stamp'), { gain: 0.6 });
      this.caption(this.T.cap.stamp);
      this.renderLedger();
      setTimeout(() => !this.d.done && this.enterPhase('image'), 900);
      return true;
    }
    if (this.phase === 'image') {
      this.imgStep += 1;
      if (this.imgStep === 1) {
        this.recordEl.classList.add('on');
        this.audio.play(shipSound(core, 'paper'), { gain: 0.45 });
      } else this.enterPhase('consolidate');
      return true;
    }
    if (this.phase === 'consolidate') {
      const it = ITEMS[this.item];
      if (!it) {
        this.audio.play(shipSound(core, 'stamp'), { gain: 0.7 });
        this.enterPhase('submitted');
        return true;
      }
      if (this.placed.length === it.bounds.length) {
        this.done[it.id] = true;
        this.audio.play(shipSound(core, 'stamp'), { gain: 0.6 });
        this.caption(this.T.cap.stamp);
        this.item += 1;
        this.loadItem();
        return true;
      }
      const m = it.alias[this.marker] ?? this.marker;
      if (it.bounds.includes(m) && !this.placed.includes(m)) {
        this.placed.push(m);
        this.audio.play(shipSound(core, 'relay'), { gain: 0.6 });
        if (this.placed.length < it.bounds.length) this.marker = clamp(m + 3, 0, MONTHS - 1);
        this.updateSegments();
      } else if (!it.bounds.includes(m)) {
        this.msgEl.textContent = this.T.noRecord;
      }
      return true;
    }
    if (this.phase === 'submitted') {
      this.enterPhase('official');
      return true;
    }
    if (this.phase === 'official') {
      if (this.sel.index >= this.entries.length) this.next();
      return true;
    }
    return true;
  }

  saveState() {
    return { phase: this.phase, ledgerPos: this.wheel.pos, done: this.done, item: this.item };
  }

  // ---- frame ----------------------------------------------------------------------------------

  frame(dt) {
    if (this.phase === 'ledger') {
      for (const e of this.wheel.update(dt)) this.ledgerEvent(e);
      this.renderLedger();
      const v = Math.abs(this.wheel.vel) + (this.ctx.knob.speedAt() ? Math.min(40, Math.abs(this.ctx.knob.speedAt()) / 18) : 0);
      if (this.roller) {
        this.roller.setGain(Math.min(0.45, v / 40), 0.08);
        this.roller.setRate(0.7 + Math.min(0.8, v / 50), 0.1);
      }
      if (v > 2) this.caption(this.T.cap.roller, 1000);
      this.drum.querySelector('.knurl').style.backgroundPositionY = `${-this.wheel.pos * 6}px`;
    } else if (this.roller) this.roller.setGain(0, 0.1);
    if (Math.random() < dt * 0.05) {
      this.audio.play(shipSound(this.ctx.core, 'relay'), { gain: 0.15, pan: -0.5 });
      this.caption(this.T.cap.relay, 1200);
    }
    if (this.phase === 'consolidate') this.drawAxis();
    if (this.phase === 'official') this.drawOfficial(dt);
  }

  thumb(y) {
    if (this.thumbs.has(y)) return this.thumbs.get(y);
    return null;
  }

  drawAxis() {
    const it = ITEMS[this.item];
    const c = this.axis;
    fitCanvas(c);
    const g = c.getContext('2d');
    const W = c.width;
    const H = c.height;
    g.fillStyle = '#d8d2c2';
    g.fillRect(0, 0, W, H);
    const years = 2133 - Y0 + 1;
    const tw = W / years;
    const th = tw * 0.62;
    // Make two thumbnails per frame until all exist.
    const entries = (this.allEntries = this.allEntries || e017Entries({ includeLatest: true }));
    let budget = 2;
    for (const e of entries) {
      if (budget <= 0) break;
      if (!e.empty && !this.thumbs.has(e.year)) {
        this.thumbs.set(e.year, renderEntry(e, Math.max(40, Math.round(tw * 1.5)), Math.max(25, Math.round(th * 1.5))));
        budget -= 1;
      }
    }
    const top = H * 0.62;
    // A larger look at the year under the marker.
    const my = Y0 + Math.floor(this.marker / 12);
    this.previews = this.previews || new Map();
    if (!this.previews.has(my)) {
      const e = entries.find((x) => x.year === my);
      if (e && !e.empty) this.previews.set(my, renderEntry(e, Math.round(H * 0.5 * 1.6 * 1.5), Math.round(H * 0.5 * 1.5)));
      else this.previews.set(my, null);
    }
    const pv = this.previews.get(my);
    const pw = H * 0.5 * 1.6;
    const px = clamp((this.marker / 12) * tw - pw / 2, 0, W - pw);
    if (pv) g.drawImage(pv, px, H * 0.04, pw, H * 0.5);
    else {
      g.fillStyle = 'rgba(42,41,37,0.15)';
      g.fillRect(px, H * 0.04, pw, H * 0.5);
    }
    for (let i = 0; i < years; i++) {
      const t = this.thumb(Y0 + i);
      if (t) g.drawImage(t, i * tw + 0.5, top, tw - 1, th);
      else {
        g.fillStyle = 'rgba(42,41,37,0.12)';
        g.fillRect(i * tw + 0.5, top, tw - 1, th);
      }
      if ((Y0 + i) % 10 === 0) {
        g.fillStyle = '#2a2925';
        g.font = `${Math.round(H * 0.07)}px IBM Plex Mono, monospace`;
        g.fillText(String(Y0 + i), i * tw, top + th + H * 0.2);
      }
    }
    if (!it) return;
    const xOf = (m) => (m / 12) * tw;
    // Segments placed so far.
    const b = [...this.placed].sort((a, z) => a - z);
    g.fillStyle = 'rgba(184,67,44,0.9)';
    for (const m of b) g.fillRect(xOf(m) - 1.5, top - H * 0.06, 3, th + H * 0.12);
    // Documented months, as small notches under the strip.
    const docs = it.draft ? it.bounds : it.bounds;
    g.fillStyle = '#2a2925';
    for (const m of docs) g.fillRect(xOf(m) - 0.5, top + th + H * 0.04, 1, H * 0.08);
    // The marker.
    const x = xOf(this.marker);
    g.fillStyle = '#e3a23b';
    g.beginPath();
    g.moveTo(x, top + th + H * 0.02);
    g.lineTo(x - H * 0.06, top + th + H * 0.14);
    g.lineTo(x + H * 0.06, top + th + H * 0.14);
    g.fill();
    g.fillRect(x - 1, top - H * 0.04, 2, th + H * 0.08);
    g.fillStyle = '#2a2925';
    g.font = `${Math.round(H * 0.1)}px IBM Plex Mono, monospace`;
    g.fillText(mLabel(this.marker), clamp(x + 6, 0, W - H * 0.6), top - H * 0.03);
  }

  drawOfficial(dt) {
    this.sel.update(dt);
    const c = this.offCanvas;
    fitCanvas(c);
    const g = c.getContext('2d');
    const pos = clamp(this.sel.pos, 0, this.entries.length);
    const i = Math.round(pos);
    const e = this.entries[i];
    this.offEnd.classList.toggle('on', i >= this.entries.length);
    if (!e || e.empty) {
      if (e && e.empty) this.offHead.textContent = `${e.year}　站點遷移，本年無例行影像`;
      return;
    }
    let pic = this.offCache.get(i);
    if (!pic) {
      pic = renderEntry(e, Math.min(1400, c.width), Math.round(Math.min(1400, c.width) * 0.625));
      this.offCache.set(i, pic);
      while (this.offCache.size > 10) this.offCache.delete(this.offCache.keys().next().value);
    }
    g.drawImage(pic, 0, 0, c.width, c.height);
    const dip = Math.abs(pos - i);
    if (dip > 0.02) {
      g.fillStyle = `rgba(16,15,13,${dip * 0.5})`;
      g.fillRect(0, 0, c.width, c.height);
    }
    const label = this.officialLabels(e);
    if (this.offLabels.textContent !== label) this.offLabels.textContent = label;
    this.offHead.textContent = e.baseline ? '基準版' : `更新庫　第 ${e.shipYear} 年接收`;
  }
}
