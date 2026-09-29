// Run with `npm test`. Decides whether a PDF's own text is enough to skip the AI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { countReadable, tidy, toTextLayer } from '../src/text-layer.ts';

const invoiceText = 'ACME Office Supplies GmbH\nInvoice No.: INV-2026-0417\nTotal due (EUR) 183.14\nIBAN: DE89 3704 0044 0532 0130 00';

test('a page with real text is enough; a scan (no text or stray marks) is not', () => {
  assert.equal(toTextLayer([invoiceText]).enough, true);
  assert.equal(toTextLayer(['']).enough, false);
  assert.equal(toTextLayer(['  \n . - \n  ']).enough, false);
  assert.equal(toTextLayer([]).enough, false);
});

test('one picture page among text pages: only that page needs the AI', () => {
  const layer = toTextLayer([invoiceText, '', invoiceText]);
  assert.equal(layer.enough, false);
  assert.deepEqual(layer.hasText, [true, false, true]);
});

test('text in any alphabet counts, punctuation does not', () => {
  assert.equal(countReadable('Счёт № 42'), 6);
  assert.equal(countReadable('請求書 12'), 5);
  assert.equal(countReadable('--- ... !!!'), 0);
  assert.equal(toTextLayer(['Счёт на оплату номер 42 от четырнадцатого марта две тысячи двадцать шестого года']).enough, true);
});

test('tidy squeezes spaces and blank lines but keeps line breaks', () => {
  assert.equal(tidy('a  b\u00a0 c \n\n\n\n d '), 'a b c\n\nd');
  assert.equal(toTextLayer(['a', 'b'], 1).text, 'a\n\nb');
});
