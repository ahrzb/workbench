# Block: Excel and CSV in, Excel and CSV out

For the AI, not the user. Tested code for reading the user's spreadsheets and writing new ones in an Electron tool from `starters/electron/`. Copy it instead of rewriting it. It implements the spreadsheet rules of [safety.md](../../safety.md#data): columns by header text never by position, IDs as text, a library warning on load is a stop.

## Use it when / not when

- Use: the tool reads an `.xlsx` or `.csv` the user picks, or writes one (an export, a cleaned-up copy, a report).
- Not: the tool owns its data (that is SQLite in `dataDir()`); the user only wants numbers pasted in (a text box does); an old `.xls`, a password-protected file, or `.xlsm` macros (the block tells the user to save as plain `.xlsx` in Excel). Never write into the user's original: output is always a new file.

## Files (from this folder into `tools/<name>/app/`)

| Copy | To | What |
|---|---|---|
| `src/sheet.ts` | `app/src/sheet.ts` | The block. Main process only. Never change its rules; change the tool's spec instead. |
| `src/tablespec.ts` | `app/src/tablespec.ts` | Example spec: the headers the tool expects (`TABLE_READ`), the columns it writes (`TABLE_COLUMNS`), csv style (`TABLE_CSV`). **Edit it to the user's real header names, in their words.** |
| `test/sheet.test.mjs` | `app/test/sheet.test.mjs` | 31-test file for the block itself (fixtures are generated in the test). Keep it; add the tool's own tests beside it. |

## Install (from `tools/<name>/app/`)

```
..\..\..\.workbench\scripts\run.cmd npm.cmd install exceljs@4.4.0 --save-exact
```

Then the native-module check in `starters/electron/README.md`. Expected result, measured on the starter with `npm_config_ignore_scripts=true`: `hasInstallScript` still only `fsevents`; no `binding.gyp`; no new `*.node` files. Footprint: `node_modules` grows by about 31 MB (126 more lock entries, 60 top-level folders, ExcelJS itself 22 MB); the packaged app's `main.js` is about 1 MB with it (Vite bundles ExcelJS into it, no `node_modules` is shipped). Loading ExcelJS takes about 0.3 s in plain Node, paid when the app starts. npm prints deprecation warnings for ExcelJS's old dependencies (`rimraf`, `fstream`, `uuid`, ...): harmless, do not chase them. ExcelJS is pure JS (MIT).

## Wiring (four small edits; the page never sees a path or a buffer)

Flow: the native Open dialog picks the file, main reads the bytes (size cap), `readTable` parses them in main, and the page receives rows or plain-words problems. Saving: the page sends rows only, main builds the file from `TABLE_COLUMNS`, the Save dialog picks the name, main writes with `wx`.

**`src/shared.ts`** (add; `import type` is erased, so the page never loads ExcelJS):

```ts
import type { ReadResult, Row } from './sheet.ts';

export interface OpenedTable {
  name: string; // file name only
  result: ReadResult; // { ok: true, rows, headers, warnings, ... } or { ok: false, problems }
}
export type TableFormat = 'xlsx' | 'csv';

// in Api:
  openTable(): Promise<OpenedTable | null>;
  saveTable(rows: Row[], format: TableFormat, suggestedName: string): Promise<SaveResult>;

// in CHANNELS:
  openTable: 'table:open',
  saveTable: 'table:save',
```

**`src/preload.ts`** (two named functions, nothing generic):

```ts
  openTable: () => ipcRenderer.invoke(CHANNELS.openTable),
  saveTable: (rows, format, suggestedName) => ipcRenderer.invoke(CHANNELS.saveTable, rows, format, suggestedName),
```

**`src/main.ts`**: imports (merge with the existing `shared.ts` imports), two helpers after `readConfirmed`, two handlers inside `registerIpc`. `saveTextFile` can call `writeNewFile` too if you want one write path; leave it alone otherwise.

```ts
import { checkRows, readTable, writeCsv, writeSheet } from './sheet.ts';
import { TABLE_COLUMNS, TABLE_CSV, TABLE_READ } from './tablespec.ts';
import type { OpenedTable, TableFormat } from './shared.ts';

const TABLE_EXTENSIONS = ['xlsx', 'csv'];

/** Like readConfirmed, but binary (an .xlsx is a zip) and parsed into rows. Same rules: only a path from the Open dialog, size cap. */
async function readTableConfirmed(filePath: string): Promise<OpenedTable> {
  const name = path.basename(filePath);
  const fail = (problem: string): OpenedTable => ({ name, result: { ok: false, problems: [problem] } });
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!TABLE_EXTENSIONS.includes(ext)) return fail(`unsupported file type ".${ext}" (use ${TABLE_EXTENSIONS.map((e) => `.${e}`).join(', ')})`);
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return fail('not a file');
    if (info.size > MAX_FILE_BYTES) return fail(`file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB`);
    return { name, result: await readTable(await readFile(filePath), TABLE_READ) };
  } catch (e) {
    return fail(`could not read file: ${e instanceof Error ? e.message : String(e)}`);
  }
}

/** Exclusive create ('wx'): never truncates or overwrites an existing file. */
async function writeNewFile(target: string, data: Uint8Array): Promise<SaveResult> {
  try {
    const handle = await open(target, 'wx');
    try {
      await handle.writeFile(data);
    } finally {
      await handle.close();
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EEXIST') return { status: 'refused', reason: 'that file already exists; pick a new file name' };
    return { status: 'refused', reason: `could not write file: ${e instanceof Error ? e.message : String(e)}` };
  }
  return { status: 'saved', path: target, bytes: data.length };
}

// inside registerIpc(...):
  ipcMain.handle(CHANNELS.openTable, async (event): Promise<OpenedTable | null> => {
    assertTrusted(event);
    const win = getWindow();
    const options: Electron.OpenDialogOptions = {
      title: 'Open a spreadsheet',
      properties: ['openFile'],
      filters: [{ name: 'Spreadsheets', extensions: TABLE_EXTENSIONS }],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return readTableConfirmed(result.filePaths[0]);
  });

  ipcMain.handle(CHANNELS.saveTable, async (event, rows: unknown, format: unknown, suggestedName: unknown): Promise<SaveResult> => {
    assertTrusted(event); // validate every argument: they come from the page
    const checked = checkRows(rows);
    if (!checked.ok) return { status: 'refused', reason: `nothing to save (${checked.error})` };
    if (format !== 'xlsx' && format !== 'csv') return { status: 'refused', reason: 'unknown file format' };
    const fmt: TableFormat = format;
    let data: Uint8Array; // built first, so a row that does not fit its column is reported before any dialog
    try {
      data = fmt === 'xlsx' ? await writeSheet(checked.rows, TABLE_COLUMNS) : writeCsv(checked.rows, TABLE_COLUMNS, TABLE_CSV);
    } catch (e) {
      return { status: 'refused', reason: e instanceof Error ? e.message : String(e) };
    }
    if (data.length > MAX_FILE_BYTES) return { status: 'refused', reason: 'the file would be too large' };
    const base = typeof suggestedName === 'string' && suggestedName !== '' ? path.basename(suggestedName, path.extname(suggestedName)) : 'table';
    const win = getWindow();
    const options: Electron.SaveDialogOptions = {
      title: 'Save spreadsheet as',
      defaultPath: `${base}.${fmt}`,
      filters: [{ name: fmt === 'xlsx' ? 'Excel workbook' : 'CSV file', extensions: [fmt] }],
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { status: 'cancelled' };
    if (path.extname(result.filePath).slice(1).toLowerCase() !== fmt) return { status: 'refused', reason: `the file name must end in .${fmt}` };
    return writeNewFile(result.filePath, data);
  });
```

**`src/renderer.ts`** (shape of the page side; `import type { Row } from './sheet.ts'`; cells only via `textContent`):

```ts
const opened = await window.api.openTable();
if (opened === null) return;
if (!opened.result.ok) { status.textContent = `${opened.name}: ${opened.result.problems.join(' ')}`; return; }
const { headers, rows, warnings } = opened.result;
// ...build the table with textContent; keep `rows` for saveTable(rows, 'xlsx', opened.name)
// warnings.length > 0: show them next to the result; do not hide them (see below).
```

Nothing else changes: CSP, sandbox, fuses stay as they are. This adds no network use and no native module. Note the deliberate difference from "untrusted formats are parsed in the renderer": `stack.md` puts xlsx in main (ExcelJS needs Node). The block limits the risk: 50 MB file cap, `zipProblem` refuses a zip whose directory claims more than 500 MB unpacked (a zip bomb) before anything is unpacked, a row cap (`maxRows`, default 100000), and only plain rows go to the page.

## API (all in `sheet.ts`)

- `readTable(bytes, opts)` reads `.xlsx` or `.csv`, judged by the file's first bytes (not the extension). `readSheet` (xlsx) and `readCsv` do one format each.
- Result: `{ ok: false, problems: string[] }` (plain sentences, safe to show) or `{ ok: true, headers, rows, rowNumbers, formulaCells, warnings, sheetName?, delimiter?, decimal? }`. It never throws for a problem in the user's file.
- `opts`: `required` (headers that must exist), `idColumns`, `numberColumns`, `dateColumns`, `dateOrder`, `decimal`, `sheet`, `maxRows`. **Every header named in any list must exist**, so name only columns the tool really needs.
- `writeSheet(rows, columns, { sheetName? })` -> xlsx bytes. `writeCsv(rows, columns, { delimiter?, decimal? })` -> csv bytes. `Column = { header, key?, type?: 'text' | 'id' | 'number' | 'date', numFmt?, width? }`. A value that does not fit its column type throws an Error naming row and column ("Row 3, column "Amount": "abc" is not a number."): show it.
- `checkRows(unknown)` validates rows arriving over IPC. `parseNumber`, `parseDate`, `parseCsv` are exported for tool logic.

## What the reading rules do (state these to yourself, never to the user as options)

- Headers match trimmed, case-insensitive, whitespace collapsed. Row keys use the spelling in `required`; other columns keep the file's spelling. The header row is found in the first 30 rows (title rows above it are fine) and, with several sheets, the first visible sheet that has all the headers is used.
- Missing header, or the same header twice, or a merged header cell: `ok: false` with a sentence naming the header, the cell or columns, and the columns that do exist.
- IDs (`idColumns`): text exactly as displayed. A number cell with format `00000` gives `"00042"`; `123456789012` stays `"123456789012"` (no `1.23E+11`). Text is never trimmed or changed. A number of 16+ digits gets a warning: Excel keeps only 15 digits, so the damage is already in the file; ask for the column as text.
- Dates: real date cells become `"2024-03-05"` or `"2024-03-05T14:30:00"` (no time zone; Excel has none). Text dates in `dateColumns` are accepted as `2024-03-05`, `05.03.2024` (day first) and `03/04/2024` only when `dateOrder` is given or one part is over 12; anything else becomes `null` plus a warning. Never guess day/month.
- Numbers in `numberColumns`: text like `1.234,50` or `1,234.50` is converted; the decimal mark is worked out from the whole file (or `opts.decimal`), a file mixing `1,5` and `1.5` is refused, an ambiguous `1,234` follows the csv delimiter (`;` means comma decimals). Bad cells become `null` plus a warning.
- Formulas: the saved result is the value, and the cell is listed in `formulaCells` (`{ row, column }`). A formula Excel never calculated (file made by a script) has no result: `null` plus a warning. Excel error values (`#DIV/0!`) become `null` plus a warning.
- Blank or spaces-only cells are `null`. Fully blank rows are skipped; `rowNumbers` gives each kept row's number in the file for messages.
- Other warnings: hidden or filtered rows (they are included), cells inside merged blocks (only the top cell holds the value, the rest read empty), data under a column with no header (ignored), duplicate non-required headers (renamed `Name (2)`), csv rows longer than the header, csv not UTF-8 (read as Windows-1252).
- **`warnings` is a stop sign, like a library warning on load.** If it is not empty, show the warnings with the result and let the user decide; do not carry on silently. If ExcelJS itself warns or fails while opening, the file is not read (`ok: false`).
- csv: UTF-8 (BOM stripped), UTF-16 with BOM, `sep=;` first line, delimiter `, ; tab |` detected from the first lines, quoted fields with doubled quotes and line breaks inside quotes; an unclosed quote is refused.

## What the writing rules do

- xlsx: bold header row, frozen, filter on, widths fitted (or `width`), sheet name cleaned of characters Excel forbids. `id` columns are text cells with the text format (`t="s"`, so Excel never turns `000123` into `123` or a long ID into `1.23E+17`). `number` columns are numbers (`numFmt` such as `'#,##0.00'`), `date` columns are real dates (`yyyy-mm-dd`, or with time when the value has one). Formula-looking text such as `=SUM(A1)` is stored as text, never as a formula.
- csv: UTF-8 with BOM (Excel then reads umlauts right), CRLF, quoting where needed, `delimiter`/`decimal` as given (copy what `readCsv` reported for the user's own files: `;` and `,` for a German Excel). Text starting with `= + - @` gets a leading `'` so Excel does not run it as a formula when the file is opened.
- csv cannot keep IDs safe: double-clicking a csv makes Excel drop leading zeros and shorten long numbers. When the output contains IDs, offer xlsx as the default and csv only when asked.

## Tests

`test/sheet.test.mjs` (31 tests, next to the starter's 2). It builds every input file itself with ExcelJS (leading-zero and formatted IDs, long numbers, headers in another order, missing and duplicate header, merged header, merged data cells, formula with and without saved result, error value, dates, text numbers/dates, hidden rows, wrong file kinds, zip bomb, library warning, row cap) and German/English/tab/latin-1/UTF-16 csv. The round-trip test unzips the written xlsx and checks the cell XML: ID cells are `t="s"`, numbers and dates have no type attribute, frozen pane, filter, widths, date format. When you add a rule to `sheet.ts`, add its test here first.

## Verified (scratch copy of the starter, Node 22.23, `npm_config_ignore_scripts=true`)

`npm test`: 33 pass (31 new + the starter's 2), `npm run typecheck` clean, `npm run package` builds, and the packaged exe (ExcelJS bundled into `main.js`) wrote and re-read a workbook inside Electron's main process (52 ms for the round trip) via a scratch-only hook that is not part of this block. Speed and memory, in plain Node: writing 50,000 rows took 1.1 s, reading them back 0.7 s, with the process at about 390 MB; ExcelJS holds the whole sheet in memory, so keep `maxRows` at its default (100000) or lower.

Not verified: opening a written file in real Excel or LibreOffice (none here); the Open/Save dialogs driven by hand (native dialogs); files produced by Excel itself with unusual features (pivot tables, tables with structured references, 1904 dates, password protection beyond the `.xls`/OLE refusal); sheets of 100,000 rows (only 50,000 were timed).
