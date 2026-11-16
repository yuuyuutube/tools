/** Deterministic, DOM-free position-based granular simulation. Units: artwork pixels / seconds. */
export const HALF_HEIGHT = 218;
export const RADIUS = 1.6;
export const STEP = 1 / 120;
export const INITIAL_ANGLE = -12 * Math.PI / 180;
export const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
export const wrap = (angle) => Math.atan2(Math.sin(angle), Math.cos(angle));
export function widthAt(y) {
  const t = clamp(Math.abs(y) / HALF_HEIGHT, 0, 1);
  return 12 + 112 * Math.pow(Math.sin(t * Math.PI / 2), 1.3);
}

export class SandSimulation {
  constructor(count = 2400, seed = 2718) {
    this.count = count;
    this.seed = seed;
    this.x = new Float64Array(count);
    this.y = new Float64Array(count);
    this.px = new Float64Array(count);
    this.py = new Float64Array(count);
    this.tint = new Uint8Array(count);
    this.cell = RADIUS * 2;
    this.cols = Math.ceil(260 / this.cell) + 2;
    this.rows = Math.ceil(440 / this.cell) + 2;
    this.head = new Int32Array(this.cols * this.rows);
    this.next = new Int32Array(count);
    this.angle = INITIAL_ANGLE;
    this.fieldAngle = 0; // 0 points up; positive angles turn clockwise.
    this.strength = 1;
    this.reset();
  }

  reset() {
    this.angle = INITIAL_ANGLE;
    this.fieldAngle = 0;
    this.strength = 1;
    let seed = this.seed;
    const random = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 4294967296; };
    const gap = RADIUS * 2 + .12;
    let i = 0;
    for (let row = 0; i < this.count; row++) {
      const y = HALF_HEIGHT - RADIUS - 1 - row * gap * .88;
      if (y < -HALF_HEIGHT + RADIUS) throw new RangeError('Too many particles for the container');
      const half = widthAt(y) - RADIUS - 1;
      for (let x = -half + (row % 2) * gap * .5; x <= half && i < this.count; x += gap) {
        this.x[i] = this.px[i] = x + (random() - .5) * .1;
        this.y[i] = this.py[i] = y + (random() - .5) * .1;
        this.tint[i] = Math.floor(random() * 5);
        i++;
      }
    }
    this.time = 0;
  }

  /** Keep world-space positions when the glass rotates; wall collisions then move sand. */
  rotateTo(angle) {
    const next = wrap(angle);
    const delta = wrap(this.angle - next);
    const c = Math.cos(delta), s = Math.sin(delta);
    for (let i = 0; i < this.count; i++) {
      const x = this.x[i], y = this.y[i], px = this.px[i], py = this.py[i];
      this.x[i] = c * x - s * y;
      this.y[i] = s * x + c * y;
      this.px[i] = c * px - s * py;
      this.py[i] = s * px + c * py;
      this.constrain(i);
    }
    this.angle = next;
  }

  constrain(i) {
    const limit = HALF_HEIGHT - RADIUS;
    if (Math.abs(this.y[i]) > limit) {
      const v = this.y[i] - this.py[i];
      this.y[i] = clamp(this.y[i], -limit, limit);
      this.py[i] = this.y[i] + v * .05;
      this.px[i] += (this.x[i] - this.px[i]) * .12;
    }
    const half = widthAt(this.y[i]) - RADIUS;
    if (Math.abs(this.x[i]) > half) {
      const side = Math.sign(this.x[i]);
      const slope = (widthAt(this.y[i] + .2) - widthAt(this.y[i] - .2)) / .4;
      const nx = side, ny = -slope, norm = 1 + slope * slope;
      const vx = this.x[i] - this.px[i], vy = this.y[i] - this.py[i];
      const outward = Math.max(0, (vx * nx + vy * ny) / norm);
      this.x[i] = side * half;
      this.px[i] = this.x[i] - (vx - outward * nx * 1.03) * .96;
      this.py[i] = this.y[i] - (vy - outward * ny * 1.03) * .96;
    }
  }

  step(dt = STEP) {
    const field = this.fieldAngle - this.angle;
    const ax = Math.sin(field) * 330 * this.strength * dt * dt;
    const ay = -Math.cos(field) * 330 * this.strength * dt * dt;
    const { x, y, px, py, count, head, next, cell, cols } = this;
    for (let i = 0; i < count; i++) {
      const vx = clamp((x[i] - px[i]) * .996, -2.8, 2.8);
      const vy = clamp((y[i] - py[i]) * .996, -2.8, 2.8);
      px[i] = x[i]; py[i] = y[i];
      x[i] += vx + ax; y[i] += vy + ay;
      this.constrain(i);
    }
    const diameter = RADIUS * 2, diameter2 = diameter * diameter;
    for (let iteration = 0; iteration < 3; iteration++) {
      head.fill(-1);
      for (let i = 0; i < count; i++) {
        const col = Math.floor((x[i] + 130) / cell) + 1;
        const row = Math.floor((y[i] + 220) / cell) + 1;
        const index = row * cols + col;
        next[i] = head[index]; head[index] = i;
      }
      for (let i = 0; i < count; i++) {
        const col = Math.floor((x[i] + 130) / cell) + 1;
        const row = Math.floor((y[i] + 220) / cell) + 1;
        for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) {
          let j = head[(row + oy) * cols + col + ox];
          while (j !== -1 && j !== undefined) {
            if (j > i) {
              let dx = x[j] - x[i], dy = y[j] - y[i];
              const d2 = dx * dx + dy * dy;
              if (d2 < diameter2) {
                const d = Math.sqrt(d2) || .001;
                if (d2 === 0) { dx = .001; dy = 0; }
                const amount = (diameter - d) * .49 / d;
                const cx = dx * amount, cy = dy * amount;
                x[i] -= cx; y[i] -= cy; x[j] += cx; y[j] += cy;
                // Dissipate a little of the correction instead of injecting collision energy.
                px[i] -= cx * .18; py[i] -= cy * .18;
                px[j] += cx * .18; py[j] += cy * .18;
              }
            }
            j = next[j];
          }
        }
      }
      for (let i = 0; i < count; i++) this.constrain(i);
    }
    this.time += dt;
  }

  metrics() {
    let upper = 0, sumX = 0, sumY = 0, maxSpeed = 0;
    for (let i = 0; i < this.count; i++) {
      upper += this.y[i] < 0 ? 1 : 0;
      sumX += this.x[i]; sumY += this.y[i];
      maxSpeed = Math.max(maxSpeed, Math.hypot(this.x[i] - this.px[i], this.y[i] - this.py[i]) / STEP);
    }
    return { upper, centerX: sumX / this.count, centerY: sumY / this.count, maxSpeed };
  }
}
