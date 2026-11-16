/** A pressure-preserving 2D membrane. No DOM or rendering dependencies. */
export const BUBBLE_STEP = 1 / 120;
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class BubbleBody {
  constructor(id, cx, cy, radius, count = 56) {
    this.id = id; this.radius = radius; this.count = count;
    this.homeX = cx; this.homeY = cy;
    this.x = new Float64Array(count); this.y = new Float64Array(count);
    this.px = new Float64Array(count); this.py = new Float64Array(count);
    this.area0 = count * Math.sin(TAU / count) * radius * radius / 2;
    this.edge = 2 * radius * Math.sin(Math.PI / count);
    for (let i = 0; i < count; i++) {
      const a = i * TAU / count;
      const ripple = 1 + .015 * Math.cos(a * 3 + id);
      this.x[i] = this.px[i] = cx + Math.cos(a) * radius * ripple;
      this.y[i] = this.py[i] = cy + Math.sin(a) * radius / ripple;
    }
  }
  center() {
    let x = 0, y = 0;
    for (let i = 0; i < this.count; i++) { x += this.x[i]; y += this.y[i]; }
    return { x: x / this.count, y: y / this.count };
  }
  area() {
    let sum = 0;
    for (let i = 0; i < this.count; i++) {
      const j = (i + 1) % this.count;
      sum += this.x[i] * this.y[j] - this.x[j] * this.y[i];
    }
    return sum / 2;
  }
  contains(x, y) {
    let inside = false;
    for (let i = 0, j = this.count - 1; i < this.count; j = i++) {
      if ((this.y[i] > y) !== (this.y[j] > y) && x < (this.x[j] - this.x[i]) * (y - this.y[i]) / (this.y[j] - this.y[i]) + this.x[i]) inside = !inside;
    }
    return inside;
  }
  nearest(x, y) {
    let index = 0, distance = Infinity;
    for (let i = 0; i < this.count; i++) {
      const d = Math.hypot(x - this.x[i], y - this.y[i]);
      if (d < distance) { index = i; distance = d; }
    }
    return { index, distance };
  }
}

export class BubbleSimulation {
  constructor() {
    this.grabs = new Map();
    this.reset();
  }
  reset() {
    this.bubbles = [new BubbleBody(0, 15, -15, 133), new BubbleBody(1, -150, 95, 73), new BubbleBody(2, 157, -119, 48)];
    this.grabs.clear(); this.elasticity = .6; this.inflation = 1; this.blowing = false; this.breathStrength = 1; this.time = 0; this.nextId = 3;
  }
  add() {
    if (this.bubbles.length >= 5) return null;
    const id = this.nextId++;
    const bubble = new BubbleBody(id, id % 2 ? 140 : -130, id % 2 ? 113 : -125, id % 2 ? 39 : 45);
    this.bubbles.push(bubble);
    return bubble;
  }
  grab(pointer, x, y) {
    let best = null;
    for (let k = this.bubbles.length - 1; k >= 0; k--) {
      const body = this.bubbles[k], nearest = body.nearest(x, y);
      if (body.contains(x, y) || nearest.distance < 24) {
        best = { body, index: nearest.index, x: body.x[nearest.index], y: body.y[nearest.index], offsetX: body.x[nearest.index] - x, offsetY: body.y[nearest.index] - y };
        break;
      }
    }
    if (!best) return false;
    this.grabs.set(pointer, best); return true;
  }
  move(pointer, x, y) {
    const grab = this.grabs.get(pointer);
    if (!grab) return;
    const center = grab.body.center();
    let tx = clamp(x + grab.offsetX, -258, 258), ty = clamp(y + grab.offsetY, -203, 203);
    const dx = tx - center.x, dy = ty - center.y, d = Math.hypot(dx, dy);
    const limit = grab.body.radius * 2.1;
    if (d > limit) { tx = center.x + dx * limit / d; ty = center.y + dy * limit / d; }
    grab.x = tx; grab.y = ty;
  }
  release(pointer) { this.grabs.delete(pointer); }
  releaseAll() { this.grabs.clear(); this.blowing = false; }

  constrainLength(body, i, j, rest, stiffness) {
    const dx = body.x[j] - body.x[i], dy = body.y[j] - body.y[i];
    const distance = Math.hypot(dx, dy) || .001;
    const correction = (distance - rest) / distance * .5 * stiffness;
    body.x[i] += dx * correction; body.y[i] += dy * correction;
    body.x[j] -= dx * correction; body.y[j] -= dy * correction;
  }
  pressure(body, target) {
    let denominator = 0;
    const area = body.area();
    for (let i = 0; i < body.count; i++) {
      const prev = (i + body.count - 1) % body.count, next = (i + 1) % body.count;
      const gx = (body.y[next] - body.y[prev]) * .5, gy = (body.x[prev] - body.x[next]) * .5;
      denominator += gx * gx + gy * gy;
    }
    const lambda = clamp((target - area) / Math.max(denominator, 1), -.15, .15) * .72;
    // Gradients are computed before applying position corrections to avoid directional bias.
    const gx = body.gx ||= new Float64Array(body.count), gy = body.gy ||= new Float64Array(body.count);
    for (let i = 0; i < body.count; i++) {
      const prev = (i + body.count - 1) % body.count, next = (i + 1) % body.count;
      gx[i] = (body.y[next] - body.y[prev]) * .5; gy[i] = (body.x[prev] - body.x[next]) * .5;
    }
    for (let i = 0; i < body.count; i++) { body.x[i] += gx[i] * lambda; body.y[i] += gy[i] * lambda; }
  }
  contacts(a, b) {
    const ca = a.center(), cb = b.center();
    if (Math.hypot(ca.x - cb.x, ca.y - cb.y) > (a.radius + b.radius) * 1.6) return;
    for (let i = 0; i < a.count; i++) {
      const x = a.x[i], y = a.y[i];
      if (!b.contains(x, y)) continue;
      let min = Infinity, bestX = x, bestY = y, edge = 0, mix = 0;
      for (let j = 0; j < b.count; j++) {
        const k = (j + 1) % b.count, ex = b.x[k] - b.x[j], ey = b.y[k] - b.y[j];
        const t = clamp(((x - b.x[j]) * ex + (y - b.y[j]) * ey) / Math.max(ex * ex + ey * ey, .001), 0, 1);
        const qx = b.x[j] + t * ex, qy = b.y[j] + t * ey, d = (x - qx) ** 2 + (y - qy) ** 2;
        if (d < min) { min = d; bestX = qx; bestY = qy; edge = j; mix = t; }
      }
      const dx = clamp(bestX - x, -8, 8) * .65, dy = clamp(bestY - y, -8, 8) * .65;
      a.x[i] += dx; a.y[i] += dy;
      const next = (edge + 1) % b.count;
      b.x[edge] -= dx * .35 * (1 - mix); b.y[edge] -= dy * .35 * (1 - mix);
      b.x[next] -= dx * .35 * mix; b.y[next] -= dy * .35 * mix;
    }
  }
  step(dt = BUBBLE_STEP) {
    const targetArea = 1 + (this.blowing ? .45 * clamp(this.breathStrength, 0, 1) : 0);
    this.inflation += (targetArea - this.inflation) * (this.blowing ? 1.2 : .85) * dt;
    const stretch = Math.sqrt(this.inflation);
    for (const body of this.bubbles) {
      const center = body.center();
      const ax = (body.homeX - center.x) * 2.5, ay = (body.homeY - center.y) * 2.5;
      for (let i = 0; i < body.count; i++) {
        const x = body.x[i], y = body.y[i];
        const a = i * TAU / body.count;
        const tx = center.x + Math.cos(a) * body.radius * stretch, ty = center.y + Math.sin(a) * body.radius * stretch;
        const vx = clamp((x - body.px[i]) * .976, -3, 3), vy = clamp((y - body.py[i]) * .976, -3, 3);
        body.px[i] = x; body.py[i] = y;
        body.x[i] = x + vx + (ax + (tx - x) * (2 + 10 * this.elasticity)) * dt * dt;
        body.y[i] = y + vy + (ay + (ty - y) * (2 + 10 * this.elasticity)) * dt * dt;
      }
    }
    for (let pass = 0; pass < 7; pass++) {
      for (const body of this.bubbles) {
        for (let i = 0; i < body.count; i++) {
          this.constrainLength(body, i, (i + 1) % body.count, body.edge * stretch, .44 + this.elasticity * .4);
          this.constrainLength(body, i, (i + 4) % body.count, 2 * body.radius * stretch * Math.sin(4 * Math.PI / body.count), .025 + this.elasticity * .04);
        }
        this.pressure(body, body.area0 * this.inflation);
      }
      if (pass % 2 === 0) for (let i = 0; i < this.bubbles.length; i++) for (let j = i + 1; j < this.bubbles.length; j++) {
        this.contacts(this.bubbles[i], this.bubbles[j]); this.contacts(this.bubbles[j], this.bubbles[i]);
      }
      for (const grab of this.grabs.values()) {
        const { body, index } = grab;
        for (let offset = -3; offset <= 3; offset++) {
          const i = (index + offset + body.count) % body.count;
          const weight = Math.exp(-offset * offset / 3) * .78;
          const dx = clamp(grab.x - body.x[index], -25, 25), dy = clamp(grab.y - body.y[index], -25, 25);
          body.x[i] += dx * weight; body.y[i] += dy * weight;
        }
      }
      for (const body of this.bubbles) for (let i = 0; i < body.count; i++) {
        body.x[i] = clamp(body.x[i], -270, 270); body.y[i] = clamp(body.y[i], -215, 215);
      }
    }
    this.time += dt;
  }
}
