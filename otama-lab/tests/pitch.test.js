import test from 'node:test';
import assert from 'node:assert/strict';
import { BASE, TOP, MODELS, frequencyAt, positionAt, pitchOf, semitonesFrom, sensitivityAt } from '../src/pitch.js';
const near = (a, b, tolerance = 1e-8) => assert.ok(Math.abs(a - b) < tolerance, `${a} ≠ ${b}`);
test('reference pitches, octave names and signed cents', () => {
  near(BASE, 130.8127826502993); near(TOP, 1046.5022612023945);
  for (const [frequency, note] of [[BASE, 'C3'], [440, 'A4'], [880, 'A5'], [TOP, 'C6']]) {
    assert.equal(pitchOf(frequency).note, note); assert.equal(pitchOf(frequency).cents, 0);
  }
  assert.equal(pitchOf(440 * 2 ** (.23 / 12)).cents, 23);
  assert.equal(pitchOf(440 * 2 ** (-.37 / 12)).cents, -37);
  assert.equal(pitchOf(440 * 2 ** (.51 / 12)).note, 'A♯4');
  assert.equal(pitchOf(440 * 2 ** (.51 / 12)).cents, -49);
  assert.throws(() => pitchOf(0), RangeError);
});
for (const model of Object.keys(MODELS)) {
  test(`${model}: endpoints, monotonicity and round trips across 1001 positions`, () => {
    near(frequencyAt(0, model), BASE); near(frequencyAt(1, model), TOP);
    let previous = 0;
    for (let i = 0; i <= 1000; i++) {
      const x = i / 1000, f = frequencyAt(x, model);
      assert.ok(f > previous); previous = f;
      near(positionAt(f, model), x);
      near(pitchOf(f).midi - 48, semitonesFrom(f));
    }
  });
  test(`${model}: every octave doubles frequency, independent of position spacing`, () => {
    for (let i = 0; i <= 2; i++) {
      const f = BASE * 2 ** i;
      near(semitonesFrom(2 * f, f), 12);
      near(frequencyAt(positionAt(f * 2, model), model), f * 2);
    }
  });
}
test('halfway position differs between models; no note snapping', () => {
  near(frequencyAt(.5, 'inverse'), BASE / .5625);
  near(frequencyAt(.5, 'exponential'), BASE * Math.sqrt(8));
  near(frequencyAt(.5, 'linear'), BASE * 4.5);
  assert.ok(pitchOf(frequencyAt(.350123, 'inverse')).cents !== 0);
});
test('sensitivity correctly increases/decreases/is constant and matches numerical derivative', () => {
  assert.ok(sensitivityAt(.9, 'inverse') > sensitivityAt(.1, 'inverse'));
  assert.ok(sensitivityAt(.9, 'linear') < sensitivityAt(.1, 'linear'));
  near(sensitivityAt(.1, 'exponential'), 36);
  for (const model of Object.keys(MODELS)) {
    const x = .45, h = 1e-6;
    const derivative = 100 * semitonesFrom(frequencyAt(x + h, model), frequencyAt(x - h, model)) / (2 * h) / 100;
    near(sensitivityAt(x, model), derivative, 1e-6);
  }
});
