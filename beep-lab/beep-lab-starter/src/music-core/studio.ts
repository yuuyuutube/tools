import { isMusicEvent, MAX_EVENTS, type MusicEvent } from './model';
import type { EditorState, EditResult } from './editor';
export function updateSelected(state: EditorState, event: MusicEvent): EditResult {
  const index = state.cursor - 1;
  if (index < 0 || index >= state.melody.events.length || !isMusicEvent(event)) return { state };
  if (JSON.stringify(event) === JSON.stringify(state.melody.events[index])) return { state };
  const events = state.melody.events.map((original, i) => i === index ? { ...event } : { ...original });
  return { state: { ...state, melody: { ...state.melody, events, updatedAt: new Date().toISOString() } }, preview: event };
}
export function appendStudioEvent(state: EditorState, event: MusicEvent): EditResult {
  if (!isMusicEvent(event) || state.melody.events.length >= MAX_EVENTS) return { state, message: '已達音符數量上限。' };
  const events = state.melody.events.map(e => ({ ...e }));
  events.splice(state.cursor, 0, { ...event });
  return { state: { ...state, cursor: state.cursor + 1, melody: { ...state.melody, events, updatedAt: new Date().toISOString() } }, preview: event };
}
export const pitchSteps = ['c', 'c#', 'd', 'd#', 'e', 'f', 'f#', 'g', 'g#', 'a', 'a#', 'b'] as const;
export function noteFromStep(step: number, rhythm: Pick<MusicEvent, 'duration' | 'dotted'>): MusicEvent {
  const safe = Math.max(0, Math.min(35, Math.round(step)));
  const value = pitchSteps[safe % 12];
  return { type: 'note', pitch: value[0] as 'c'|'d'|'e'|'f'|'g'|'a'|'b', sharp: value.includes('#'), octave: (Math.floor(safe / 12) + 1) as 1|2|3, duration: rhythm.duration, dotted: rhythm.dotted };
}
export function noteStep(event: MusicEvent): number | null {
  return event.type === 'rest' ? null : (event.octave - 1) * 12 + pitchSteps.indexOf(`${event.pitch}${event.sharp ? '#' : ''}` as typeof pitchSteps[number]);
}

export function resizeRhythm(event: MusicEvent, width: number): MusicEvent {
  if (!Number.isFinite(width)) return { ...event };
  const denominators = [1, 2, 4, 8, 16, 32] as const;
  const scale = 320 * (event.dotted ? 1.5 : 1);
  const duration = denominators.reduce((closest, candidate) =>
    Math.abs(scale / candidate - width) < Math.abs(scale / closest - width) ? candidate : closest, denominators[0] as typeof denominators[number]);
  return { ...event, duration };
}

export function swapStudioEvents(state: EditorState, from: number, to: number): EditResult {
  const count = state.melody.events.length;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || to < 0 || from >= count || to >= count || from === to) return { state };
  const events = state.melody.events.map(event => ({ ...event }));
  [events[from], events[to]] = [events[to], events[from]];
  return { state: { ...state, cursor: to + 1, melody: { ...state.melody, events, updatedAt: new Date().toISOString() } }, message: `已交換第 ${from + 1} 與第 ${to + 1} 音。` };
}
