export function bindLiveFocus({ enter, exit, onResize }) {
  const root = document.documentElement;
  let active = false, scrollY = 0;
  const resize = () => {
    if (active) root.style.setProperty('--live-focus-height', `${window.visualViewport?.height || window.innerHeight}px`);
    onResize();
  };
  const setActive = next => {
    if (active === next) return;
    if (next) scrollY = window.scrollY;
    active = next; root.classList.toggle('live-focus', active);
    enter.setAttribute('aria-pressed', String(active));
    if (active) { resize(); exit.focus({ preventScroll: true }); }
    else {
      root.style.removeProperty('--live-focus-height');
      window.scrollTo({ top: scrollY, behavior: 'instant' });
      enter.focus({ preventScroll: true }); onResize();
    }
  };
  enter.addEventListener('click', () => setActive(true));
  exit.addEventListener('click', () => setActive(false));
  window.addEventListener('resize', resize);
  window.visualViewport?.addEventListener('resize', resize);
  return { get active() { return active; }, exit: () => setActive(false) };
}
