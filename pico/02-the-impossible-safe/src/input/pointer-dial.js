// Circular drag on the dial: the finger (or mouse) goes round the knob like a click wheel.
// Rotation is measured as the change of angle around the dial centre, unwrapped across the
// ±180° seam, so any number of continuous turns in either direction is tracked exactly.

export function angleDelta(prev, next) {
  let d = next - prev;
  while (d > 180) d -= 360;
  while (d < -180) d += 360;
  return d;
}

const HOLD_MS = 650;
const TAP_SLOP = 9; // px

export function attachPointerDial(el, { getCenter, onAngle, onPress, onDragState, canStart }) {
  let active = null;

  const angleOf = (x, y, c) => (Math.atan2(y - c.y, x - c.x) * 180) / Math.PI;

  function down(e) {
    if (e.button !== undefined && e.button !== 0) return;
    if (canStart && !canStart(e)) return;
    const c = getCenter();
    if (!c) return;
    const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
    // Presses only start on the knob; drags can start anywhere on the stage.
    const onKnob = dist < c.r * 0.34;
    active = {
      id: e.pointerId,
      c,
      angle: angleOf(e.clientX, e.clientY, c),
      x0: e.clientX,
      y0: e.clientY,
      dragging: false,
      onKnob,
      longFired: false,
      hold: null,
    };
    if (onKnob) {
      active.hold = setTimeout(() => {
        if (active && !active.dragging) {
          active.longFired = true;
          onPress('long');
        }
      }, HOLD_MS);
    }
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    e.preventDefault();
  }

  function move(e) {
    if (!active || e.pointerId !== active.id) return;
    const c = active.c;
    const dist = Math.hypot(e.clientX - c.x, e.clientY - c.y);
    const a = angleOf(e.clientX, e.clientY, c);
    if (!active.dragging) {
      if (Math.hypot(e.clientX - active.x0, e.clientY - active.y0) < TAP_SLOP) return;
      active.dragging = true;
      clearTimeout(active.hold);
      onDragState && onDragState(true);
    }
    // Too close to the centre the angle is unstable: hold still until the finger moves out.
    if (dist < 14) {
      active.angle = a;
      return;
    }
    const d = angleDelta(active.angle, a);
    active.angle = a;
    if (d) onAngle(d);
    e.preventDefault();
  }

  function up(e) {
    if (!active || e.pointerId !== active.id) return;
    clearTimeout(active.hold);
    const wasTap = !active.dragging && active.onKnob && !active.longFired;
    if (active.dragging) onDragState && onDragState(false);
    active = null;
    if (wasTap && e.type === 'pointerup') onPress('short');
  }

  el.addEventListener('pointerdown', down);
  el.addEventListener('pointermove', move);
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', up);
  el.addEventListener('lostpointercapture', up);
  return () => {
    el.removeEventListener('pointerdown', down);
    el.removeEventListener('pointermove', move);
    el.removeEventListener('pointerup', up);
    el.removeEventListener('pointercancel', up);
    el.removeEventListener('lostpointercapture', up);
  };
}
