import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SaveManager, migrate, defaultSave, SAVE_KEY, DEFAULT_SETTINGS } from '../src/core/save-manager.js';
import { duplicateLines, ARTIFACT_BY_ID, cnCount } from '../src/game/artifacts.js';

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial));
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), m };
}

test('fresh save has every section', () => {
  const s = new SaveManager({ storage: memoryStorage() });
  assert.equal(s.data.version, 1);
  assert.deepEqual(s.settings, DEFAULT_SETTINGS);
});

test('artifacts count duplicates and keep the first discovery time', () => {
  const store = memoryStorage();
  const s = new SaveManager({ storage: store });
  assert.deepEqual(s.addArtifact('artifact-001', 'M001', 1000), { count: 1, first: true });
  assert.deepEqual(s.addArtifact('artifact-001', 'D-x', 2000), { count: 2, first: false });
  assert.equal(s.data.artifacts['artifact-001'].firstAt, 1000);
  const again = new SaveManager({ storage: store });
  assert.equal(again.artifactCount('artifact-001'), 2);
});

test('old or partial saves are upgraded, unknown fields survive', () => {
  const old = { format: 'bup-save', version: 0, artifacts: { 'artifact-002': { count: 3 } }, futureThing: 42, settings: { volume: 0.2 } };
  const m = migrate(old);
  assert.equal(m.version, 1);
  assert.equal(m.futureThing, 42);
  assert.equal(m.settings.volume, 0.2);
  assert.equal(m.settings.sensitivity, 'standard');
  assert.equal(m.artifacts['artifact-002'].count, 3);
  assert.ok(Array.isArray(m.artifacts['artifact-002'].log));
});

test('corrupt storage falls back to a clean save instead of crashing', () => {
  const s = new SaveManager({ storage: memoryStorage({ [SAVE_KEY]: '{not json' }) });
  assert.equal(s.data.format, 'bup-save');
});

test('import accepts only Bureau saves; reset keeps settings', () => {
  const s = new SaveManager({ storage: memoryStorage() });
  assert.equal(s.importJSON('{"hello":1}'), false);
  assert.equal(s.importJSON('nope'), false);
  const other = defaultSave();
  other.missions.M001 = { completedAt: 5, attempts: 1, failures: 0 };
  assert.equal(s.importJSON(JSON.stringify(other)), true);
  assert.equal(s.isComplete('M001'), true);
  s.setSetting('volume', 0.3);
  s.reset();
  assert.equal(s.isComplete('M001'), false);
  assert.equal(s.settings.volume, 0.3);
});

test('duplicate lines count in Chinese and keep the measure word', () => {
  assert.deepEqual(duplicateLines(ARTIFACT_BY_ID['artifact-001'], 2), ['本局現已保管兩顆普通馬鈴薯。', '安全風險評估維持不變。']);
  assert.equal(cnCount(12), '十二');
  assert.equal(cnCount(21), '二十一');
  assert.ok(duplicateLines(ARTIFACT_BY_ID['artifact-019'], 3)[0].startsWith('本局現已保管三條橡皮筋'));
});
