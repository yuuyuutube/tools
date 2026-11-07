import { clamp } from './pitch.js';
const movementKeys = new Set(['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End', 'PageUp', 'PageDown']);
const playKeys = new Set([...movementKeys, ' ', 'Enter']);

// The whole neck is the hit target; only the dark track defines its pitch scale.
// Window listeners provide a fallback if pointer capture is unavailable/interrupted.
export function bindInstrument({ strip, track = strip, range, getPosition, onPosition, onStart, onStop }) {
  let pointer = null, pointerTarget = null, active = false;
  const held = new Set();
  const begin = () => { if (!active) { active = true; onStart(); } };
  const finish = () => {
    const target = pointerTarget, id = pointer;
    pointer = null; pointerTarget = null; held.clear(); active = false;
    onStop();
    try { if (target && target.hasPointerCapture(id)) target.releasePointerCapture(id); } catch { /* Already released by the UA. */ }
  };
  const setFromPointer = e => {
    if (pointerTarget === strip) {
      const rect = track.getBoundingClientRect();
      if (rect.height) onPosition(clamp((e.clientY - rect.top) / rect.height));
    } else if (pointerTarget === range) {
      const rect = range.getBoundingClientRect();
      // Matches the 18px thumb in styles.css, including both endpoints.
      if (rect.width > 18) onPosition(clamp((e.clientX - rect.left - 9) / (rect.width - 18)));
    }
  };
  for (const target of [strip, range]) {
    target.addEventListener('pointerdown', e => {
      if (e.button !== 0 || pointer !== null || !e.isPrimary) return;
      e.preventDefault();
      target.focus({ preventScroll: true });
      pointer = e.pointerId; pointerTarget = target;
      try { target.setPointerCapture(e.pointerId); } catch { /* Window listeners continue the drag. */ }
      setFromPointer(e);
      begin();
    }, { passive: false });
    target.addEventListener('lostpointercapture', e => {
      if (e.pointerId === pointer && e.target === pointerTarget) finish();
    });
    target.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); finish(); return; }
      if (!playKeys.has(e.key)) return;
      e.preventDefault(); held.add(e.key);
      if (movementKeys.has(e.key)) {
        let x = getPosition();
        const delta = e.shiftKey ? .001 : .01;
        if (e.key === 'Home') x = 0;
        else if (e.key === 'End') x = 1;
        else if (e.key === 'PageUp') x += .1;
        else if (e.key === 'PageDown') x -= .1;
        else x += ['ArrowUp', 'ArrowRight'].includes(e.key) ? delta : -delta;
        onPosition(clamp(x));
      }
      begin();
    });
    target.addEventListener('keyup', e => {
      if (!playKeys.has(e.key)) return;
      e.preventDefault(); held.delete(e.key);
      if (!held.size && pointer === null) finish();
    });
    target.addEventListener('blur', finish);
    target.addEventListener('contextmenu', e => e.preventDefault());
    target.addEventListener('dragstart', e => e.preventDefault());
  }
  window.addEventListener('pointermove', e => {
    if (e.pointerId !== pointer) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { finish(); return; }
    if (e.cancelable) e.preventDefault();
    setFromPointer(e);
  }, { capture: true, passive: false });
  range.addEventListener('input', e => onPosition(Number(e.target.value) / 100));
  for (const event of ['pointerup', 'pointercancel']) window.addEventListener(event, e => {
    if (e.pointerId === pointer) finish();
  }, { capture: true });
  window.addEventListener('blur', finish);
  window.addEventListener('pagehide', finish);
  document.addEventListener('visibilitychange', () => { if (document.hidden) finish(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') finish(); });
  return { stop: finish };
}
