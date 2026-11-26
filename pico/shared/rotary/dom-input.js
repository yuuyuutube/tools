// Browser input sources feeding a RotaryHub-like object:
//   input.detents(n, source, t)  input.exact(n, source)  input.press(kind, source)

// Keyboard: arrows turn, Enter/Space confirm, Escape/Backspace go back.
// Typing in a text field is left alone.
export function attachKeyboard(input, target = window, { shiftStep = 10 } = {}) {
  const onKey = (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const el = e.target;
    if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName || ''))) return;
    const k = e.key;
    let dir = 0;
    if (k === 'ArrowRight' || k === 'ArrowDown') dir = 1;
    else if (k === 'ArrowLeft' || k === 'ArrowUp') dir = -1;
    if (dir) {
      e.preventDefault();
      if (e.shiftKey) input.exact(dir * shiftStep, 'keyboard');
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
export function attachWheel(input, el, { pxPerDetent = 34 } = {}) {
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
    const n = Math.trunc(acc / pxPerDetent);
    if (n) {
      acc -= n * pxPerDetent;
      input.detents(n, 'wheel', t);
    }
  };
  el.addEventListener('wheel', onWheel, { passive: false });
  return () => el.removeEventListener('wheel', onWheel);
}

// Press-and-hold repeat for on-screen step buttons.
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
  const down = (e) => {
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
  };
  button.addEventListener('pointerdown', down);
  const types = ['pointerup', 'pointercancel', 'lostpointercapture'];
  for (const type of types) button.addEventListener(type, stop);
  return () => {
    stop();
    button.removeEventListener('pointerdown', down);
    for (const type of types) button.removeEventListener(type, stop);
  };
}

// An on-screen knob button: tap = short press, hold = long press, like the real KY-040.
export function attachPressButton(button, input, { holdMs = 650, source = 'button' } = {}) {
  let timer = null;
  let fired = false;
  const down = (e) => {
    if (e.button !== 0) return;
    fired = false;
    timer = setTimeout(() => {
      fired = true;
      input.press('long', source);
    }, holdMs);
  };
  const up = (e) => {
    clearTimeout(timer);
    if (e.type === 'pointerup' && !fired) input.press('short', source);
    fired = true;
  };
  const key = (e) => e.key === 'Enter' && e.stopPropagation();
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('pointerleave', up);
  button.addEventListener('keydown', key);
  return () => {
    clearTimeout(timer);
    button.removeEventListener('pointerdown', down);
    button.removeEventListener('pointerup', up);
    button.removeEventListener('pointercancel', up);
    button.removeEventListener('pointerleave', up);
    button.removeEventListener('keydown', key);
  };
}
