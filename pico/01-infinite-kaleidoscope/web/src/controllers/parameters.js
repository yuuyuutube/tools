import { mod, smooth } from './artwork.js';

const symmetries = [8, 10, 12, 7, 9, 6, 11];
const opticalFamilies = [0, 1, 2];

function familyAt(position, families) {
  const index = Math.floor(position);
  return {
    first: families[mod(index, families.length)],
    second: families[mod(index + 1, families.length)],
    mix: smooth(Math.max(0, (position - index - 0.30) / 0.70)),
  };
}

export function kaleidoParameters(position, seed) {
  const chapter = position / 24 + seed[0] * 0.22;
  return familyAt(chapter, symmetries);
}

export function opticalParameters(position, seed) {
  return familyAt(position / 20 + seed[1] * 0.24, opticalFamilies);
}

export function spiroParameters(position, phase, seed) {
  const x = position * 0.055;
  return {
    inner: 3.1 + 1.5 * Math.sin(x * 0.82 + seed[0] * 5),
    outer: 6.4 + 2.6 * Math.sin(x * 0.43 + seed[2] * 6.2),
    reach: 0.39 + 0.22 * Math.sin(x * 1.13 + seed[1] * 5.2),
    lift: 0.09 + 0.075 * Math.sin(x * 0.8 + seed[3] * 4),
    angle: seed[2] * 1.7 + x * 0.18 + phase * 0.031,
    growth: 0.5 + 0.5 * Math.cos(phase * 0.095 + x * 0.2),
  };
}
