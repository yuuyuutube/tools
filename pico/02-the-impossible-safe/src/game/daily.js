// Daily commissions: seeded, endlessly repeatable routine work.
// The same date and index always produce the same safe, the same paperwork and the same answer.
// Every generator records the clue data it printed (`puzzle`), and tests re-derive the
// combination from that data alone, then open the lock with it.

import { rng, hash32 } from '../core/prng.js';
import { p, note, proc, step, redact, mark, table, memo, pad2 } from './doc.js';
import { ARTIFACTS, RARITIES } from './artifacts.js';
import { mod } from '../core/lock-state-machine.js';

export const DAILY_PER_DAY = 3;

// Artifacts only obtainable from their own special safe.
const EXCLUSIVE = new Set(['artifact-013', 'artifact-015', 'artifact-027']);

const PLACES = ['第三檔案室', '地下二樓走廊盡頭', '局長辦公室隔壁的隔壁', '舊茶水間', '員工餐廳後方', '總務科儲藏室', '頂樓水塔旁', '第七會議室（無人使用）', '電梯旁的那面牆'];
const REASONS = [
  (n) => `該保險箱已連續 ${n} 年無人開啟。依規定，須例行確認內容物仍然存在。`,
  (n) => `該保險箱之例行檢查已延誤 ${n} 個月。延誤原因：無人記得。`,
  (n) => `本局接獲通報，指稱該保險箱「好像有聲音」。經查，通報人已於 ${n} 年前退休。`,
  (n) => `該保險箱需重新建立鑑定紀錄。前一份紀錄的內容為「同上」，共 ${n} 頁。`,
  () => '該保險箱之保險單即將到期。保險金額高於內容物價值約一萬倍。',
];
const LOOKS = ['standard', 'antique', 'vault', 'lab', 'standard'];
const KINDS = ['procedure', 'redacted', 'typewriter', 'log', 'listen', 'listen-near', 'rhythm', 'inventory'];

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function distinctTargets(r, count, minGap = 8) {
  const out = [];
  while (out.length < count) {
    const n = r.int(0, 99);
    if (out.every((m) => Math.abs(mod(n - m + 50, 100) - 50) >= minGap)) out.push(n);
  }
  return out;
}

function stagesFrom(r, targets) {
  let dir = r.sign();
  const turnsPlan = targets.length === 4 ? [3, 2, 1, 0] : [r.int(2, 3), r.int(1, 2), 0];
  return targets.map((target, i) => {
    const s = { dir, turns: turnsPlan[i], target };
    dir = -dir;
    return s;
  });
}

const stepsOf = (stages, show = (s) => s.target) => stages.map((s, i) => step(s.dir, s.turns, show(s, i)));

// --- generators: each returns { kind, title, lockSpec, brief(html), puzzle, guide, meter } --------

const GEN = {
  procedure(r) {
    const stages = stagesFrom(r, distinctTargets(r, r.chance(0.35) ? 4 : 3));
    const strict = r.chance(0.5);
    return {
      title: '例行開啟',
      lockSpec: { strict, resetOnError: true, stages },
      guide: { target: true, turns: true, dir: true },
      puzzle: { kind: 'procedure', steps: stages.map((s) => [s.dir, s.turns, s.target]) },
      body: [
        p('程序完整附上。本案之難度，僅在於閣下是否願意認真執行。'),
        proc(stepsOf(stages), { caption: '本案程序' }),
        strict ? p('本保險箱採<b>嚴格行程制</b>：反轉超過 3 格，該階段行程歸零。') : p('本保險箱採寬鬆行程制。'),
      ],
    };
  },

  redacted(r) {
    // Two of three numbers hidden; the audit note pins them down.
    for (;;) {
      const third = r.int(5, 30);
      const k = r.pick([2, 3]);
      const first = third * k;
      const second = r.int(0, 99);
      if (first > 99 || first === third || second === first || second === third) continue;
      const stages = stagesFrom(r, [first, second, third]);
      const sum = first + second + third;
      return {
        title: '遮蔽文件',
        lockSpec: { resetOnError: true, stages },
        guide: { target: false, turns: true, dir: true },
        puzzle: { kind: 'redacted', known: second, sum, ratio: k, steps: stages.map((s) => [s.dir, s.turns]) },
        body: [
          memo('內部備忘錄', proc(stepsOf(stages, (s, i) => (i === 1 ? s.target : redact())))),
          memo('稽核附註', [p(`三個數字之總和為 <b>${sum}</b>。`), p(`第一個數字為第三個數字的 <b>${k === 2 ? '兩' : '三'}倍</b>。`)].join(''), { cls: 'tilt' }),
        ],
      };
    }
  },

  typewriter(r) {
    const stages = stagesFrom(r, distinctTargets(r, 3));
    const shift = r.pick([1, 2, 3]);
    const sign = r.sign();
    const typed = stages.map((s) => shiftDigits(s.target, shift * sign));
    return {
      title: '打字室繕本',
      lockSpec: { resetOnError: true, stages },
      guide: { target: false, turns: true, dir: true },
      puzzle: { kind: 'typewriter', typed, shift: shift * sign, steps: stages.map((s) => [s.dir, s.turns]) },
      body: [
        memo('繕打本', proc(stepsOf(stages, (s, i) => typed[i])), { cls: 'typed' }),
        p(`本份文件之打字機故障：每個數字鍵打出的數字都比按下的數字<b>${sign > 0 ? '大' : '小'} ${shift}</b>（${sign > 0 ? '超過 9 時從 0 接續' : '低於 0 時從 9 接續'}）。方向字母與圈數不受影響。`),
      ],
    };
  },

  log(r) {
    const start = r.int(0, 99);
    let pos = start;
    let dir = r.sign();
    const moves = [];
    const stages = [];
    const turns = [r.int(2, 3), r.int(1, 2), r.int(0, 1)];
    for (let i = 0; i < 3; i++) {
      const extra = r.int(5, 95);
      moves.push([dir, turns[i], extra]);
      pos = mod(pos + dir * extra, 100);
      stages.push({ dir, turns: turns[i], target: pos });
      dir = -dir;
    }
    const word = (d) => (d > 0 ? '向右' : '向左');
    return {
      title: '交接日誌',
      lockSpec: { resetOnError: true, stages },
      guide: { target: false, turns: true, dir: true },
      puzzle: { kind: 'log', start, moves },
      body: [
        memo('交接日誌（手寫）', [
          p(`先把轉盤${word(moves[0][0])}轉到 <b>${pad2(start)}</b>。`),
          ...moves.map(([d, t, e]) => p(`${word(d)}轉 ${t ? `${t} 圈，再多轉 ` : ''}${e} 格。按確認。`)),
          p('拉把手。'),
        ].join(''), { cls: 'hand' }),
        p('動作照做即可，數字由轉盤自己決定。'),
      ],
    };
  },

  listen(r, { near = false, rhythm = false } = {}) {
    const targets = distinctTargets(r, 3, 12);
    const stages = stagesFrom(r, targets).map((s) => ({ ...s, gate: { tone: 'mid', proximity: near, rhythm } }));
    const knownLast = !rhythm && r.chance(0.4);
    if (knownLast) stages[2].gate = null;
    return {
      title: rhythm ? '死點檢查' : near ? '預響檢查' : '共鳴檢查',
      lockSpec: { resetOnError: true, strict: near && r.chance(0.5), stages },
      guide: { target: false, turns: true, dir: true },
      meter: true,
      puzzle: { kind: rhythm ? 'rhythm' : near ? 'near' : 'listen', known: knownLast ? stages[2].target : null },
      body: [
        p(rhythm
          ? '本型號之閘口：正確刻度前後各四格為雙響，正確刻度本身無聲。'
          : near
            ? '本型號之閘口附有預響：接近正確刻度三格內，聲音逐漸增強。'
            : '本型號之閘口：朝該階段方向、以適當速度經過正確刻度時，發出空心共鳴。'),
        proc(stepsOf(stages, (s, i) => (s.gate ? '??' : s.target)), { caption: '本案程序' }),
      ],
    };
  },

  inventory(r) {
    const targets = distinctTargets(r, 3);
    const stages = stagesFrom(r, targets);
    const names = ['迴紋針', '鉛筆', '橡皮筋', '便條紙', '訂書針', '印泥', '紙箱', '膠帶', '信封', '圖釘'];
    const units = ['盒', '支', '條', '本', '排', '盒', '個', '卷', '個', '盒'];
    const rows = [];
    const pool = names.map((n, i) => [n, units[i]]);
    // Shuffle and pick 8 rows, 3 of which carry the stamp, in order.
    for (let i = pool.length - 1; i > 0; i--) {
      const j = r.int(0, i);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const stampRows = [r.int(0, 1), r.int(2, 4), r.int(5, 7)];
    for (let i = 0; i < 8; i++) {
      const k = stampRows.indexOf(i);
      const qty = k >= 0 ? targets[k] : r.int(0, 240);
      rows.push({ name: pool[i][0], unit: pool[i][1], qty, stamped: k >= 0 });
    }
    return {
      title: '庫存清點',
      lockSpec: { resetOnError: true, stages },
      guide: { target: false, turns: true, dir: true },
      puzzle: { kind: 'inventory', rows: rows.map((x) => [x.qty, x.stamped]) },
      body: [
        p('依由上而下的順序，取出蓋有「' + mark('密') + '」字章之品項數量。'),
        proc(stepsOf(stages, (s, i) => '①②③'[i]), { caption: '本案程序' }),
        table([['品項', '單位', '數量', ''], ...rows.map((x) => [x.name, x.unit, pad2(x.qty), x.stamped ? mark('密') : ''])], { cls: 'inv' }),
      ],
    };
  },
};

export function shiftDigits(n, k) {
  const s = pad2(n);
  return [...s].map((d) => String(mod(Number(d) + k, 10))).join('');
}

// Picks the artifact for a commission. Prefers things the employee has not seen yet,
// so a long streak of potatoes cannot happen unless the Bureau insists.
export function pickArtifact(r, owned = {}) {
  const pool = ARTIFACTS.filter((a) => !EXCLUSIVE.has(a.id));
  const fresh = pool.filter((a) => !owned[a.id]);
  const from = fresh.length && r.chance(0.65) ? fresh : pool;
  return r.weighted(from.map((a) => [a.id, RARITIES[a.rarity].weight])) || pool[0].id;
}

export function generateCommission(date, index, { owned = {} } = {}) {
  const r = rng('bup-daily', date, index);
  const kind = KINDS[hash32(date, index, 'kind') % KINDS.length];
  const gen =
    kind === 'listen-near' ? GEN.listen(r, { near: true })
      : kind === 'rhythm' ? GEN.listen(r, { rhythm: true })
        : GEN[kind](r);
  const place = r.pick(PLACES);
  const reason = r.pick(REASONS)(r.int(3, 60));
  const number = `D${date.replace(/-/g, '').slice(2)}-${index + 1}`;
  const look = r.pick(LOOKS);
  const ar = rng('bup-daily-artifact', date, index);
  return {
    id: `D-${date}-${index}`,
    daily: true,
    number,
    act: 0,
    kind,
    look,
    title: `${gen.title}：${place}`,
    guide: gen.guide,
    meter: Boolean(gen.meter),
    artifact: pickArtifact(ar, owned),
    lockSpec: gen.lockSpec,
    lock: () => gen.lockSpec,
    puzzle: gen.puzzle,
    brief: () => [p(`地點：${place}。`), p(reason), ...gen.body, note(`委託編號 ${number}。本委託每日更新。`)].join(''),
    success: ['確認。', '例行委託完成。內容物仍然存在，這令人放心，也令人不解。'],
  };
}
