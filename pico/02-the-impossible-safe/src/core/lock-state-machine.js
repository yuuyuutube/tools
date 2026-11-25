// The Bureau Standard Combination Mechanism (BSP-3). Pure logic: no DOM, no audio, no clock.
// Every method takes the time `t` in milliseconds so tests can replay a session exactly.
//
// Direction convention: +1 = clockwise = "R / 右旋" = the reading under the index increases.
//
// A stage is satisfied when, since the stage began, the dial has travelled a net distance of
// at least `turns` full revolutions in the stage direction and the index now rests on `target`.
// Net travel is used (not raw travel) so that nudging back by a couple of numbers after an
// overshoot never destroys the turns already made — unless the safe is `strict`.

export const mod = (n, m) => ((n % m) + m) % m;

// Shortest signed distance from a to b on a ring of size m.
export function ringDistance(a, b, m) {
  const d = mod(b - a, m);
  return d > m / 2 ? d - m : d;
}

const SPEED_WINDOW = 300; // ms

export class DialTracker {
  constructor({ size = 100, abs = 0 } = {}) {
    this.size = size;
    this.abs = abs;
    this.direction = 0;
    this.directionChanges = 0;
    this.runLength = 0; // numbers moved since the last change of direction
    this.totalTravel = 0;
    this.samples = []; // { t, n }
  }

  get position() {
    return mod(this.abs, this.size);
  }

  get completedTurns() {
    return Math.floor(this.totalTravel / this.size);
  }

  speed(t) {
    if (this.samples.length && t < this.samples[this.samples.length - 1].t) this.samples.length = 0;
    while (this.samples.length && t - this.samples[0].t > SPEED_WINDOW) this.samples.shift();
    let sum = 0;
    for (const s of this.samples) sum += s.n;
    return sum / (SPEED_WINDOW / 1000);
  }

  // Moves by an integer number of graduations. Returns every graduation landed on, in order.
  move(n, t) {
    if (!Number.isInteger(n) || n === 0) return { crossed: [], dir: 0, reversed: false };
    const dir = Math.sign(n);
    const reversed = this.direction !== 0 && dir !== this.direction;
    if (reversed) {
      this.directionChanges += 1;
      this.runLength = 0;
    }
    this.direction = dir;
    const crossed = [];
    for (let i = 0; i < Math.abs(n); i++) {
      this.abs += dir;
      crossed.push(this.position);
    }
    this.runLength += Math.abs(n);
    this.totalTravel += Math.abs(n);
    if (this.samples.length && t < this.samples[this.samples.length - 1].t) this.samples.length = 0;
    this.samples.push({ t, n: Math.abs(n) });
    this.speed(t);
    return { crossed, dir, reversed };
  }
}

export const DEFAULT_SPEED_LIMIT = 24; // graduations per second; faster spinning hides resonance

export function normaliseSpec(spec) {
  return {
    size: 100,
    strict: false,
    tolerance: 3,
    resetOnError: false,
    speedLimit: DEFAULT_SPEED_LIMIT,
    gear: 1,
    wake: null,
    patience: null,
    shy: null,
    ...spec,
    stages: spec.stages.map((s) => ({ turns: 0, gate: null, ...s })),
  };
}

export class Lock {
  constructor(spec, { startAbs = 0, t = 0 } = {}) {
    this.spec = normaliseSpec(spec);
    this.dial = new DialTracker({ size: this.spec.size, abs: startAbs });
    this.gearAcc = 0;
    this.phase = this.spec.wake ? 'wake' : 'dial';
    this.stageIndex = 0;
    this.stageStart = startAbs;
    this.reverseRun = 0; // strict mode: graduations moved against the stage direction
    this.failures = 0;
    this.lastT = t;
    this.lastMoveT = t;
    // Sleeping safe
    this.swings = 0;
    this.swingRun = 0;
    this.swingDir = 0;
    // Impatient safe
    this.patience = this.spec.patience ? 1 : null;
    // Shy safe
    this.withdrawnUntil = -Infinity;
    this.lastTooFast = -Infinity;
  }

  get size() {
    return this.spec.size;
  }

  get stage() {
    return this.spec.stages[this.stageIndex] || null;
  }

  get position() {
    return this.dial.position;
  }

  get abs() {
    return this.dial.abs;
  }

  // Net travel in the current stage direction since the stage began.
  get net() {
    const stage = this.stage;
    if (!stage) return 0;
    return (this.dial.abs - this.stageStart) * stage.dir;
  }

  get turnsDone() {
    return Math.max(0, Math.floor(this.net / this.size));
  }

  // Time-based behaviour (patience draining, shyness recovering). Call every frame.
  update(t) {
    const dt = Math.max(0, t - this.lastT) / 1000;
    this.lastT = t;
    const events = [];
    const p = this.spec.patience;
    if (p && this.phase === 'dial') {
      const idle = t - this.lastMoveT > 120 || this.dial.speed(t) < p.brisk;
      if (idle) {
        const before = this.patience;
        this.patience = Math.max(0, this.patience - p.drain * dt);
        if (before > 0 && this.patience === 0) {
          if (this.net !== 0) {
            this.stageStart = this.dial.abs;
            events.push({ type: 'bored' });
          } else {
            events.push({ type: 'bored', quiet: true });
          }
        }
      }
    }
    return events;
  }

  // n: integer graduations requested by the input layer. Returns a list of events.
  rotate(n, t) {
    const events = [];
    if (!Number.isInteger(n) || n === 0 || this.phase === 'open') return events;
    events.push(...this.update(t));

    // A reluctant mechanism (the retired safe) only moves a fraction of what it is asked to.
    let steps = n;
    if (this.spec.gear !== 1) {
      this.gearAcc += n * this.spec.gear;
      steps = Math.trunc(this.gearAcc);
      this.gearAcc -= steps;
      if (steps === 0) {
        events.push({ type: 'slip' });
        return events;
      }
    }

    const speedBefore = this.dial.speed(t);
    const { crossed, dir, reversed } = this.dial.move(steps, t);
    const speed = Math.max(speedBefore, this.dial.speed(t));
    this.lastMoveT = t;
    if (reversed) events.push({ type: 'reverse', dir });

    if (this.phase === 'wake') {
      events.push(...this.wakeStep(Math.abs(steps), dir, reversed));
    } else if (this.phase === 'handle') {
      // Turning after alignment scrambles the wheels again.
      if (Math.abs(this.dial.abs - this.alignedAbs) > this.spec.tolerance) {
        this.stageIndex = this.spec.stages.length - 1;
        this.phase = 'dial';
        this.stageStart = this.lastStageStart;
        events.push({ type: 'unaligned' });
      }
    }

    const stage = this.phase === 'dial' ? this.stage : null;

    if (stage && this.spec.strict) {
      if (dir === stage.dir) this.reverseRun = 0;
      else {
        const before = this.reverseRun;
        this.reverseRun += Math.abs(steps);
        if (this.reverseRun > this.spec.tolerance) {
          // Travel only starts counting again once the dial turns the right way.
          const hadTravel = this.net > 0;
          this.stageStart = this.dial.abs;
          if (before <= this.spec.tolerance && hadTravel) events.push({ type: 'travel-reset' });
        }
      }
    }

    if (stage && this.patience !== null) {
      if (speed >= this.spec.patience.brisk) this.patience = Math.min(1, this.patience + this.spec.patience.refill * Math.abs(steps));
    }

    const shy = this.spec.shy;
    const limit = shy ? shy.limit : this.spec.speedLimit;
    let tooFast = speed > limit;
    if (shy && tooFast) this.withdrawnUntil = t + shy.withdrawMs;
    const withdrawn = shy && t < this.withdrawnUntil;

    for (const pos of crossed) {
      const tick = { type: 'tick', pos, dir, speed, silent: false };
      events.push(tick);
      if (!stage || !stage.gate) continue;
      if (tooFast || withdrawn) continue;
      const res = this.resonanceAt(stage, pos, dir);
      if (res) {
        if (res.kind === 'dead') tick.silent = true;
        events.push({ type: 'resonance', pos, ...res });
      }
    }

    if (stage && stage.gate && (tooFast || withdrawn) && t - this.lastTooFast > 900) {
      this.lastTooFast = t;
      events.push({ type: withdrawn && !tooFast ? 'withdrawn' : 'too-fast', speed });
    }
    return events;
  }

  // The fictional resonance gates. Same state → same answer, always.
  resonanceAt(stage, pos, dir) {
    const gate = stage.gate;
    if (dir !== stage.dir) return null;
    const d = Math.abs(ringDistance(pos, stage.target, this.size));
    if (gate.rhythm) {
      if (d === 0) return { kind: 'dead', strength: 1, tone: gate.tone || 'mid' };
      if (d <= 4) return { kind: 'double', strength: 0.5, tone: gate.tone || 'mid' };
    } else {
      if (d === 0) return { kind: 'gate', strength: 1, tone: gate.tone || 'mid' };
      if (gate.proximity && d <= 3) return { kind: 'near', strength: 0.62 - 0.17 * (d - 1), tone: gate.tone || 'mid' };
    }
    for (const decoy of gate.decoys || []) {
      if (decoy.number === pos) return { kind: 'gate', strength: 1, tone: decoy.tone, decoy: true };
    }
    return null;
  }

  wakeStep(steps, dir, reversed) {
    const w = this.spec.wake;
    const events = [];
    if (reversed) {
      // A finished swing in one direction.
      if (this.swingRun >= w.min && this.swingRun <= w.max) {
        this.swings += 1;
        events.push({ type: 'rock', swings: this.swings });
      }
      this.swingRun = 0;
    }
    this.swingRun += steps;
    if (this.swingRun > w.max) {
      if (this.swings > 0) events.push({ type: 'startled' });
      this.swings = 0;
    }
    if (this.swings >= w.swings) {
      this.phase = 'dial';
      this.stageStart = this.dial.abs;
      this.reverseRun = 0;
      events.push({ type: 'awake' });
    }
    return events;
  }

  // The short press. Returns { ok, reason?, stageDone?, aligned?, opened? }.
  confirm(t) {
    this.update(t);
    if (this.phase === 'open') return { ok: false, reason: 'already-open' };
    if (this.phase === 'wake') return { ok: false, reason: 'asleep' };
    if (this.phase === 'handle') {
      this.phase = 'open';
      return { ok: true, opened: true };
    }
    const stage = this.stage;
    const net = this.net;
    let reason = null;
    if (this.position !== stage.target) reason = 'wrong-number';
    else if (net < 0) reason = 'wrong-direction';
    else if (Math.floor(net / this.size) < stage.turns) reason = 'not-enough-turns';

    if (reason) {
      this.failures += 1;
      const result = {
        ok: false,
        reason,
        stageIndex: this.stageIndex,
        offBy: ringDistance(this.position, stage.target, this.size),
        turnsDone: this.turnsDone,
      };
      if (this.spec.resetOnError) {
        this.stageIndex = 0;
        this.stageStart = this.dial.abs;
        this.reverseRun = 0;
        result.reset = true;
      }
      return result;
    }

    const done = this.stageIndex;
    const startedAt = this.stageStart;
    this.stageIndex += 1;
    this.stageStart = this.dial.abs;
    this.reverseRun = 0;
    if (this.patience !== null) this.patience = 1;
    if (this.stageIndex >= this.spec.stages.length) {
      this.phase = 'handle';
      this.alignedAbs = this.dial.abs;
      this.lastStageStart = startedAt;
      return { ok: true, stageDone: done, aligned: true };
    }
    return { ok: true, stageDone: done };
  }

  reset(t) {
    const abs = this.dial.abs;
    const spec = this.spec;
    Object.assign(this, new Lock(spec, { startAbs: abs, t }));
  }

  snapshot(t) {
    const stage = this.stage;
    return {
      phase: this.phase,
      stageIndex: this.stageIndex,
      stageCount: this.spec.stages.length,
      stage,
      position: this.position,
      abs: this.dial.abs,
      net: this.net,
      turnsDone: this.turnsDone,
      onTarget: stage ? this.position === stage.target : false,
      direction: this.dial.direction,
      directionChanges: this.dial.directionChanges,
      speed: this.dial.speed(t),
      patience: this.patience,
      withdrawn: this.spec.shy ? t < this.withdrawnUntil : false,
      swings: this.swings,
      failures: this.failures,
    };
  }
}

// The canonical way to open a lock from its current state: used by tests and by the
// generator's solvability check. Returns a list of integer moves (one graduation each when slow).
export function solutionMoves(spec, startAbs = 0) {
  const s = normaliseSpec(spec);
  const moves = [];
  let abs = startAbs;
  if (s.wake) {
    const amp = Math.max(s.wake.min, Math.min(s.wake.max, 4));
    for (let i = 0; i <= s.wake.swings; i++) {
      const dir = i % 2 === 0 ? 1 : -1;
      moves.push({ n: dir * amp, slow: true });
      abs += dir * amp;
    }
    moves.push({ wakeDone: true });
  }
  for (const stage of s.stages) {
    const pos = mod(abs, s.size);
    let dist = mod((stage.target - pos) * stage.dir, s.size);
    dist += stage.turns * s.size;
    // Input units: a reluctant gear needs proportionally more turning.
    moves.push({ n: Math.round((dist * stage.dir) / s.gear), slow: Boolean(stage.gate) });
    abs += dist * stage.dir;
    moves.push({ confirm: true });
  }
  moves.push({ confirm: true }); // the handle
  return moves;
}
