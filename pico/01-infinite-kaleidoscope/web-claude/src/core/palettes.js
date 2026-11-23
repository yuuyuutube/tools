// Ink sets. Each one is a sheet of paper plus four inks.
// key: the darkest / strongest ink. a, b: the two main inks. c: accent, used sparingly.
// dark: true means the paper is dark and inks overprint with "screen" instead of "multiply".

export const PALETTES = [
  { id: 'vermilion', paper: '#EEE6D6', key: '#1D2140', a: '#E2412A', b: '#2D5BA6', c: '#F2B42A', dark: false },
  { id: 'riso', paper: '#F3EFE6', key: '#2B2A33', a: '#FF4FA3', b: '#0078BF', c: '#FFE33A', dark: false },
  { id: 'mineral', paper: '#E7DECB', key: '#2A2925', a: '#2E7A64', b: '#B5462F', c: '#C9A04A', dark: false },
  { id: 'night', paper: '#13151D', key: '#ECE4D3', a: '#FF6A4D', b: '#2AAE9F', c: '#F2C14E', dark: true },
  { id: 'sumi', paper: '#F1EEE6', key: '#19191B', a: '#4C4C52', b: '#93918B', c: '#C2352B', dark: false },
  { id: 'cyanotype', paper: '#1D3C70', key: '#F3EFE4', a: '#A4BCDD', b: '#6487BF', c: '#E6D3A0', dark: true },
];

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

// Flat array: paper, key, a, b, c (5 x rgb) + dark flag.
export function paletteVector(p) {
  return {
    colors: [p.paper, p.key, p.a, p.b, p.c].map(hexToRgb),
    dark: p.dark ? 1 : 0,
  };
}

export function mixPalette(from, to, k) {
  const colors = from.colors.map((c, i) => c.map((v, j) => v + (to.colors[i][j] - v) * k));
  return { colors, dark: from.dark + (to.dark - from.dark) * k };
}

export const paletteCount = PALETTES.length;
