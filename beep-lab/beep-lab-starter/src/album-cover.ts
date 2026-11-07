import type { Melody } from './music-core/model';
import { noteStep } from './music-core/studio';
import { cardArtStyles } from './art-styles';
export function albumCoverStyle(melody:Melody) {
  const signature=JSON.stringify([melody.tempoBpm,melody.events.map(event=>[noteStep(event),event.duration,event.dotted])]);
  let seed=2166136261;for(let i=0;i<signature.length;i++)seed=Math.imul(seed^signature.charCodeAt(i),16777619)>>>0;
  return cardArtStyles[seed%cardArtStyles.length];
}
