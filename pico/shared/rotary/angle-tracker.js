// Angle bookkeeping shared by every rotary surface (Pico, circular drag, wheel).
//
//   angleDelta        — shortest signed difference between two angles, unwrapped across ±180°.
//   AngleAccumulator  — continuous degrees → whole units, keeping the remainder so slow
//                       circular drags never lose motion between pointer events.
//   RotationTracker   — total travel, whole turns, current direction, reversals and speed.

export function angleDelta(prev, next) {
  let d = next - prev;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

export class AngleAccumulator {
  constructor(unitDeg) {
    this.unitDeg = unitDeg;
    this.acc = 0;
  }
  push(deg) {
    this.acc += deg;
    const units = Math.trunc(this.acc / this.unitDeg);
    this.acc -= units * this.unitDeg;
    return units;
  }
  get fraction() {
    return this.acc / this.unitDeg;
  }
  reset() {
    this.acc = 0;
  }
}

// Tracks a knob's history in degrees (clockwise positive). Speed is an exponentially smoothed
// estimate in degrees per second that decays toward zero when nothing arrives.
export class RotationTracker {
  constructor({ smoothing = 0.12 } = {}) {
    this.smoothing = smoothing; // seconds, time constant of the speed filter
    this.reset();
  }

  reset() {
    this.total = 0; // signed degrees since reset
    this.travel = 0; // unsigned degrees since reset
    this.direction = 0; // -1, 0, 1
    this.reversals = 0;
    this.speed = 0; // signed deg/s, smoothed
    this.lastT = null;
  }

  get turns() {
    return this.total / 360;
  }

  push(deg, t) {
    if (!deg) return;
    const dir = Math.sign(deg);
    if (this.direction && dir !== this.direction) this.reversals += 1;
    this.direction = dir;
    this.total += deg;
    this.travel += Math.abs(deg);
    if (this.lastT === null || t <= this.lastT) {
      this.lastT = t;
      return;
    }
    const dt = Math.max((t - this.lastT) / 1000, 0.004);
    const inst = deg / dt;
    const k = 1 - Math.exp(-dt / this.smoothing);
    this.speed += (inst - this.speed) * k;
    this.lastT = t;
  }

  // Call every frame so the speed estimate settles when the knob stops.
  decay(t) {
    if (this.lastT === null) return this.speed;
    const idle = (t - this.lastT) / 1000;
    if (idle > 0.06) this.speed *= Math.exp(-(idle - 0.06) / this.smoothing);
    if (Math.abs(this.speed) < 0.5) this.speed = 0;
    return this.speed;
  }
}
