// Dev-only page (palette-preview.html): compare draft palettes using the real card-art renderers.
import { cardArtNames, cardArtStyles, type CardArtStyle } from './art-styles';
import { artPalettes, originalPaletteCount } from './art-palettes';
import { createCardArt } from './card-art';
import { starterMelodies } from './repertoire';
import type { Melody } from './music-core/model';

const melodies = starterMelodies();
const root = document.querySelector<HTMLElement>('#root')!;
const melodySelect = document.querySelector<HTMLSelectElement>('#melody')!;
const modeSelect = document.querySelector<HTMLSelectElement>('#mode')!;
const shuffle = document.querySelector<HTMLButtonElement>('#shuffle')!;
melodies.forEach((melody, i) => melodySelect.add(new Option(melody.title, String(i))));

const renderArt = (melody: Melody, style: CardArtStyle, tone: number) => createCardArt(melody, style, tone).element;

function figure(melody: Melody, style: CardArtStyle, paletteIndex: number, caption: string, note = '') {
  const palette = artPalettes[style].palettes[paletteIndex];
  const fig = document.createElement('figure');
  if (paletteIndex >= originalPaletteCount(style)) fig.className = 'new';
  const cap = document.createElement('figcaption');
  cap.innerHTML = `<b></b><span></span>`;
  cap.querySelector('b')!.textContent = caption;
  cap.querySelector('span')!.textContent = note;
  const swatches = document.createElement('div');
  swatches.className = 'swatches';
  palette.colors.forEach((hex, i) => {
    const swatch = document.createElement('i');
    swatch.style.background = hex;
    swatch.title = `${artPalettes[style].roles[i]} ${hex}`;
    swatches.append(swatch);
  });
  fig.append(renderArt(melody, style, paletteIndex), cap, swatches);
  return fig;
}

function renderStyles(melody: Melody) {
  for (const style of cardArtStyles) {
    const section = document.createElement('section');
    const { palettes } = artPalettes[style];
    section.innerHTML = `<h2>${cardArtNames[style]}<small>${palettes.length} 組配色・滑過色條看色碼</small></h2>`;
    const row = document.createElement('div');
    row.className = 'row';
    palettes.forEach((palette, i) => row.append(figure(melody, style, i, palette.name)));
    section.append(row);
    root.append(section);
  }
}

function renderShelf() {
  const section = document.createElement('section');
  section.innerHTML = `<h2>隨機書架<small>每首歌隨機抽圖案＋配色，看整體是否和諧</small></h2>`;
  const shelf = document.createElement('div');
  shelf.className = 'shelf';
  const pick = <T,>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];
  for (let i = 0; i < 24; i++) {
    const melody = melodies[i % melodies.length];
    const style = pick(cardArtStyles);
    const index = Math.floor(Math.random() * artPalettes[style].palettes.length);
    shelf.append(figure(melody, style, index, melody.title, `${cardArtNames[style]}・${artPalettes[style].palettes[index].name}`));
  }
  section.append(shelf);
  root.append(section);
}

function render() {
  root.replaceChildren();
  const shelfMode = modeSelect.value === 'shelf';
  shuffle.hidden = !shelfMode;
  melodySelect.disabled = shelfMode;
  if (shelfMode) renderShelf();
  else renderStyles(melodies[Number(melodySelect.value)]);
}
melodySelect.onchange = render;
modeSelect.onchange = render;
shuffle.onclick = render;
render();
