import { mod, seededRandom } from '../controllers/artwork.js';

export const BLOOM_RING_LIMIT = 13;
const symmetryOptions = [8, 10, 6, 8];
const organic = ['petal', 'arc', 'lace'];
const angular = ['diamond', 'star', 'tessellation'];

function birthSeed(seed, index) {
  // Include both halves so the stream does not repeat when the low word wraps.
  let value = seed ^ Math.imul(index | 0, 0x9e3779b1) ^
    Math.imul(Math.floor(index / 4294967296) | 0, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return (value ^ (value >>> 15)) >>> 0;
}

function pickFamily(seed, index) {
  const slot = mod(index, 6);
  const bank = slot % 2 === 0 ? organic : angular;
  const order = birthSeed(seed ^ (slot % 2), Math.floor(index / 6)) % 6;
  const first = order % 3;
  const stride = order < 3 ? 1 : 2;
  return bank[(first + Math.floor(slot / 2) * stride) % 3];
}

export function generateBloomRing(seed, index) {
  const ringSeed = birthSeed(seed, index);
  const random = seededRandom(ringSeed);
  const family = pickFamily(seed, index);
  const baseSymmetry = symmetryOptions[birthSeed(seed, 0) % symmetryOptions.length];
  const symmetry = baseSymmetry;
  const rotation = random() < 0.5 ? 0 : Math.PI / symmetry;
  const alternate = random() < 0.42;
  const even = mod(index, 2) === 0;

  return {
    index, ringSeed, family, symmetry, rotation,
    breadth: 0.83 + 0.15 * random(),
    stretch: 0.92 + 0.075 * random(),
    bias: random(),
    primary: even ? (alternate ? 3 : 4) : (alternate ? 3 : 2),
    secondary: even ? 2 : 4,
    highlight: 1,
  };
}

export function bloomRadius(age) {
  const lived = Math.max(0, age);
  return lived * (0.040 + 0.0075 * lived);
}

export function bloomRingWindow(progress, corner, frame) {
  frame.newest = Math.floor(progress);
  // On narrow or ultrawide screens, scale the radial measure to keep the same budget.
  frame.scale = Math.max(0.87, corner / 1.12);
  let count = 1;
  while (count < BLOOM_RING_LIMIT &&
         bloomRadius(progress - frame.newest + count - 1) * frame.scale < corner) count++;
  frame.oldest = frame.newest - count + 1;
}
