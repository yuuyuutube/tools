// Entry sound choice, shared by every page: two round speaker buttons (off / on),
// the same gesture as stamp-tour's gate. The click is a real user gesture, so
// onChoose may start Web Audio synchronously. Sound is the point of this lab,
// so "on" is the recommended choice: marked, and focused first.
const SOUND_GATE_ICONS = {
  off: '<path d="M11 5 6 9H3v6h3l5 4V5Zm5 4 6 6m0-6-6 6"/>',
  on: '<path d="M11 5 6 9H3v6h3l5 4V5Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
};
export function showSoundGate(onChoose) {
  const gate = document.createElement('div');
  gate.className = 'sound-gate';
  gate.setAttribute('role', 'dialog');
  gate.setAttribute('aria-modal', 'true');
  gate.setAttribute('aria-labelledby', 'sound-gate-title');
  gate.setAttribute('aria-describedby', 'sound-gate-note');
  gate.innerHTML = `<div class="sound-gate-panel"><h2 id="sound-gate-title" class="sound-gate-title">請開啟聲音</h2><p id="sound-gate-note" class="sound-gate-note">滑音、音高與音色都要用耳朵聽，<br>開啟聲音才能完整體驗。</p><div class="sound-gate-choices">${['off', 'on'].map(value => {
    const label = value === 'on' ? '開啟聲音（建議）' : '保持靜音';
    return `<button type="button" data-sound="${value}" aria-label="${label}" title="${label}"><span class="sound-gate-disc"><svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${SOUND_GATE_ICONS[value]}</svg></span><span class="sound-gate-caption">${value === 'on' ? '開啟聲音' : '靜音'}</span></button>`;
  }).join('')}</div></div>`;
  const previousFocus = document.activeElement;
  // Keep focus, taps and screen readers inside the gate until a choice is made.
  const covered = [...document.body.children].map(element => [element, element.inert]);
  for (const [element] of covered) element.inert = true;
  document.body.append(gate);
  void gate.offsetWidth; // Commit the hidden state so the entrance transitions.
  gate.classList.add('in');
  const buttons = [...gate.querySelectorAll('button')];
  buttons[1].focus({ preventScroll: true });
  let chosen = false;
  function choose(button) {
    if (chosen) return;
    chosen = true;
    const on = button.dataset.sound === 'on';
    button.classList.add('picked');
    for (const [element, inert] of covered) element.inert = inert;
    gate.classList.add('out');
    if (previousFocus?.isConnected && previousFocus !== document.body) previousFocus.focus({ preventScroll: true });
    onChoose(on);
    setTimeout(() => gate.remove(), 420);
  }
  gate.addEventListener('click', event => { const button = event.target.closest('button'); if (button) choose(button); });
  // Page shortcuts (Esc stop, W mouth, Space play) must not fire behind the gate.
  for (const type of ['keydown', 'keyup']) gate.addEventListener(type, event => {
    event.stopPropagation();
    if (type !== 'keydown' || chosen) return;
    if (event.key === 'Escape') { event.preventDefault(); choose(buttons[0]); }
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      buttons[event.key === 'ArrowLeft' ? 0 : 1].focus();
    }
  });
}
