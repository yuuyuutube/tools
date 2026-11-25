import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateCommission, shiftDigits, dateKey } from '../src/game/daily.js';
import { mod, Lock } from '../src/core/lock-state-machine.js';
import { play, sweep } from './helpers.js';

const DATES = ['2026-11-25', '2026-01-01', '2027-02-28', '2030-07-14', '2026-12-31'];
const ALL = [];
for (const d of DATES) for (let i = 0; i < 60; i++) ALL.push(generateCommission(d, i));

// Re-derive the combination from the printed clue data only.
function derive(m) {
  const z = m.puzzle;
  switch (z.kind) {
    case 'procedure':
      return z.steps.map((s) => s[2]);
    case 'redacted': {
      const third = (z.sum - z.known) / (z.ratio + 1);
      return [third * z.ratio, z.known, third];
    }
    case 'typewriter':
      return z.typed.map((s) => Number(shiftDigits(Number(s), -z.shift)));
    case 'log': {
      let pos = z.start;
      return z.moves.map(([d, , e]) => (pos = mod(pos + d * e, 100)));
    }
    case 'inventory':
      return z.rows.filter((r) => r[1]).map((r) => r[0]);
    default:
      return null; // listening kinds: found by ear, checked below
  }
}

test('same date and index always produce the same commission', () => {
  const a = generateCommission('2026-11-25', 1);
  const b = generateCommission('2026-11-25', 1);
  assert.deepEqual(a.lockSpec, b.lockSpec);
  assert.equal(a.brief(), b.brief());
  assert.notDeepEqual(generateCommission('2026-11-26', 1).lockSpec, a.lockSpec);
});

test('every generated commission is solvable from its paperwork', () => {
  const kinds = new Set();
  for (const m of ALL) {
    kinds.add(m.kind);
    const spec = m.lockSpec;
    const expected = derive(m);
    if (expected) assert.deepEqual(spec.stages.map((s) => s.target), expected, `${m.id} (${m.kind})`);
    for (const start of [0, 63]) {
      const { lock, results } = play(spec, { startAbs: start });
      assert.ok(results.every((r) => r.ok), `${m.id} ${m.kind} from ${start}`);
      assert.equal(lock.phase, 'open');
    }
  }
  assert.ok(kinds.size >= 7, `variety: ${[...kinds]}`);
});

test('listening commissions: each hidden number has exactly one audible gate', () => {
  for (const m of ALL.filter((x) => x.meter)) {
    m.lockSpec.stages.forEach((stage, si) => {
      if (!stage.gate) {
        assert.ok(m.brief().includes(String(stage.target).padStart(2, '0')), `${m.id} prints the known number`);
        return;
      }
      const lock = new Lock(m.lockSpec);
      lock.stageIndex = si;
      const { hits } = sweep(lock, stage.dir, { kinds: [stage.gate.rhythm ? 'dead' : 'gate'] });
      assert.deepEqual(hits.map((h) => h.pos), [stage.target], `${m.id} stage ${si}`);
    });
  }
});

test('no exclusive artifact leaks into routine work', () => {
  for (const m of ALL) assert.ok(!['artifact-013', 'artifact-015', 'artifact-027'].includes(m.artifact));
});

test('commissions prefer artifacts the employee has not seen', () => {
  const owned = {};
  let fresh = 0;
  for (let i = 0; i < 40; i++) {
    const m = generateCommission('2026-11-25', i, { owned });
    if (!owned[m.artifact]) fresh += 1;
    owned[m.artifact] = { count: 1 };
  }
  assert.ok(fresh >= 15, `fresh ${fresh}`);
});

test('date keys are local calendar days', () => {
  assert.equal(dateKey(new Date(2026, 10, 5)), '2026-11-05');
});
