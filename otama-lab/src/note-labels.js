import { positionAt } from './pitch.js';

// Hidden URL option for focus mode: ?mode=play&notes=abc writes C D E F G A B
// beside the neck ticks, ?notes=123 writes numbered notation (C = 1). Octave
// numbers are left out on purpose: C3 and C4 are both "C" (or "1").
const NOTE_LABEL_SYSTEMS = Object.freeze({ abc: ['C', 'D', 'E', 'F', 'G', 'A', 'B'], 123: ['1', '2', '3', '4', '5', '6', '7'] });
const NOTE_LABEL_STEPS = [0, 2, 4, 5, 7, 9, 11];
export function noteLabelSystem(search = window.location.search) {
  const value = new URLSearchParams(search).get('notes')?.toLowerCase();
  return value && Object.hasOwn(NOTE_LABEL_SYSTEMS, value) ? value : null;
}
const midiFrequency = midi => 440 * 2 ** ((midi - 69) / 12);
// One small tick per semitone; octaves of the range's low note are long and lime.
export function appendNoteTicks(container, range, model) {
  for (let semitone = 0; semitone <= range.semitones; semitone++) {
    const mark = document.createElement('i');
    mark.className = 'note-mark';
    const frequency = semitone === range.semitones ? range.top : range.base * 2 ** (semitone / 12);
    mark.style.bottom = `${(1 - positionAt(frequency, model, range)) * 100}%`;
    if (semitone % 12 === 0 || semitone === range.semitones) { mark.style.width = '15px'; mark.style.background = '#c8f16e'; }
    container.append(mark);
  }
}
// Natural notes only. Neighbouring labels alternate sides of the neck, so the
// half steps E–F and B–C stay readable where the high end of the neck crowds.
export function appendNoteLabels(container, { system, range, model }) {
  const names = NOTE_LABEL_SYSTEMS[system];
  if (!names) return;
  for (let midi = range.lowMidi; midi <= range.highMidi; midi++) {
    const step = NOTE_LABEL_STEPS.indexOf(midi % 12);
    if (step < 0) continue;
    const label = document.createElement('span');
    label.className = `note-label ${(Math.floor(midi / 12) * 7 + step) % 2 ? 'right' : 'left'}${step === 0 ? ' tonic' : ''}`;
    label.textContent = names[step];
    label.style.bottom = `${(1 - positionAt(midiFrequency(midi), model, range)) * 100}%`;
    container.append(label);
  }
}
