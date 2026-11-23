// Inline SVG icons. 24 x 24, drawn with currentColor.
const svg = (body, extra = '') =>
  `<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const ICONS = {
  mirror: svg('<circle cx="12" cy="12" r="8.6"/><path d="M12 3.4 19.45 16.3H4.55Z"/><path d="M12 12 12 3.4M12 12 19.45 16.3M12 12 4.55 16.3" stroke-width="1" opacity=".55"/>'),
  ink: svg('<path d="M12 3.2c-2.9 3.7-6.2 7.6-6.2 10.9a6.2 6.2 0 0 0 12.4 0c0-3.3-3.3-7.2-6.2-10.9Z"/><path d="M9.2 14.6a2.9 2.9 0 0 0 5.6 0" stroke-width="1.3"/>'),
  moire: svg('<circle cx="9.3" cy="12" r="6.4"/><circle cx="9.3" cy="12" r="3.2" stroke-width="1.2"/><circle cx="14.7" cy="12" r="6.4"/><circle cx="14.7" cy="12" r="3.2" stroke-width="1.2"/>'),
  universe: svg('<circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none"/><path d="M12 2.8v4M12 17.2v4M2.8 12h4M17.2 12h4M5.5 5.5l2.6 2.6M15.9 15.9l2.6 2.6M18.5 5.5l-2.6 2.6M8.1 15.9l-2.6 2.6"/>'),
  save: svg('<path d="M12 4v10.5M7.2 10l4.8 4.8 4.8-4.8M5 19.4h14"/>'),
  link: svg('<path d="M10.2 13.8a3.9 3.9 0 0 0 5.5 0l3.1-3.1a3.9 3.9 0 0 0-5.5-5.5l-1.1 1.1"/><path d="M13.8 10.2a3.9 3.9 0 0 0-5.5 0l-3.1 3.1a3.9 3.9 0 0 0 5.5 5.5l1.1-1.1"/>'),
  check: svg('<path d="M5 12.6 9.6 17 19 7.4"/>'),
  pause: svg('<path d="M9 6.5v11M15 6.5v11" stroke-width="2.4"/>'),
  play: svg('<path d="M8.5 5.8v12.4L18.6 12Z" fill="currentColor"/>'),
  expand: svg('<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>'),
  shrink: svg('<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>'),
  knob: svg('<circle class="ring" cx="12" cy="12" r="10.2" stroke-width="1.5"/><circle cx="12" cy="12" r="6.6"/><g class="notch"><path d="M12 12V6.9" stroke-width="2"/></g>'),
  drag: svg('<path d="M4.5 12h15M7.5 9 4.5 12l3 3M16.5 9l3 3-3 3"/>'),
};
