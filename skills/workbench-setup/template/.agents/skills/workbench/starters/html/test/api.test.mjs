// The copy being tried out and the copy in use share one browser store (every file:// page does),
// so they must never read or write each other's data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserApi } from '../src/api.mjs';

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => void map.set(k, String(v)), map };
}

const entry = (name) => ({ name, lines: 1, words: 1, characters: 1 });

test('a copy being tried out keeps its own data and never changes the copy in use', () => {
  const storage = memoryStorage();
  const common = { toolId: 'bills-k3f9x2', toolName: 'Bills', dataVersion: 1, document: undefined, storage };
  const inUse = createBrowserApi(common);
  const trial = createBrowserApi({ ...common, storageId: 'bills-k3f9x2:trying-out' });

  assert.ok(inUse.saveData({ recent: [entry('real.csv')] }));
  assert.deepEqual(trial.loadData().recent, [], 'the trial starts empty, not with the real data');
  assert.ok(trial.saveData({ recent: [entry('practice.csv')] }));
  assert.deepEqual(inUse.loadData().recent.map((r) => r.name), ['real.csv']);
  assert.deepEqual(trial.loadData().recent.map((r) => r.name), ['practice.csv']);
  assert.ok([...storage.map.keys()].every((k) => k.startsWith('bills-k3f9x2:')), 'every key still starts with the tool id');
});
