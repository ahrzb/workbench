// The code checks every answer the AI gives (ai-features.md). Pure functions, no imports, tested in
// test/checks.test.mjs. Each check returns a list of problems in plain words; an empty list means fine.
// Order matters: an empty answer passes every sum check (0 + 0 = 0), so emptiness is checked FIRST.

export type Data = Record<string, unknown>;

/** Not missing: not null/undefined, not blank text, not an empty list. Zero is NOT empty (see checkNonZero). */
export function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return Number.isFinite(v);
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export function checkRequired(data: Data, keys: string[]): string[] {
  return keys.filter((k) => !isFilled(data[k])).map((k) => `${k} is missing`);
}

/** Amounts that must not be zero (a zero total is what a hidden instruction or a misread produces). */
export function checkNonZero(data: Data, keys: string[]): string[] {
  return keys.filter((k) => data[k] === 0).map((k) => `${k} is zero`);
}

export function checkNumbers(data: Data, keys: string[]): string[] {
  return keys.filter((k) => isFilled(data[k]) && !(typeof data[k] === 'number' && Number.isFinite(data[k]))).map((k) => `${k} is not a number`);
}

/** A real calendar date written YYYY-MM-DD (2026-02-30 is not one). */
export function isIsoDate(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  return y >= 1900 && date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

/** Dates that are present must be valid. Missing ones are the business of checkRequired. */
export function checkDates(data: Data, keys: string[]): string[] {
  return keys.filter((k) => isFilled(data[k]) && !isIsoDate(data[k])).map((k) => `${k} is not a valid date (${String(data[k])})`);
}

export function checkDateOrder(earlier: string, later: string, label: string): string[] {
  return isIsoDate(earlier) && isIsoDate(later) && earlier > later ? [`${label}: ${later} is before ${earlier}`] : [];
}

const cents = (n: number) => Math.round(n * 100);

/** True when the parts add up to the total within one cent. Not finite numbers never match. */
export function sumsMatch(parts: number[], total: number): boolean {
  if (!parts.every(Number.isFinite) || !Number.isFinite(total)) return false;
  return Math.abs(parts.reduce((s, p) => s + cents(p), 0) - cents(total)) <= 1;
}

export function checkSum(label: string, parts: number[], total: number): string[] {
  return sumsMatch(parts, total) ? [] : [`${label}: ${parts.map((p) => p.toFixed(2)).join(' + ') || '0'} does not add up to ${Number.isFinite(total) ? total.toFixed(2) : String(total)}`];
}

/** IBAN checksum (ISO 13616, mod 97). Spaces and case are ignored. Does not check the country's length. */
export function isValidIban(v: unknown): boolean {
  if (typeof v !== 'string') return false;
  const s = v.replace(/\s+/g, '').toUpperCase();
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false;
  let rest = 0;
  for (const ch of s.slice(4) + s.slice(0, 4)) {
    const digits = /\d/.test(ch) ? ch : String(ch.charCodeAt(0) - 55);
    for (const d of digits) rest = (rest * 10 + Number(d)) % 97;
  }
  return rest === 1;
}

export function checkIban(data: Data, key: string): string[] {
  return isFilled(data[key]) && !isValidIban(data[key]) ? [`${key} is not a valid IBAN (${String(data[key])})`] : [];
}

/**
 * Reference composition for the invoice example in ai-fields.ts. Anything returned means "please
 * check this one": show it to the user, never put the document silently into their sheet.
 * Stage 1 (empty, zero, not a number) stops the rest: sums over missing numbers prove nothing.
 */
export function checkInvoice(data: Data): string[] {
  const money = ['net_total', 'tax_total', 'gross_total'];
  const stage1 = [
    ...checkRequired(data, ['supplier_name', 'invoice_number', 'invoice_date', 'currency', 'lines', ...money]),
    ...checkNumbers(data, money),
    ...checkNonZero(data, ['gross_total', 'net_total']),
  ];
  const lines = Array.isArray(data.lines) ? (data.lines as Data[]) : [];
  lines.forEach((l, i) => {
    stage1.push(...checkRequired(l, ['description']).map((p) => `line ${i + 1}: ${p}`));
    stage1.push(...checkNumbers(l, ['quantity', 'unit_price', 'amount']).map((p) => `line ${i + 1}: ${p}`));
    stage1.push(...checkNonZero(l, ['amount']).map((p) => `line ${i + 1}: ${p}`));
  });
  if (stage1.length > 0) return stage1;

  const num = (k: string) => data[k] as number;
  const problems = [
    ...checkDates(data, ['invoice_date', 'due_date']),
    ...checkDateOrder(String(data.invoice_date), String(data.due_date ?? data.invoice_date), 'due date'),
    ...checkIban(data, 'iban'),
    ...checkSum('lines and net total', lines.map((l) => l.amount as number), num('net_total')),
    ...checkSum('net total and tax and total', [num('net_total'), num('tax_total')], num('gross_total')),
  ];
  lines.forEach((l, i) => {
    if (!sumsMatch([(l.quantity as number) * (l.unit_price as number)], l.amount as number)) problems.push(`line ${i + 1}: quantity times unit price is not the amount`);
  });
  return problems;
}
