import { durations, MAX_EVENTS, pitches, type Melody, type MusicEvent, type Octave } from './model';
export type EditorState = { melody: Melody; cursor: number; octave: Octave };
export type EditResult = { state: EditorState; preview?: MusicEvent; message?: string };
export function edit(state: EditorState, key: string, dotted = false): EditResult {
  const events = state.melody.events.map(e => ({ ...e }));
  let cursor = Math.max(0, Math.min(state.cursor, events.length));
  let octave = state.octave;
  let preview: MusicEvent | undefined;
  let message: string | undefined;
  const selected = events[cursor - 1];
  if (key === 'ArrowLeft') cursor = Math.max(0, cursor - 1);
  else if (key === 'ArrowRight') cursor = Math.min(events.length, cursor + 1);
  else if (key === 'Backspace') {
    if (cursor > 0) events.splice(--cursor, 1);
  } else if (/^[0-7]$/.test(key)) {
    if (events.length >= MAX_EVENTS) return { state, message: `最多可輸入 ${MAX_EVENTS} 個音符／休止符。` };
    const duration = selected?.duration ?? 4;
    const event: MusicEvent = key === '0' ? { type: 'rest', duration, dotted: false }
      : { type: 'note', pitch: pitches[Number(key) - 1], octave, sharp: false, duration, dotted };
    events.splice(cursor++, 0, event);
    preview = event;
  } else if (key === '8' || key === '9') {
    if (!selected) message = '請先輸入音符，或把游標移到音符右方。';
    else {
      const index = durations.indexOf(selected.duration);
      selected.duration = durations[Math.max(0, Math.min(durations.length - 1, index + (key === '8' ? 1 : -1)))];
      preview = selected;
    }
  } else if (key === '*') {
    octave = (octave % 3 + 1) as Octave;
    message = `下一個音符：八度 ${octave}。`;
  } else if (key === '#') {
    if (!selected || selected.type === 'rest') message = '請將游標移到音符右方，再切換升音。';
    else if (selected.pitch === 'e' || selected.pitch === 'b') message = '依原手冊規則，E 與 B 不提供升音。';
    else { selected.sharp = !selected.sharp; preview = selected; }
  } else if (key === '.') {
    if (selected) { selected.dotted = !selected.dotted; preview = selected; }
    else message = '請先選取音符或休止符。';
  }
  const changed = JSON.stringify(events) !== JSON.stringify(state.melody.events);
  return { state: { melody: changed ? { ...state.melody, events, updatedAt: new Date().toISOString() } : state.melody, cursor, octave }, preview, message };
}
