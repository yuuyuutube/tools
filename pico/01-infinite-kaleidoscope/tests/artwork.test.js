import assert from 'node:assert/strict';
import test from 'node:test';
import { Animation } from '../web/src/controllers/animation.js';
import { initialArtwork, restoreState, stateURL, universe } from '../web/src/controllers/artwork.js';
import { kaleidoParameters, opticalParameters } from '../web/src/controllers/parameters.js';
import { nextStyle, patternStyles } from '../web/src/controllers/styles.js';
import { styleMotion } from '../web/src/engines/style-motion.js';

const base = 'http://localhost:8000/01/?debug=yes#old';

test('cycling a style follows the menu order and wraps within each mode', () => {
  for (const [engine, [first, second, third]] of Object.entries(patternStyles)) {
    assert.equal(nextStyle(engine, first.id), second.id);
    assert.equal(nextStyle(engine, second.id), third.id);
    assert.equal(nextStyle(engine, third.id), first.id);
  }
});

test('style motion is continuous at interval boundaries and varies across long runs', () => {
  const seed = 36173;
  const interval = 23;
  for (const boundary of [-46, -23, 0, 23, 46]) {
    const before = styleMotion(boundary - 0.001, seed, interval, 3);
    const at = styleMotion(boundary, seed, interval, 3);
    const after = styleMotion(boundary + 0.001, seed, interval, 3);
    assert.ok(Math.abs(at - before) < 1e-6);
    assert.ok(Math.abs(at - after) < 1e-6);
  }
  const samples = Array.from({ length: 12 }, (_, index) => styleMotion(index * interval, seed, interval, 3));
  assert.equal(new Set(samples).size, samples.length);
  assert.notEqual(styleMotion(92, seed, interval, 3), styleMotion(92, seed, interval, 4));
});

test('style links restore each engine’s own presets and preserve earlier default links', () => {
  for (const engine of ['kaleido', 'spiro', 'optical']) {
    const legacy = { ...initialArtwork, engine };
    assert.deepEqual(restoreState(stateURL(legacy, base), base), legacy);
    for (const { id: patternStyle } of patternStyles[engine].slice(1)) {
      const selected = { ...legacy, patternStyle, position: -13.25, phase: 1.7 };
      const url = stateURL(selected, base);
      assert.deepEqual(restoreState(url, base), selected);
      const wrongEngine = new URL(url);
      wrongEngine.searchParams.set('e', engine === 'kaleido' ? 'spiro' : 'kaleido');
      assert.equal(restoreState(wrongEngine, base), null);
      url.searchParams.append('style', patternStyle);
      assert.equal(restoreState(url, base), null);
    }
  }
});

test('versioned links round-trip the exact displayed animation sample', () => {
  const original = {
    ...initialArtwork, engine: 'spiro', position: -214.567891234567, phase: 23.659, seed: 4294967295,
  };
  const url = stateURL(original, base);
  assert.deepEqual(restoreState(url, base), original);
  assert.equal(url.pathname, '/01/');
  assert.equal(url.hash, '');
  assert.deepEqual(universe(original.seed), universe(restoreState(url, base).seed));
});

test('malformed links do not replace the current print', () => {
  const query = stateURL(initialArtwork, base).search;
  for (const bad of [
    base, query.replace('v=1', 'v=2'), query.replace('s=36173', 's=-1'), query + '&s=1',
    query.replace('e=kaleido', 'e=no'), query.replace('x=0', 'x=Infinity'),
    query.replace('t=0', 't='), query.replace('p=moss-cyclamen', 'p=red'),
  ]) assert.equal(restoreState(bad, base), null);
});

test('negative positions and transitions between cyclic families stay continuous', () => {
  const seed = [0, 0, 0, 0];
  const before = kaleidoParameters(-0.00001, seed);
  const after = kaleidoParameters(0, seed);
  assert.equal(before.second, after.first);
  assert.ok(before.mix > 0.9999);
  const optical = new Set();
  for (let i = -60; i <= 60; i++) optical.add(opticalParameters(i, seed).first);
  assert.equal(optical.size, 3);
});

test('manual steps ease, reduced motion snaps, and background time does not accumulate', () => {
  const state = { ...initialArtwork };
  const animation = new Animation(state);
  const options = { demo: false, reduced: false };
  assert.equal(animation.step(0, state, options), false);
  state.position = 6;
  animation.step(16, state, options);
  assert.ok(animation.position > 0 && animation.position < 6);
  animation.beginTransition();
  assert.equal(animation.transition, 0);
  animation.step(32, state, { demo: true, reduced: true });
  assert.equal(animation.position, 6);
  assert.equal(animation.phase, 0);
  assert.equal(animation.transition, 1);
  animation.suspend();
  animation.step(100_000, state, { demo: true, reduced: false });
  animation.step(100_016, state, { demo: true, reduced: false });
  assert.ok(animation.phase > 0 && animation.phase < 0.02);
});
