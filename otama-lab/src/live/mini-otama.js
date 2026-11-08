import { RANGES, positionAt } from '../pitch.js';

export const MINI_OTAMA_MEDIA = '(min-width: 900px) and (hover: hover) and (pointer: fine)';

// Visual simulation only: follow detected Hz using the virtual instrument's
// default inverse-inspired mapping. This is not a measured DX finger position.
export function miniOtamaPitch(frequencyHz) {
  if (!Number.isFinite(frequencyHz) || frequencyHz <= 0) return null;
  const range = RANGES['g3-d6'];
  return {
    frequencyHz,
    position: positionAt(frequencyHz, 'inverse', range),
    limit: frequencyHz < range.base ? 'low' : frequencyHz > range.top ? 'high' : 'none',
  };
}

export function bindMiniOtama({ button, panel, finger, face, onResize, media = window.matchMedia(MINI_OTAMA_MEDIA) }) {
  // Keep already cached HTML without the new controls usable.
  if (!button || !panel) return { update() {}, stop() {} };
  let enabled = false, latest = null, sounding = false;
  const paint = () => {
    if (panel.hidden) return;
    finger.hidden = !latest;
    if (latest) {
      finger.style.bottom = `${(1 - latest.position) * 100}%`;
      panel.dataset.limit = latest.limit;
    }
    face.classList.toggle('playing', sounding);
  };
  const render = () => {
    const visible = enabled && media.matches;
    button.hidden = !media.matches;
    button.setAttribute('aria-pressed', String(visible));
    button.setAttribute('aria-label', visible ? '收起虛擬琴頸' : '顯示虛擬琴頸');
    button.title = `${visible ? '收起' : '顯示'}虛擬琴頸（Simulation，G3–D6）`;
    panel.hidden = !visible;
    document.documentElement.classList.toggle('mini-otama-open', visible);
    paint(); onResize();
  };
  button.addEventListener('click', () => { enabled = !enabled; render(); });
  media.addEventListener('change', render);
  render();
  return {
    update(frequencyHz) {
      const pitch = miniOtamaPitch(frequencyHz);
      if (pitch) latest = pitch;
      sounding = Boolean(pitch); paint();
    },
    stop() { sounding = false; paint(); },
  };
}
