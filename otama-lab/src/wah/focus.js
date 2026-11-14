// CSS viewport mode, shared controls and no fullscreen permission or autoplay.
export function bindWahFocus({ button, neck, onChange = () => {} }) {
  if (!button) return { enter() {}, exit() {}, get active() { return false; } };
  let active = false;
  const setActive = next => {
    if (active === next) return;
    onChange(next); // Release pointers and pending audio before moving the stage.
    active = next;
    document.documentElement.classList.toggle('wah-focus', active);
    button.setAttribute('aria-pressed', String(active));
    const label = active ? '離開專注演奏' : '專注演奏';
    button.setAttribute('aria-label', label); button.title = active ? `${label}（Esc）` : label;
    button.querySelector('use').setAttribute('href', active ? '#wah-close' : '#wah-focus-icon');
    const url = new URL(window.location.href);
    if (active) url.searchParams.set('mode', 'play');
    else if (url.searchParams.get('mode') === 'play') url.searchParams.delete('mode');
    try { window.history.replaceState(window.history.state, '', url); } catch { /* Restricted file viewer. */ }
    (active ? neck : button).focus({ preventScroll: true });
  };
  button.addEventListener('click', () => setActive(!active));
  document.addEventListener('keydown', event => {
    if (active && event.key === 'Escape' && !document.querySelector('dialog[open]')) { event.preventDefault(); setActive(false); }
  });
  return { enter: () => setActive(true), exit: () => setActive(false), get active() { return active; } };
}
