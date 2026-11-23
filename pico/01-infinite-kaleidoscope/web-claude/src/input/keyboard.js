// Keyboard -> Art Controller. Held keys never repeat discrete actions.

export function attachKeyboard(controller, actions) {
  window.addEventListener('keydown', (e) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const onButton = e.target instanceof HTMLElement && e.target.closest('button');
    const k = e.key;
    actions.activity();

    if (k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowLeft' || k === 'ArrowDown') {
      const sign = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : -1;
      controller.rotate(sign * (e.shiftKey ? 5 : 1), 'keyboard');
      e.preventDefault();
      return;
    }
    if (e.repeat) return;
    if (k === ' ' || k === 'Spacebar') {
      if (onButton) return; // let a focused button handle its own activation
      e.preventDefault();
      controller.nextMode(e.shiftKey ? -1 : 1, 'keyboard');
      return;
    }
    switch (k.toLowerCase()) {
      case 'r': controller.press('long', 'keyboard'); break;
      case 'c': controller.cyclePalette(e.shiftKey ? -1 : 1); break;
      case 's': actions.save(); break;
      case 'l': actions.link(); break;
      case 'f': actions.fullscreen(); break;
      case 'm':
      case 'p': actions.motion(); break;
      case 'h': actions.toggleUI(); break;
      case '1': controller.setMode(0, -1, 'keyboard'); break;
      case '2': controller.setMode(1, controller.state.mode < 1 ? 1 : -1, 'keyboard'); break;
      case '3': controller.setMode(2, 1, 'keyboard'); break;
      case 'escape': actions.escape(); break;
      default: return;
    }
    e.preventDefault();
  });
}
