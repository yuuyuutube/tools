// The ceremony after a safe opens, the archive, and an artifact's full record.
import { ListPage } from './list-page.js';
import { DocScreen } from './screens-menu.js';
import { ICONS } from './icons.js';
import { ARTIFACTS, ARTIFACT_BY_ID, RARITIES, accessionNo, duplicateLines } from '../game/artifacts.js';
import { artifactSVG } from '../game/artifact-art.js';
import { certificateHTML, rarityMark, downloadCertificate } from '../export/certificate.js';
import { LINES, pickLine } from '../game/dialogue.js';
import { MISSIONS, MISSION_BY_ID } from '../game/missions.js';
import { esc } from '../game/doc.js';

const fmt = (t) => new Date(t).toLocaleString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

const STEPS = {
  bolts: '鎖栓　三道，依序解除',
  handle: '把手　已轉動',
  door: '門鉸　運作正常',
  light: '照明　啟動',
  reveal: '內容物　確認中',
};

// ---------------------------------------------------------------- reveal

export class RevealScreen extends DocScreen {
  enter(params, dir) {
    const g = this.game;
    const m = params.mission;
    this.params = params;
    this.phase = 'opening';
    this.scrollTarget = null;
    const a = ARTIFACT_BY_ID[m.artifact];
    this.artifact = a;
    const s = g.save;
    const distinctBefore = s.distinctArtifacts;

    // Record first, celebrate second: closing the tab mid-ceremony loses nothing.
    s.completeMission(m.id);
    this.result = s.addArtifact(a.id, m.id);
    if (m.daily && !s.data.daily.done.includes(m.id)) {
      s.data.daily.done.push(m.id);
      s.persist();
    }
    const pref = s.settings.shortReveal;
    const fast = pref === 'always-short' || (pref === 'auto' && s.data.seenReveal[a.id]);
    s.data.seenReveal[a.id] = true;
    s.persist();
    this.milestone = s.distinctArtifacts !== distinctBefore ? LINES.milestone[s.distinctArtifacts] : null;

    g.stage.placeSpecimen(artifactSVG(a.id, { uid: 'rv' }), `No. ${accessionNo(a)}`);
    this.page = g.page(`
      <div class="reveal">
        <div class="unlock-head"><span class="u-no">No. ${esc(m.number)}</span><span class="u-title">開啟程序</span><span class="u-act">${fast ? '精簡' : '完整'}</span></div>
        <ol class="oplog" data-log></ol>
        <div class="cert-slot" data-cert></div>
        <div class="doc-actions" data-actions><span>${ICONS.knob} 略過</span></div>
      </div>`, dir);
    this.log = this.page.querySelector('[data-log]');
    if (m.persona === 'void') document.documentElement.classList.add('void');
    g.say(pickLine(LINES.opening));
    this.pressWhileBusy = true;
    g.busy = true;
    const sequence = g.stage.openSequence({
      audio: g.audio,
      fast,
      reducedMotion: g.reducedMotion,
      openAngle: m.openAngle || -108,
      onStep: (k) => this.addLog(STEPS[k]),
    });
    // Whatever happens to timers (a hidden tab throttles them), the certificate arrives.
    const token = (this.token = {});
    const safety = new Promise((r) => setTimeout(() => r('timeout'), fast ? 6000 : 14000));
    Promise.race([sequence, safety]).then((why) => {
      if (this.token !== token || this.phase !== 'opening') return;
      if (why === 'timeout') g.stage.skip();
      this.showCertificate();
    });
  }

  addLog(text) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${text}</span><b>OK</b>`;
    this.log.appendChild(li);
  }

  showCertificate() {
    const g = this.game;
    g.busy = false;
    this.phase = 'cert';
    const a = this.artifact;
    const rec = g.save.data.artifacts[a.id];
    const dup = this.result.count > 1 ? duplicateLines(a, this.result.count) : null;
    const certSlot = this.page.querySelector('[data-cert]');
    certSlot.innerHTML = `
      ${dup ? `<div class="dup-note">${dup.map(esc).join('<br>')}</div>` : this.result.first ? '<div class="first-note">首次入庫</div>' : ''}
      ${certificateHTML(a, rec, { uid: 'rvc' })}`;
    certSlot.classList.add('in');
    this.page.querySelector('[data-actions]').innerHTML = `<span>${ICONS.turn} 瀏覽</span><span>${ICONS.knob} 存入典藏室</span><span>${ICONS.hold} 返回</span>`;
    g.audio.paper();
    const m = this.params.mission;
    g.say(m.success || pickLine(LINES.stored));
    setTimeout(() => {
      if (this.phase === 'cert' && this.page.isConnected) this.scrollTarget = Math.max(0, certSlot.offsetTop - 12);
    }, 400);
  }

  press(kind) {
    const g = this.game;
    if (this.phase === 'opening') {
      g.stage.skip();
      return;
    }
    if (this.phase === 'cert' && kind === 'short') {
      this.phase = 'stored';
      g.audio.stamp();
      this.page.querySelector('.cert').classList.add('stamped');
      this.page.querySelector('[data-actions]').innerHTML = `<span>${ICONS.knob} 繼續</span>`;
      g.say(this.milestone || pickLine(LINES.stored));
      return;
    }
    this.leave();
  }

  leave() {
    const g = this.game;
    const m = this.params.mission;
    document.documentElement.classList.remove('void');
    g.audio.back();
    if (m.daily) g.go('daily', {}, -1);
    else {
      const next = MISSIONS[MISSIONS.indexOf(m) + 1];
      g.go('missions', { focus: next && !next.hidden ? next.id : m.id }, -1);
    }
  }

  exit() {
    this.token = null;
    document.documentElement.classList.remove('void');
    this.game.busy = false;
  }
}

// ---------------------------------------------------------------- archive

export class ArchiveScreen extends ListPage {
  build(params) {
    const s = this.game.save;
    const owned = s.data.artifacts;
    const items = ARTIFACTS.map((a) => ({ a, rec: owned[a.id] }));
    const index = Math.max(0, items.findIndex((x) => x.a.id === params.focus));
    const cells = items.map((x) => `<i class="${x.rec ? 'on' : ''} d-${x.a.rarity.toLowerCase()}"></i>`).join('');
    return {
      items,
      index,
      cls: 'archive',
      itemH: 56,
      head: `<div class="page-head"><span class="page-code">典藏室</span><span class="page-sub">${s.distinctArtifacts}／${ARTIFACTS.length}　共 ${s.totalArtifacts} 件</span></div><div class="drawer">${cells}</div>`,
      render: ({ a, rec }) =>
        rec
          ? `<div class="row-in"><span class="row-no">${String(a.no).padStart(3, '0')}</span><span class="row-title">${esc(a.name)}</span><span class="row-meta">${rec.count > 1 ? `×${rec.count}` : ''}</span></div>`
          : `<div class="row-in empty"><span class="row-no">${String(a.no).padStart(3, '0')}</span><span class="row-title">未入庫</span><span class="row-meta"></span></div>`,
    };
  }

  entered() {
    const g = this.game;
    g.stage.setView('vitrine');
    g.sayFrom('archive');
  }

  focusChanged(item, i, d) {
    if (!item) return;
    const { a, rec } = item;
    this.game.stage.showVitrine(
      rec
        ? `<div class="vit-art">${artifactSVG(a.id, { uid: `v${i}` })}</div><div class="vit-label"><b>No. ${accessionNo(a)}</b><span>${esc(a.name)}</span>${rarityMark(a.rarity)}</div>`
        : `<div class="vit-empty"><span>${String(a.no).padStart(3, '0')}</span></div><div class="vit-label"><b>No. ${accessionNo(a)}</b><span>本位置保留中</span></div>`,
      d,
    );
    this.pageEl.querySelectorAll('.drawer i').forEach((c, k) => c.classList.toggle('cur', k === i));
  }

  select(item) {
    const g = this.game;
    if (!item.rec) {
      g.audio.error();
      g.say(['該位置尚未入庫。', '本局正在等待一件同樣不重要的物品。']);
      return;
    }
    g.audio.select();
    g.go('detail', { id: item.a.id }, 1);
  }

  back() {
    const g = this.game;
    g.audio.back();
    g.stage.setView('safe');
    g.go('menu', { focus: 'archive', quiet: true }, -1);
  }
}

// ---------------------------------------------------------------- detail

export class DetailScreen extends DocScreen {
  enter(params, dir) {
    const g = this.game;
    this.params = params;
    this.scrollTarget = null;
    const a = ARTIFACT_BY_ID[params.id];
    const rec = g.save.data.artifacts[a.id];
    this.a = a;
    this.rec = rec;
    const source = (id) => (MISSION_BY_ID[id] ? `第 ${MISSION_BY_ID[id].number} 號保險箱` : id.startsWith('D-') ? `日常委託 ${id.slice(2, 12)}` : id);
    const dup = rec.count > 1 ? duplicateLines(a, rec.count) : null;
    g.page(`
      <article class="detail">
        ${certificateHTML(a, rec, { uid: 'dt', stamped: true })}
        ${dup ? `<div class="dup-note">${dup.map(esc).join('<br>')}</div>` : ''}
        <table class="doc-table record">
          <tr><th>典藏編號</th><td>${accessionNo(a)}</td></tr>
          <tr><th>稀有度</th><td>${RARITIES[a.rarity].zh}　${RARITIES[a.rarity].en}</td></tr>
          <tr><th>稀有度說明</th><td>${RARITIES[a.rarity].note}</td></tr>
          <tr><th>首次入庫</th><td>${fmt(rec.firstAt)}</td></tr>
          <tr><th>保管數量</th><td>${rec.count} ${a.unit}</td></tr>
        </table>
        <div class="log-title">獲得紀錄</div>
        <ol class="acq">${rec.log.slice().reverse().map((l) => `<li><span>${fmt(l.at)}</span><span>${esc(source(l.source))}</span></li>`).join('')}</ol>
        <div class="doc-actions"><span>${ICONS.knob} 匯出收藏證書 PNG</span><span>${ICONS.hold} 返回</span></div>
      </article>`, dir);
  }

  async press(kind) {
    const g = this.game;
    if (kind === 'long') {
      g.audio.back();
      g.go('archive', { focus: this.a.id }, -1);
      return;
    }
    g.audio.stamp();
    try {
      await downloadCertificate(this.a, this.rec, { employeeNo: g.save.data.employeeNo });
      g.notify('收藏證書已匯出');
    } catch (err) {
      console.error(err);
      g.notify('匯出失敗');
    }
  }
}
