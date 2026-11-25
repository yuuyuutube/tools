import assert from 'node:assert/strict';
import test from 'node:test';
import { Animation } from '../web/src/controllers/animation.js';
import { engines, initialArtwork, restoreState, stateURL } from '../web/src/controllers/artwork.js';
import {
  BLOOM_START, BLOOM_STYLES, MAX_BLOOM_PROGRESS, changeBloomProgress,
} from '../web/src/controllers/bloom.js';
import {
  BLOOM_RING_LIMIT, bloomRadius, bloomRingWindow, generateBloomRing,
} from '../web/src/engines/bloom-rings.js';
import { makeBloomMotif } from '../web/src/engines/bloom-motifs.js';
import { createBloomRenderer } from '../web/src/engines/bloom.js';
import { palettes } from '../web/src/palettes/index.js';

const seed = 36173;
const bloom = { ...initialArtwork, engine: 'bloom', ...BLOOM_START };
const base = 'http://localhost:8000/';
const active = { demo: true, reduced: false };

test('generation is repeatable and every six-ring group uses all six families', () => {
  const families = ['petal', 'diamond', 'star', 'arc', 'tessellation', 'lace'];
  for (let start = -30; start <= 1440; start += 6) {
    const rings = Array.from({ length: 6 }, (_, i) => generateBloomRing(seed, start + i));
    assert.deepEqual(new Set(rings.map((ring) => ring.family)), new Set(families));
    assert.equal(new Set(rings.map((ring) => ring.ringSeed)).size, 6);
    assert.notEqual(rings.at(-1).family, generateBloomRing(seed, start + 6).family);
  }
  assert.deepEqual(generateBloomRing(seed, -9), generateBloomRing(seed, -9));
  assert.notEqual(generateBloomRing(seed, 17).ringSeed, generateBloomRing(seed, 2 ** 32 + 17).ringSeed);
  assert.notDeepEqual(generateBloomRing(seed, 17), generateBloomRing(seed + 1, 17));
});

test('each fixed generation advances outward and leaves only after its inner edge clears the viewport', () => {
  const frame = {};
  for (const corner of [0.707, 1.1, 3, 100]) {
    for (let progress = 0.25; progress < 3600; progress += 0.5) {
      bloomRingWindow(progress, corner, frame);
      assert.ok(frame.newest - frame.oldest + 1 <= BLOOM_RING_LIMIT);
      const age = progress - frame.oldest;
      assert.ok(bloomRadius(age - 1) * frame.scale <= corner);
      assert.ok(bloomRadius(age) * frame.scale >= corner);
      assert.ok(bloomRadius(age + 0.05) > bloomRadius(age));
    }
  }
  assert.equal(bloomRadius(0), 0);
});

test('Bloom stays at the saved position without input even if Demo is on', () => {
  const state = { ...bloom };
  const animation = new Animation(state);
  for (const time of [0, 16, 48, 120_000]) {
    assert.equal(animation.step(time, state, active), false);
    assert.equal(animation.bloomProgress, bloom.bloomProgress);
  }
  assert.equal(animation.phase, bloom.phase);
});

test('dial detents move to finite targets and reverse back to the same ring geometry', () => {
  assert.equal(changeBloomProgress(0, 4), 1);
  assert.equal(changeBloomProgress(0, -4), -1);
  assert.equal(changeBloomProgress(MAX_BLOOM_PROGRESS, 1), MAX_BLOOM_PROGRESS);
  assert.equal(changeBloomProgress(-MAX_BLOOM_PROGRESS, -1), -MAX_BLOOM_PROGRESS);

  const state = { ...bloom };
  const animation = new Animation(state);
  animation.step(0, state, active);
  state.bloomProgress = changeBloomProgress(state.bloomProgress, 1);
  assert.equal(animation.step(16, state, active), true);
  assert.ok(animation.bloomProgress > bloom.bloomProgress);
  assert.ok(animation.bloomProgress < state.bloomProgress);
  for (let time = 32; time <= 512; time += 16) animation.step(time, state, active);
  assert.equal(animation.bloomProgress, state.bloomProgress);
  assert.equal(animation.step(1000, state, active), false);

  state.bloomProgress = changeBloomProgress(state.bloomProgress, -1);
  const expanded = animation.bloomProgress;
  animation.step(1016, state, active);
  assert.ok(animation.bloomProgress < expanded);
  for (let time = 1032; time <= 1512; time += 16) animation.step(time, state, active);
  assert.equal(animation.bloomProgress, bloom.bloomProgress);

  state.bloomProgress = changeBloomProgress(state.bloomProgress, -4);
  assert.equal(animation.step(1528, state, { demo: false, reduced: true }), false);
  const window = {};
  bloomRingWindow(animation.bloomProgress, 1, window);
  assert.ok(window.newest < 0 && window.oldest < window.newest);
});

test('background time and other modes cannot advance a pending Bloom step', () => {
  const state = { ...bloom };
  const animation = new Animation(state);
  animation.step(0, state, active);
  state.bloomProgress = changeBloomProgress(state.bloomProgress, 1);
  animation.step(16, state, active);
  const progress = animation.bloomProgress;
  animation.step(32, { ...state, engine: 'spiro' }, active);
  assert.equal(animation.bloomProgress, progress);
  animation.suspend();
  animation.step(300_000, state, active);
  assert.equal(animation.bloomProgress, progress);
  animation.step(300_016, state, active);
  assert.ok(animation.bloomProgress > progress && animation.bloomProgress < state.bloomProgress);
});

test('share URL restores a fixed frame with its precise progress, including old rate links', () => {
  const state = { ...bloom, bloomProgress: -287.742346781416, bloomStyle: 'japanese' };
  const url = stateURL(state, base);
  assert.deepEqual(restoreState(url, base), state);
  assert.equal(new Animation(restoreState(url, base)).bloomProgress, state.bloomProgress);
  assert.equal(url.searchParams.has('r'), false);
  const legacyBloom = new URL(url);
  legacyBloom.searchParams.set('r', '-1.38');
  assert.deepEqual(restoreState(legacyBloom, base), state);
  for (const [key, value] of [
    ['b', String(-MAX_BLOOM_PROGRESS - 1)], ['b', String(MAX_BLOOM_PROGRESS + 1)], ['b', 'Infinity'],
    ['b', ''], ['style', 'unknown'],
  ]) {
    const broken = new URL(url);
    broken.searchParams.set(key, value);
    assert.equal(restoreState(broken, base), null);
  }
  const missing = new URL(url);
  missing.searchParams.delete('b');
  assert.equal(restoreState(missing, base), null);
  url.searchParams.append('b', '1');
  assert.equal(restoreState(url, base), null);

  assert.deepEqual(engines, ['kaleido', 'spiro', 'optical', 'bloom']);
  for (const engine of engines.slice(0, -1)) {
    const legacy = { ...initialArtwork, engine };
    const legacyURL = stateURL(legacy, base);
    assert.equal(legacyURL.searchParams.has('b'), false);
    assert.deepEqual(restoreState(legacyURL, base), legacy);
  }
});

test('path families use distinct primitives and drawing reuses each visible generation', (t) => {
  let allocations = 0;
  class TestPath {
    operations = [];
    constructor() { allocations++; }
    moveTo(...args) { this.operations.push(['moveTo', ...args]); }
    lineTo(...args) { this.operations.push(['lineTo', ...args]); }
    closePath() { this.operations.push(['closePath']); }
    bezierCurveTo(...args) { this.operations.push(['bezierCurveTo', ...args]); }
    quadraticCurveTo(...args) { this.operations.push(['quadraticCurveTo', ...args]); }
    ellipse(...args) { this.operations.push(['ellipse', ...args]); }
  }
  globalThis.Path2D = TestPath;
  t.after(() => { delete globalThis.Path2D; });

  const signatures = new Set();
  for (let index = 0; index < 6; index++) {
    const ring = generateBloomRing(seed, index);
    const forms = BLOOM_STYLES.map(({ id }) => Object.values(makeBloomMotif(ring, id))
      .map((path) => path.operations));
    assert.equal(new Set(forms.map((form) => JSON.stringify(form))).size, BLOOM_STYLES.length);
    signatures.add(forms[0].flat().map(([name]) => name).join(','));
  }
  assert.equal(signatures.size, 6);

  const noop = () => {};
  const ctx = {
    save: noop, restore: noop, beginPath: noop, arc: noop, stroke: noop,
    fillRect: noop, rotate: noop, translate: noop, scale: noop, fill: noop,
  };
  allocations = 0;
  const draw = createBloomRenderer();
  draw(ctx, 0.86, 0.5, bloom, palettes[0]);
  const initial = allocations;
  assert.ok(initial > 0 && initial <= BLOOM_RING_LIMIT * 4);
  for (let frame = 0; frame < 30; frame++) {
    draw(ctx, 0.86, 0.5, { ...bloom, bloomProgress: 0.56 + frame / 1000 }, palettes[0]);
  }
  assert.equal(allocations, initial);
  draw(ctx, 0.86, 0.5, { ...bloom, bloomProgress: 1.12 }, palettes[0]);
  assert.equal(allocations, initial + 4);

  draw(ctx, 0.5, 0.5, { ...bloom, bloomProgress: 1.12 }, palettes[0]);
  const beforeWidening = allocations;
  draw(ctx, 0.86, 0.5, { ...bloom, bloomProgress: 1.12 }, palettes[0]);
  assert.ok(allocations > beforeWidening, 'rings leaving a smaller frame are released');
});
