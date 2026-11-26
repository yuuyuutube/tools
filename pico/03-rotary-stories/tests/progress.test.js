import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Progress } from '../src/storage/progress.js';
import { Disposer } from '../src/engine/disposer.js';

function memory() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('progress: chapter, scene state and settings survive a reload', () => {
  const store = memory();
  const p = new Progress(store);
  p.updateStory('s', { chapter: 2, scenes: { ch2: { index: 5 } } });
  p.setSetting('captions', true);
  const q = new Progress(store);
  assert.equal(q.story('s').chapter, 2);
  assert.deepEqual(q.sceneState('s', 'ch2'), { index: 5 });
  assert.equal(q.settings.captions, true);
});

test('progress: starting again keeps the photograph the reader made', () => {
  const p = new Progress(memory());
  p.updateStory('s', { chapter: 5, completed: true, keepsake: { az: 212, mm: 35 } });
  p.restartStory('s');
  assert.equal(p.story('s').chapter, 0);
  assert.deepEqual(p.story('s').keepsake, { az: 212, mm: 35 });
  assert.equal(p.story('s').completed, true);
});

test('progress: corrupt storage falls back to defaults instead of throwing', () => {
  const store = memory();
  store.setItem('rotary-stories.v1', '{oops');
  const p = new Progress(store);
  assert.equal(p.settings.volume, 0.8);
});

test('progress: only small JSON is stored (no images)', () => {
  const store = memory();
  const p = new Progress(store);
  p.updateStory('s', { keepsake: { az: 1, mm: 24, focus: null, time: '10:12' } });
  assert.ok(store.m.get('rotary-stories.v1').length < 1000);
});

test('disposer: tears down in reverse order, once', () => {
  const d = new Disposer();
  const order = [];
  d.add(() => order.push(1));
  const c = d.child();
  c.add(() => order.push(2));
  d.add(() => order.push(3));
  d.run();
  d.run();
  assert.deepEqual(order, [3, 2, 1]);
});
