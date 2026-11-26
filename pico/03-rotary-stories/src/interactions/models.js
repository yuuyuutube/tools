// Rotary interaction models. Pure: no DOM, no audio, no clock of their own.
//
// Each model takes knob degrees through turn(deg, info) and returns a list of events the
// scene turns into sound and pictures; update(dt) advances any physics. A scene usually owns
// one or two of these. They are deliberately small: a new story adds its own model rather
// than bending these into a general-purpose engine.
//
//   Handwheel      — multi-turn, bounded travel with a ratchet; a heavy load follows with lag
//   DetentSelector — discrete positions (years, tapes, books) with a sprung settle
//   BoundedDial    — a finite continuous parameter (focus, zoom)
//   CyclicDial     — an endless angle (camera azimuth)
//   Flywheel       — a heavy scroll that keeps coasting after a flick (a ledger, a reel)

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Critically damped spring step toward a target. Returns [x, v].
export function springStep(x, v, target, dt, stiffness, damping) {
  // Semi-implicit Euler in small sub-steps keeps stiff springs stable at low frame rates.
  const steps = Math.max(1, Math.ceil(dt / (1 / 240)));
  const h = dt / steps;
  for (let i = 0; i < steps; i++) {
    const a = -stiffness * (x - target) - damping * v;
    v += a * h;
    x += v * h;
  }
  return [x, v];
}

// ---------------------------------------------------------------------------------------------

export class Handwheel {
  // turns: full wheel revolutions from closed to open. toothDeg: ratchet pitch.
  // The wheel angle follows the hand exactly; the load (shutter) lags behind with weight.
  constructor({ turns = 4, toothDeg = 15, stiffness = 14, damping = 7.5, position = 0 } = {}) {
    this.range = turns * 360;
    this.toothDeg = toothDeg;
    this.stiffness = stiffness;
    this.damping = damping;
    this.wheel = clamp(position, 0, 1) * this.range; // degrees
    this.load = clamp(position, 0, 1);
    this.loadV = 0;
    this.kick = 0; // visual recoil of the wheel at an end stop (degrees)
    this.kickV = 0;
    this.pressing = 0; // how hard the hand pushes into an end stop, for the strain sound
  }

  get target() {
    return this.wheel / this.range;
  }

  get open() {
    return this.load;
  }

  turn(deg) {
    const events = [];
    if (!deg) return events;
    const before = this.wheel;
    let next = before + deg;
    if (next > this.range) {
      if (before < this.range) events.push({ type: 'limit', end: 'open', force: Math.min(1, Math.abs(deg) / 40) });
      else this.pressing = Math.min(1, this.pressing + Math.abs(deg) / 90);
      this.kickV -= Math.min(Math.abs(deg), 30) * 6;
      next = this.range;
    } else if (next < 0) {
      if (before > 0) events.push({ type: 'limit', end: 'closed', force: Math.min(1, Math.abs(deg) / 40) });
      else this.pressing = Math.min(1, this.pressing + Math.abs(deg) / 90);
      this.kickV += Math.min(Math.abs(deg), 30) * 6;
      next = 0;
    }
    // One event per ratchet tooth crossed, in order, so fast Pico bursts are never collapsed.
    const t0 = Math.floor(before / this.toothDeg);
    const t1 = Math.floor(next / this.toothDeg);
    const n = Math.abs(t1 - t0);
    for (let i = 0; i < n; i++) events.push({ type: 'tooth', dir: Math.sign(next - before), index: Math.min(t0, t1) + i });
    this.wheel = next;
    return events;
  }

  update(dt) {
    [this.load, this.loadV] = springStep(this.load, this.loadV, this.target, dt, this.stiffness, this.damping);
    if (this.load < 0) {
      this.load = 0;
      this.loadV = 0;
    } else if (this.load > 1) {
      this.load = 1;
      this.loadV = 0;
    }
    [this.kick, this.kickV] = springStep(this.kick, this.kickV, 0, dt, 320, 18);
    this.pressing *= Math.exp(-dt * 6);
  }

  get wheelAngle() {
    return this.wheel + this.kick;
  }

  get loadSpeed() {
    return Math.abs(this.loadV);
  }

  setPosition(p) {
    this.wheel = clamp(p, 0, 1) * this.range;
    this.load = clamp(p, 0, 1);
    this.loadV = 0;
  }
}

// ---------------------------------------------------------------------------------------------

export class DetentSelector {
  // stepDeg: knob degrees per position. accel(speedDegPerSec) → multiplier for fast spins.
  // skip(i) → true for positions that exist on the scale but are passed over (empty slots).
  constructor({ count, index = 0, stepDeg = 18, wrap = false, stiffness = 260, damping = 24, accel = null, skip = null } = {}) {
    this.count = count;
    this.index = clamp(index, 0, count - 1);
    this.stepDeg = stepDeg;
    this.wrap = wrap;
    this.stiffness = stiffness;
    this.damping = damping;
    this.accel = accel;
    this.skip = skip;
    this.acc = 0; // pending degrees not yet a whole step
    this.pos = this.index; // displayed (sprung) position
    this.vel = 0;
    this.dragging = false;
  }

  setCount(count, index = this.index) {
    this.count = count;
    this.index = clamp(index, 0, count - 1);
    this.pos = this.index;
    this.vel = 0;
    this.acc = 0;
  }

  jump(index) {
    this.index = clamp(index, 0, this.count - 1);
    this.acc = 0;
  }

  turn(deg, info = {}) {
    const events = [];
    if (!deg) return events;
    this.dragging = Boolean(info.continuous);
    const mult = this.accel ? this.accel(Math.abs(info.speed || 0)) : 1;
    this.acc += deg;
    let steps = Math.trunc(this.acc / this.stepDeg);
    this.acc -= steps * this.stepDeg;
    if (!steps) return events;
    steps *= mult;
    const dir = Math.sign(steps);
    for (let i = 0; i < Math.abs(steps); i++) {
      let next = this.index + dir;
      while (this.skip && next >= 0 && next < this.count && this.skip(next)) {
        events.push({ type: 'skip', index: next });
        next += dir;
      }
      if (this.wrap) next = ((next % this.count) + this.count) % this.count;
      if (next < 0 || next >= this.count) {
        events.push({ type: 'limit', end: next < 0 ? 'start' : 'end' });
        this.vel += dir * 6;
        this.acc = 0;
        break;
      }
      this.index = next;
      events.push({ type: 'step', index: next, dir });
    }
    return events;
  }

  // Fraction of the next step already dialled in (for crossfades while dragging).
  get partial() {
    return this.acc / this.stepDeg;
  }

  update(dt) {
    let target = this.index;
    if (this.dragging) target += clamp(this.partial, -0.95, 0.95);
    if (this.wrap) {
      // Take the short way round when the index wraps.
      const d = target - this.pos;
      if (Math.abs(d) > this.count / 2) this.pos += Math.sign(d) * this.count;
    }
    [this.pos, this.vel] = springStep(this.pos, this.vel, target, dt, this.stiffness, this.damping);
  }

  release() {
    this.dragging = false;
    // A drag that ends past the half-way mark completes the step.
    const events = [];
    if (Math.abs(this.partial) >= 0.5) events.push(...this.turn(Math.sign(this.acc) * (this.stepDeg - Math.abs(this.acc) + 0.001)));
    this.acc = 0;
    return events;
  }
}

// ---------------------------------------------------------------------------------------------

export class BoundedDial {
  // degPerRange: knob degrees to sweep the whole range. tickDeg: knob degrees between ticks.
  constructor({ value = 0, min = 0, max = 1, degPerRange = 720, tickDeg = 9, curve = null } = {}) {
    this.min = min;
    this.max = max;
    this.value = clamp(value, min, max);
    this.degPerRange = degPerRange;
    this.tickDeg = tickDeg;
    this.curve = curve; // optional (speed) → multiplier
    this.tickAcc = 0;
  }

  setSensitivity(degPerRange) {
    this.degPerRange = degPerRange;
  }

  turn(deg, info = {}) {
    const events = [];
    if (!deg) return events;
    const mult = this.curve ? this.curve(Math.abs(info.speed || 0)) : 1;
    const before = this.value;
    let next = before + (deg * mult * (this.max - this.min)) / this.degPerRange;
    if (next > this.max || next < this.min) {
      const end = next > this.max ? 'max' : 'min';
      next = clamp(next, this.min, this.max);
      if (before !== next || Math.abs(before - (end === 'max' ? this.max : this.min)) < 1e-9) events.push({ type: 'limit', end, fresh: before !== next });
    }
    this.value = next;
    if (next !== before) {
      this.tickAcc += Math.abs(deg);
      const n = Math.floor(this.tickAcc / this.tickDeg);
      if (n) {
        this.tickAcc -= n * this.tickDeg;
        events.push({ type: 'tick', count: n, dir: Math.sign(deg) });
      }
      events.push({ type: 'change', value: next });
    }
    return events;
  }

  get norm() {
    return (this.value - this.min) / (this.max - this.min);
  }
}

// ---------------------------------------------------------------------------------------------

export class CyclicDial {
  // ratio: output degrees per knob degree. accel(speed) → extra multiplier for fast spins.
  constructor({ angle = 0, ratio = 0.25, detentDeg = 15, accel = null } = {}) {
    this.angle = ((angle % 360) + 360) % 360;
    this.ratio = ratio;
    this.detentDeg = detentDeg;
    this.accel = accel;
    this.unwrapped = this.angle;
  }

  turn(deg, info = {}) {
    const events = [];
    if (!deg) return events;
    const mult = this.accel ? this.accel(Math.abs(info.speed || 0)) : 1;
    const before = this.unwrapped;
    this.unwrapped += deg * this.ratio * mult;
    this.angle = ((this.unwrapped % 360) + 360) % 360;
    const a = Math.floor(before / this.detentDeg);
    const b = Math.floor(this.unwrapped / this.detentDeg);
    if (a !== b) events.push({ type: 'detent', count: Math.abs(b - a), dir: Math.sign(deg) });
    events.push({ type: 'change', angle: this.angle });
    return events;
  }
}

// ---------------------------------------------------------------------------------------------

export class Flywheel {
  // A heavy scroll in [0, length]. Turning drags it directly; a quick flick leaves velocity
  // that friction bleeds away. unitsPerDeg: scroll units per knob degree.
  constructor({ length = 100, pos = 0, unitsPerDeg = 0.05, friction = 2.2, coastGain = 1, markEvery = 1 } = {}) {
    this.length = length;
    this.pos = clamp(pos, 0, length);
    this.vel = 0;
    this.unitsPerDeg = unitsPerDeg;
    this.friction = friction;
    this.coastGain = coastGain;
    this.markEvery = markEvery;
    this.lastMark = Math.floor(this.pos / markEvery);
    this.hand = 0; // recent hand velocity estimate
  }

  turn(deg, info = {}) {
    const events = this.move(deg * this.unitsPerDeg);
    // Only a decisive spin (over ~300°/s of knob) leaves the wheel coasting once the hand lets go.
    const speed = info.speed || 0;
    this.vel = Math.abs(speed) > 300 && Math.sign(speed) === Math.sign(deg) ? speed * this.unitsPerDeg * this.coastGain : 0;
    this.idle = 0;
    return events;
  }

  move(d) {
    const events = [];
    const before = this.pos;
    let next = before + d;
    if (next < 0 || next > this.length) {
      events.push({ type: 'limit', end: next < 0 ? 'start' : 'end', force: Math.min(1, Math.abs(this.vel) / 30 + 0.3) });
      next = clamp(next, 0, this.length);
      this.vel = 0;
    }
    this.pos = next;
    const m = Math.floor(next / this.markEvery);
    if (m !== this.lastMark) {
      events.push({ type: 'mark', count: Math.abs(m - this.lastMark), dir: Math.sign(m - this.lastMark), at: m });
      this.lastMark = m;
    }
    return events;
  }

  update(dt) {
    this.idle = (this.idle || 0) + dt;
    // While the hand is still turning, it alone moves the scroll.
    if (!this.vel || this.idle < 0.06) return [];
    const events = this.move(this.vel * dt);
    this.vel *= Math.exp(-this.friction * dt);
    if (Math.abs(this.vel) < 0.02) this.vel = 0;
    return events;
  }

  stop() {
    this.vel = 0;
  }
}
