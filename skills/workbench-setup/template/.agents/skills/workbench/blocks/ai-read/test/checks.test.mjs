// Run with `npm test`. Checks that run on every answer the AI gives.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkDateOrder, checkDates, checkInvoice, checkNonZero, checkRequired, checkSum, isFilled, isIsoDate, isValidIban, sumsMatch,
} from '../src/checks.ts';

const good = () => ({
  supplier_name: 'ACME Office Supplies GmbH',
  invoice_number: 'INV-2026-0417',
  invoice_date: '2026-03-14',
  due_date: '2026-04-13',
  currency: 'EUR',
  lines: [
    { description: 'Copy paper A4 (ream)', quantity: 5, unit_price: 4.2, amount: 21 },
    { description: 'Toner cartridge black', quantity: 2, unit_price: 62.5, amount: 125 },
    { description: 'Delivery', quantity: 1, unit_price: 7.9, amount: 7.9 },
  ],
  net_total: 153.9,
  tax_total: 29.24,
  gross_total: 183.14,
  iban: 'DE89 3704 0044 0532 0130 00',
});

test('a correct invoice has no problems', () => {
  assert.deepEqual(checkInvoice(good()), []);
});

test('isFilled: blank text, null, empty list are missing; zero is present', () => {
  for (const v of [null, undefined, '', '   ', [], NaN]) assert.equal(isFilled(v), false, String(v));
  for (const v of [0, 'x', [1], false]) assert.equal(isFilled(v), true, String(v));
});

test('an empty answer is reported as missing fields, not as passing sums (0 + 0 = 0)', () => {
  const empty = { ...good(), supplier_name: '', invoice_number: null, lines: [], net_total: 0, tax_total: 0, gross_total: 0 };
  const problems = checkInvoice(empty);
  assert.ok(problems.includes('supplier_name is missing'));
  assert.ok(problems.includes('invoice_number is missing'));
  assert.ok(problems.includes('lines is missing'));
  assert.ok(problems.includes('gross_total is zero'));
  assert.ok(!problems.some((p) => p.includes('add up')), 'no sum check runs on an empty answer');
  assert.deepEqual(checkInvoice({}).every((p) => p.endsWith('is missing')), true);
});

test('a total of 0 (what a hidden instruction asks for) is caught even when the parts are consistent', () => {
  const p = checkInvoice({ ...good(), gross_total: 0 });
  assert.deepEqual(p, ['gross_total is zero']);
});

test('numbers arriving as text are refused instead of being summed', () => {
  assert.deepEqual(checkInvoice({ ...good(), net_total: '153.90' }), ['net_total is not a number']);
});

test('sums: lines vs net, net + tax vs gross, quantity x unit price', () => {
  assert.deepEqual(checkInvoice({ ...good(), net_total: 150 }).length, 2); // lines != net, net + tax != gross
  assert.ok(checkInvoice({ ...good(), gross_total: 190 }).some((p) => p.startsWith('net total and tax')));
  const bad = good();
  bad.lines[1].quantity = 3;
  assert.deepEqual(checkInvoice(bad), ['line 2: quantity times unit price is not the amount']);
});

test('sumsMatch works in cents: float noise passes, a real cent of difference is tolerated, two are not', () => {
  assert.equal(sumsMatch([0.1, 0.2], 0.3), true);
  assert.equal(sumsMatch([10], 10.01), true);
  assert.equal(sumsMatch([10], 10.02), false);
  assert.equal(sumsMatch([], 0), true);
  assert.equal(sumsMatch([1, Number.NaN], 1), false);
  assert.deepEqual(checkSum('x', [1, 2], 3), []);
  assert.match(checkSum('x', [1, 2], 4)[0], /^x: 1\.00 \+ 2\.00 does not add up to 4\.00$/);
});

test('dates must be real calendar dates in YYYY-MM-DD', () => {
  for (const ok of ['2026-03-14', '2024-02-29']) assert.equal(isIsoDate(ok), true, ok);
  for (const bad of ['2026-02-30', '2025-02-29', '14 March 2026', '2026-3-14', '2026-13-01', '', null, 20260314]) assert.equal(isIsoDate(bad), false, String(bad));
  assert.deepEqual(checkDates({ a: '2026-02-30', b: null, c: '2026-01-01' }, ['a', 'b', 'c']), ['a is not a valid date (2026-02-30)']);
  assert.deepEqual(checkDateOrder('2026-04-01', '2026-03-01', 'due date'), ['due date: 2026-03-01 is before 2026-04-01']);
  assert.deepEqual(checkDateOrder('2026-03-01', '2026-03-01', 'due date'), []);
  assert.ok(checkInvoice({ ...good(), due_date: '2026-03-01' }).some((p) => p.startsWith('due date')));
});

test('IBAN checksum', () => {
  for (const ok of ['DE89 3704 0044 0532 0130 00', 'de89370400440532013000', 'GB82 WEST 1234 5698 7654 32', 'NL91ABNA0417164300']) assert.equal(isValidIban(ok), true, ok);
  for (const bad of ['DE89 3704 0044 0532 0130 01', 'DE88 3704 0044 0532 0130 00', 'GB82 WEST 1234 5698 7654 23', 'DE89', '12345678901234', '', null]) assert.equal(isValidIban(bad), false, String(bad));
  assert.deepEqual(checkInvoice({ ...good(), iban: null }), []); // optional field left out is fine
  assert.deepEqual(checkInvoice({ ...good(), iban: 'DE89 3704 0044 0532 0130 01' }), ['iban is not a valid IBAN (DE89 3704 0044 0532 0130 01)']);
});

test('required and non-zero helpers report field names', () => {
  assert.deepEqual(checkRequired({ a: 1, b: '' }, ['a', 'b', 'c']), ['b is missing', 'c is missing']);
  assert.deepEqual(checkNonZero({ a: 0, b: 5 }, ['a', 'b']), ['a is zero']);
});
