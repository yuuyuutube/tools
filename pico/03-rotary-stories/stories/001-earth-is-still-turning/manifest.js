// RS 001 《地球仍有四季》 — story manifest. The library and the player read only this file;
// each chapter's scene module is imported when the reader reaches it.
import * as text from './narrative/text.js';
import { keepsake } from './keepsake.js';

const base = new URL('./', import.meta.url).href;

export default {
  id: '001-earth-is-still-turning',
  slug: 'eist',
  text,
  stylesheet: `${base}styles/story.css`,
  keepsake,
  chapters: [
    { id: 'ch1', card: text.cards.ch1, load: () => import('./scenes/ch1-observation-deck.js') },
    { id: 'ch2', card: text.cards.ch2, load: () => import('./scenes/ch2-image-archive.js') },
    { id: 'ch3', card: text.cards.ch3, load: () => import('./scenes/ch3-sounds.js') },
    { id: 'ch4', card: text.cards.ch4, load: () => import('./scenes/ch4-living-archive.js') },
    { id: 'ch5', card: text.cards.ch5, load: () => import('./scenes/ch5-distant-signal.js') },
    { id: 'fin', card: { ...text.cards.fin, prelude: text.interlude }, final: true, load: () => import('./scenes/fin-first-photograph.js') },
  ],
};
