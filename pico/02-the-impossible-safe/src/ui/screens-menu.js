import { ListPage } from './list-page.js';
import { ICONS, sealSVG } from './icons.js';
import { LINES, pickLine } from '../game/dialogue.js';
import { MISSIONS, MISSION_BY_ID, ACTS, missionUnlocked } from '../game/missions.js';
import { ARTIFACTS } from '../game/artifacts.js';
import { generateCommission, dateKey, DAILY_PER_DAY } from '../game/daily.js';
import { lookOf } from '../rendering/looks.js';
import { SENSITIVITY } from '../input/rotary-navigation.js';
import { esc, pad2 } from '../game/doc.js';

const row = (no, title, meta = '', cls = '') =>
  `<div class="row-in ${cls}"><span class="row-no">${no}</span><span class="row-title">${title}</span><span class="row-meta">${meta}</span></div>`;

const redactBar = (w) => `<span class="bar" style="width:${w}em"></span>`;

// ---------------------------------------------------------------- title: a dial to play with

export class TitleScreen {
  constructor() {
    this.mode = 'free';
    this.samples = [];
  }

  enter() {
    const g = this.game;
    g.stage.setView('safe');
    g.stage.setLook('standard', { number: '———', size: 100 });
    g.stage.resetDoor();
    g.stage.setLamps(3, 0);
    const emp = g.save.data.employeeNo;
    this.page = g.page(`
      <div class="title-page">
        <h1 class="display">The<br>Impossible<br>Safe</h1>
        <p class="subtitle">A Very Serious Vault for Very Unimportant Things.</p>
        <div class="title-reading"><span class="lbl">讀數</span><span class="num" data-reading>00</span></div>
        <p class="title-cta">${ICONS.knob}<span>按下旋鈕，開始值勤</span></p>
        <p class="title-emp">保險庫管理員　第 ${emp} 號</p>
      </div>`);
    this.readingEl = this.page.querySelector('[data-reading]');
    g.sayFrom('title');
  }

  rotate(units, info) {
    const g = this.game;
    g.dialAbs = Math.round(g.dialAbs) + units;
    const t = info.t || performance.now();
    this.samples.push({ t, n: Math.abs(units) });
    while (this.samples.length && t - this.samples[0].t > 300) this.samples.shift();
    const speed = this.samples.reduce((s, x) => s + x.n, 0) / 0.3;
    g.audio.ticks(Math.abs(units), { speed });
    g.save.data.stats.graduations += Math.abs(units);
    const pos = ((Math.round(g.dialAbs) % 100) + 100) % 100;
    this.readingEl.textContent = pad2(pos);
  }

  press() {
    const g = this.game;
    g.audio.select();
    if (!g.save.data.seenIntro) g.go('intro', {}, 1);
    else g.go('menu', {}, 1);
  }
}

// ---------------------------------------------------------------- scrolling documents

export class DocScreen {
  constructor() {
    this.mode = 'nav';
  }

  scrollBy(units) {
    const s = this.game.sheet;
    const before = s.scrollTop;
    this.scrollTarget = Math.max(0, Math.min(s.scrollHeight - s.clientHeight, (this.scrollTarget ?? s.scrollTop) + units * 64));
    if (this.scrollTarget === before && units) this.game.audio.bump();
    else this.game.audio.menuTick(Math.sign(units));
    this.game.spinNav(units);
  }

  frame(dt) {
    if (this.scrollTarget === undefined || this.scrollTarget === null) return;
    const s = this.game.sheet;
    const d = this.scrollTarget - s.scrollTop;
    if (Math.abs(d) < 0.5) {
      s.scrollTop = this.scrollTarget;
      this.scrollTarget = null;
      return;
    }
    s.scrollTop += d * (1 - Math.exp(-dt / 70));
  }

  rotate(units) {
    this.scrollBy(units);
  }
}

export class IntroScreen extends DocScreen {
  enter(params, dir) {
    const g = this.game;
    this.scrollTarget = null;
    const emp = g.save.data.employeeNo;
    g.page(`
      <article class="doc letter">
        <div class="doc-kicker">聘用通知書　第 ${emp} 號</div>
        <h2>致新進保險庫管理員</h2>
        <p>經本局審慎評估，閣下已獲錄用為<b>見習保險庫管理員</b>，即日起生效。</p>
        <p>本局成立於 1957 年，負責保管各類經鑑定為「無人想要」之物品。本局目前保管之物品，總價值經會計科估算為新台幣十二元，保管費用則為每年四億元。本局認為這個比例證明了我們的認真。</p>
        <p>閣下之職責如下：依程序開啟保險箱、確認內容物仍然存在、建立鑑定紀錄、存入典藏室。</p>
        <p>閣下的主要工具是轉盤。請轉它。本局的一切都可以用轉的。</p>
        <table class="doc-table keys">
          <tr><th>${ICONS.turn}</th><td>旋轉　選擇、捲動、轉動轉盤</td></tr>
          <tr><th>${ICONS.knob}</th><td>按下　確認、進入</td></tr>
          <tr><th>${ICONS.hold}</th><td>長按　返回、輔助選單</td></tr>
        </table>
        <p class="note">若無實體旋鈕：可在保險箱上以手指或滑鼠畫圈轉動，點一下中央旋鈕即為按下，長按中央即為長按。鍵盤方向鍵旋轉，Enter 確認，Esc 返回。</p>
        <div class="sign">${sealSVG({ color: '#B2321F' })}<div>首席保管官<br><span class="signature">封存仁</span></div></div>
      </article>`, dir);
    g.sayFrom('welcome');
  }

  press(kind) {
    const g = this.game;
    g.save.data.seenIntro = true;
    g.save.persist();
    g.audio.select();
    if (kind === 'short') g.go('missions', { focus: 'M001' }, 1);
    else g.go('menu', {}, -1);
  }
}

// ---------------------------------------------------------------- main menu

export class MenuScreen extends ListPage {
  build(params) {
    const g = this.game;
    const s = g.save;
    const actDone = (a) => MISSIONS.filter((m) => m.act === a && !m.hidden).every((m) => s.isComplete(m.id));
    const curAct = actDone(1) ? (actDone(2) ? 3 : 2) : 1;
    const doneCount = MISSIONS.filter((m) => s.isComplete(m.id)).length;
    const dailyOpen = s.isComplete('M003');
    const today = dateKey();
    const doneToday = s.data.daily.date === today ? s.data.daily.done.length : 0;
    const status = g.serial.status;
    const picoMeta = { connected: '已連線', connecting: '連線中', lost: '中斷', error: '被占用', unsupported: '不支援', idle: '未連線' }[status] || '';
    const items = [
      { id: 'missions', no: '01', title: '主線任務', meta: `${ACTS[curAct].code}　${doneCount}／${MISSIONS.length}` },
      { id: 'daily', no: '02', title: '日常委託', meta: dailyOpen ? `今日 ${Math.min(doneToday, DAILY_PER_DAY)}／${DAILY_PER_DAY}` : '見習期滿後開放', locked: !dailyOpen },
      { id: 'archive', no: '03', title: '典藏室', meta: `${s.distinctArtifacts}／${ARTIFACTS.length}` },
      { id: 'settings', no: '04', title: '設定', meta: '' },
      { id: 'pico', no: '05', title: '旋鈕連線', meta: picoMeta },
    ];
    const index = Math.max(0, items.findIndex((i) => i.id === params.focus));
    return {
      items,
      index,
      cls: 'menu',
      itemH: 66,
      head: `<div class="page-head"><span class="page-code">工作項目</span><span class="page-sub">${new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}</span></div>`,
      render: (it) => row(it.no, it.title, it.meta, it.locked ? 'locked' : ''),
    };
  }

  entered(params) {
    const g = this.game;
    g.stage.setView('safe');
    g.stage.setLook('standard', { number: '———', size: 100 });
    g.stage.resetDoor();
    g.stage.setLamps(3, 0);
    if (!params.quiet) g.say(pickLine(LINES.menu));
  }

  select(item) {
    const g = this.game;
    if (item.locked) {
      g.audio.error();
      g.say(['日常委託於見習期滿後開放。', '請先完成第 003 號保險箱。']);
      return;
    }
    g.audio.select();
    if (item.id === 'pico') {
      g.connectPico();
      return;
    }
    g.go(item.id, {}, 1);
  }

  back() {
    this.game.audio.back();
    this.game.go('title', {}, -1);
  }
}

// ---------------------------------------------------------------- mission list

export class MissionsScreen extends ListPage {
  build(params) {
    const s = this.game.save;
    const isComplete = (id) => s.isComplete(id);
    const items = MISSIONS.map((m) => {
      const unlocked = missionUnlocked(m, isComplete);
      return { m, unlocked, done: isComplete(m.id) };
    });
    let index = items.findIndex((i) => i.m.id === params.focus);
    if (index < 0) index = Math.max(0, items.findIndex((i) => i.unlocked && !i.done));
    if (index < 0) index = 0;
    return {
      items,
      index,
      cls: 'missions',
      itemH: 60,
      head: `<div class="page-head"><span class="page-code">案件清單</span><span class="page-sub" data-act></span></div>`,
      foot: `<div class="mission-peek" data-peek></div>`,
      render: ({ m, unlocked, done }) => {
        if (m.hidden && !unlocked) return row('███', redactBar(6), '', 'locked hidden');
        const title = unlocked ? esc(m.title) : redactBar(4 + (m.title.length % 4));
        const meta = done ? `<span class="done-mark">${ICONS.check}</span>` : unlocked ? `<span class="new-dot"></span>` : ICONS.lock;
        return row(m.number, title, meta, unlocked ? '' : 'locked');
      },
    };
  }

  focusChanged(item) {
    if (!item || !this.pageEl) return;
    const { m, unlocked, done } = item;
    const act = ACTS[m.act];
    this.pageEl.querySelector('[data-act]').textContent = `${act.code}　${act.title}　${act.zh}`;
    const look = lookOf(m.look);
    const rec = this.game.save.data.missions[m.id];
    this.pageEl.querySelector('[data-peek]').innerHTML = unlocked
      ? `<span>${look.name}</span><span>${done ? `已完成　${new Date(rec.completedAt).toLocaleDateString('zh-TW')}` : '待處理'}</span>`
      : `<span>未授權</span><span>${m.act === 3 && !m.hidden ? '須完成 ACT 2' : '須完成前一案件'}</span>`;
    this.game.stage.setLook(unlocked ? m.look : 'standard', { number: unlocked ? m.number : '———', size: 100 });
  }

  entered() {
    this.game.stage.setView('safe');
    this.game.stage.resetDoor();
    this.game.sayFrom('missions');
  }

  select({ m, unlocked }) {
    const g = this.game;
    if (!unlocked) {
      g.audio.error();
      g.say(pickLine(LINES.missions.slice(1)));
      return;
    }
    g.audio.select();
    g.go('brief', { mission: m, from: 'missions' }, 1);
  }

  back() {
    this.game.audio.back();
    this.game.go('menu', { focus: 'missions', quiet: true }, -1);
  }
}

// ---------------------------------------------------------------- daily commissions

export class DailyScreen extends ListPage {
  build(params) {
    const s = this.game.save;
    const today = dateKey();
    if (s.data.daily.date !== today) {
      s.data.daily = { date: today, done: [], overtime: 0 };
      s.persist();
    }
    const done = new Set(s.data.daily.done);
    const count = Math.max(DAILY_PER_DAY, done.size + 1);
    const items = [];
    for (let i = 0; i < count; i++) {
      const m = generateCommission(today, i, { owned: s.data.artifacts });
      items.push({ m, i, done: done.has(m.id), overtime: i >= DAILY_PER_DAY });
    }
    let index = items.findIndex((x) => !x.done);
    if (params.focus !== undefined) index = Math.min(items.length - 1, params.focus);
    return {
      items,
      index: Math.max(0, index),
      cls: 'daily',
      itemH: 62,
      head: `<div class="page-head"><span class="page-code">日常委託</span><span class="page-sub">${today}</span></div>`,
      foot: `<div class="mission-peek" data-peek></div>`,
      render: ({ m, done, overtime }) => row(m.number.split('-')[1].padStart(2, '0'), esc(m.title), done ? `<span class="done-mark">${ICONS.check}</span>` : overtime ? '加班' : '', ''),
    };
  }

  focusChanged(item) {
    if (!item || !this.pageEl) return;
    this.game.stage.setLook(item.m.look, { number: item.m.number, size: 100 });
    const kindName = { procedure: '完整程序', redacted: '遮蔽文件', typewriter: '打字機', log: '交接日誌', listen: '共鳴', 'listen-near': '預響', rhythm: '死點', inventory: '清點表' }[item.m.kind];
    this.pageEl.querySelector('[data-peek]').innerHTML = `<span>${lookOf(item.m.look).name}</span><span>${kindName}</span>`;
  }

  entered() {
    this.game.stage.setView('safe');
    this.game.stage.resetDoor();
    this.game.sayFrom('daily');
  }

  select({ m }) {
    this.game.audio.select();
    this.game.go('brief', { mission: m, from: 'daily' }, 1);
  }

  back() {
    this.game.audio.back();
    this.game.go('menu', { focus: 'daily', quiet: true }, -1);
  }
}

// ---------------------------------------------------------------- brief

export function missionHeader(m) {
  const look = lookOf(m.look);
  const act = m.daily ? '日常委託' : `${ACTS[m.act].code} ${ACTS[m.act].title}`;
  return `<div class="doc-head">
    <div class="doc-no"><span>No.</span>${esc(m.number)}</div>
    <table class="doc-fields">
      <tr><th>案件</th><td>${esc(m.title)}</td></tr>
      <tr><th>型號</th><td>${look.name}</td></tr>
      <tr><th>分類</th><td>${act}</td></tr>
    </table>
  </div>`;
}

export class BriefScreen extends DocScreen {
  enter(params, dir) {
    const g = this.game;
    this.params = params;
    this.scrollTarget = null;
    const m = params.mission;
    this.ctx = params.ctx || g.archiveContext();
    g.stage.setView('safe');
    g.stage.setLook(m.look, { number: m.number, size: 100 });
    g.stage.resetDoor();
    g.page(`<article class="doc brief">${missionHeader(m)}<div class="doc-body">${m.brief(this.ctx)}</div>
      <div class="doc-actions"><span>${ICONS.knob} 開始作業</span><span>${ICONS.hold} 返回</span></div></article>`, dir);
    g.sayFrom('brief');
  }

  press(kind) {
    const g = this.game;
    if (kind === 'short') {
      g.audio.select();
      g.go('unlock', { mission: this.params.mission, from: this.params.from, ctx: this.ctx, level: 0 }, 1);
    } else {
      g.audio.back();
      g.go(this.params.from || 'missions', { focus: this.params.from === 'daily' ? undefined : this.params.mission.id }, -1);
    }
  }
}

// ---------------------------------------------------------------- settings

const ONOFF = (v) => (v ? '開' : '關');

export class SettingsScreen extends ListPage {
  build(params) {
    const st = this.game.save.settings;
    const vol = Math.round(st.volume * 10);
    const items = [
      { id: 'volume', title: '音量', value: `<span class="meter-cells">${Array.from({ length: 10 }, (_, i) => `<i class="${i < vol ? 'on' : ''}"></i>`).join('')}</span>` },
      { id: 'ambient', title: '環境音', value: ONOFF(st.ambient) },
      { id: 'sensitivity', title: '旋鈕靈敏度', value: SENSITIVITY[st.sensitivity].label },
      { id: 'invert', title: '旋鈕方向', value: st.invert ? '反轉' : '標準' },
      { id: 'visualAssist', title: '視覺線索輔助', value: ONOFF(st.visualAssist) },
      { id: 'reducedMotion', title: '減少動態', value: ONOFF(st.reducedMotion) },
      { id: 'shortReveal', title: '開箱演出', value: { auto: '首次完整', 'always-long': '永遠完整', 'always-short': '永遠精簡' }[st.shortReveal] },
      { id: 'haptics', title: '震動回饋', value: ONOFF(st.haptics) },
      { id: 'export', title: '匯出存檔', value: ICONS.download },
      { id: 'import', title: '匯入存檔', value: ICONS.upload },
      { id: 'reset', title: '重設進度', value: '', danger: true },
    ];
    const index = Math.max(0, items.findIndex((i) => i.id === params.focus));
    return {
      items,
      index,
      cls: 'settings',
      itemH: 54,
      head: `<div class="page-head"><span class="page-code">設定</span><span class="page-sub" data-hint></span></div>`,
      render: (it, i) => row(pad2(i + 1), it.title, it.value, `${it.danger ? 'danger' : ''} ${this.editing === it.id ? 'editing' : ''}`),
    };
  }

  focusChanged(item) {
    if (!this.pageEl || !item) return;
    const hints = {
      volume: '按下後旋轉調整',
      sensitivity: '慢轉永遠逐格；快轉時借用較高齒輪比',
      invert: '僅影響 Pico 旋鈕',
      visualAssist: '記錄紙標出共鳴刻度，指標燈加強',
      import: '需要以滑鼠或鍵盤選擇檔案',
      reset: '需要再次確認',
    };
    this.pageEl.querySelector('[data-hint]').textContent = hints[item.id] || '';
  }

  entered() {
    this.game.sayFrom('settings');
  }

  rotate(units) {
    if (this.editing === 'volume') {
      const g = this.game;
      const v = Math.max(0, Math.min(10, Math.round(g.save.settings.volume * 10) + Math.sign(units)));
      g.save.setSetting('volume', v / 10);
      g.audio.setVolume(v / 10);
      g.audio.menuTick(Math.sign(units));
      g.spinNav(Math.sign(units));
      this.rebuild();
      return;
    }
    super.rotate(units);
  }

  rebuild() {
    const items = this.build({}).items;
    this.list.refresh(items);
    this.list.layoutRows(true);
  }

  press(kind) {
    if (this.editing) {
      this.editing = null;
      this.game.audio.select();
      this.rebuild();
      return;
    }
    super.press(kind);
  }

  select(item) {
    const g = this.game;
    const st = g.save.settings;
    const cycle = (key, values) => g.save.setSetting(key, values[(values.indexOf(st[key]) + 1) % values.length]);
    g.audio.select();
    switch (item.id) {
      case 'volume':
        this.editing = 'volume';
        break;
      case 'ambient':
        g.save.setSetting('ambient', !st.ambient);
        g.audio.setAmbient(st.ambient);
        break;
      case 'sensitivity':
        cycle('sensitivity', ['precise', 'standard', 'swift']);
        g.input.setSensitivity(st.sensitivity);
        break;
      case 'invert':
        g.save.setSetting('invert', !st.invert);
        g.input.invert = st.invert;
        break;
      case 'visualAssist':
      case 'haptics':
        g.save.setSetting(item.id, !st[item.id]);
        break;
      case 'reducedMotion':
        g.save.setSetting('reducedMotion', !st.reducedMotion);
        g.reducedMotion = st.reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
        document.documentElement.classList.toggle('calm', g.reducedMotion);
        break;
      case 'shortReveal':
        cycle('shortReveal', ['auto', 'always-long', 'always-short']);
        break;
      case 'export':
        g.exportSave();
        break;
      case 'import':
        g.importSave();
        break;
      case 'reset':
        g.go('confirm', {
          title: '重設進度',
          body: '所有任務進度與典藏室內容將被清除，且無法復原。設定將被保留。',
          yes: '確認重設',
          onYes: () => {
            g.save.reset();
            g.say(pickLine(LINES.reset));
            g.go('menu', { quiet: true }, -1);
          },
          onNo: () => g.go('settings', { focus: 'reset' }, -1),
        }, 1);
        return;
    }
    this.rebuild();
  }

  back() {
    this.editing = null;
    this.game.audio.back();
    this.game.go('menu', { focus: 'settings', quiet: true }, -1);
  }
}

// ---------------------------------------------------------------- confirm dialog

export class ConfirmScreen extends ListPage {
  build(params) {
    return {
      items: [{ id: 'no', title: '取消' }, { id: 'yes', title: params.yes || '確認', danger: true }],
      index: 0,
      cls: 'confirm',
      itemH: 58,
      head: `<div class="confirm-box"><h2>${esc(params.title)}</h2><p>${esc(params.body)}</p></div>`,
      render: (it) => row('', it.title, '', it.danger ? 'danger' : ''),
    };
  }

  select(item) {
    if (item.id === 'yes') {
      this.game.audio.stamp();
      this.params.onYes();
    } else this.back();
  }

  back() {
    this.game.audio.back();
    this.params.onNo();
  }
}

export { MISSION_BY_ID };
