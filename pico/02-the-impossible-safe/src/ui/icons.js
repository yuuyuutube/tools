// Inline SVG icons. Stroke icons inherit currentColor.

const svg = (body, vb = '0 0 24 24') =>
  `<svg viewBox="${vb}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  ccw: svg('<path d="M8.2 6.2A7.5 7.5 0 1 1 4.6 13"/><path d="M8.6 2.6 8.2 6.6l4 .4"/>'),
  cw: svg('<path d="M15.8 6.2A7.5 7.5 0 1 0 19.4 13"/><path d="M15.4 2.6l.4 4-4 .4"/>'),
  press: svg('<circle cx="12" cy="12" r="7.5"/><circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none"/>'),
  back: svg('<path d="M9 7 4.5 11.5 9 16"/><path d="M5 11.5h9.5a5 5 0 0 1 0 10H12"/>'),
  soundOn: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>'),
  soundOff: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5M21 9.5l-5 5"/>'),
  soundWait: svg('<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><circle cx="17.5" cy="12" r="1" fill="currentColor"/><circle cx="21" cy="12" r="1" fill="currentColor"/>'),
  plug: svg('<path d="M9 3v4M15 3v4"/><path d="M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 16v5"/>'),
  plugOff: svg('<path d="M9 3v4M15 3v4"/><path d="M6.5 7h11v3.5a5.5 5.5 0 0 1-11 0z"/><path d="M12 16v5"/><path d="M3 3l18 18"/>'),
  knob: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5V6"/>'),
  hold: svg('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/><path d="M12 3.5V6"/><path d="M12 12V9.6M12 12l1.8 1.2"/>'),
  turn: svg('<path d="M6 12a6 6 0 0 1 10.4-4.1M18 12a6 6 0 0 1-10.4 4.1"/><path d="M16.8 4.2v3.9h-3.9M7.2 19.8v-3.9h3.9"/>'),
  download: svg('<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 19.5h14"/>'),
  upload: svg('<path d="M12 20V9M7.5 13.5 12 9l4.5 4.5M5 4.5h14"/>'),
  arrowR: svg('<path d="M5 12h13M13 7l5 5-5 5"/>'),
  arrowL: svg('<path d="M19 12H6M11 7l-5 5 5 5"/>'),
  check: svg('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  lock: svg('<rect x="5" y="10.5" width="14" height="9.5" rx="1"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>'),
};

// The Bureau seal: a keyhole in a double ring with lettering.
export function sealSVG({ color = 'currentColor', text = 'BUREAU OF UNNECESSARY PROTECTION · EST. 1957 · ' } = {}) {
  return `<svg viewBox="0 0 100 100" aria-hidden="true">
    <defs><path id="seal-arc" d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0"/></defs>
    <circle cx="50" cy="50" r="46" fill="none" stroke="${color}" stroke-width="3"/>
    <circle cx="50" cy="50" r="27" fill="none" stroke="${color}" stroke-width="1.6"/>
    <text font-family="Helvetica, Arial, sans-serif" font-size="8.4" font-weight="700" letter-spacing="1.1" fill="${color}"><textPath href="#seal-arc">${text}</textPath></text>
    <circle cx="50" cy="44" r="7" fill="${color}"/>
    <path d="M46 47h8l2.6 15h-13.2z" fill="${color}"/>
  </svg>`;
}
