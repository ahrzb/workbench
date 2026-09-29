// The one screen. Plain TypeScript + DOM, no framework. Extraction runs HERE, in the sandboxed
// renderer: pdf.js and mammoth parse untrusted files in the process that has no Node access,
// and the main process only reads bytes from paths the user confirmed in the Open dialog.
//
// Text from files is only ever put into the page with textContent / input.value (never innerHTML).
import './index.css';
import { extractText } from './extract.ts';
import { buildWorkbook, FIELD_KEYS, FIELD_LABELS } from './exportXlsx.ts';
import type { ExportRow } from './exportXlsx.ts';
import { libs } from './libs.ts';
import { DEFAULT_SKILLS, parseResume } from './parser.ts';
import type { FieldKey, Flag, ParsedResume } from './parser.ts';

interface Row {
  id: string;
  fileName: string;
  problem?: string;
  text: string;
  values: Record<FieldKey, string>;
  original: Record<FieldKey, string>;
  flags: Record<FieldKey, Flag>;
  notes: Record<FieldKey, string>;
  edited: Set<FieldKey>;
  cells: Partial<Record<FieldKey, HTMLInputElement>>;
  tr?: HTMLTableRowElement;
}

const api = window.resumeApi;
const $ = <T extends HTMLElement>(id: string): T => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el as T;
};

const rowsEl = $<HTMLTableSectionElement>('rows');
const emptyEl = $<HTMLParagraphElement>('empty');
const statusEl = $<HTMLElement>('status');
const rawTitle = $<HTMLElement>('raw-title');
const rawText = $<HTMLElement>('raw-text');
const skillsText = $<HTMLTextAreaElement>('skills-text');
const skillsSummary = $<HTMLElement>('skills-summary');
const openBtn = $<HTMLButtonElement>('open');
const exportBtn = $<HTMLButtonElement>('export');

const rows: Row[] = [];
let nextId = 1;
let selected: Row | null = null;
let skills: string[] = [...DEFAULT_SKILLS];

const emptyRecord = <T>(v: T): Record<FieldKey, T> => Object.fromEntries(FIELD_KEYS.map((k) => [k, v])) as Record<FieldKey, T>;

// ------------------------------------------------------------------ table

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function refreshStatus(extra = ''): void {
  const bad = rows.filter((r) => r.problem).length;
  const base =
    rows.length === 0
      ? 'Ready.'
      : `${rows.length} resume(s) in the table${bad ? `, ${bad} could not be read (see red rows)` : ''}. Yellow/orange cells need a look.`;
  setStatus(extra ? `${base} ${extra}` : base);
}

function paintCell(row: Row, key: FieldKey): void {
  const input = row.cells[key];
  if (!input) return;
  const edited = row.edited.has(key);
  input.className = `cell ${edited ? 'edited' : row.flags[key]}`;
  input.title = edited ? 'Edited by you' : row.notes[key] || (row.flags[key] === 'found' ? '' : row.flags[key] === 'uncertain' ? 'Uncertain: please check' : 'Not found');
}

function applyParsed(row: Row, parsed: ParsedResume | null, only?: FieldKey): void {
  for (const key of FIELD_KEYS) {
    if (only && key !== only) continue;
    const f = parsed?.fields[key];
    row.original[key] = f?.value ?? '';
    row.values[key] = f?.value ?? '';
    row.flags[key] = f?.flag ?? 'not_found';
    row.notes[key] = f?.note ?? '';
    row.edited.delete(key);
    const input = row.cells[key];
    if (input) input.value = row.values[key];
    paintCell(row, key);
  }
}

function selectRow(row: Row): void {
  selected?.tr?.classList.remove('selected');
  selected = row;
  row.tr?.classList.add('selected');
  rawTitle.textContent = `Extracted text — ${row.fileName}`;
  rawText.textContent = row.problem ? `(${row.problem})` : row.text;
}

function buildRowElement(row: Row): HTMLTableRowElement {
  const tr = document.createElement('tr');
  tr.addEventListener('click', () => selectRow(row));

  const idTd = document.createElement('td');
  idTd.className = 'id';
  idTd.textContent = row.id;
  tr.append(idTd);

  const fileTd = document.createElement('td');
  fileTd.className = `file${row.problem ? ' file-problem' : ''}`;
  const fileName = document.createElement('div');
  fileName.textContent = row.fileName;
  fileTd.append(fileName);
  if (row.problem) {
    const problem = document.createElement('div');
    problem.className = 'problem';
    problem.textContent = row.problem;
    fileTd.append(problem);
  }
  tr.append(fileTd);

  for (const key of FIELD_KEYS) {
    const td = document.createElement('td');
    const input = document.createElement('input');
    input.type = 'text';
    input.value = row.values[key];
    input.spellcheck = false;
    input.setAttribute('aria-label', `${FIELD_LABELS[key]} for ${row.fileName}`);
    input.addEventListener('focus', () => selectRow(row));
    input.addEventListener('input', () => {
      row.values[key] = input.value;
      if (input.value === row.original[key]) row.edited.delete(key);
      else row.edited.add(key);
      paintCell(row, key);
    });
    row.cells[key] = input;
    paintCell(row, key);
    td.append(input);
    tr.append(td);
  }
  row.tr = tr;
  return tr;
}

function addRow(fileName: string, text: string, problem?: string): Row {
  const row: Row = {
    id: `C${String(nextId++).padStart(3, '0')}`,
    fileName,
    problem,
    text,
    values: emptyRecord(''),
    original: emptyRecord(''),
    flags: emptyRecord<Flag>('not_found'),
    notes: emptyRecord(''),
    edited: new Set(),
    cells: {},
  };
  if (!problem) {
    const parsed = parseResume(text, { skills });
    for (const key of FIELD_KEYS) {
      const f = parsed.fields[key];
      row.original[key] = row.values[key] = f.value;
      row.flags[key] = f.flag;
      row.notes[key] = f.note ?? '';
    }
  }
  rows.push(row);
  rowsEl.append(buildRowElement(row));
  emptyEl.hidden = true;
  return row;
}

// ------------------------------------------------------------------ actions

async function openResumes(): Promise<void> {
  openBtn.disabled = true;
  try {
    const files = await api.openResumes();
    if (files.length === 0) return;
    let last: Row | null = null;
    for (const [i, file] of files.entries()) {
      setStatus(`Reading ${file.name} (${i + 1} of ${files.length})…`);
      if (!file.bytes) {
        last = addRow(file.name, '', file.error ?? 'could not read file');
        continue;
      }
      const res = await extractText(file.name, file.bytes, libs);
      last = res.ok ? addRow(file.name, res.text) : addRow(file.name, '', res.reason);
    }
    if (last) selectRow(last);
    refreshStatus();
  } catch (e) {
    setStatus(`Something went wrong while opening files: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    openBtn.disabled = false;
  }
}

function toExportRows(): ExportRow[] {
  return rows.map((r) => ({
    id: r.id,
    fileName: r.fileName,
    problem: r.problem,
    values: r.values,
    flags: r.flags,
    edited: [...r.edited],
  }));
}

async function exportToExcel(): Promise<void> {
  if (rows.length === 0) {
    setStatus('Nothing to export yet. Open some resumes first.');
    return;
  }
  exportBtn.disabled = true;
  try {
    const bytes = await buildWorkbook(toExportRows());
    const res = await api.saveXlsx(bytes, 'resumes.xlsx');
    if (res.status === 'saved') refreshStatus(`Saved ${res.path} (${res.bytes.toLocaleString()} bytes).`);
    else if (res.status === 'refused') setStatus(`Not saved: ${res.reason}.`);
    else refreshStatus('Export cancelled.');
  } catch (e) {
    setStatus(`Could not export: ${e instanceof Error ? e.message : String(e)}`);
  } finally {
    exportBtn.disabled = false;
  }
}

function clearTable(): void {
  rows.length = 0;
  nextId = 1;
  selected = null;
  rowsEl.replaceChildren();
  emptyEl.hidden = false;
  rawTitle.textContent = 'Extracted text';
  rawText.textContent = 'Click a row to see the text that was read from that file.';
  refreshStatus();
}

// ------------------------------------------------------------------ skill list

function showSkills(): void {
  skillsText.value = skills.join('\n');
  skillsSummary.textContent = `Skill list (${skills.length}) — edit it to change what counts as a match`;
}

async function saveSkillsAndRescan(): Promise<void> {
  const list = skillsText.value.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
  try {
    await api.saveSkills(list);
  } catch (e) {
    setStatus(`Skill list not saved: ${e instanceof Error ? e.message : String(e)}`);
    return;
  }
  skills = list;
  showSkills();
  for (const row of rows) {
    if (!row.problem) applyParsed(row, parseResume(row.text, { skills }), 'skills');
  }
  refreshStatus(`Skill list saved (${skills.length}); "Matching skills" re-scanned.`);
}

async function resetSkills(): Promise<void> {
  skillsText.value = DEFAULT_SKILLS.join('\n');
  await saveSkillsAndRescan();
}

// ------------------------------------------------------------------ start

openBtn.addEventListener('click', () => void openResumes());
exportBtn.addEventListener('click', () => void exportToExcel());
$('clear').addEventListener('click', clearTable);
$('skills-save').addEventListener('click', () => void saveSkillsAndRescan());
$('skills-reset').addEventListener('click', () => void resetSkills());

showSkills();
void api.loadSkills().then((saved) => {
  if (saved && saved.length > 0) {
    skills = saved;
    showSkills();
  }
});
