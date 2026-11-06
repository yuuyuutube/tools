export const pitches = ['c', 'd', 'e', 'f', 'g', 'a', 'b'] as const;
export const durations = [1, 2, 4, 8, 16, 32] as const;
export type PitchClass = typeof pitches[number];
export type Duration = typeof durations[number];
export type Octave = 1 | 2 | 3;
type Rhythm = { duration: Duration; dotted: boolean };
export type MusicEvent = Rhythm & ({ type: 'note'; pitch: PitchClass; octave: Octave; sharp: boolean } | { type: 'rest' });
export type Melody = {
  schemaVersion: 1; id: string; title: string; tempoBpm: number;
  events: MusicEvent[]; createdAt: string; updatedAt: string;
};
export const MIN_BPM = 40;
export const MAX_BPM = 240;
export const MAX_EVENTS = 512; // Modern practical limit, not a hardware claim.
export const MAX_TITLE = 60;
export function createMelody(title = 'Untitled beep'): Melody {
  const now = new Date().toISOString();
  return { schemaVersion: 1, id: crypto.randomUUID(), title, tempoBpm: 120, events: [], createdAt: now, updatedAt: now };
}
export function isMusicEvent(value: unknown): value is MusicEvent {
  if (!value || typeof value !== 'object') return false;
  const e = value as Record<string, unknown>;
  if (!durations.includes(e.duration as Duration) || typeof e.dotted !== 'boolean') return false;
  return e.type === 'rest' || (e.type === 'note' && pitches.includes(e.pitch as PitchClass)
    && [1, 2, 3].includes(e.octave as number) && typeof e.sharp === 'boolean'
    && !(e.sharp && (e.pitch === 'e' || e.pitch === 'b')));
}
export function isMelody(value: unknown): value is Melody {
  if (!value || typeof value !== 'object') return false;
  const m = value as Record<string, unknown>;
  return m.schemaVersion === 1 && typeof m.id === 'string' && m.id.length > 0 && m.id.length <= 100
    && typeof m.title === 'string' && m.title.trim().length > 0 && m.title.length <= MAX_TITLE
    && Number.isInteger(m.tempoBpm) && Number(m.tempoBpm) >= MIN_BPM && Number(m.tempoBpm) <= MAX_BPM
    && Array.isArray(m.events) && m.events.length <= MAX_EVENTS && m.events.every(isMusicEvent)
    && typeof m.createdAt === 'string' && Number.isFinite(Date.parse(m.createdAt))
    && typeof m.updatedAt === 'string' && Number.isFinite(Date.parse(m.updatedAt));
}
export function serializeMelody(melody: Melody): string {
  if (!isMelody(melody)) throw new Error('Invalid melody');
  return JSON.stringify(melody);
}
export function parseMelody(json: string): Melody {
  const value: unknown = JSON.parse(json);
  if (!isMelody(value)) throw new Error('Invalid melody');
  return value;
}
export function formatEvent(event: MusicEvent): string {
  const rhythm = `${event.duration}${event.dotted ? '.' : ''}`;
  return event.type === 'rest' ? `${rhythm}-` : `${rhythm}${event.sharp ? '#' : ''}${event.pitch}${event.octave}`;
}
export function eventSeconds(event: MusicEvent, bpm: number): number {
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error('Invalid tempo');
  return 60 / bpm * 4 / event.duration * (event.dotted ? 1.5 : 1);
}
export function timeline(events: MusicEvent[], bpm: number) {
  let offset = 0;
  return events.map((event, index) => {
    const duration = eventSeconds(event, bpm);
    const entry = { event, index, offset, duration };
    offset += duration;
    return entry;
  });
}
export function frequency(event: Extract<MusicEvent, { type: 'note' }>): number {
  const semitones = { c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };
  // Nokia label 1 -> scientific octave 4. Deliberate modern playback mapping.
  const midi = 60 + (event.octave - 1) * 12 + semitones[event.pitch] + Number(event.sharp);
  return 440 * 2 ** ((midi - 69) / 12);
}
