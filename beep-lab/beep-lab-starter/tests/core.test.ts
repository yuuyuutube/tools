import { describe, expect, it } from 'vitest';
import { createMelody, eventSeconds, formatEvent, frequency, isMelody, isMusicEvent, parseMelody, serializeMelody, timeline, type MusicEvent } from '../src/music-core/model';
import { edit, type EditorState } from '../src/music-core/editor';
import { readLibrary, STORAGE_KEY, writeLibrary } from '../src/music-core/storage';
const note: MusicEvent = { type: 'note', pitch: 'c', octave: 2, sharp: false, duration: 4, dotted: false };
function initial(): EditorState { return { melody: createMelody(), cursor: 0, octave: 2 }; }
function input(keys: string[], state = initial()) { return keys.reduce((s, key) => edit(s, key).state, state); }
function memory() { const data = new Map<string, string>(); return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k, v); } }; }
describe('canonical melody', () => {
  it('formats notes, dotted sharps and rests', () => {
    expect(formatEvent(note)).toBe('4c2');
    expect(formatEvent({ ...note, pitch: 'f', sharp: true, dotted: true, duration: 8 })).toBe('8.#f2');
    expect(formatEvent({ type: 'rest', duration: 4, dotted: false })).toBe('4-');
  });
  it('round-trips versioned JSON, retaining event details and metadata', () => {
    const melody = input(['1', '8', '#', '.', '0', '*', '6']).melody;
    expect(parseMelody(serializeMelody(melody))).toEqual(melody);
  });
  it('rejects invalid schema, tempo, timestamps and impossible pitches', () => {
    expect(isMusicEvent({ ...note, pitch: 'e', sharp: true })).toBe(false);
    expect(isMusicEvent({ ...note, pitch: 'b', sharp: true })).toBe(false);
    for (const override of [{ schemaVersion: 2 }, { tempoBpm: 0 }, { tempoBpm: 120.5 }, { createdAt: 'bad' }, { title: '' }, { events: [{ ...note, duration: 3 }] }]) {
      expect(isMelody({ ...createMelody(), ...override })).toBe(false);
    }
    expect(() => parseMelody('{}')).toThrow();
  });
  it('calculates rhythm, dots, rests and sequential offsets independently of display', () => {
    expect(eventSeconds(note, 120)).toBe(0.5);
    expect(eventSeconds({ ...note, duration: 8, dotted: true }, 120)).toBe(0.375);
    expect(eventSeconds({ type: 'rest', duration: 1, dotted: false }, 60)).toBe(4);
    expect(timeline([note, { type: 'rest', duration: 8, dotted: true }, note], 120).map(e => e.offset)).toEqual([0, 0.5, 0.875]);
    expect(() => eventSeconds(note, 0)).toThrow();
  });
  it('uses the explicit octave mapping C1 = scientific C4 and A1 = 440 Hz', () => {
    expect(frequency({ ...note, pitch: 'a', octave: 1 })).toBe(440);
    expect(frequency({ ...note, octave: 1 })).toBeCloseTo(261.6256);
    expect(frequency({ ...note, octave: 3 }) / frequency({ ...note, octave: 2 })).toBe(2);
  });
});
describe('composer editing', () => {
  it('maps 1–7 to C–B and previews each inserted event', () => {
    expect(input('1234567'.split('')).melody.events.map(e => e.type === 'note' && e.pitch)).toEqual(['c', 'd', 'e', 'f', 'g', 'a', 'b']);
    expect(edit(initial(), '1').preview).toEqual(note);
  });
  it('inserts at the cursor, modifies the left event and deletes to the left', () => {
    const s = input(['1', '3', 'ArrowLeft', '2']);
    expect(s.melody.events.map(formatEvent)).toEqual(['4c2', '4d2', '4e2']);
    expect(input(['Backspace'], s).melody.events.map(formatEvent)).toEqual(['4c2', '4e2']);
    expect(input(['ArrowLeft', '8'], s).melody.events.map(formatEvent)).toEqual(['8c2', '4d2', '4e2']);
    expect(input(['ArrowLeft', 'ArrowLeft', 'Backspace'], s).melody.events).toHaveLength(3);
  });
  it('uses previous duration for rests and subsequent notes; clamps duration boundaries', () => {
    expect(input(['0']).melody.events[0].duration).toBe(4);
    expect(input(['1', '8', '0', '2']).melody.events.map(e => e.duration)).toEqual([8, 8, 8]);
    const shortest = input(['1', ...Array(10).fill('8')]);
    expect(shortest.melody.events[0].duration).toBe(32);
    expect(input(Array(10).fill('9'), shortest).melody.events[0].duration).toBe(1);
  });
  it('cycles future-note octaves without mutating previous notes', () => {
    const s = input(['1', '*', '2', '*', '3', '*', '4']);
    expect(s.melody.events.map(e => e.type === 'note' && e.octave)).toEqual([2, 3, 1, 2]);
  });
  it('toggles sharps except E/B and refuses to sharpen rests', () => {
    expect(input(['1', '#']).melody.events[0]).toMatchObject({ sharp: true });
    expect(input(['1', '#', '#']).melody.events[0]).toMatchObject({ sharp: false });
    for (const key of ['3', '7', '0']) {
      const s = input([key]); expect(edit(s, '#').message).toBeTruthy(); expect(edit(s, '#').state.melody).toEqual(s.melody);
    }
  });
  it('creates a dotted note once and preserves dots when adjusting duration', () => {
    const s = edit(initial(), '1', true).state;
    expect(s.melody.events).toHaveLength(1);
    expect(input(['8'], s).melody.events[0]).toMatchObject({ duration: 8, dotted: true });
    expect(input(['.'], s).melody.events[0].dotted).toBe(false);
  });
  it('enforces the documented event limit without losing existing notes', () => {
    const s = initial(); s.melody.events = Array.from({ length: 512 }, () => ({ ...note })); s.cursor = 512;
    const result = edit(s, '1'); expect(result.state).toBe(s); expect(result.message).toBeTruthy();
  });
});
describe('local library recovery', () => {
  it('saves and restores title, tempo, rhythm and all metadata', () => {
    const storage = memory(); const melody = input(['1', '8', '.', '0']).melody;
    melody.title = 'My First Beep'; melody.tempoBpm = 144;
    writeLibrary(storage, [melody]); expect(readLibrary(storage)).toEqual({ songs: [melody], writable: true, warning: undefined });
  });
  it('keeps valid songs when another entry is corrupt or duplicated', () => {
    const storage = memory(); const melody = createMelody();
    storage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 1, songs: [melody, {}, melody] }));
    expect(readLibrary(storage).songs).toEqual([melody]); expect(readLibrary(storage).warning).toBeTruthy();
  });
  it('does not overwrite malformed or future-version libraries', () => {
    for (const raw of ['{bad', '{"schemaVersion":2,"songs":[]}']) {
      const storage = memory(); storage.setItem(STORAGE_KEY, raw);
      expect(readLibrary(storage).writable).toBe(false); expect(storage.getItem(STORAGE_KEY)).toBe(raw);
    }
  });
  it('handles unavailable storage and reports write failures', () => {
    const storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); } };
    expect(readLibrary(storage).warning).toBeTruthy(); expect(() => writeLibrary(storage, [createMelody()])).toThrow('儲存失敗');
  });
});
