import type { Melody } from './music-core/model';
import { cardArtStyles } from './art-styles';
import { melodySeed, paletteCount } from './art-palettes';
/** Album covers stay stable per melody: the content hash picks both the art style and its palette. */
export function albumCoverStyle(melody:Melody) {
  return cardArtStyles[melodySeed(melody)%cardArtStyles.length];
}
export function albumCoverTone(melody:Melody) {
  return Math.floor(melodySeed(melody)/cardArtStyles.length)%paletteCount(albumCoverStyle(melody));
}
