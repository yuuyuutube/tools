export const MIRROR_STEP = 1 / 120;
export const TAU = Math.PI * 2;
export const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
export const wrapAngle = x => Math.atan2(Math.sin(x), Math.cos(x));

/** Proper Euclidean rotation in an ordered coordinate plane, preserving lengths in R^n. */
export function rotatePlane(point, a, b, angle) {
  const output = [...point], c = Math.cos(angle), s = Math.sin(angle);
  output[a] = c * point[a] - s * point[b];
  output[b] = s * point[a] + c * point[b];
  return output;
}

export function makeTesseract() {
  const vertices = Array.from({ length:16 }, (_,mask) => Array.from({ length:4 }, (_,axis) => mask & (1 << axis) ? 1 : -1));
  const edges = [];
  for (let i = 0; i < 16; i++) for (let axis = 0; axis < 4; axis++) {
    const j = i ^ (1 << axis);
    if (i < j) edges.push({ a:i, b:j, axis });
  }
  const faces = [];
  for (let a = 0; a < 4; a++) for (let b = a + 1; b < 4; b++) {
    for (let fixed = 0; fixed < 16; fixed++) {
      if ((fixed & (1 << a)) || (fixed & (1 << b))) continue;
      faces.push({ indices:[fixed, fixed | (1 << a), fixed | (1 << a) | (1 << b), fixed | (1 << b)], axes:[a,b] });
    }
  }
  return { vertices, edges, faces };
}
export const TESSERACT = makeTesseract();

export function project4(point, distance) {
  const factor = distance / (distance - point[3]);
  return point.slice(0,3).map(value => value * factor);
}
export function project3(point, distance = 5.5) {
  const factor = distance / (distance - point[2]);
  return { x:point[0] * factor, y:point[1] * factor, z:point[2] };
}

export class MirrorGeometry {
  constructor() { this.reset(); }
  reset() {
    this.angles = { xw:.40, yw:-.26, zw:.18 };
    this.view = { yaw:.56, pitch:-.38, roll:-.10 };
    this.depth = 3.6; this.mode = '4d'; this.time = 0; this.transition = null;
  }
  rotate(dx, dy) {
    this.transition = null;
    if (this.mode === '4d') {
      this.angles.xw = wrapAngle(this.angles.xw + dx);
      this.angles.yw = wrapAngle(this.angles.yw + dy);
    } else {
      this.view.yaw = wrapAngle(this.view.yaw + dx);
      this.view.pitch = wrapAngle(this.view.pitch + dy);
    }
  }
  setAngle(angle) { this.angles.xw = wrapAngle(angle); this.transition = null; }
  twist(angle) {
    this.transition = null;
    if (this.mode === '4d') this.angles.zw = wrapAngle(this.angles.zw + angle);
    else this.view.roll = wrapAngle(this.view.roll + angle);
  }
  flip(animate = true) {
    if (!animate) { this.angles.xw = wrapAngle(this.angles.xw + Math.PI / 2); this.transition = null; return; }
    this.transition = { start:this.angles.xw, elapsed:0, duration:1.15 };
  }
  step(dt = MIRROR_STEP, automatic = true) {
    if (this.transition) {
      const transition = this.transition;
      transition.elapsed = Math.min(transition.elapsed + dt, transition.duration);
      const t = transition.elapsed / transition.duration;
      const eased = t * t * (3 - 2 * t);
      this.angles.xw = wrapAngle(transition.start + Math.PI / 2 * eased);
      if (t >= 1) this.transition = null;
    } else if (automatic && this.mode === '4d') {
      this.angles.xw = wrapAngle(this.angles.xw + dt * .13);
      this.angles.yw = wrapAngle(this.angles.yw + dt * .075);
      this.angles.zw = wrapAngle(this.angles.zw + dt * .035);
    } else if (automatic) {
      this.view.yaw = wrapAngle(this.view.yaw + dt * .13);
      this.view.pitch = wrapAngle(this.view.pitch + dt * .055);
    }
    this.time += dt;
  }
  transformed4() {
    return TESSERACT.vertices.map(point => {
      let p = rotatePlane(point,0,3,this.angles.xw);
      p = rotatePlane(p,1,3,this.angles.yw);
      return rotatePlane(p,2,3,this.angles.zw);
    });
  }
  geometry() {
    const four = this.transformed4();
    const three = four.map(point => {
      let p = project4(point,this.depth);
      p = rotatePlane(p,0,2,this.view.yaw);
      p = rotatePlane(p,1,2,this.view.pitch);
      return rotatePlane(p,0,1,this.view.roll);
    });
    return { four, three, screen:three.map(point => project3(point)) };
  }
}
