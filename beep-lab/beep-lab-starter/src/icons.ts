const paths = {
  undo: '<path d="m9 5-5 5 5 5M4 10h9a7 7 0 0 1 7 7"/>',
  redo: '<path d="m15 5 5 5-5 5m5-5h-9a7 7 0 0 0-7 7"/>',
  expand: '<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
  collapse: '<path d="M3 8h5V3m8 0v5h5M8 21v-5H3m13 5v-5h5"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  backspace: '<path d="M9 5h12v14H9l-7-7Z"/><path d="m12 9 6 6m0-6-6 6"/>',
  dot: '<path d="M10 6v10"/><ellipse cx="7" cy="17" rx="3" ry="2"/><circle cx="17" cy="15" r="1.5" fill="currentColor" stroke="none"/>',
  play: '<path d="m8 5 11 7-11 7Z" fill="currentColor" stroke="none"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor" stroke="none"/>',
  volume: '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="M11 5 6 9H3v6h3l5 4Z"/><path d="m16 9 6 6m0-6-6 6"/>',
  save: '<path d="M5 3h12l4 4v14H3V3Z"/><path d="M7 3v6h10V3M7 21v-8h10v8"/>',
  add: '<path d="M12 5v14M5 12h14"/>',
  load: '<path d="M12 3v12m-4-4 4 4 4-4M4 15v6h16v-6"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  shorter: '<path d="M5 12h14"/>',
  longer: '<path d="M5 12h14M12 5v14"/>',
  octave: '<path d="M12 20V4m-5 5 5-5 5 5"/>',
  rest: '<path d="m14 3-5 5 6 5-5 3 3 5"/>',
  sharp: '<path d="m9 3-2 18m10-18-2 18M4 9l17-2M3 17l17-2"/>',
} as const;
export type IconName = keyof typeof paths;
export function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name]}</svg>`;
}
