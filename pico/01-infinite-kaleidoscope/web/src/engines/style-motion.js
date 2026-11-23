import { smooth } from '../controllers/artwork.js';

// A seeded gradient between adjacent positions. There is no short repeating timeline.
function sample(index, seed, stream) {
  let value = Math.imul(index | 0, 0x9e3779b1) ^ seed ^ Math.imul(stream, 0x85ebca6b);
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  return ((value ^ (value >>> 15)) >>> 0) / 4294967295;
}

export function styleMotion(position, seed, interval, stream) {
  const scaled = position / interval;
  const index = Math.floor(scaled);
  const first = sample(index, seed, stream);
  const next = sample(index + 1, seed, stream);
  return first + (next - first) * smooth(scaled - index);
}

export function mixInk(first, second, ratio) {
  const a = Number.parseInt(first.slice(1), 16);
  const b = Number.parseInt(second.slice(1), 16);
  const r = Math.round((a >>> 16) * (1 - ratio) + (b >>> 16) * ratio);
  const g = Math.round(((a >>> 8) & 255) * (1 - ratio) + ((b >>> 8) & 255) * ratio);
  const blue = Math.round((a & 255) * (1 - ratio) + (b & 255) * ratio);
  return `rgb(${r} ${g} ${blue})`;
}
