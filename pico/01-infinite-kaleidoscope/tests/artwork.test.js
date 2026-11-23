import assert from 'node:assert/strict';
import test from 'node:test';
import { Animation } from '../web/src/controllers/animation.js';
import { initialArtwork, restoreState, stateURL, universe } from '../web/src/controllers/artwork.js';
import { kaleidoParameters, opticalParameters } from '../web/src/controllers/parameters.js';

const base = 'http://localhost:8000/01/?debug=yes#old';

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
