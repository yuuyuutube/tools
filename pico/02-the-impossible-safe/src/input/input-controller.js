// Pico / Mouse / Touch / Keyboard  →  one stream of game units.
//
// The game tells the controller which mode it is in:
//   dial — units are graduations of the safe dial (size graduations per revolution)
//   nav  — units are list steps; one step = 36° of dial travel (the menu detent)
// Every source ends up in onRotate(units, info) or onPress(kind, info), nothing else.
//
// Press dispatch, serial routing, gearing and angle accumulation come from pico/shared/rotary;
// only the safe's two modes live here.

import { RotaryHub, now } from '../../../shared/rotary/rotary-hub.js';
import { DialGear, NavGear } from '../../../shared/rotary/rotary-navigation.js';
import { AngleAccumulator } from '../../../shared/rotary/angle-tracker.js';

export const NAV_STEP_DEG = 36;

export class InputController extends RotaryHub {
  constructor({ sensitivity = 'standard', invert = false } = {}) {
    super({ invert });
    this.mode = 'nav';
    this.dialSize = 100;
    this.dialGear = new DialGear(sensitivity);
    this.navGear = new NavGear();
    this.dialAngle = new AngleAccumulator(360 / this.dialSize);
    this.navAngle = new AngleAccumulator(NAV_STEP_DEG);
  }

  describe() {
    return { mode: this.mode };
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

  // Discrete clicks: Pico detents, keyboard arrows, wheel notches, on-screen buttons.
  detents(n, source, t = now()) {
    if (!Number.isInteger(n) || n === 0) return;
    if (source === 'pico' && this.invert) n = -n;
    const units = this.mode === 'dial' ? this.dialGear.detents(n, t) : this.navGear.steps(n, t);
    this.emit(units, source, t);
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
}
