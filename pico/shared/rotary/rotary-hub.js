// One stream of rotate / press events, whatever the source (Pico, wheel, finger, keyboard).
//
// The hub owns press dispatch (short / long) and serial-event routing. Sites subclass it to
// decide what a detent means: the safe turns detents into dial graduations, the story
// library turns them into degrees of knob rotation. Handlers receive (units, info) where
// info always carries { source, t } plus whatever describe() adds.

export class RotaryHub {
  constructor({ invert = false } = {}) {
    this.invert = invert;
    this.rotateHandlers = new Set();
    this.pressHandlers = new Set();
    this.lastSource = 'none';
  }

  onRotate(fn) {
    this.rotateHandlers.add(fn);
    return () => this.rotateHandlers.delete(fn);
  }

  onPress(fn) {
    this.pressHandlers.add(fn);
    return () => this.pressHandlers.delete(fn);
  }

  // Extra fields merged into every rotate event (e.g. the safe's current mode).
  describe() {
    return {};
  }

  emit(units, source, t = now(), extra) {
    if (!units) return;
    this.lastSource = source;
    const info = { source, ...this.describe(), t, ...extra };
    for (const fn of this.rotateHandlers) fn(units, info);
  }

  // Discrete clicks: Pico detents, keyboard arrows, wheel notches, on-screen buttons.
  // Subclasses usually override this to apply gearing; the invert flag is for the Pico only.
  detents(n, source, t = now()) {
    if (!Number.isInteger(n) || n === 0) return;
    if (source === 'pico' && this.invert) n = -n;
    this.emit(n, source, t);
  }

  // Exact steps with no gearing (keyboard shift-jumps, programmatic moves).
  exact(n, source, t = now()) {
    this.emit(n, source, t);
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

export const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
