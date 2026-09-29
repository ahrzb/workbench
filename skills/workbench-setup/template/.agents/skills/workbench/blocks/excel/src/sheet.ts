// Spreadsheet reading and writing (xlsx through ExcelJS, csv with plain code). MAIN PROCESS ONLY:
// the page never touches these files, it gets the rows this module returns.
//
// Rules this file enforces (safety.md): columns are matched by header text, never by position;
// IDs are always text, exactly as displayed; anything odd is reported in plain words instead of
// being guessed. Nothing here throws for a problem in the user's file: readSheet/readCsv/readTable
// return { ok: false, problems } and the caller shows the problems.
import ExcelJS from 'exceljs';
import type { Cell, Worksheet } from 'exceljs';

// ------------------------------------------------------------------ types

export type CellValue = string | number | boolean | null;
export type Row = Record<string, CellValue>;
/** What writeSheet/writeCsv accept: like Row, plus real Dates for date columns. */
export type WriteRow = Record<string, CellValue | Date | undefined>;

export interface ReadOptions {
  /** Headers that must exist. Matched trimmed and case-insensitively; rows use THIS spelling as the key. */
  required: string[];
  /** Columns whose values are IDs: always read as text exactly as displayed (leading zeros kept). */
  idColumns?: string[];
  /** Columns that must be numbers. Text like "1.234,56" is converted (CSV, or numbers typed as text). */
  numberColumns?: string[];
  /** Columns that must be dates. Read as ISO text: "2024-03-05" or "2024-03-05T14:30:00". */
  dateColumns?: string[];
  /** For text dates like 03/04/2024 (with slashes): which comes first. Dotted dates (03.04.2024) are day first. */
  dateOrder?: 'dmy' | 'mdy';
  /** Force the decimal mark of text numbers. Default: worked out from the file. */
  decimal?: '.' | ',';
  /** xlsx only: sheet name. Default: the first visible sheet that has all the headers. */
  sheet?: string;
  /** Refuse bigger sheets. Default 100000. */
  maxRows?: number;
}

export interface SheetData {
  /** The keys of every row object, in file order. */
  headers: string[];
  rows: Row[];
  /** For each row, its row number in the file (1 = first row), for messages like "row 7". */
  rowNumbers: number[];
  /** Cells that held a formula: the value in the row is the result Excel had saved, not a typed value. */
  formulaCells: { row: number; column: string }[];
  /** Things the tool must not ignore: show them to the user or handle them. Empty = clean read. */
  warnings: string[];
  /** xlsx: the sheet that was read. */
  sheetName?: string;
  /** csv: the delimiter and decimal mark that were detected, so a written file can match. */
  delimiter?: string;
  decimal?: '.' | ',';
}

export type ReadResult = ({ ok: true } & SheetData) | { ok: false; problems: string[] };

export interface Column {
  header: string;
  /** Property of each row object. Default: the header. */
  key?: string;
  /** text (default), id (always a text cell), number, date (ISO text or Date -> a real date). */
  type?: 'text' | 'id' | 'number' | 'date';
  /** Excel number format for number columns, e.g. '#,##0.00'. */
  numFmt?: string;
  /** Column width in characters. Default: fitted to the content. */
  width?: number;
}

// ------------------------------------------------------------------ small helpers

const MAX_ROWS_DEFAULT = 100_000;
const MAX_UNPACKED_BYTES = 500 * 1024 * 1024;
const HEADER_SEARCH_ROWS = 30;
const MAX_WARNINGS = 25;
const MAX_COLUMNS = 1000;

const norm = (s: string): string => s.replace(/\s+/g, ' ').trim().toLowerCase();

function colName(index0: number): string {
  let n = index0 + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = (n - 1 - r) / 26;
  }
  return s;
}

const pad = (n: number, len = 2): string => String(n).padStart(len, '0');

function isoFromDate(d: Date): string | null {
  if (Number.isNaN(d.getTime())) return null;
  const r = new Date(Math.round(d.getTime() / 1000) * 1000); // Excel times carry rounding noise
  const time = `${pad(r.getUTCHours())}:${pad(r.getUTCMinutes())}:${pad(r.getUTCSeconds())}`;
  if (r.getUTCFullYear() === 1899) return time; // a time without a date
  const day = `${pad(r.getUTCFullYear(), 4)}-${pad(r.getUTCMonth() + 1)}-${pad(r.getUTCDate())}`;
  return time === '00:00:00' ? day : `${day}T${time}`;
}

/** Collects messages; repeated ones (one per bad cell) are merged into one line per kind. */
class Notes {
  private list: string[] = [];
  private groups = new Map<string, { count: number; first: string; make: (count: number, first: string) => string }>();
  add(message: string): void {
    this.list.push(message);
  }
  group(key: string, first: string, make: (count: number, first: string) => string): void {
    const g = this.groups.get(key);
    if (g) g.count++;
    else this.groups.set(key, { count: 1, first, make });
  }
  finish(): string[] {
    const all = [...this.list, ...[...this.groups.values()].map((g) => g.make(g.count, g.first))];
    if (all.length <= MAX_WARNINGS) return all;
    return [...all.slice(0, MAX_WARNINGS), `...and ${all.length - MAX_WARNINGS} more.`];
  }
}

// ------------------------------------------------------------------ header matching

type Kind = 'text' | 'id' | 'number' | 'date';

interface Wanted {
  name: string; // the spelling the code asked for; used as the row key
  kind: Kind;
}

/** Every header the code names, by normalized text. A column named in several lists takes the first of id, number, date. */
function wantedList(opts: ReadOptions): Map<string, Wanted> {
  const out = new Map<string, Wanted>();
  const add = (names: string[] | undefined, kind: Kind) => {
    for (const raw of names ?? []) {
      const key = norm(raw);
      const existing = out.get(key);
      if (!existing) out.set(key, { name: raw.trim(), kind });
      else if (existing.kind === 'text') existing.kind = kind;
    }
  };
  add(opts.required, 'text');
  add(opts.idColumns, 'id');
  add(opts.numberColumns, 'number');
  add(opts.dateColumns, 'date');
  return out;
}

/** Index (0-based) of the row that looks like the header row, and how many wanted headers it has. */
function pickHeaderRow(grid: (string | null)[][], wanted: Map<string, Wanted>): { index: number; found: number } {
  let best = { index: -1, found: -1 };
  for (let r = 0; r < grid.length; r++) {
    const texts = grid[r];
    if (!texts.some((t) => t !== null)) continue;
    if (wanted.size === 0) return { index: r, found: 0 };
    const present = new Set(texts.filter((t): t is string => t !== null).map(norm));
    let found = 0;
    for (const key of wanted.keys()) if (present.has(key)) found++;
    if (found === wanted.size) return { index: r, found };
    if (found > best.found) best = { index: r, found };
  }
  if (best.index === -1) {
    const first = grid.findIndex((t) => t.some((x) => x !== null));
    return { index: first, found: 0 };
  }
  return best;
}

interface Bound {
  key: string;
  col: number; // 0-based
  kind: Kind;
}

function bindColumns(texts: (string | null)[], wanted: Map<string, Wanted>, where: string, notes: Notes): { bound: Bound[]; problems: string[] } {
  const problems: string[] = [];
  const positions = new Map<string, number[]>();
  texts.forEach((t, c) => {
    if (t === null) return;
    const k = norm(t);
    positions.set(k, [...(positions.get(k) ?? []), c]);
  });
  const shown = texts.filter((t): t is string => t !== null).map((t) => `"${t}"`);
  for (const [k, w] of wanted) {
    const at = positions.get(k) ?? [];
    if (at.length === 0) {
      problems.push(`${where} has no column "${w.name}". The columns it has: ${shown.length ? shown.join(', ') : '(none)'}.`);
    } else if (at.length > 1) {
      problems.push(`${where} has the column "${w.name}" more than once (columns ${at.map(colName).join(', ')}), so it is unclear which one to use. Rename or remove one of them.`);
    }
  }
  const used = new Set<string>();
  const bound: Bound[] = [];
  texts.forEach((t, c) => {
    if (t === null) return;
    const k = norm(t);
    const w = wanted.get(k);
    if (w) {
      if (positions.get(k)!.length === 1) bound.push({ key: w.name, col: c, kind: w.kind });
      used.add(k);
      return;
    }
    let key = t;
    let n = 2;
    while (used.has(norm(key)) || wanted.has(norm(key))) key = `${t} (${n++})`;
    if (key !== t) notes.add(`The column "${t}" appears more than once; the extra one is called "${key}".`);
    used.add(norm(key));
    bound.push({ key, col: c, kind: 'text' });
  });
  return { bound, problems };
}

// ------------------------------------------------------------------ text -> number / date

/** Which decimal mark the numbers use, judged from the samples. null = they contradict each other. */
function detectDecimal(samples: string[], fallback: '.' | ','): '.' | ',' | null {
  let comma = 0;
  let dot = 0;
  for (const raw of samples) {
    const s = raw.replace(/[\s\u00a0\u202f']/g, '');
    if (!/^[+-]?[\d.,]+$/.test(s)) continue;
    const commas = (s.match(/,/g) ?? []).length;
    const dots = (s.match(/\./g) ?? []).length;
    if (commas && dots) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) comma++;
      else dot++;
    } else if (commas > 1) dot++; // 1,234,567: commas group thousands
    else if (dots > 1) comma++;
    else if (commas === 1) {
      if (s.length - s.indexOf(',') - 1 !== 3) comma++;
    } else if (dots === 1) {
      if (s.length - s.indexOf('.') - 1 !== 3) dot++;
    }
  }
  if (comma && dot) return null;
  if (comma) return ',';
  if (dot) return '.';
  return fallback;
}

/** "1.234,56" / "1,234.56" / "-3,5" -> number, using the given decimal mark. null if it isn't a clean number. */
export function parseNumber(text: string, decimal: '.' | ','): number | null {
  const s = text.replace(/[\s\u00a0\u202f']/g, '');
  const group = decimal === ',' ? '.' : ',';
  const m = /^([+-]?)(\d+|\d{1,3}(?:[.,]\d{3})+)?(?:[.,](\d+))?$/.exec(s);
  if (!m || (m[2] === undefined && m[3] === undefined)) return null;
  const intPart = m[2] ?? '0';
  if (/[.,]/.test(intPart) && intPart.replace(/\d/g, '').split('').some((c) => c !== group)) return null;
  const sepBeforeFraction = m[3] !== undefined ? s.charAt(s.length - m[3].length - 1) : '';
  if (m[3] !== undefined && sepBeforeFraction !== decimal) return null;
  const n = Number(`${m[1]}${intPart.replace(/[.,]/g, '')}${m[3] !== undefined ? `.${m[3]}` : ''}`);
  return Number.isFinite(n) ? n : null;
}

function isoDate(y: number, mo: number, d: number, time?: string): string | null {
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  const day = `${pad(y, 4)}-${pad(mo)}-${pad(d)}`;
  return time && time !== '00:00:00' ? `${day}T${time}` : day;
}

/** "2024-03-05", "05.03.2024", "03/04/2024" (needs dateOrder unless one part is above 12) -> ISO text. */
export function parseDate(text: string, dateOrder?: 'dmy' | 'mdy'): string | null {
  const s = text.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/.exec(s);
  if (m) {
    const time = m[4] === undefined ? undefined : `${pad(Number(m[4]))}:${m[5]}:${m[6] ?? '00'}`;
    return isoDate(Number(m[1]), Number(m[2]), Number(m[3]), time);
  }
  m = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(s);
  if (m) return isoDate(Number(m[3]), Number(m[2]), Number(m[1]));
  m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const order = dateOrder ?? (a > 12 ? 'dmy' : b > 12 ? 'mdy' : undefined);
    if (!order) return null; // 03/04/2024 could be either: never guess
    return order === 'dmy' ? isoDate(Number(m[3]), b, a) : isoDate(Number(m[3]), a, b);
  }
  return null;
}

/** Turns text in number/date columns into numbers/ISO dates (both file types). */
function convertTyped(rows: Row[], rowNumbers: number[], cols: Bound[], opts: ReadOptions, fallbackDecimal: '.' | ',', notes: Notes): { problems: string[]; decimal?: '.' | ',' } {
  const numCols = cols.filter((c) => c.kind === 'number');
  const dateCols = cols.filter((c) => c.kind === 'date');
  const problems: string[] = [];
  let decimal: '.' | ',' | undefined;
  if (numCols.length) {
    const samples: string[] = [];
    for (const row of rows) for (const c of numCols) if (typeof row[c.key] === 'string') samples.push(row[c.key] as string);
    const d = opts.decimal ?? detectDecimal(samples, fallbackDecimal);
    if (d === null) problems.push(`The number columns mix two styles, like 1,5 and 1.5, so it is unclear what the numbers mean. Ask which style is right.`);
    else decimal = d;
  }
  const bad = (kind: string, key: string, rowNo: number, v: CellValue) =>
    notes.group(`${kind}:${key}`, `row ${rowNo}, ${JSON.stringify(String(v).slice(0, 30))}`, (n, first) =>
      kind === 'num'
        ? `${n} cell(s) in "${key}" are not numbers (first: ${first}). They were read as empty.`
        : `${n} cell(s) in "${key}" are not dates, or are day/month-ambiguous (first: ${first}). They were read as empty.`,
    );
  rows.forEach((row, i) => {
    for (const c of numCols) {
      const v = row[c.key];
      if (v === null || typeof v === 'number') continue;
      const n = typeof v === 'string' && decimal ? parseNumber(v, decimal) : null;
      if (n === null) bad('num', c.key, rowNumbers[i], v);
      row[c.key] = n;
    }
    for (const c of dateCols) {
      const v = row[c.key];
      if (v === null) continue;
      const iso = typeof v === 'string' ? parseDate(v, opts.dateOrder) : null;
      if (iso === null) bad('date', c.key, rowNumbers[i], v);
      row[c.key] = iso;
    }
  });
  return { problems, decimal };
}

// ------------------------------------------------------------------ xlsx: cell values

function idFromNumber(v: number, numFmt: string | undefined, notes: Notes, key: string, rowNo: number): string {
  if (!Number.isInteger(v)) return String(v);
  if (Math.abs(v) >= 1e15) {
    notes.group(`long:${key}`, `row ${rowNo}`, (n, first) => `${n} ID(s) in "${key}" are numbers of 16+ digits (first: ${first}). Excel keeps only 15 digits of a number, so the ID may already be wrong in the file; the column should be text in the source file.`);
  }
  let s = BigInt(v).toString();
  const zeros = /^(0+)(?:;.*)?$/.exec(numFmt ?? ''); // a format like 00000 shows leading zeros
  if (zeros && v >= 0) s = s.padStart(zeros[1].length, '0');
  return s;
}

interface Plain {
  value: CellValue;
  error?: string;
}

function plain(v: unknown, numFmt: string | undefined, id: boolean, notes: Notes, key: string, rowNo: number): Plain {
  if (v === null || v === undefined) return { value: null };
  if (typeof v === 'string') return { value: v.trim() === '' ? null : v };
  if (typeof v === 'number') return { value: id ? idFromNumber(v, numFmt, notes, key, rowNo) : v };
  if (typeof v === 'boolean') return { value: id ? (v ? 'TRUE' : 'FALSE') : v };
  if (v instanceof Date) return { value: isoFromDate(v) };
  if (typeof v === 'object') {
    if ('richText' in v && Array.isArray(v.richText)) return plain(v.richText.map((t: { text?: string }) => t.text ?? '').join(''), numFmt, id, notes, key, rowNo);
    if ('error' in v && typeof v.error === 'string') return { value: null, error: v.error };
    if ('hyperlink' in v) return plain('text' in v ? v.text : undefined, numFmt, id, notes, key, rowNo);
  }
  return { value: String(v) };
}

/** The saved result of a formula cell, or null when the cell holds no formula. `result` is undefined when Excel never calculated it. */
function formulaOf(raw: unknown): { result: unknown } | null {
  if (typeof raw !== 'object' || raw === null || raw instanceof Date) return null;
  if (!('formula' in raw) && !('sharedFormula' in raw)) return null;
  return { result: 'result' in raw ? raw.result : undefined };
}

function readCellsOfSheet(
  ws: Worksheet,
  headerRow: number,
  bound: Bound[],
  headerTexts: (string | null)[],
  maxRows: number,
  notes: Notes,
): { rows: Row[]; rowNumbers: number[]; formulaCells: { row: number; column: string }[] } {
  const rows: Row[] = [];
  const rowNumbers: number[] = [];
  const formulaCells: { row: number; column: string }[] = [];
  const boundCols = new Set(bound.map((b) => b.col));
  const orphanCols = new Set<number>();
  let hidden = 0;
  let merged = 0;
  let mergedFirst = '';
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const xrow = ws.findRow(r);
    if (!xrow) continue;
    const row: Row = {};
    const formulasHere: string[] = [];
    let any = false;
    for (const b of bound) {
      const cell: Cell | undefined = xrow.findCell(b.col + 1);
      row[b.key] = null;
      if (!cell) continue;
      if (cell.type === ExcelJS.ValueType.Merge) {
        merged++;
        mergedFirst ||= cell.address;
        continue;
      }
      const formula = formulaOf(cell.value);
      if (formula && formula.result === undefined) {
        notes.group('noresult', cell.address, (n, first) => `${n} formula cell(s) have no saved result (first: ${first}); the file was never calculated by Excel, so their values are unknown. Open and save it in Excel first.`);
        formulasHere.push(b.key);
        any = true;
        continue;
      }
      const p = plain(formula ? formula.result : cell.value, cell.numFmt, b.kind === 'id', notes, b.key, r);
      if (p.error) notes.group('error', cell.address, (n, first) => `${n} cell(s) show an Excel error like ${p.error} (first: ${first}). They were read as empty.`);
      if (formula) formulasHere.push(b.key);
      row[b.key] = p.value;
      if (p.value !== null || p.error) any = true;
    }
    // Data under a column with no header is dropped, so say so.
    xrow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const c = colNumber - 1;
      if (c < MAX_COLUMNS && !boundCols.has(c) && headerTexts[c] == null && cell.type !== ExcelJS.ValueType.Merge && plain(cell.value, undefined, false, notes, '', r).value !== null) orphanCols.add(c);
    });
    if (!any) continue;
    if (xrow.hidden) hidden++;
    rows.push(row);
    rowNumbers.push(r);
    for (const column of formulasHere) formulaCells.push({ row: r, column });
    if (rows.length > maxRows) break;
  }
  if (hidden) notes.add(`${hidden} row(s) are hidden or filtered out in the sheet. They are included in the rows.`);
  if (merged) notes.add(`${merged} cell(s) in the data are part of merged cells (first: ${mergedFirst}). Only the top cell of a merged block holds a value; the others were read as empty.`);
  if (orphanCols.size) notes.add(`Column(s) ${[...orphanCols].map(colName).join(', ')} have data but no header. They were ignored.`);
  return { rows, rowNumbers, formulaCells };
}

// ------------------------------------------------------------------ xlsx: reading

/** Sniffs the first bytes. Returns a plain-words problem when it is not an .xlsx. */
function sniff(bytes: Uint8Array): 'zip' | 'text' | string {
  if (bytes.length === 0) return 'The file is empty.';
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return 'zip';
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return 'This is an old Excel file (.xls) or a password-protected one. Open it in Excel, remove the password if there is one, and save it as .xlsx first.';
  }
  return 'text';
}

/** Adds up the sizes a zip claims to unpack to (an .xlsx is a zip), so a zip bomb never gets unpacked. */
function zipProblem(bytes: Uint8Array): string | null {
  const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) return 'The file is damaged or is not an Excel workbook (no zip directory found).';
  const count = v.getUint16(eocd + 10, true);
  let pos = v.getUint32(eocd + 16, true);
  if (count > 10_000) return 'The file has far too many parts to be a normal Excel workbook.';
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (pos + 46 > bytes.length || v.getUint32(pos, true) !== 0x02014b50) return 'The file is damaged (its zip directory is unreadable).';
    total += v.getUint32(pos + 24, true);
    pos += 46 + v.getUint16(pos + 28, true) + v.getUint16(pos + 30, true) + v.getUint16(pos + 32, true);
  }
  return total > MAX_UNPACKED_BYTES ? `The workbook would unpack to about ${Math.round(total / 1024 / 1024)} MB, which is too much to open safely.` : null;
}

async function loadWorkbook(bytes: Uint8Array): Promise<{ wb: ExcelJS.Workbook } | { problem: string }> {
  const wb = new ExcelJS.Workbook();
  // A warning from the library while opening means the file is not what it seems: stop, don't carry on.
  const heard: string[] = [];
  const saved = { warn: console.warn, trace: console.trace, error: console.error };
  const listen = (...args: unknown[]) => void heard.push(args.map(String).join(' ').slice(0, 200));
  console.warn = console.trace = console.error = listen;
  let failure: string | null = null;
  try {
    // ExcelJS's typings name an older Buffer type than @types/node 24; the runtime value is right.
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength) as unknown as Parameters<typeof wb.xlsx.load>[0];
    await wb.xlsx.load(buffer);
  } catch (e) {
    failure = e instanceof Error ? e.message : String(e);
  } finally {
    Object.assign(console, saved);
  }
  const warned = heard.length ? ` The Excel library warned while opening it: ${heard.join(' | ')}` : '';
  if (failure !== null) return { problem: `The file could not be opened as an Excel workbook (${failure}).${warned}` };
  if (warned) return { problem: `The file was not read.${warned}` };
  return { wb };
}

function headerGrid(ws: Worksheet): (string | null)[][] {
  const grid: (string | null)[][] = [];
  const cols = Math.min(ws.columnCount, MAX_COLUMNS);
  for (let r = 1; r <= Math.min(ws.rowCount, HEADER_SEARCH_ROWS); r++) {
    const row: (string | null)[] = [];
    const xrow = ws.findRow(r);
    for (let c = 1; c <= cols; c++) {
      const cell = xrow?.findCell(c);
      const raw = cell && cell.type !== ExcelJS.ValueType.Merge ? (formulaOf(cell.value)?.result ?? cell.value) : null;
      const v = cell ? plain(raw, cell.numFmt, true, new Notes(), '', r).value : null;
      row.push(v === null ? null : String(v).trim() || null);
    }
    grid.push(row);
  }
  return grid;
}

export async function readSheet(input: Uint8Array, opts: ReadOptions): Promise<ReadResult> {
  const kind = sniff(input);
  if (kind !== 'zip') return { ok: false, problems: [kind === 'text' ? 'This does not look like an Excel (.xlsx) file.' : kind] };
  const zp = zipProblem(input);
  if (zp) return { ok: false, problems: [zp] };
  const loaded = await loadWorkbook(input);
  if ('problem' in loaded) return { ok: false, problems: [loaded.problem] };
  const wb = loaded.wb;

  const wanted = wantedList(opts);
  const notes = new Notes();
  let sheets = wb.worksheets.filter((ws) => ws.state === 'visible');
  if (sheets.length === 0) sheets = wb.worksheets;
  if (opts.sheet !== undefined) {
    sheets = wb.worksheets.filter((ws) => norm(ws.name) === norm(opts.sheet as string));
    if (sheets.length === 0) return { ok: false, problems: [`The workbook has no sheet called "${opts.sheet}". Its sheets: ${wb.worksheets.map((w) => `"${w.name}"`).join(', ')}.`] };
  }
  if (sheets.length === 0) return { ok: false, problems: ['The workbook has no sheets.'] };

  let pick: { ws: Worksheet; grid: (string | null)[][]; index: number; found: number } | null = null;
  for (const ws of sheets) {
    const grid = headerGrid(ws);
    const p = pickHeaderRow(grid, wanted);
    if (p.index >= 0 && (pick === null || p.found > pick.found)) pick = { ws, grid, ...p };
    if (p.index >= 0 && p.found === wanted.size) break;
  }
  if (pick === null) return { ok: false, problems: [`The sheet "${sheets[0].name}" is empty.`] };

  const { ws } = pick;
  const headerTexts = pick.grid[pick.index];
  const where = `Sheet "${ws.name}", row ${pick.index + 1},`;
  const problems: string[] = [];
  const headerXRow = ws.getRow(pick.index + 1);
  for (let c = 0; c < headerTexts.length; c++) {
    const cell = headerXRow.findCell(c + 1);
    const next = headerXRow.findCell(c + 2);
    if (cell && cell.type !== ExcelJS.ValueType.Merge && next && next.type === ExcelJS.ValueType.Merge && next.master.address === cell.address) {
      let end = c + 1;
      while (headerXRow.findCell(end + 2)?.type === ExcelJS.ValueType.Merge) end++;
      problems.push(`The header in ${cell.address} is a merged cell across columns ${colName(c)} to ${colName(end)}, so the tool cannot tell which column is which. Unmerge it and give each column its own header.`);
    }
  }
  const { bound, problems: bindProblems } = bindColumns(headerTexts, wanted, where, notes);
  problems.push(...bindProblems);
  const maxRows = opts.maxRows ?? MAX_ROWS_DEFAULT;
  if (ws.rowCount - (pick.index + 1) > maxRows + 1000 && ws.actualRowCount > maxRows) problems.push(`The sheet has more than ${maxRows} rows, which is more than this tool reads.`);
  if (problems.length) return { ok: false, problems };

  const data = readCellsOfSheet(ws, pick.index + 1, bound, headerTexts, maxRows, notes);
  if (data.rows.length > maxRows) return { ok: false, problems: [`The sheet has more than ${maxRows} rows, which is more than this tool reads.`] };
  const typed = convertTyped(data.rows, data.rowNumbers, bound, opts, '.', notes);
  if (typed.problems.length) return { ok: false, problems: typed.problems };
  return { ok: true, headers: bound.map((b) => b.key), ...data, warnings: notes.finish(), sheetName: ws.name, decimal: typed.decimal };
}

// ------------------------------------------------------------------ csv: reading

function decodeCsv(bytes: Uint8Array, notes: Notes): string {
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  const body = bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf ? bytes.subarray(3) : bytes;
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(body);
  } catch {
    notes.add('The file is not UTF-8 text; it was read as Windows-1252 (what older Excel exports use). Check that letters like ä, é, € look right.');
    return new TextDecoder('windows-1252').decode(body);
  }
}

/** RFC 4180 style: quoted fields, "" for a quote, delimiters and line breaks inside quotes. */
export function parseCsv(text: string, delimiter: string): { rows: string[][]; unterminated: boolean } {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
        } else {
          quoted = false;
          i++;
        }
      } else {
        field += ch;
        i++;
      }
    } else if (ch === '"' && field === '') {
      quoted = true;
      i++;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
      i++;
    } else if (ch === '\r' || ch === '\n') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
      i++;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return { rows, unterminated: quoted };
}

/** The delimiter that splits the first lines into the same number (2 or more) of columns. */
function detectDelimiter(text: string): string {
  const sample = text.slice(0, 65_536);
  let best = { d: ',', score: 0 };
  for (const d of [',', ';', '\t', '|']) {
    let rows = parseCsv(sample, d).rows;
    if (sample.length === 65_536) rows = rows.slice(0, -1); // the last line may be cut off
    rows = rows.slice(0, 20).filter((r) => r.length > 1 || r[0] !== '');
    if (rows.length === 0 || rows[0].length < 2) continue;
    const consistent = rows.filter((r) => r.length === rows[0].length).length;
    const score = consistent * 1000 + rows[0].length;
    if (score > best.score) best = { d, score };
  }
  return best.d;
}

export function readCsv(input: Uint8Array, opts: ReadOptions): ReadResult {
  const notes = new Notes();
  let text = decodeCsv(input, notes);
  let delimiter: string | undefined;
  const sep = /^sep=(.)\r?\n/i.exec(text);
  if (sep) {
    delimiter = sep[1];
    text = text.slice(sep[0].length);
  }
  delimiter ??= detectDelimiter(text);
  const parsed = parseCsv(text, delimiter);
  if (parsed.unterminated) return { ok: false, problems: ['The file has a quote mark that is never closed, so the rest of it cannot be split into cells reliably. Ask for a fresh export.'] };

  const wanted = wantedList(opts);
  const cellText = (s: string): string | null => (s.trim() === '' ? null : s.trim());
  const grid = parsed.rows.slice(0, HEADER_SEARCH_ROWS).map((r) => r.map(cellText));
  const pick = pickHeaderRow(grid, wanted);
  if (pick.index < 0) return { ok: false, problems: ['The file is empty.'] };
  const headerTexts = grid[pick.index];
  const { bound, problems } = bindColumns(headerTexts, wanted, `The file, row ${pick.index + 1},`, notes);
  if (problems.length) return { ok: false, problems };

  const maxRows = opts.maxRows ?? MAX_ROWS_DEFAULT;
  const rows: Row[] = [];
  const rowNumbers: number[] = [];
  let ragged = 0;
  let raggedFirst = 0;
  for (let r = pick.index + 1; r < parsed.rows.length; r++) {
    const fields = parsed.rows[r];
    if (fields.every((f) => f.trim() === '')) continue;
    if (fields.length > headerTexts.length && fields.slice(headerTexts.length).some((f) => f.trim() !== '')) {
      ragged++;
      raggedFirst ||= r + 1;
    }
    const row: Row = {};
    for (const b of bound) {
      const f = fields[b.col];
      row[b.key] = f === undefined || f.trim() === '' ? null : f;
    }
    rows.push(row);
    rowNumbers.push(r + 1);
    if (rows.length > maxRows) return { ok: false, problems: [`The file has more than ${maxRows} rows, which is more than this tool reads.`] };
  }
  if (ragged) notes.add(`${ragged} row(s) have more values than the header has columns (first: row ${raggedFirst}). The extra values were ignored.`);
  const typed = convertTyped(rows, rowNumbers, bound, opts, delimiter === ';' ? ',' : '.', notes);
  if (typed.problems.length) return { ok: false, problems: typed.problems };
  return { ok: true, headers: bound.map((b) => b.key), rows, rowNumbers, formulaCells: [], warnings: notes.finish(), delimiter, decimal: typed.decimal };
}

/** Reads an .xlsx or a .csv, judged by the file's first bytes (the extension can lie). */
export async function readTable(input: Uint8Array, opts: ReadOptions): Promise<ReadResult> {
  const kind = sniff(input);
  if (kind === 'text') return readCsv(input, opts);
  return readSheet(input, opts);
}

// ------------------------------------------------------------------ rows from the page

/** Checks rows that arrive over IPC: a list of plain objects holding only text, numbers, booleans or nothing. */
export function checkRows(value: unknown, maxRows = 200_000): { ok: true; rows: Row[] } | { ok: false; error: string } {
  if (!Array.isArray(value)) return { ok: false, error: 'rows must be a list' };
  if (value.length > maxRows) return { ok: false, error: `more than ${maxRows} rows` };
  const rows: Row[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null || Array.isArray(item)) return { ok: false, error: 'every row must be an object' };
    const row: Row = {};
    for (const [k, v] of Object.entries(item)) {
      if (v === null || v === undefined) row[k] = null;
      else if (typeof v === 'string' && v.length <= 32_767) row[k] = v;
      else if (typeof v === 'number' && Number.isFinite(v)) row[k] = v;
      else if (typeof v === 'boolean') row[k] = v;
      else return { ok: false, error: `the value in "${k}" is not text, a number, true/false or empty` };
    }
    rows.push(row);
  }
  return { ok: true, rows };
}

// ------------------------------------------------------------------ writing

interface Prepared {
  col: Column & { key: string; type: NonNullable<Column['type']> };
  values: (string | number | Date | null)[];
  hasTime: boolean[];
}

function toIdText(v: unknown): string {
  return typeof v === 'number' && Number.isInteger(v) ? BigInt(v).toString() : String(v);
}

function prepare(rows: WriteRow[], columns: Column[]): Prepared[] {
  if (columns.length === 0) throw new Error('No columns to write.');
  const seen = new Set<string>();
  for (const c of columns) {
    if (seen.has(norm(c.header))) throw new Error(`The column "${c.header}" is listed twice.`);
    seen.add(norm(c.header));
  }
  return columns.map((c) => {
    const col = { ...c, key: c.key ?? c.header, type: c.type ?? 'text' } as Prepared['col'];
    const hasTime: boolean[] = [];
    const values = rows.map((row, i): string | number | Date | null => {
      const v = row[col.key];
      hasTime.push(false);
      if (v === null || v === undefined || v === '') return null;
      const at = `Row ${i + 1}, column "${col.header}"`;
      if (col.type === 'number') {
        if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`${at}: ${JSON.stringify(v)} is not a number.`);
        return v;
      }
      if (col.type === 'date') {
        const iso = v instanceof Date ? isoFromDate(v) : typeof v === 'string' ? parseDate(v) : null;
        const m = iso === null ? null : /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2}))?$/.exec(iso);
        if (!m) throw new Error(`${at}: ${JSON.stringify(v)} is not a date (use 2024-03-05 or 2024-03-05T14:30:00).`);
        hasTime[i] = m[4] !== undefined;
        return new Date(`${iso}${hasTime[i] ? '' : 'T00:00:00'}Z`);
      }
      if (col.type === 'id') return toIdText(v);
      return typeof v === 'string' ? v : String(v);
    });
    return { col, values, hasTime };
  });
}

function sheetTitle(name: string | undefined): string {
  const cleaned = (name ?? '').replace(/[\\/?*[\]:]/g, '-').replace(/^'+|'+$/g, '').trim().slice(0, 31);
  return cleaned || 'Sheet1';
}

/** An .xlsx: header row (bold, frozen, filter), IDs as text cells, numbers as numbers, dates as real dates. */
export async function writeSheet(rows: WriteRow[], columns: Column[], options: { sheetName?: string } = {}): Promise<Uint8Array> {
  if (rows.length > 1_048_575) throw new Error('Too many rows for one Excel sheet (limit 1,048,575).');
  const prepared = prepare(rows, columns);
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetTitle(options.sheetName), { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow(prepared.map((p) => p.col.header));
  const header = ws.getRow(1);
  header.font = { bold: true };
  header.alignment = { vertical: 'middle' };
  for (let i = 0; i < rows.length; i++) {
    const xrow = ws.addRow(prepared.map((p) => p.values[i]));
    prepared.forEach((p, c) => {
      const cell = xrow.getCell(c + 1);
      if (p.col.type === 'id') cell.numFmt = '@';
      else if (p.col.type === 'date' && p.values[i] !== null) cell.numFmt = p.hasTime[i] ? 'yyyy-mm-dd hh:mm' : 'yyyy-mm-dd';
      else if (p.col.type === 'number' && p.col.numFmt) cell.numFmt = p.col.numFmt;
    });
  }
  prepared.forEach((p, c) => {
    let width = p.col.width;
    if (width === undefined) {
      const shown = p.col.type === 'date' ? 12 : Math.max(0, ...p.values.map((v) => (v === null ? 0 : v instanceof Date ? 16 : String(v).length)));
      width = Math.min(60, Math.max(10, p.col.header.length + 4, shown + 2));
    }
    ws.getColumn(c + 1).width = width;
  });
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: prepared.length } };
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

/** A .csv Excel opens correctly: UTF-8 with a BOM, CRLF, quoted where needed. */
export function writeCsv(rows: WriteRow[], columns: Column[], options: { delimiter?: ',' | ';' | '\t'; decimal?: '.' | ',' } = {}): Uint8Array {
  const delimiter = options.delimiter ?? ',';
  const decimal = options.decimal ?? '.';
  const prepared = prepare(rows, columns);
  const field = (text: string, plainNumber: boolean): string => {
    // Text starting with = + - @ is run as a formula when Excel opens the file: defuse it with a leading '.
    if (!plainNumber && /^[=+\-@\t\r]/.test(text) && !/^[+-]?[\d.,]+$/.test(text)) text = `'${text}`;
    return /["\r\n]/.test(text) || text.includes(delimiter) || text !== text.trim() ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [prepared.map((p) => field(p.col.header, false)).join(delimiter)];
  for (let i = 0; i < rows.length; i++) {
    lines.push(
      prepared
        .map((p) => {
          const v = p.values[i];
          if (v === null) return '';
          if (typeof v === 'number') return String(v).replace('.', decimal);
          if (v instanceof Date) return (isoFromDate(v) ?? '').replace('T', ' ');
          return field(v, false);
        })
        .join(delimiter),
    );
  }
  const body = new TextEncoder().encode(`${lines.join('\r\n')}\r\n`);
  const out = new Uint8Array(body.length + 3);
  out.set([0xef, 0xbb, 0xbf]);
  out.set(body, 3);
  return out;
}
