// View-only performance mode: pitch, audio and input keep their own lifecycles.
export function bindFocusMode({ button, strip, onEnter, onExit }) {
  let active = false, scrollY = 0;
  const root = document.documentElement;
  const size = () => {
    if (active) root.style.setProperty('--performance-height', `${window.visualViewport?.height || window.innerHeight}px`);
  };
  function setActive(next, { activateAudio = true } = {}) {
    if (active === next) return;
    if (next) scrollY = window.scrollY;
    active = next;
    root.classList.toggle('focus-mode', active);
    const url = new URL(window.location.href);
    if (active) url.searchParams.set('mode', 'play');
    else if (url.searchParams.get('mode') === 'play') url.searchParams.delete('mode');
    // Preserve other query parameters and the anchor when bookmarking this view.
    try { window.history.replaceState(window.history.state, '', url); } catch { /* Some local file viewers restrict URL changes. */ }
    button.setAttribute('aria-pressed', String(active));
    button.setAttribute('aria-label', active ? '離開專注演奏' : '專注演奏（開啟聲音）');
    button.title = active ? '離開專注演奏（Esc）' : '專注演奏（開啟聲音）';
    button.querySelector('use').setAttribute('href', active ? '#icon-close' : '#icon-music');
    button.querySelector('span').textContent = active ? '離開專注演奏' : '專注演奏';
    if (active) {
      size();
      strip.focus({ preventScroll: true });
      onEnter({ activateAudio });
    } else {
      root.style.removeProperty('--performance-height');
      onExit();
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      button.focus({ preventScroll: true });
    }
  }
  button.addEventListener('click', () => setActive(!active));
  document.addEventListener('keydown', e => {
    if (active && e.key === 'Escape') { e.preventDefault(); setActive(false); }
  });
  window.addEventListener('resize', size);
  window.visualViewport?.addEventListener('resize', size);
  return { enter: options => setActive(true, options), exit: () => setActive(false), get active() { return active; } };
}
