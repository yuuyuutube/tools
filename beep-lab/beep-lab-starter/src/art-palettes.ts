import type { CardArtStyle } from './art-styles';
import type { Melody } from './music-core/model';
import { noteStep } from './music-core/studio';

/**
 * Card art palettes ("tone" in URLs).
 * Each style lists its colour roles once; every palette gives one hex per role, in the same order.
 * The first palette(s) are the colours hard-coded in the renderer; weave has four originals picked by melody hash.
 * Palettes are addressed by index in shared URLs, so only ever append new ones.
 */
export type ArtPalette = { name: string; colors: readonly string[] };
export type StylePalettes = { roles: readonly string[]; palettes: readonly ArtPalette[] };

export const weavePalettes = [
  {paper:'#f5efe3',thread:'#b5a78c',colors:['#264c49','#c35e45','#d5ad56','#547598','#d9a398']},
  {paper:'#f2eee5',thread:'#b0a99c',colors:['#354d9b','#dc795e','#829a86','#d8bb69','#78576c']},
  {paper:'#f3ecdf',thread:'#b3a58e',colors:['#365849','#ce7748','#86a4b1','#af7589','#d0ae59']},
  {paper:'#f5eee8',thread:'#b8a899',colors:['#654b73','#b95848','#d4ac64','#537b7b','#d8a7a0']},
] as const;

const weaveFlat = (p: { paper: string; thread: string; colors: readonly string[] }) => [p.paper, p.thread, ...p.colors];

export const artPalettes: Record<CardArtStyle, StylePalettes> = {
  weave: {
    roles: ['紙底', '經線', '色 1', '色 2', '色 3', '色 4', '色 5'],
    palettes: [
      { name: '織錦', colors: weaveFlat(weavePalettes[0]) },
      { name: '青花', colors: weaveFlat(weavePalettes[1]) },
      { name: '田園', colors: weaveFlat(weavePalettes[2]) },
      { name: '葡萄', colors: weaveFlat(weavePalettes[3]) },
      { name: '苔庭', colors: ['#f2efe2', '#ada68c', '#3d5a3a', '#b8743f', '#a9b98a', '#d7b45e', '#7d5b4a'] },
      { name: '暮霞', colors: ['#f5eee9', '#b9a7a0', '#4a3f6b', '#c9705f', '#e0b48a', '#5f8a8b', '#c58fa0'] },
    ],
  },
  stars: {
    roles: ['夜空', '軌道', '連線', '低八度', '中八度', '高八度', '星芒'],
    palettes: [
      { name: '藍夜', colors: ['#202d43', '#bec7cb', '#aebdcb', '#e9be78', '#a8c9cd', '#deaaa0', '#f7f0df'] },
      { name: '深林夜', colors: ['#1f3330', '#c3cbbf', '#b3c2b4', '#e6c27a', '#9fc7b4', '#e3a98f', '#f6f1df'] },
      { name: '梅夜', colors: ['#2d2438', '#cbc1cc', '#bfb2c6', '#efc58a', '#b8b8dc', '#e8a6a8', '#f8efe4'] },
    ],
  },
  rhythm: {
    roles: ['紙底', '墨線', '色 1', '色 2', '色 3', '色 4', '色 5'],
    palettes: [
      { name: '經典', colors: ['#f4eee2', '#30372f', '#cc563d', '#355a9d', '#dab34f', '#315c4f', '#b57889'] },
      { name: '港灣', colors: ['#f1efe7', '#2c3440', '#c4643a', '#2c5d7c', '#e0bd5c', '#6c8f8a', '#d39a8a'] },
      { name: '莓果', colors: ['#f5eee6', '#3a2f35', '#a8443f', '#5a4a86', '#e0a64d', '#3f6a5e', '#d58ea0'] },
    ],
  },
  terrain: {
    roles: ['紙底', '遠山', '層 2', '層 3', '層 4', '近山', '等高線', '稜線'],
    palettes: [
      { name: '青山', colors: ['#f3eee4', '#a6bcc3', '#b9c6b6', '#d0aea3', '#8fa28b', '#4e716c', '#f8f3e9', '#fff8df'] },
      { name: '秋原', colors: ['#f4ede1', '#c9b79a', '#d8c6a0', '#cf9f86', '#a59a6c', '#6b5a3f', '#faf3e6', '#fff6dc'] },
      { name: '晨霧', colors: ['#f3efe9', '#b7b6cc', '#c9cdd6', '#dcb8b0', '#9aa7b8', '#55627a', '#f8f5f2', '#fff9ea'] },
    ],
  },
  letterpress: {
    roles: ['紙底', '紙紋', '墨 1', '墨 2', '墨 3', '墨 4', '墨 5', '墨 6', '墨 7', '附點'],
    palettes: [
      { name: '朱墨', colors: ['#f3eadb', '#84765e', '#b85945', '#3c7e7a', '#c4a34d', '#566b9b', '#af7584', '#3f6b54', '#bd7741', '#c65d45'] },
      { name: '海報', colors: ['#f1ede2', '#7a7868', '#2f6f9a', '#d0644e', '#e0b84a', '#4a8a6f', '#8c5a8f', '#24435f', '#e08b6a', '#d36a52'] },
      { name: '秋印', colors: ['#f4e9d8', '#8a7458', '#8f3f2f', '#5d7a4a', '#d49a3a', '#3f5266', '#b0697a', '#6b4e3a', '#c8803c', '#a5452f'] },
    ],
  },
  specimen: {
    roles: ['紙底', '低八度', '中八度', '高八度', '枝', '葉脈', '細紋', '附點', '膠帶'],
    palettes: [
      { name: '綠葉', colors: ['#f2eee3', '#526d54', '#7b9291', '#b18178', '#73765e', '#67745c', '#e7e7cf', '#bc786c', '#e4dcc4'] },
      { name: '秋葉', colors: ['#f3ece0', '#8a5a32', '#b98a45', '#a5513e', '#7a6a50', '#6e5f45', '#efe4cc', '#9c4a38', '#e6d8bd'] },
      { name: '藍花', colors: ['#f2eee6', '#4e6a7d', '#8b8fb3', '#c49aa6', '#6c7470', '#5f6a6a', '#e8e8e2', '#b07a90', '#e2dccd'] },
    ],
  },
  windows: {
    roles: ['紙底', '窗底', '窗 1', '窗 2', '窗 3', '窗 4', '窗 5', '窗 6', '窗 7', '休止', '窗櫺', '附點', '反光 1', '反光 2', '窗框', '窗台'],
    palettes: [
      { name: '午後窗', colors: ['#f4f0e6', '#e6ece5', '#98ada2', '#d8b16a', '#8daebc', '#cf9d92', '#b0a0b2', '#a6b38d', '#6f999a', '#f1eee2', '#607473', '#f6e9bf', '#fff7dc', '#fffdf1', '#657b78', '#9dada2'] },
      { name: '黃昏窗', colors: ['#f5efe4', '#efe6dc', '#c9a07a', '#e0b65e', '#a7a3c2', '#d98f7c', '#b98fa0', '#c2b07a', '#8a7d9f', '#f3ede2', '#6e5f63', '#f8e6bb', '#fff7dc', '#fffdf1', '#776569', '#b4a29b'] },
      { name: '海邊窗', colors: ['#f3f0e8', '#e3ebec', '#8fb3c4', '#e5c77a', '#6f9fb0', '#e0a890', '#a8b8c9', '#9cc0b0', '#4f7f93', '#eff0ea', '#4f6a78', '#f4ebc6', '#fff7dc', '#fffdf1', '#58717d', '#98aeb6'] },
    ],
  },
};

/** Number of original palettes baked into each renderer (weave picks one of four by melody hash). */
export const originalPaletteCount = (style: CardArtStyle) => style === 'weave' ? weavePalettes.length : 1;
export const paletteCount = (style: CardArtStyle) => artPalettes[style].palettes.length;
export const paletteName = (style: CardArtStyle, tone: number) => artPalettes[style].palettes[tone]?.name ?? '';

/** Stable FNV-1a hash of the playable content (ignores id/title), shared by weave colours and album covers. */
export function melodySeed(melody: Melody) {
  const signature = JSON.stringify([melody.tempoBpm, melody.events.map(event => [noteStep(event), event.duration, event.dotted])]);
  let seed = 2166136261;
  for (let i = 0; i < signature.length; i++) seed = Math.imul(seed ^ signature.charCodeAt(i), 16777619) >>> 0;
  return seed;
}

/** The palette a style shows when no tone is given (keeps links made before palettes existed unchanged). */
export const defaultTone = (melody: Melody, style: CardArtStyle) => style === 'weave' ? melodySeed(melody) % weavePalettes.length : 0;

/** Parse a URL tone value; undefined when missing or not valid for this style. */
export function parseTone(value: string | null, style: CardArtStyle): number | undefined {
  if (value === null || !/^\d{1,2}$/.test(value)) return undefined;
  const tone = Number(value);
  return tone < paletteCount(style) ? tone : undefined;
}

export const resolveTone = (value: string | null, style: CardArtStyle, melody: Melody) => parseTone(value, style) ?? defaultTone(melody, style);

/** Random palette for a style, never repeating `exclude` when another choice exists. */
export function drawTone(style: CardArtStyle, random: () => number = Math.random, exclude?: number) {
  const choices = Array.from({ length: paletteCount(style) }, (_, i) => i).filter(i => i !== exclude);
  const sample = random();
  return choices[Number.isFinite(sample) ? Math.min(choices.length - 1, Math.max(0, Math.floor(sample * choices.length))) : 0];
}

/** Colours the renderer actually painted with, in role order. */
export function renderedColors(melody: Melody, style: CardArtStyle) {
  return style === 'weave' ? weaveFlat(weavePalettes[defaultTone(melody, style)]) : artPalettes[style].palettes[0].colors;
}

/** from→to hex map that turns the rendered colours into the chosen palette. */
export function toneColorMap(melody: Melody, style: CardArtStyle, tone: number) {
  const from = renderedColors(melody, style), to = artPalettes[style].palettes[tone]?.colors ?? from;
  return new Map(from.map((hex, i) => [hex.toLowerCase(), to[i]]));
}

/** Replace every fill/stroke in a rendered SVG using a hex map. */
export function recolorSvg(svg: Element, map: ReadonlyMap<string, string>) {
  for (const node of [svg, ...svg.querySelectorAll('*')]) {
    for (const attr of ['fill', 'stroke', 'stop-color', 'flood-color']) {
      const value = node.getAttribute(attr)?.toLowerCase();
      const next = value && map.get(value);
      if (next && next !== value) node.setAttribute(attr, next);
    }
  }
}
