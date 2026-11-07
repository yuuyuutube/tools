// Simulation only. No DX circuit or measurement is represented here.
export const BASE = 440 * 2 ** ((48 - 69) / 12);
export const TOP = BASE * 8;
export const MODELS = Object.freeze({
  inverse: { name: 'Inverse-length-inspired', formula: 'f(x) = f₀ / (1 − 0.875x)', hint: '向高音移動，同樣的位移跨過更多半音。高音的音符位置逐漸擠在一起。' },
  exponential: { name: 'Equal semitone spacing', formula: 'f(x) = f₀ × 8ˣ', hint: '每一格音程一樣寬。半音圖是一條直線，Hz 圖卻向上彎曲。' },
  linear: { name: 'Linear frequency', formula: 'f(x) = f₀ + (f₁ − f₀)x', hint: '每一格增加相同 Hz；越往高音，同樣的位移跨過的半音反而越少。' },
});
export const clamp = x => Math.max(0, Math.min(1, Number(x) || 0));
export function frequencyAt(position, model) {
  const x = clamp(position);
  if (model === 'inverse') return BASE / (1 - .875 * x);
  if (model === 'exponential') return BASE * 8 ** x;
  if (model === 'linear') return BASE + (TOP - BASE) * x;
  throw new RangeError(`Unknown simulation: ${model}`);
}
export function positionAt(frequency, model) {
  if (model === 'inverse') return clamp((1 - BASE / frequency) / .875);
  if (model === 'exponential') return clamp(Math.log2(frequency / BASE) / 3);
  if (model === 'linear') return clamp((frequency - BASE) / (TOP - BASE));
  throw new RangeError(`Unknown simulation: ${model}`);
}
export const semitonesFrom = (frequency, reference = BASE) => 12 * Math.log2(frequency / reference);
export function pitchOf(frequency) {
  if (!Number.isFinite(frequency) || frequency <= 0) throw new RangeError('Frequency must be positive');
  const midi = 69 + 12 * Math.log2(frequency / 440);
  const nearest = Math.round(midi);
  const names = ['C', 'C♯', 'D', 'D♯', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'A♯', 'B'];
  const cents = Math.round(100 * (midi - nearest)) || 0;
  return { midi, nearest, cents, note: `${names[(nearest % 12 + 12) % 12]}${Math.floor(nearest / 12) - 1}` };
}
// Local derivative, expressed in cents for a 1 percentage-point displacement.
export function sensitivityAt(x, model) {
  if (model === 'exponential') return 36;
  if (model === 'linear') return 12 / Math.LN2 * 7 / (1 + 7 * x);
  return 12 / Math.LN2 * .875 / (1 - .875 * x);
}
export const signed = value => `${value > 0 ? '+' : ''}${value}`;
