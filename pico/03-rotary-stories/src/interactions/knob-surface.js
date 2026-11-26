// Makes a round thing on screen (a handwheel, a jog wheel, a focus knob) turnable by finger
// or mouse: drag around its centre like a click wheel. A tap on its hub is a short press,
// holding the hub is a long press. Uses the shared pointer-dial so angle unwrapping across
// ±180°, multi-turn drags and reversals behave exactly as in the other pico/ sites.
import { attachPointerDial } from '../../../shared/rotary/pointer-dial.js';

// el: the element that receives pointer events. hub: optional element whose box defines the
// centre (defaults to el). pressRadius: share of the radius that counts as the hub.
export function attachKnobSurface(el, knob, { hub = el, pressRadius = 0.3, onDrag, press = true } = {}) {
  el.classList.add('knob-surface');
  const off = attachPointerDial(el, {
    getCenter: () => {
      const r = hub.getBoundingClientRect();
      if (!r.width) return null;
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, r: Math.min(r.width, r.height) / 2 };
    },
    onAngle: (deg) => knob.angle(deg, 'pointer'),
    onPress: press ? (kind) => knob.press(kind, 'pointer') : null,
    onDragState: (on) => {
      el.classList.toggle('turning', on);
      onDrag && onDrag(on);
    },
    pressRadius,
  });
  return () => {
    off();
    el.classList.remove('knob-surface', 'turning');
  };
}
