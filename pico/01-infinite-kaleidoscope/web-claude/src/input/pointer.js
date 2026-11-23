// Mouse wheel, mouse drag and touch gestures -> Art Controller.
//   wheel / horizontal drag : turn the dial (fractional detents)
//   touch: tap toggles the toolbar, vertical swipe changes mode, press-and-hold = new universe
//   a fast horizontal flick keeps spinning and slows down like a weighted knob

const PX_PER_DETENT = 13;
const WHEEL_PX_PER_DETENT = 48;
const HOLD_MS = 650;

export function attachPointer(el, controller, { onTap = () => {}, onActivity = () => {} } = {}) {
  let drag = null;
  let spin = 0;
  let spinFrame = 0;
  let lastSpin = 0;

  function spinLoop(now) {
    const dt = Math.min((now - lastSpin) / 1000, 0.05);
    lastSpin = now;
    controller.rotate(spin * dt, 'touch');
    spin *= Math.exp(-dt * 3.2);
    if (Math.abs(spin) > 0.4) spinFrame = requestAnimationFrame(spinLoop);
    else spinFrame = 0;
  }
  function stopSpin() {
    spin = 0;
    if (spinFrame) cancelAnimationFrame(spinFrame);
    spinFrame = 0;
  }

  el.addEventListener(
    'wheel',
    (e) => {
      e.preventDefault();
      onActivity();
      stopSpin();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
      const d = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
      const detents = Math.max(-4, Math.min(4, (d * unit) / WHEEL_PX_PER_DETENT));
      controller.rotate(detents, 'wheel');
    },
    { passive: false },
  );

  el.addEventListener('pointerdown', (e) => {
    if (drag || (e.pointerType === 'mouse' && e.button !== 0)) return;
    onActivity();
    stopSpin();
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* some synthetic or stale pointers cannot be captured; the gesture still works */
    }
    drag = {
      id: e.pointerId,
      type: e.pointerType,
      x0: e.clientX,
      y0: e.clientY,
      x: e.clientX,
      t0: performance.now(),
      axis: null,
      v: 0,
      lastT: performance.now(),
      held: false,
      hold: null,
    };
    if (e.pointerType !== 'mouse') {
      drag.hold = setTimeout(() => {
        if (drag && !drag.axis) {
          drag.held = true;
          if (navigator.vibrate && navigator.userActivation?.hasBeenActive) navigator.vibrate(12);
          controller.press('long', 'touch');
        }
      }, HOLD_MS);
    }
  });

  el.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.id) {
      if (e.pointerType === 'mouse') onActivity();
      return;
    }
    const dx = e.clientX - drag.x0;
    const dy = e.clientY - drag.y0;
    if (!drag.axis && Math.hypot(dx, dy) > 9) {
      drag.axis = Math.abs(dx) >= Math.abs(dy) || drag.type === 'mouse' ? 'x' : 'y';
      clearTimeout(drag.hold);
      if (drag.axis === 'x') el.classList.add('dragging');
    }
    if (drag.axis === 'x') {
      const step = (e.clientX - drag.x) / PX_PER_DETENT;
      const now = performance.now();
      const dt = Math.max((now - drag.lastT) / 1000, 1e-3);
      drag.v = drag.v * 0.6 + (step / dt) * 0.4;
      drag.lastT = now;
      controller.rotate(step, drag.type);
    }
    drag.x = e.clientX;
  });

  function end(e, cancelled) {
    if (!drag || e.pointerId !== drag.id) return;
    clearTimeout(drag.hold);
    el.classList.remove('dragging');
    const d = drag;
    drag = null;
    if (cancelled || d.held) return;
    const dt = performance.now() - d.t0;
    const dy = e.clientY - d.y0;
    if (!d.axis && d.type !== 'mouse' && dt < 400) onTap();
    if (d.axis === 'y' && Math.abs(dy) > 56 && dt < 800) controller.nextMode(dy < 0 ? 1 : -1, 'touch');
    if (d.axis === 'x' && d.type !== 'mouse' && performance.now() - d.lastT < 80 && Math.abs(d.v) > 6) {
      spin = Math.max(-60, Math.min(60, d.v));
      lastSpin = performance.now();
      spinFrame = requestAnimationFrame(spinLoop);
    }
  }
  el.addEventListener('pointerup', (e) => end(e, false));
  el.addEventListener('pointercancel', (e) => end(e, true));
  el.addEventListener('contextmenu', (e) => e.preventDefault());

  return { stopSpin };
}
