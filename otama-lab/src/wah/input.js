import { clamp } from '../pitch.js';

// Each surface owns one pointer ID. A second touch need not be isPrimary:
// neck→mouth and mouth→neck must both work without stealing the first finger.
export function bindWahInput({ neck, track, face, openingRange, getPosition, getOpening, onPosition, onOpening, onHold, onRelease }) {
  let neckPointer = null, mouthPointer = null, neckKeyHeld = false;
  const capture = (element, id) => { try { element.setPointerCapture(id); } catch { /* Window fallback. */ } };
  const release = (element, id) => { try { if (id !== null && element.hasPointerCapture(id)) element.releasePointerCapture(id); } catch { /* UA already cancelled. */ } };
  const neckPosition = event => { const r = track.getBoundingClientRect(); if (r.height) onPosition(clamp((event.clientY - r.top) / r.height)); };
  let mouthOrigin = 0, mouthStart = 0;
  const mouthPosition = event => onOpening(clamp(mouthStart + (event.clientY - mouthOrigin) / 90));
  function endNeck() {
    const id = neckPointer; neckPointer = null; neckKeyHeld = false; held.clear();
    onRelease(); release(neck, id);
  }
  function endMouth() {
    const id = mouthPointer; mouthPointer = null;
    onOpening(0); release(face, id);
  }
  neck.addEventListener('pointerdown', event => {
    if (event.button !== 0 || neckPointer !== null || event.pointerId === mouthPointer) return;
    event.preventDefault(); // No focus transfer: touching the mouth must not blur a held key.
    neckPointer = event.pointerId; capture(neck, neckPointer); neckPosition(event); onHold();
  }, { passive: false });
  face.addEventListener('pointerdown', event => {
    if (event.button !== 0 || mouthPointer !== null || event.pointerId === neckPointer) return;
    event.preventDefault(); mouthPointer = event.pointerId; capture(face, mouthPointer);
    mouthOrigin = event.clientY; mouthStart = Math.max(.45, getOpening()); onOpening(mouthStart);
  }, { passive: false });
  window.addEventListener('pointermove', event => {
    if (event.pointerId !== neckPointer && event.pointerId !== mouthPointer) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      if (event.pointerId === neckPointer) endNeck();
      if (event.pointerId === mouthPointer) endMouth();
      return;
    }
    if (event.cancelable) event.preventDefault();
    if (event.pointerId === neckPointer) neckPosition(event);
    if (event.pointerId === mouthPointer) mouthPosition(event);
  }, { capture: true, passive: false });
  for (const type of ['pointerup', 'pointercancel']) window.addEventListener(type, event => {
    if (event.pointerId === neckPointer) { neckPointer = null; if (!neckKeyHeld) onRelease(); release(neck, event.pointerId); }
    if (event.pointerId === mouthPointer) endMouth();
  }, { capture: true });
  neck.addEventListener('lostpointercapture', event => { if (event.pointerId === neckPointer) endNeck(); });
  face.addEventListener('lostpointercapture', event => { if (event.pointerId === mouthPointer) endMouth(); });
  const playKeys = new Set([' ', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);
  const held = new Set();
  neck.addEventListener('keydown', event => {
    if (!playKeys.has(event.key)) return;
    event.preventDefault(); held.add(event.key); neckKeyHeld = true;
    const direction = ['ArrowUp', 'ArrowRight', 'PageUp'].includes(event.key) ? 1 : -1;
    if (![' ', 'Enter'].includes(event.key)) onPosition(event.key === 'Home' ? 0 : event.key === 'End' ? 1 : clamp(getPosition() + direction * (event.key.startsWith('Page') ? .1 : event.shiftKey ? .001 : .01)));
    onHold();
  });
  neck.addEventListener('keyup', event => {
    if (!playKeys.has(event.key)) return;
    event.preventDefault(); held.delete(event.key);
    if (!held.size) { neckKeyHeld = false; if (neckPointer === null) onRelease(); }
  });
  neck.addEventListener('blur', () => { held.clear(); neckKeyHeld = false; if (neckPointer === null) onRelease(); });
  face.addEventListener('keydown', event => {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', ' '].includes(event.key)) return;
    event.preventDefault();
    onOpening(event.key === 'Home' ? 0 : event.key === 'End' || event.key === ' ' ? 1 : clamp(getOpening() + (['ArrowUp', 'ArrowRight'].includes(event.key) ? 1 : -1) * (event.shiftKey ? .01 : .1)));
  });
  openingRange.addEventListener('input', () => onOpening(Number(openingRange.value) / 100));
  for (const target of [neck, face]) for (const type of ['contextmenu', 'dragstart']) target.addEventListener(type, event => event.preventDefault());
  return { stop() { held.clear(); endNeck(); endMouth(); } };
}
