// Run with `npm test`. Node's built-in test runner; imports the TypeScript file directly.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filterBooks, parseBooks } from '../src/lib/books.ts';

const books = [
  { id: '1', title: 'The Left Hand of Darkness', author: 'Ursula K. Le Guin', year: 1969 },
  { id: '2', title: 'Middlemarch', author: 'George Eliot', year: 1871 },
];

test('parseBooks reads rows and keeps only the known fields', () => {
  const rows = [{ id: '7', title: 'T', author: 'A', year: 2000, extra: 'ignored' }];
  assert.deepEqual(parseBooks(rows), [{ id: '7', title: 'T', author: 'A', year: 2000 }]);
});

test('parseBooks refuses what is not a list, and rows with a missing or wrongly typed field', () => {
  assert.throws(() => parseBooks('<!doctype html>'), /could not be read/);
  assert.throws(() => parseBooks({ id: '1' }), /could not be read/);
  assert.throws(() => parseBooks([null]), /Row 1/);
  assert.throws(() => parseBooks([books[0], { id: '2', title: 'T', author: 'A', year: '1871' }]), /Row 2 of the list is missing something/);
});

test('filterBooks matches title or author, ignoring case and surrounding spaces', () => {
  assert.deepEqual(filterBooks(books, ' MIDDLE ').map((b) => b.id), ['2']);
  assert.deepEqual(filterBooks(books, 'guin').map((b) => b.id), ['1']);
  assert.deepEqual(filterBooks(books, 'nothing like this'), []);
});

test('filterBooks with an empty or blank search keeps everything', () => {
  assert.equal(filterBooks(books, ''), books);
  assert.equal(filterBooks(books, '   '), books);
});
