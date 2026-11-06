import { createMelody, type PitchClass } from './music-core/model';
export function demoMelody() {
  const melody = createMelody('Little signals');
  melody.tempoBpm = 132;
  const notes: PitchClass[] = ['c', 'e', 'g', 'e', 'd', 'f', 'a', 'g', 'e', 'd', 'c'];
  melody.events = notes.map((pitch, index) => ({ type: 'note', pitch, octave: 2, sharp: false, duration: index === 10 ? 2 : 8, dotted: index === 7 }));
  melody.events.splice(4, 0, { type: 'rest', duration: 8, dotted: false });
  return melody;
}
