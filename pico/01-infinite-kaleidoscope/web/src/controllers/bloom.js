export const BLOOM_STYLES = [
  { id: 'indian', name: 'Indian', palette: 'moss-cyclamen' },
  { id: 'nordic', name: 'Nordic', palette: 'cocoa-bluebell' },
  { id: 'japanese', name: 'Japanese', palette: 'prussian-celadon' },
];
export const BLOOM_START = { bloomProgress: 0.56, bloomStyle: 'indian' };
export const MAX_BLOOM_PROGRESS = 1e10;
const RINGS_PER_STEP = 0.25;

export function changeBloomProgress(progress, steps) {
  const target = progress + steps * RINGS_PER_STEP;
  return Math.min(MAX_BLOOM_PROGRESS, Math.max(-MAX_BLOOM_PROGRESS, target));
}
