// Pico / Mouse / Touch / Keyboard  →  one stream of game units.
//
// The game tells the controller which mode it is in:
//   dial — units are graduations of the safe dial (size graduations per revolution)
//   nav  — units are list steps; one step = 36° of dial travel (the menu detent)
// Every source ends up in onRotate(units, info) or onPress(kind, info), nothing else.

import { DialGear, NavGear, AngleAccumulator } from './rotary-navigation.js';

export const NAV_STEP_DEG = 36;

export class InputController {
  constructor({ sensitivity = 'standard', invert = false } = {}) {
    this.mode = 'nav';
    this.dialSize = 100;
    this.invert = invert;
    this.dialGear = new DialGear(sensitivity);
    this.navGear = new NavGear();
    this.dialAngle = new AngleAccumulator(360 / this.dialSize);
    this.navAngle = new AngleAccumulator(NAV_STEP_DEG);
    this.rotateHandlers = new Set();
    this.pressHandlers = new Set();
    this.lastSource = 'none';
  }

  onRotate(fn) {
    this.rotateHandlers.add(fn);
  }

  onPress(fn) {
    this.pressHandlers.add(fn);
  }

  setMode(mode, dialSize = 100) {
    if (mode === this.mode && dialSize === this.dialSize) return;
    this.mode = mode;
    this.dialSize = dialSize;
    this.dialAngle = new AngleAccumulator(360 / dialSize);
    this.navAngle.reset();
    this.dialGear.reset();
    this.navGear.reset();
  }

  setSensitivity(name) {
    this.dialGear.setSensitivity(name);
  }

  // Leftover fraction of a pointer drag, so the dial can follow a finger between units.
  get fraction() {
    return this.mode === 'dial' ? this.dialAngle.fraction : this.navAngle.fraction;
  }

  emit(units, source, t) {
    if (!units) return;
    this.lastSource = source;
    for (const fn of this.rotateHandlers) fn(units, { source, mode: this.mode, t });
  }

  // Discrete clicks: Pico detents, keyboard arrows, wheel notches, on-screen buttons.
  detents(n, source, t = now()) {
    if (!Number.isInteger(n) || n === 0) return;
    if (source === 'pico' && this.invert) n = -n;
    const units = this.mode === 'dial' ? this.dialGear.detents(n, t) : this.navGear.steps(n, t);
    this.emit(units, source, t);
  }

  // Exact steps with no gearing (keyboard shift-jumps, programmatic moves).
  exact(n, source, t = now()) {
    this.emit(n, source, t);
  }

  // Continuous angle from a circular drag (degrees, clockwise positive).
  angle(deg, source = 'pointer', t = now()) {
    const acc = this.mode === 'dial' ? this.dialAngle : this.navAngle;
    this.emit(acc.push(deg), source, t);
  }

  endDrag() {
    this.dialAngle.reset();
    this.navAngle.reset();
  }

  press(kind, source = 'ui') {
    if (kind !== 'short' && kind !== 'long') return;
    this.lastSource = source;
    for (const fn of this.pressHandlers) fn(kind, { source });
  }

  // Serial events from the Pico, already validated by protocol.js.
  serialEvent(event) {
    if (event.type === 'rotate') this.detents(event.delta, 'pico');
    else if (event.type === 'press') this.press(event.kind, 'pico');
  }
}

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Keyboard: arrows turn, Enter/Space confirm, Escape/Backspace go back.
export function attachKeyboard(input, target = window) {
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key;
    let dir = 0;
    if (k === 'ArrowRight' || k === 'ArrowDown') dir = 1;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') dir = -1;
    if (dir) {
      e.preventDefault();
      if (e.shiftKey) input.exact(dir * 10, 'keyboard');
      else input.detents(dir, 'keyboard');
      return;
    }
    if (e.repeat) return;
    if (k === 'Enter' || k === ' ') {
      e.preventDefault();
      input.press('short', 'keyboard');
    } else if (k === 'Escape' || k === 'Backspace') {
      e.preventDefault();
      input.press('long', 'keyboard');
    }
  };
  target.addEventListener('keydown', onKey);
  return () => target.removeEventListener('keydown', onKey);
}

// Mouse wheel and trackpads. A wheel notch is one detent; trackpad pixels are accumulated.
export function attachWheel(input, el) {
  let acc = 0;
  let lastNotch = 0;
  const onWheel = (e) => {
    e.preventDefault();
    let dy = e.deltaY;
    if (Math.abs(e.deltaX) > Math.abs(dy)) dy = e.deltaX;
    if (e.deltaMode === 1) dy *= 40;
    if (e.deltaMode === 2) dy *= 400;
    const t = performance.now();
    if (Math.abs(dy) >= 50 && Number.isInteger(dy)) {
      // A physical notch. Guard against a few browsers firing twice for one notch.
      if (t - lastNotch < 8) return;
      lastNotch = t;
      input.detents(Math.sign(dy), 'wheel', t);
      return;
    }
    acc += dy;
    const n = Math.trunc(acc / 34);
    if (n) {
      acc -= n * 34;
      input.detents(n, 'wheel', t);
    }
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}

// Press-and-hold repeat for the on-screen step buttons.
export function holdRepeat(button, fire) {
  let timer = null;
  let count = 0;
  const stop = () => {
    clearTimeout(timer);
    timer = null;
  };
  const loop = () => {
    count += 1;
    fire();
    timer = setTimeout(loop, Math.max(28, 120 - count * 8));
  };
  button.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    try {
      button.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    count = 0;
    fire();
    timer = setTimeout(loop, 380);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) button.addEventListener(type, stop);
}
