// Simulation only. These are selectable musical ranges, not measured DX specs.
const makeRange = (id, lowMidi, highMidi, lowNote, highNote) => Object.freeze({
  id, lowMidi, highMidi, lowNote, highNote, label: `${lowNote}–${highNote}`,
  base: 440 * 2 ** ((lowMidi - 69) / 12),
  top: 440 * 2 ** ((highMidi - 69) / 12),
  semitones: highMidi - lowMidi,
});
export const RANGES = Object.freeze({
  'g3-d6': makeRange('g3-d6', 55, 86, 'G3', 'D6'),
  'c3-c6': makeRange('c3-c6', 48, 84, 'C3', 'C6'),
});
export const DEFAULT_RANGE = RANGES['g3-d6'];
export const rangeFor = id => Object.hasOwn(RANGES, id) ? RANGES[id] : DEFAULT_RANGE;
export const MODELS = Object.freeze({
  inverse: { name: 'Inverse-length-inspired', formula: 'f(x) = f₀ / [1 − (1 − f₀/f₁)x]', hint: '向高音移動，同樣的位移跨過更多半音。高音的音符位置逐漸擠在一起。' },
  exponential: { name: 'Equal semitone spacing', formula: 'f(x) = f₀ × (f₁/f₀)ˣ', hint: '每一格音程一樣寬。半音圖是一條直線，Hz 圖卻向上彎曲。' },
  linear: { name: 'Linear frequency', formula: 'f(x) = f₀ + (f₁ − f₀)x', hint: '每一格增加相同 Hz；越往高音，同樣的位移跨過的半音反而越少。' },
});
export const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
export function frequencyAt(position, model, range = DEFAULT_RANGE) {
  const x = clamp(position), { base, top } = range, ratio = top / base;
  let frequency;
  if (model === 'inverse') frequency = base / (1 - (1 - 1 / ratio) * x);
  else if (model === 'exponential') frequency = base * ratio ** x;
  else if (model === 'linear') frequency = base + (top - base) * x;
  else throw new RangeError(`Unknown simulation: ${model}`);
  return x === 0 ? base : x === 1 ? top : frequency;
}
export function positionAt(frequency, model, range = DEFAULT_RANGE) {
  const { base, top, semitones } = range;
  if (model === 'inverse') return clamp((1 - base / frequency) / (1 - base / top));
  if (model === 'exponential') return clamp(12 * Math.log2(frequency / base) / semitones);
  if (model === 'linear') return clamp((frequency - base) / (top - base));
  throw new RangeError(`Unknown simulation: ${model}`);
}
export const semitonesFrom = (frequency, reference = DEFAULT_RANGE.base) => 12 * Math.log2(frequency / reference);
export function pitchOf(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError('Frequency must be positive');
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const nearest = Math.round(midi);
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const cents = Math.round(100 * (midi - nearest)) || 0;
  return { midi, nearest, cents, note: `${names[(nearest % 12 + 12) % 12]}${Math.floor(nearest / 12) - 1}` };
}
export function rangeMarkers(range = DEFAULT_RANGE) {
  const semitones = [];
  for (let s = 0; s <= range.semitones; s += 12) semitones.push(s);
  if (semitones.at(-1) !== range.semitones) semitones.push(range.semitones);
  return semitones.map(s => {
    const frequency = s === range.semitones ? range.top : range.base * 2 ** (s / 12);
    return { semitones: s, frequency, note: pitchOf(frequency).note };
  });
}
// Local derivative, expressed in cents for a 1 percentage-point displacement.
export function sensitivityAt(x, model, range = DEFAULT_RANGE) {
  const ratio = range.top / range.base, a = 1 - 1 / ratio;
  if (model === 'exponential') return range.semitones;
  if (model === 'linear') return 12 / Math.LN2 * (ratio - 1) / (1 + (ratio - 1) * x);
  if (model === 'inverse') return 12 / Math.LN2 * a / (1 - a * x);
  throw new RangeError(`Unknown simulation: ${model}`);
}
export const signed = value => `${value > 0 ? '+' : ''}${value}`;
