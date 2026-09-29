// Run with `node --test` (or `npm.cmd test`). Node's built-in test runner.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_RECENT,
  addRecent,
  backupFileName,
  makeBackup,
  normalizeData,
  normalizeSettings,
  parseBackup,
  safeFileName,
  summarize,
} from '../src/logic.mjs';

// The same two checks as the Electron starter: the two starters keep the same example.
test('summarize counts lines, words and characters', () => {
  assert.deepEqual(summarize('one two\r\nthree\n'), { lines: 2, words: 3, characters: 15 });
});

test('summarize of empty or blank text is zero lines and zero words', () => {
  assert.deepEqual(summarize(''), { lines: 0, words: 0, characters: 0 });
  assert.deepEqual(summarize('  \n '), { lines: 0, words: 0, characters: 4 });
});

test('settings: anything unreadable falls back to the defaults', () => {
  assert.deepEqual(normalizeSettings(undefined), { wrapLines: true });
  assert.deepEqual(normalizeSettings('nonsense'), { wrapLines: true });
  assert.deepEqual(normalizeSettings({ wrapLines: 'no' }), { wrapLines: true });
  assert.deepEqual(normalizeSettings({ wrapLines: false, extra: 1 }), { wrapLines: false });
});

test('recent list: newest first, a reopened file moves up, capped', () => {
  const s = { lines: 1, words: 2, characters: 3 };
  let data = { recent: [] };
  data = addRecent(data, 'a.txt', s);
  data = addRecent(data, 'b.txt', s);
  data = addRecent(data, 'a.txt', { lines: 9, words: 9, characters: 9 });
  assert.deepEqual(data.recent.map((r) => r.name), ['a.txt', 'b.txt']);
  assert.equal(data.recent[0].lines, 9);
  for (let i = 0; i < 20; i++) data = addRecent(data, `f${i}.txt`, s);
  assert.equal(data.recent.length, MAX_RECENT);
  assert.equal(data.recent[0].name, 'f19.txt');
});

test('normalizeData drops damaged entries instead of failing', () => {
  const data = normalizeData({ recent: [{ name: 'ok.txt', lines: 2, words: -1, characters: 'x' }, 5, { lines: 1 }, null] });
  assert.deepEqual(data, { recent: [{ name: 'ok.txt', lines: 2, words: 0, characters: 0 }] });
  assert.deepEqual(normalizeData(null), { recent: [] });
});

const me = { toolId: 'bills-k3f9x2', dataVersion: 2 };
const sample = () => ({
  ...me,
  settings: { wrapLines: false },
  data: { recent: [{ name: 'a.txt', lines: 1, words: 2, characters: 3 }] },
  now: new Date('2026-09-30T10:15:00Z'),
});

test('a backup made by the tool restores to the same settings and data', () => {
  const result = parseBackup(makeBackup(sample()), me);
  assert.equal(result.ok, true);
  assert.deepEqual(result.settings, { wrapLines: false });
  assert.deepEqual(result.data, sample().data);
  assert.equal(result.savedAt, '2026-09-30T10:15:00.000Z');
});

test('restore refuses files that are not this tool\'s backup, with a plain sentence', () => {
  const refused = (text, expected = me) => {
    const r = parseBackup(text, expected);
    assert.equal(r.ok, false);
    assert.match(r.reason, /^[A-Z].*\.$/);
    return r.reason;
  };
  refused('not json at all');
  refused('[1,2,3]');
  refused(JSON.stringify({ format: 'something-else', toolId: me.toolId, dataVersion: 1 }));
  assert.match(refused(makeBackup(sample()), { toolId: 'other-abcdef', dataVersion: 2 }), /different tool/);
  assert.match(refused(makeBackup({ ...sample(), dataVersion: 3 })), /newer version/);
  refused(JSON.stringify({ format: 'workbench-backup', toolId: me.toolId, dataVersion: 'two' }));
});

test('a backup from an older data version is accepted and normalized', () => {
  const old = JSON.stringify({ format: 'workbench-backup', toolId: me.toolId, dataVersion: 1, settings: {}, data: { recent: 'gone' } });
  const r = parseBackup(old, me);
  assert.equal(r.ok, true);
  assert.deepEqual(r.data, { recent: [] });
  assert.deepEqual(r.settings, { wrapLines: true });
});

test('backup file name carries the local date and time, and is a legal Windows name', () => {
  assert.equal(backupFileName('My tool', new Date(2026, 8, 30, 7, 5)), 'My tool-backup-2026-09-30-0705.json');
  assert.equal(backupFileName('a/b:c?', new Date(2026, 0, 2, 13, 45)), 'a-b-c-backup-2026-01-02-1345.json');
});

test('safeFileName removes folders and forbidden characters', () => {
  assert.equal(safeFileName('..\\..\\evil.txt'), 'evil.txt');
  assert.equal(safeFileName('bills: may*2026?.csv'), 'bills- may-2026-.csv');
  assert.equal(safeFileName('   '), 'file');
  assert.equal(safeFileName('', 'notes.txt'), 'notes.txt');
});
