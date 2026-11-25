// The work itself: a Lock, its instruments, and everything the safe says back.
import { Lock } from '../core/lock-state-machine.js';
import { lockSpecsOf } from '../game/missions.js';
import { ACTS } from '../game/missions.js';
import { LINES, pickLine } from '../game/dialogue.js';
import { lookOf } from '../rendering/looks.js';
import { ResonanceMeter, StripChart } from './instruments.js';
import { RotaryList } from './rotary-list.js';
import { ICONS } from './icons.js';
import { esc, pad2, step } from '../game/doc.js';
import { artifactSVG } from '../game/artifact-art.js';

const DIR_NAME = { 1: '右旋', '-1': '左旋' };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => performance.now();

export class UnlockScreen {
  constructor() {
    this.mode = 'dial';
  }

  enter(params, dir) {
    const g = this.game;
    this.params = params;
    const m = params.mission;
    const level = params.level || 0;
    const lv = m.levels ? m.levels[level] : null;
    this.levelInfo = lv;
    this.isLastLevel = !m.levels || level === m.levels.length - 1;
    this.spec = lockSpecsOf(m, params.ctx)[level];
    const size = this.spec.size || 100;
    this.dialSize = size;
    this.guide = (lv && lv.guide) || m.guide;
    this.meterOn = Boolean((lv && lv.meter) || m.meter);
    this.failStreak = 0;
    this.assistOpen = false;
    this.lastSlipLine = 0;

    // The dial keeps its physical angle when the graduation count changes.
    if (g.stage.size !== size) g.dialAbs = Math.round((g.dialAbs / g.stage.size) * size);
    g.dialAbs = Math.round(g.dialAbs);
    const look = (lv && lv.look) || m.look;
    g.stage.setView('safe');
    g.stage.setLook(look, { number: (lv && lv.number) || m.number, size });
    g.stage.resetDoor();
    g.stage.setLamps(this.spec.stages.length, 0);
    g.stage.dial.marker = null;
    g.input.setMode('dial', size);

    this.lock = new Lock(this.spec, { startAbs: g.dialAbs, t: now() });
    this.renderPanel(dir);
    this.update();
    if (this.spec.wake) g.audio.loop('snore', true);
    if (level === 0) g.say(pickLine(LINES.unlock));
  }

  exit() {
    this.game.audio.loop('snore', false);
    this.game.stage.dial.marker = null;
  }

  renderPanel(dir) {
    const g = this.game;
    const m = this.params.mission;
    const lv = this.levelInfo;
    const stages = this.spec.stages;
    const cells = stages
      .map((s, i) => `<div class="cell" data-cell="${i}"><span class="cell-no">${i + 1}</span><span class="code">${step(s.dir, s.turns, this.guide.target ? s.target : '??')}</span><span class="cell-state"></span></div>`)
      .join('');
    const persona = this.spec.patience
      ? `<div class="persona"><span class="ro-l">耐心</span><div class="gauge"><i data-patience></i></div></div>`
      : this.spec.wake
        ? `<div class="persona"><span class="ro-l">安撫</span><div class="swings" data-swings>${'<i></i>'.repeat(this.spec.wake.swings)}</div></div>`
        : '';
    const act = m.daily ? '日常委託' : ACTS[m.act].code;
    const el = g.page(`
      <div class="unlock">
        <div class="unlock-head"><span class="u-no">No. ${esc((lv && lv.number) || m.number)}</span><span class="u-title">${esc(m.title)}</span><span class="u-act">${act}</span></div>
        ${lv && lv.tag ? `<div class="hang-tag"><b>${esc(lv.tag[0])}</b>${esc(lv.tag[1])}</div>` : ''}
        <div class="proc-track">${cells}<div class="cell handle-cell" data-cell="h"><span class="cell-no">${ICONS.lock}</span><span class="code">把手</span><span class="cell-state"></span></div></div>
        <div class="readouts">
          <div class="ro"><span class="ro-l">讀數</span><b class="ro-big" data-pos>00</b></div>
          <div class="ro"><span class="ro-l">目標</span><b class="ro-big" data-target>??</b></div>
          <div class="ro"><span class="ro-l">方向</span><b class="ro-mid" data-dir></b></div>
          <div class="ro wide"><span class="ro-l">行程</span><div class="travel"><div class="travel-bar"><i data-travel></i><span data-marks></span></div><b class="ro-mid" data-turns></b></div></div>
        </div>
        ${this.meterOn ? `<div class="instrument"><div class="meter" data-meter></div><div class="strip-wrap"><canvas class="strip" data-strip></canvas><div class="inds"><span class="ind" data-ind-fast>速度過快</span>${this.spec.shy ? '<span class="ind" data-ind-shy>退縮中</span>' : ''}</div></div></div>` : ''}
        ${persona}
        <p class="status" data-status></p>
        <div class="doc-actions"><span>${ICONS.turn} 轉動</span><span>${ICONS.knob} 確認</span><span>${ICONS.hold} 輔助選單</span></div>
        <div class="assist" data-assist hidden></div>
      </div>`, dir);
    this.el = el;
    this.q = (sel) => el.querySelector(sel);
    this.meter = this.meterOn ? new ResonanceMeter(this.q('[data-meter]')) : null;
    if (this.meterOn) {
      requestAnimationFrame(() => {
        this.strip = new StripChart(this.q('[data-strip]'));
        this.strip.assist = g.save.settings.visualAssist;
      });
    }
    const marks = this.q('[data-marks]');
    const t = Math.max(1, this.lock.stage ? this.lock.stage.turns : 1);
    marks.innerHTML = Array.from({ length: t - 1 }, (_, i) => `<i style="left:${((i + 1) / t) * 100}%"></i>`).join('');
  }

  // ---- input -----------------------------------------------------------------------

  rotate(units, info) {
    if (this.assistOpen) {
      const moved = this.assist.move(units);
      if (moved) this.game.audio.menuTick(Math.sign(moved));
      return;
    }
    const g = this.game;
    const t = info.t || now();
    const events = this.lock.rotate(units, t);
    g.dialAbs = this.lock.abs;
    g.save.data.stats.graduations += Math.abs(units);
    this.handleEvents(events);
    this.update();
  }

  handleEvents(events) {
    const g = this.game;
    const a = g.audio;
    let ticks = 0;
    let speed = 0;
    const majors = [];
    for (const e of events) {
      switch (e.type) {
        case 'tick':
          speed = e.speed;
          if (this.strip) this.strip.tick(e.pos);
          if (!e.silent) {
            ticks += 1;
            majors.push(e.pos % 10 === 0);
          }
          break;
        case 'resonance':
          a.resonance(e);
          if (e.kind !== 'double' || g.save.settings.visualAssist) g.stage.flash(e.kind, e.tone, e.strength);
          if (this.meter) this.meter.kick(e.strength, e.tone, e.kind);
          if (this.strip) this.strip.mark(e.strength, e.tone, e.pos, e.kind);
          if (e.kind === 'gate' && g.save.settings.haptics && navigator.vibrate) navigator.vibrate(14);
          break;
        case 'too-fast':
          this.flashInd('[data-ind-fast]');
          if (now() - (this.lastFastHint || 0) > 6000) {
            this.lastFastHint = now();
            this.status('轉得太快時，共鳴機構不會作動。請放慢。');
          }
          break;
        case 'withdrawn':
          this.flashInd('[data-ind-shy]');
          break;
        case 'travel-reset':
          this.status('反轉超過容許範圍。本階段行程已歸零。', 'warn');
          break;
        case 'bored':
          if (!e.quiet) {
            a.bored();
            g.say(LINES.persona.bored);
            this.status('耐心歸零。本階段行程已清除，請重新轉動。', 'warn');
          }
          break;
        case 'rock':
          a.rock(e.swings);
          break;
        case 'startled':
          a.startled();
          g.say(LINES.persona.startled);
          break;
        case 'awake':
          a.loop('snore', false);
          a.wake();
          g.say(LINES.persona.awake);
          this.status('它醒了。請依程序作業，留意低沉的共鳴。');
          break;
        case 'slip':
          a.slip();
          if (now() - this.lastSlipLine > 12000) {
            this.lastSlipLine = now();
            a.sigh();
          }
          break;
        case 'unaligned':
          a.error();
          g.stage.setFlag('locked');
          this.status('對齊後的轉盤被轉動了。請回到最後階段的刻度並重新確認。', 'warn');
          break;
      }
    }
    if (ticks) a.ticks(ticks, { speed, majors });
  }

  press(kind) {
    if (this.assistOpen) {
      if (kind === 'short') this.assistSelect(this.assist.current);
      else this.closeAssist();
      return;
    }
    if (kind === 'long') {
      this.openAssist();
      return;
    }
    this.confirm();
  }

  confirm() {
    const g = this.game;
    const a = g.audio;
    const lock = this.lock;
    const r = lock.confirm(now());
    const stages = this.spec.stages;
    if (r.opened) {
      this.opened();
      return;
    }
    if (r.ok) {
      this.failStreak = 0;
      if (r.aligned) {
        a.stageConfirm();
        setTimeout(() => a.lockEngaged(), 140);
        g.stage.setLamps(stages.length, stages.length, 'aligned');
        g.stage.setFlag('aligned');
        g.say(pickLine(LINES.aligned));
        this.status('所有階段已對齊。請再按一次，拉動把手。', 'good');
      } else {
        a.stageConfirm();
        g.stage.setLamps(stages.length, lock.stageIndex);
        this.status(`第 ${r.stageDone + 1} 階段已記錄。`, 'good');
      }
      this.update();
      return;
    }
    if (r.reason === 'asleep') {
      a.error();
      this.status('它還在睡。請先依安撫程序，左右輕搖喚醒它。');
      return;
    }
    a.error();
    g.stage.blinkError();
    g.save.recordAttempt(this.params.mission.id, true);
    this.failStreak += 1;
    this.status(this.failureText(r), 'bad');
    if (r.reset) g.stage.setLamps(stages.length, 0);
    if (this.failStreak === 3 || this.failStreak === 7) g.say(pickLine(LINES.failStreak, this.failStreak / 10));
    this.update();
  }

  failureText(r) {
    const stage = this.spec.stages[r.stageIndex];
    const dirName = DIR_NAME[stage.dir];
    const tail = r.reset ? '鎖定機構已重設，請從第一階段重新開始。' : '';
    if (this.guide.target) {
      if (r.reason === 'wrong-number') {
        const n = Math.abs(r.offBy);
        const way = r.offBy > 0 ? '向右' : '向左';
        return `目前停在 ${pad2(this.lock.position)}，目標是 ${pad2(stage.target)}。${way}再轉 ${n} 格即可（小幅修正不影響圈數）。${tail}`;
      }
      if (r.reason === 'not-enough-turns') return `刻度正確，但圈數不足：本階段須${dirName}至少 ${stage.turns} 圈，目前 ${r.turnsDone} 圈。${tail}`;
      if (r.reason === 'wrong-direction') return `刻度正確，但方向不對：本階段須${dirName}。${tail}`;
    }
    if (r.reason === 'not-enough-turns') return `圈數不足：本階段須${dirName}至少 ${stage.turns} 圈。${tail}`;
    if (r.reason === 'wrong-direction') return `方向不正確：本階段須${dirName}。${tail}`;
    return `確認失敗：刻度不正確。${tail}`;
  }

  // ---- the panel ---------------------------------------------------------------------

  update() {
    if (!this.el) return;
    const lock = this.lock;
    const snap = lock.snapshot(now());
    const stage = lock.stage;
    const q = this.q;
    const noReading = this.guide.noReading;
    q('[data-pos]').textContent = noReading ? '—' : pad2(snap.position);
    q('[data-target]').textContent = stage ? (this.guide.target ? pad2(stage.target) : '??') : '—';
    if (stage) {
      const turning = snap.direction === stage.dir;
      q('[data-dir]').innerHTML = `${stage.dir > 0 ? ICONS.cw : ICONS.ccw}<span>${DIR_NAME[stage.dir]}</span>`;
      q('[data-dir]').classList.toggle('match', turning);
      const need = Math.max(1, stage.turns);
      const frac = Math.max(0, Math.min(1, lock.net / (need * lock.size)));
      q('[data-travel]').style.width = `${frac * 100}%`;
      q('[data-travel]').classList.toggle('neg', lock.net < 0);
      q('[data-turns]').textContent = `${snap.turnsDone}／${stage.turns} 圈`;
    } else {
      q('[data-dir]').innerHTML = `${ICONS.lock}<span>把手</span>`;
      q('[data-travel]').style.width = '100%';
      q('[data-turns]').textContent = '已對齊';
    }
    if (this.lastStageIndex !== lock.stageIndex) {
      this.lastStageIndex = lock.stageIndex;
      const t = Math.max(1, stage ? stage.turns : 1);
      q('[data-marks]').innerHTML = Array.from({ length: t - 1 }, (_, i) => `<i style="left:${((i + 1) / t) * 100}%"></i>`).join('');
    }
    this.el.querySelectorAll('[data-cell]').forEach((c) => {
      const i = c.dataset.cell === 'h' ? this.spec.stages.length : Number(c.dataset.cell);
      c.classList.toggle('done', i < lock.stageIndex);
      c.classList.toggle('current', i === lock.stageIndex && lock.phase !== 'wake');
    });
    // Act 1 marker: a small red arrow printed on the face beside the target numeral.
    this.game.stage.dial.marker = this.guide.marker && stage ? { pos: stage.target, size: lock.size } : null;
    this.game.stage.dial.dirty = true;
    if (this.spec.wake) {
      const sw = this.el.querySelectorAll('[data-swings] i');
      sw.forEach((s, i) => s.classList.toggle('on', i < lock.swings || lock.phase !== 'wake'));
    }
  }

  frame(dt, t) {
    if (this.meter) this.meter.frame(dt);
    if (this.strip) this.strip.draw();
    if (this.assistOpen && this.assist) this.assist.frame(dt);
    if (this.spec.patience && this.lock.phase === 'dial') {
      this.handleEvents(this.lock.update(now()));
      const bar = this.q('[data-patience]');
      if (bar) {
        bar.style.width = `${(this.lock.patience * 100).toFixed(1)}%`;
        bar.classList.toggle('low', this.lock.patience < 0.3);
      }
      if (this.lock.patience === 0 || this.lock.net === 0) this.update();
    }
  }

  status(text, tone = '') {
    const s = this.q('[data-status]');
    if (!s) return;
    s.textContent = text;
    s.dataset.tone = tone;
    s.classList.remove('pop');
    void s.offsetWidth;
    s.classList.add('pop');
  }

  flashInd(sel) {
    const el = this.q(sel);
    if (!el) return;
    el.classList.remove('on');
    void el.offsetWidth;
    el.classList.add('on');
  }

  // ---- assist menu (long press) ------------------------------------------------------

  openAssist() {
    const g = this.game;
    g.audio.select();
    this.assistOpen = true;
    g.input.setMode('nav');
    const box = this.q('[data-assist]');
    box.hidden = false;
    const va = g.save.settings.visualAssist;
    const items = [
      { id: 'resume', title: '繼續作業' },
      { id: 'brief', title: '重閱任務文件' },
      { id: 'assist', title: `視覺線索輔助　${va ? '開' : '關'}` },
      { id: 'restart', title: '重新開始本保險箱' },
      { id: 'quit', title: '放棄並返回' },
    ];
    this.assist = new RotaryList({
      items,
      itemH: 50,
      render: (it, i) => `<div class="row-in"><span class="row-no">${pad2(i + 1)}</span><span class="row-title">${it.title}</span></div>`,
      onSelect: () => this.assistSelect(this.assist.current),
      onFocus: (i, it, d, fromPointer) => fromPointer && g.audio.menuTick(Math.sign(d)),
      onBump: () => g.audio.bump(),
    });
    this.assist.onDragSteps = (s) => this.rotate(s, {});
    box.innerHTML = `<div class="assist-card"><div class="assist-title">輔助選單</div><div class="assist-slot"></div><div class="assist-doc" hidden></div></div>`;
    box.querySelector('.assist-slot').appendChild(this.assist.el);
  }

  closeAssist() {
    const g = this.game;
    g.audio.back();
    this.assistOpen = false;
    this.reading = false;
    g.input.setMode('dial', this.dialSize);
    const box = this.q('[data-assist]');
    box.hidden = true;
    box.innerHTML = '';
  }

  assistSelect(item) {
    const g = this.game;
    if (this.reading) {
      this.closeAssist();
      return;
    }
    switch (item.id) {
      case 'resume':
        this.closeAssist();
        break;
      case 'brief': {
        g.audio.select();
        this.reading = true;
        const doc = this.q('.assist-doc');
        doc.hidden = false;
        doc.innerHTML = `<div class="doc">${this.params.mission.brief(this.params.ctx)}</div>`;
        this.q('.assist-slot').hidden = true;
        this.assist.move = (u) => {
          doc.scrollTop += u * 60;
          return 1;
        };
        break;
      }
      case 'assist': {
        const on = !g.save.settings.visualAssist;
        g.save.setSetting('visualAssist', on);
        if (this.strip) this.strip.assist = on;
        g.notify(`視覺線索輔助：${on ? '開' : '關'}`);
        this.closeAssist();
        break;
      }
      case 'restart':
        this.closeAssist();
        this.lock.reset(now());
        this.game.stage.setLamps(this.spec.stages.length, 0);
        this.game.stage.setFlag('locked');
        if (this.spec.wake) g.audio.loop('snore', true);
        this.status('本保險箱已重新開始。');
        this.update();
        break;
      case 'quit':
        this.closeAssist();
        g.audio.back();
        g.go(this.params.from === 'daily' ? 'daily' : 'missions', { focus: this.params.from === 'daily' ? undefined : this.params.mission.id }, -1);
        break;
    }
  }

  // ---- opening -----------------------------------------------------------------------

  async opened() {
    const g = this.game;
    const m = this.params.mission;
    if (!this.isLastLevel) {
      // Nested safe: open quickly, find a smaller safe, and go again.
      g.busy = true;
      g.stage.placeSpecimen(artifactSVG('artifact-013', { uid: 'nest' }), '');
      await g.stage.openSequence({ audio: g.audio, fast: true, reducedMotion: g.reducedMotion });
      g.say(LINES.persona.nested);
      await sleep(1300);
      g.busy = false;
      g.go('unlock', { ...this.params, level: (this.params.level || 0) + 1 }, 1);
      return;
    }
    g.go('reveal', { mission: m, from: this.params.from }, 1);
  }
}

export function lookName(m) {
  return lookOf(m.look).name;
}
