import test from 'node:test';
import assert from 'node:assert/strict';
import { RANGES, DEFAULT_RANGE, rangeFor, rangeMarkers, MODELS, frequencyAt, positionAt, pitchOf, semitonesFrom, sensitivityAt } from '../src/pitch.js';
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
test('two ranges only, G3–D6 by default, and safe query fallback', () => {
  assert.deepEqual(Object.keys(RANGES), ['g3-d6', 'c3-c6']);
  assert.equal(DEFAULT_RANGE.id, 'g3-d6');
  near(DEFAULT_RANGE.base, 195.99771799087463); near(DEFAULT_RANGE.top, 1174.6590716696303);
  assert.equal(DEFAULT_RANGE.semitones, 31);
  assert.equal(rangeFor('c3-c6'), RANGES['c3-c6']);
  for (const value of [null, '', 'invalid', '__proto__', 'toString']) assert.equal(rangeFor(value), DEFAULT_RANGE);
});
test('reference notes and signed cents stay independent of the chosen range', () => {
  for (const [frequency, note] of [[130.8127826502993, 'C3'], [195.99771799087463, 'G3'], [440, 'A4'], [880, 'A5'], [1046.5022612023945, 'C6'], [1174.6590716696303, 'D6']]) {
    assert.equal(pitchOf(frequency).note, note); assert.equal(pitchOf(frequency).cents, 0);
  }
  assert.equal(pitchOf(440 * 2 ** (.23 / 12)).cents, 23);
  assert.equal(pitchOf(440 * 2 ** (-.37 / 12)).cents, -37);
  assert.equal(pitchOf(440 * 2 ** (.51 / 12)).note, 'A♯4');
  assert.equal(pitchOf(440 * 2 ** (.51 / 12)).cents, -49);
  assert.throws(() => pitchOf(0), RangeError);
});
for (const range of Object.values(RANGES)) {
  test(`${range.label}: octave markers include both endpoints, never outside the range`, () => {
    const markers = rangeMarkers(range);
    assert.equal(markers[0].note, range.lowNote); assert.equal(markers.at(-1).note, range.highNote);
    assert.equal(markers.at(-1).semitones, range.semitones);
    for (const marker of markers) assert.ok(marker.frequency >= range.base && marker.frequency <= range.top);
    assert.deepEqual(markers.map(marker => marker.note), range.id === 'g3-d6' ? ['G3', 'G4', 'G5', 'D6'] : ['C3', 'C4', 'C5', 'C6']);
  });
  for (const model of Object.keys(MODELS)) {
    test(`${range.label}/${model}: exact endpoints, monotonicity and 1001 round trips`, () => {
      assert.equal(frequencyAt(0, model, range), range.base); assert.equal(frequencyAt(1, model, range), range.top);
      let previous = 0;
      for (let i = 0; i <= 1000; i++) {
        const x = i / 1000, f = frequencyAt(x, model, range);
        assert.ok(f > previous); previous = f;
        near(positionAt(f, model, range), x);
        near(pitchOf(f).midi - range.lowMidi, semitonesFrom(f, range.base));
      }
    });
    test(`${range.label}/${model}: octave comparison and local sensitivity`, () => {
      for (const f of [range.base, range.base * 2]) {
        near(semitonesFrom(2 * f, f), 12);
        near(frequencyAt(positionAt(f * 2, model, range), model, range), f * 2);
      }
      const x = .45, h = 1e-6;
      const numerical = semitonesFrom(frequencyAt(x + h, model, range), frequencyAt(x - h, model, range)) / (2 * h);
      near(sensitivityAt(x, model, range), numerical, 1e-6);
    });
  }
  test(`${range.label}: continuous pitch and sensitivity behavior`, () => {
    const { base, top } = range;
    near(frequencyAt(.5, 'inverse', range), 2 * base * top / (base + top));
    near(frequencyAt(.5, 'exponential', range), Math.sqrt(base * top));
    near(frequencyAt(.5, 'linear', range), (base + top) / 2);
    assert.notEqual(pitchOf(frequencyAt(.350123, 'inverse', range)).cents, 0);
    assert.ok(sensitivityAt(.9, 'inverse', range) > sensitivityAt(.1, 'inverse', range));
    assert.ok(sensitivityAt(.9, 'linear', range) < sensitivityAt(.1, 'linear', range));
    near(sensitivityAt(.1, 'exponential', range), range.semitones);
  });
}
