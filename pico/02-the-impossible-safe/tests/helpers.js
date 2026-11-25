import { Lock, solutionMoves } from '../src/core/lock-state-machine.js';

// Plays a lock the way a careful person would: one graduation at a time, `gap` ms apart,
// confirming at each stop. Returns { lock, results, events }.
export function play(spec, { startAbs = 0, gap = 160, fastGap = 25 } = {}) {
  const lock = new Lock(spec, { startAbs, t: 0 });
  let t = 0;
  const results = [];
  const events = [];
  const brisk = Boolean(lock.spec.patience);
  for (const mv of solutionMoves(spec, startAbs)) {
    if (mv.wakeDone) continue;
    if (mv.confirm) {
      t += 10;
      results.push(lock.confirm(t));
      continue;
    }
    const dir = Math.sign(mv.n);
    const n = Math.abs(mv.n);
    for (let i = 0; i < n; i++) {
      t += brisk ? fastGap : gap;
      events.push(...lock.rotate(dir, t));
    }
  }
  return { lock, results, events };
}

// Sweeps one full slow revolution in `dir` from the current state and returns
// the positions where a resonance of the given kinds fired.
export function sweep(lock, dir, { gap = 160, t0 = 0, kinds = ['gate'] } = {}) {
  const hits = [];
  let t = t0;
  for (let i = 0; i < lock.size; i++) {
    t += gap;
    for (const e of lock.rotate(dir, t)) if (e.type === 'resonance' && kinds.includes(e.kind)) hits.push({ pos: e.pos, tone: e.tone, decoy: Boolean(e.decoy) });
  }
  return { hits, t };
}
