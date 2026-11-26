// Every input source becomes "degrees of knob rotation" plus short / long presses.
//
//   Pico KY-040 ...... 20 detents per revolution → one detent = 18°
//   mouse wheel ...... one notch = one detent = 18°
//   keyboard ......... one arrow = one detent; Shift+arrow = ten
//   finger / mouse ... circular drag around a device = the real angle swept
//
// Scenes decide what a degree means (a handwheel tooth, a year, a millimetre of focus).
// A delta from the Pico may carry several detents at once; it is never split or dropped.
import { RotaryHub, now } from '../../../shared/rotary/rotary-hub.js';
import { RotationTracker } from '../../../shared/rotary/angle-tracker.js';

export const DETENT_DEG = 18;

export class KnobInput extends RotaryHub {
  constructor({ invert = false } = {}) {
    super({ invert });
    this.tracker = new RotationTracker();
    this.enabled = true;
  }

  describe() {
    return { speed: this.tracker.speed };
  }

  emitDeg(deg, source, t, extra) {
    if (!this.enabled || !deg) return;
    this.tracker.push(deg, t);
    this.emit(deg, source, t, extra);
  }

  detents(n, source, t = now()) {
    if (!Number.isInteger(n) || n === 0) return;
    if (source === 'pico' && this.invert) n = -n;
    this.emitDeg(n * DETENT_DEG, source, t, { detents: n });
  }

  exact(n, source, t = now()) {
    if (!Number.isInteger(n) || n === 0) return;
    this.emitDeg(n * DETENT_DEG, source, t, { detents: n });
  }

  angle(deg, source = 'pointer', t = now()) {
    this.emitDeg(deg, source, t, { continuous: true });
  }

  press(kind, source = 'ui') {
    if (!this.enabled) return;
    super.press(kind, source);
  }

  speedAt(t = now()) {
    return this.tracker.decay(t);
  }
}
