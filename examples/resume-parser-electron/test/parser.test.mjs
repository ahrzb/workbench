// Runs the real extraction (pdf.js legacy build, mammoth, TextDecoder) + parser + xlsx export over
// the synthetic samples. Run: npm test   (node >= 22.18 strips TypeScript types natively)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import mammoth from "mammoth/mammoth.browser.js"; // the same bundle the app ships
import ExcelJS from "exceljs";
import JSZip from "jszip";
import { parseResume } from "../src/parser.ts";
import { extractText } from "../src/extract.ts";
import { buildWorkbook, FIELD_KEYS } from "../src/exportXlsx.ts";
import { loadSkills, saveSkills, sanitizeSkills } from "../src/skillStore.ts";

const libs = { pdfjs, mammoth };
const NOW = new Date("2026-09-29T12:00:00Z"); // "Present" resolves to Sep 2026
const sample = (name) => new Uint8Array(readFileSync(fileURLToPath(new URL(`../samples/${name}`, import.meta.url))));

async function parseSample(name) {
  const res = await extractText(name, sample(name), libs);
  assert.equal(res.ok, true, `extraction failed for ${name}: ${res.reason}`);
  return { text: res.text, parsed: parseResume(res.text, { now: NOW }) };
}

const skillSet = (f) => f.value.split(", ").sort();

test("PDF sample: Sofía Álvarez (header row, right-aligned dates, accents)", async () => {
  const { text, parsed } = await parseSample("resume-1-sofia-alvarez.pdf");
  assert.match(text, /Brightside Foods {2}Mar 2021 - Present/); // right-aligned dates keep a 2-space layout gap
  const f = parsed.fields;
  assert.deepEqual(f.name, { value: "Sofía Álvarez", flag: "found", note: undefined });
  assert.equal(f.email.value, "sofia.alvarez@example.com");
  assert.equal(f.email.flag, "found");
  assert.equal(f.phone.value, "+1 (555) 010-4477");
  assert.equal(f.phone.flag, "found");
  assert.equal(f.linkedin.value, "linkedin.com/in/sofia-alvarez-demo");
  assert.equal(f.linkedin.flag, "found");
  assert.equal(f.github.value, "github.com/sofia-demo");
  assert.equal(f.github.flag, "found");
  assert.equal(f.otherLinks.flag, "not_found");
  assert.deepEqual(skillSet(f.skills), ["Communication", "Copywriting", "Customer Service", "Excel", "PowerPoint", "SEO", "Social Media"]);
  // Mar 2021 - Present (66 months) + Jun 2018 - Feb 2021 (32 months) = 98 months -> 8.17 -> 8. The 2014 - 2018 education range must NOT count.
  assert.equal(f.years.value, "8");
  assert.equal(f.years.flag, "found");
  assert.deepEqual(parsed.sections, { experience: true, education: true, skills: true });
});

test("DOCX sample: DANIEL OKAFOR (ALL CAPS name, international phone, separators)", async () => {
  const { parsed } = await parseSample("resume-2-daniel-okafor.docx");
  const f = parsed.fields;
  assert.equal(f.name.value, "Daniel Okafor");
  assert.equal(f.name.flag, "found");
  assert.match(f.name.note, /ALL CAPS/);
  assert.equal(f.email.value, "daniel.okafor@example.com");
  assert.equal(f.phone.value, "+234 802 555 0147");
  assert.equal(f.phone.flag, "found");
  assert.equal(f.linkedin.value, "https://linkedin.com/in/daniel-okafor-demo");
  assert.equal(f.github.flag, "not_found");
  assert.equal(f.otherLinks.value, "https://danielokafor.example.org");
  assert.deepEqual(skillSet(f.skills), ["Accounting", "Bookkeeping", "Excel", "Leadership", "Payroll", "QuickBooks", "SAP"]);
  // Jan 2016 - Present (128) + 03/2012 - 12/2015 (45) = 173 months = 14.4 -> 14.5
  assert.equal(f.years.value, "14.5");
  assert.equal(f.years.flag, "found");
});

test("TXT sample: Priya Raman (contact line before the name, stated years)", async () => {
  const { parsed } = await parseSample("resume-3-priya-raman.txt");
  const f = parsed.fields;
  assert.equal(f.name.value, "Priya Raman");
  assert.equal(f.name.flag, "found");
  assert.equal(f.email.value, "priya.raman@example.com");
  assert.equal(f.phone.value, "+91 98765 43210");
  assert.equal(f.linkedin.flag, "not_found");
  assert.equal(f.github.value, "github.com/priyaraman-demo");
  assert.equal(f.otherLinks.value, "www.priyaraman.example.net/portfolio");
  assert.deepEqual(skillSet(f.skills), ["Agile", "Data Analysis", "Excel", "Git", "Power BI", "Python", "SQL", "Tableau"]);
  assert.equal(f.years.value, "6");
  assert.equal(f.years.flag, "found");
});

test("edited skill list is honoured (case-insensitive, punctuation-safe, no substring hits)", () => {
  const text = "Worked with c++, C#, .NET and node.js. Used MySQL and JavaScript daily.";
  const f = parseResume(text, { skills: ["C++", "C#", ".NET", "Node.js", "SQL", "Java"], now: NOW }).fields.skills;
  assert.deepEqual(f.value.split(", "), ["C++", "C#", ".NET", "Node.js"]); // MySQL != SQL, JavaScript != Java
});

test("missing and ambiguous data is flagged instead of guessed", () => {
  const empty = parseResume("", { now: NOW }).fields;
  for (const key of Object.keys(empty)) assert.equal(empty[key].flag, "not_found", key);

  const two = parseResume("Jo Bloggs\na@example.com\nb@example.org\nCall +44 20 7946 0958 or +44 161 496 0123\n", { now: NOW }).fields;
  assert.equal(two.email.flag, "uncertain");
  assert.equal(two.phone.flag, "uncertain");

  const dates = parseResume("Ann Lee\nEmployed 2019 - 2023\nRef 2020-05-17\n", { now: NOW }).fields;
  assert.equal(dates.phone.flag, "not_found"); // year ranges and ISO dates are not phone numbers
  assert.equal(dates.years.value, ""); // date range but no Experience heading: not summed
  assert.equal(dates.years.flag, "uncertain");
});

test("regressions found on real-world resumes: prose line is not a name, '(+49) ...' keeps its bracket", () => {
  const f = parseResume("I'm a data person\nI'm Jane Doe\nJane Doe\nMobile (+49) 151 2496 0924\n", { now: NOW }).fields;
  assert.equal(f.name.value, "Jane Doe");
  assert.equal(f.phone.value, "(+49) 151 2496 0924");
  assert.equal(f.phone.flag, "found");
});

test("image-only / empty files report 'no text found (scanned?)'", async () => {
  const empty = await extractText("scan.txt", new TextEncoder().encode("  \n "), libs);
  assert.deepEqual(empty, { ok: false, reason: "no text found (scanned?)" });
  // a real PDF that contains only an image (no text operators, no fonts)
  const scanned = await extractText("scanned-example.pdf", sample("scanned-example.pdf"), libs);
  assert.deepEqual(scanned, { ok: false, reason: "no text found (scanned?)" });
});

test("corrupt and unsupported files give a readable reason instead of throwing", async () => {
  const junk = new TextEncoder().encode("this is definitely not a pdf or a docx file, just some bytes");
  for (const name of ["broken.pdf", "broken.docx"]) {
    const res = await extractText(name, junk, libs);
    assert.equal(res.ok, false, name);
    assert.match(res.reason, /^could not read file: .+/, name);
  }
  const truncated = sample("resume-1-sofia-alvarez.pdf").slice(0, 300);
  const res = await extractText("cut.pdf", truncated, libs);
  assert.equal(res.ok, false);
  assert.match(res.reason, /could not read file|no text found/);
  const other = await extractText("photo.png", junk, libs);
  assert.match(other.reason, /unsupported file type/);
});

test("TXT: BOM is removed and windows-1252 bytes are decoded", async () => {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode("Zoë Kraviz\nzoe@example.com\nExcel and Python\n")]);
  const a = await extractText("a.txt", bom, libs);
  assert.equal(a.ok && a.text.startsWith("Zoë"), true);
  const ansi = new Uint8Array([...new TextEncoder().encode("Ren"), 0xe9, ...new TextEncoder().encode("e Dupont\nrenee@example.com\nExcel and SQL\n")]);
  const b = await extractText("b.txt", ansi, libs);
  assert.equal(b.ok && b.text.startsWith("Renée"), true);
});

test("xlsx export: new workbook, bold frozen header, ID and phone are text cells (ExcelJS re-read + raw XML)", async () => {
  const rows = [];
  for (const [i, name] of ["resume-1-sofia-alvarez.pdf", "resume-2-daniel-okafor.docx", "resume-3-priya-raman.txt"].entries()) {
    const { parsed } = await parseSample(name);
    const values = Object.fromEntries(FIELD_KEYS.map((k) => [k, parsed.fields[k].value]));
    const flags = Object.fromEntries(FIELD_KEYS.map((k) => [k, parsed.fields[k].flag]));
    rows.push({ id: `C00${i + 1}`, fileName: name, values, flags, edited: [] });
  }
  rows[0].values.name = "Sofía Álvarez (edited)";
  rows[0].edited = ["name"];
  rows.push({ id: "C004", fileName: "scanned-example.pdf", problem: "no text found (scanned?)", values: Object.fromEntries(FIELD_KEYS.map((k) => [k, ""])), flags: Object.fromEntries(FIELD_KEYS.map((k) => [k, "not_found"])), edited: [] });

  const bytes = await buildWorkbook(rows);
  const dir = mkdtempSync(path.join(tmpdir(), "resume-parser-xlsx-"));
  try {
    const file = path.join(dir, "out.xlsx");
    writeFileSync(file, bytes);

    const wb = new ExcelJS.Workbook();
    await wb.xlsx.readFile(file);
    const ws = wb.getWorksheet("Resumes");
    assert.equal(ws.rowCount, 5);
    assert.equal(ws.views[0].state, "frozen");
    assert.equal(ws.views[0].ySplit, 1);
    for (let c = 1; c <= 11; c++) assert.equal(ws.getCell(1, c).font.bold, true, `header col ${c}`);
    assert.equal(ws.getCell("A2").value, "C001");
    assert.equal(ws.getCell("A2").type, ExcelJS.ValueType.String);
    assert.equal(ws.getCell("A2").numFmt, "@");
    assert.equal(ws.getCell("E2").value, "+1 (555) 010-4477");
    assert.equal(ws.getCell("E2").numFmt, "@");
    assert.equal(ws.getCell("E3").value, "+234 802 555 0147");
    assert.equal(ws.getCell("C2").value, "Sofía Álvarez (edited)");
    assert.deepEqual([ws.getCell("J2").value, ws.getCell("J3").value, ws.getCell("J4").value], [8, 14.5, 6]); // numbers
    assert.equal(ws.getCell("K2").value, "Other links (not found)"); // the edited name is trusted; other links are absent in this resume
    assert.equal(ws.getCell("K5").value, "no text found (scanned?)");

    // independent check of the raw OOXML, without ExcelJS
    const zip = await JSZip.loadAsync(readFileSync(file));
    const sheet = await zip.file("xl/worksheets/sheet1.xml").async("string");
    assert.match(sheet, /<pane [^>]*ySplit="1"[^>]*state="frozen"/);
    assert.match(sheet, /<autoFilter ref="A1:K5"/);
    const styles = await zip.file("xl/styles.xml").async("string");
    assert.match(styles, /<b\/>/); // a bold font exists
    assert.match(styles, /numFmtId="49"/); // built-in Text format "@"
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("skill list persists as JSON and rejects bad input", async () => {
  const dir = mkdtempSync(path.join(tmpdir(), "resume-parser-skills-"));
  try {
    assert.equal(await loadSkills(dir), null); // nothing saved yet -> defaults
    await saveSkills(path.join(dir, "nested"), [" Excel ", "excel", "C++", "", "Power BI"]);
    assert.deepEqual(await loadSkills(path.join(dir, "nested")), ["Excel", "C++", "Power BI"]);
    writeFileSync(path.join(dir, "skills.json"), "{ not json");
    assert.equal(await loadSkills(dir), null); // damaged file -> defaults, no crash
    assert.throws(() => sanitizeSkills("Excel"), /list of text/);
    assert.throws(() => sanitizeSkills(["x".repeat(81)]), /too long/);
    await assert.rejects(saveSkills(dir, [1, 2]), /list of text/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
