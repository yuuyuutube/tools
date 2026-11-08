import test from 'node:test';
import assert from 'node:assert/strict';
import { miniOtamaPitch } from '../src/live/mini-otama.js';
import { RANGES, frequencyAt } from '../src/pitch.js';

test('mini neck follows the existing inverse Simulation continuously from G3 to D6', () => {
  const range = RANGES['g3-d6'];
  for (let index = 0; index <= 1000; index++) {
    const position = index / 1000;
    const frame = miniOtamaPitch(frequencyAt(position, 'inverse', range));
    assert.ok(Math.abs(frame.position - position) < 1e-12);
    assert.equal(frame.limit, 'none');
  }
  const natural = miniOtamaPitch(440), sharp = miniOtamaPitch(440 * 2 ** (37 / 1200));
  assert.ok(sharp.position > natural.position);
  assert.notEqual(sharp.position, miniOtamaPitch(440 * 2 ** (1 / 12)).position);
});

test('out-of-range sound clamps only the visual neck; invalid or absent pitch has no invented position', () => {
  assert.deepEqual(miniOtamaPitch(82.41), { frequencyHz: 82.41, position: 0, limit: 'low' });
  assert.deepEqual(miniOtamaPitch(1900), { frequencyHz: 1900, position: 1, limit: 'high' });
  for (const value of [null, undefined, 0, -1, NaN, Infinity, '440']) assert.equal(miniOtamaPitch(value), null);
});
