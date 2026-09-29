// Run with `npm test`. Node's built-in test runner; imports the TypeScript file directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize } from '../src/logic.ts';

test('summarize counts lines, words and characters', () => {
  assert.deepEqual(summarize('one two\r\nthree\n'), { lines: 2, words: 3, characters: 15 });
});

test('summarize of empty or blank text is zero lines and zero words', () => {
  assert.deepEqual(summarize(''), { lines: 0, words: 0, characters: 0 });
  assert.deepEqual(summarize('  \n '), { lines: 0, words: 0, characters: 4 });
});
