import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MISSIONS, MISSION_BY_ID, lockSpecsOf, missionUnlocked, voidNumbers } from '../src/game/missions.js';
import { ARTIFACTS, ARTIFACT_BY_ID } from '../src/game/artifacts.js';
import { mod, Lock } from '../src/core/lock-state-machine.js';
import { play, sweep } from './helpers.js';

const targets = (spec) => spec.stages.map((s) => s.target);
const ctx = { distinct: 23, opened: 41, potatoes: 2 };

test('the campaign has the promised shape', () => {
  const count = (k) => MISSIONS.filter((m) => m.kind === k).length;
  assert.equal(count('tutorial'), 3);
  assert.equal(count('mechanical'), 5);
  assert.equal(count('sensory'), 5);
  assert.ok(count('special') >= 4);
  assert.equal(new Set(MISSIONS.map((m) => m.id)).size, MISSIONS.length);
  for (const m of MISSIONS) assert.ok(ARTIFACT_BY_ID[m.artifact], `${m.id} reward exists`);
  assert.equal(MISSION_BY_ID.M001.artifact, 'artifact-001', 'the first safe holds the potato');
});

test('every main-line lock opens with its own procedure, from several starting positions', () => {
  for (const m of MISSIONS) {
    for (const spec of lockSpecsOf(m, ctx)) {
      for (const start of [0, 37, 99, -512]) {
        const { lock, results } = play(spec, { startAbs: start });
        assert.ok(results.every((r) => r.ok), `${m.id} from ${start}: ${JSON.stringify(results.find((r) => !r.ok))}`);
        assert.equal(lock.phase, 'open', m.id);
      }
    }
  }
});

test('mechanical clues produce exactly the combination', () => {
  const t4 = targets(MISSION_BY_ID.M004.lock());
  const pz4 = MISSION_BY_ID.M004.puzzle;
  const third = (pz4.sum - pz4.known) / (pz4.ratio + 1);
  assert.deepEqual(t4, [third * pz4.ratio, pz4.known, third]);

  const pz5 = MISSION_BY_ID.M005.puzzle;
  const untype = (n) => Number([...String(n).padStart(2, '0')].map((d) => mod(Number(d) - pz5.shift, 10)).join(''));
  assert.deepEqual(targets(MISSION_BY_ID.M005.lock()), pz5.typed.map(untype));

  const pz6 = MISSION_BY_ID.M006.puzzle;
  let pos = pz6.start;
  const expect6 = pz6.moves.map(([d, , extra]) => (pos = mod(pos + d * extra, 100)));
  assert.deepEqual(targets(MISSION_BY_ID.M006.lock()), expect6);

  // Inventory: read the stamped rows straight out of the printed table.
  const html = MISSION_BY_ID.M007.brief();
  const rows = [...html.matchAll(/<tr><th>[^<]*<\/th><td>[^<]*<\/td><td>(\d+)<\/td><td>(.*?)<\/td><\/tr>/g)];
  const stamped = rows.filter((r) => r[2].includes('密')).map((r) => Number(r[1]));
  assert.deepEqual(targets(MISSION_BY_ID.M007.lock()), stamped);

  const c = MISSION_BY_ID.M008.puzzle.copies;
  const spec8 = MISSION_BY_ID.M008.lock();
  assert.deepEqual(targets(spec8), [c.white[0][2], c.pink[1][2], c.yellow[2][2]]);
  assert.deepEqual(spec8.stages.map((s) => [s.dir, s.turns]), c.yellow.map(([d, t]) => [d, t]));

  const pz16 = MISSION_BY_ID.M016.puzzle;
  const first = pz16.first + pz16.plus;
  assert.deepEqual(targets(MISSION_BY_ID.M016.lock()), [first, first / 2, Number(MISSION_BY_ID.M016.number)]);

  assert.deepEqual(targets(MISSION_BY_ID.M019.lock()), [MISSION_BY_ID.M019.puzzle.years]);
});

test('every hidden number in a listening safe has a gate that can be heard', () => {
  for (const m of MISSIONS) {
    const specs = lockSpecsOf(m, ctx);
    const levels = m.levels || [m];
    specs.forEach((spec, li) => {
      const guide = levels[li].guide || m.guide;
      if (guide.target) return;
      if (!m.meter && !levels[li].meter) return;
      spec.stages.forEach((stage, si) => {
        const html = typeof m.brief === 'function' ? m.brief(ctx) : '';
        if (!stage.gate) {
          assert.ok(html.includes(String(stage.target).padStart(2, '0')), `${m.id} stage ${si} without a gate must be printed`);
          return;
        }
        // Bring a fresh lock to this stage, then listen for one slow revolution.
        const lock = new Lock({ ...spec, shy: spec.shy, wake: null, patience: null }, { startAbs: 0 });
        lock.stageIndex = si;
        lock.stageStart = 0;
        const kinds = stage.gate.rhythm ? ['dead'] : ['gate'];
        const { hits } = sweep(lock, stage.dir, { gap: 170, kinds });
        const real = hits.filter((h) => !h.decoy);
        assert.deepEqual(real.map((h) => h.pos), [stage.target], `${m.id} stage ${si}`);
        for (const d of hits.filter((h) => h.decoy)) assert.notEqual(d.tone, stage.gate.tone, `${m.id} decoys sound different`);
      });
    });
  }
});

test('safe 000 builds its combination from the archive', () => {
  const spec = lockSpecsOf(MISSION_BY_ID.M000, ctx)[0];
  const v = voidNumbers(ctx);
  assert.deepEqual(targets(spec), [23, 41, 0]);
  assert.equal(spec.stages[0].turns, v.turns);
  assert.equal(voidNumbers({ distinct: 30, opened: 130, potatoes: 9 }).b, 30);
});

test('unlock order: acts in sequence, act 3 in any order, 000 last', () => {
  const done = new Set();
  const isComplete = (id) => done.has(id);
  assert.equal(missionUnlocked(MISSION_BY_ID.M001, isComplete), true);
  assert.equal(missionUnlocked(MISSION_BY_ID.M002, isComplete), false);
  for (const m of MISSIONS.slice(0, 13)) done.add(m.id);
  for (const id of ['M014', 'M015', 'M016', 'M017', 'M018', 'M019']) assert.ok(missionUnlocked(MISSION_BY_ID[id], isComplete));
  assert.equal(missionUnlocked(MISSION_BY_ID.M000, isComplete), false);
  for (const id of ['M014', 'M015', 'M016', 'M017', 'M018', 'M019']) done.add(id);
  assert.equal(missionUnlocked(MISSION_BY_ID.M000, isComplete), true);
});

test('there are at least 30 artifacts, each fully documented', () => {
  assert.ok(ARTIFACTS.length >= 30);
  for (const a of ARTIFACTS) {
    for (const k of ['id', 'name', 'rarity', 'category', 'securityLevel', 'condition', 'description', 'unit']) assert.ok(a[k], `${a.id}.${k}`);
  }
});
