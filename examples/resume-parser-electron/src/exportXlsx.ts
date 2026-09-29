// Builds a NEW .xlsx workbook in memory (ExcelJS). It never opens or modifies a resume.
// Pure: rows in, bytes out. Used by the renderer and by the node tests.
import ExcelJS from "exceljs";
import type { FieldKey, Flag } from "./parser.ts";

export const FIELD_KEYS: FieldKey[] = ["name", "email", "phone", "linkedin", "github", "otherLinks", "skills", "years"];

export const FIELD_LABELS: Record<FieldKey, string> = {
  name: "Name",
  email: "Email",
  phone: "Phone",
  linkedin: "LinkedIn",
  github: "GitHub",
  otherLinks: "Other links",
  skills: "Matching skills",
  years: "Years of experience",
};

export interface ExportRow {
  id: string;
  fileName: string;
  /** Set when the file could not be read (scanned PDF, corrupt file, ...). */
  problem?: string;
  values: Record<FieldKey, string>;
  flags: Record<FieldKey, Flag>;
  /** Fields the user typed over: they are trusted, so they are not listed as "needs checking". */
  edited: FieldKey[];
}

function needsChecking(row: ExportRow): string {
  if (row.problem) return row.problem;
  return FIELD_KEYS.filter((k) => !row.edited.includes(k) && row.flags[k] !== "found")
    .map((k) => `${FIELD_LABELS[k]} (${row.flags[k] === "uncertain" ? "uncertain" : "not found"})`)
    .join(", ");
}

const TEXT = "@"; // Excel "Text" format: keeps leading zeros and "+" in IDs and phone numbers

export async function buildWorkbook(rows: ExportRow[]): Promise<Uint8Array> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Resume Parser";
  const ws = wb.addWorksheet("Resumes", { views: [{ state: "frozen", ySplit: 1 }] });

  ws.columns = [
    { header: "ID", key: "id", width: 9, style: { numFmt: TEXT } },
    { header: "File", key: "file", width: 30 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Phone", key: "phone", width: 22, style: { numFmt: TEXT } },
    { header: "LinkedIn", key: "linkedin", width: 36 },
    { header: "GitHub", key: "github", width: 30 },
    { header: "Other links", key: "otherLinks", width: 36 },
    { header: "Matching skills", key: "skills", width: 44 },
    { header: "Years of experience", key: "years", width: 12 },
    { header: "Needs checking", key: "check", width: 44 },
  ];

  const header = ws.getRow(1);
  header.font = { bold: true };
  header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8EEF9" } };
  header.alignment = { vertical: "middle", wrapText: true };

  for (const r of rows) {
    const years = Number(r.values.years.replace(",", "."));
    const row = ws.addRow({
      id: r.id,
      file: r.fileName,
      name: r.values.name,
      email: r.values.email,
      phone: r.values.phone,
      linkedin: r.values.linkedin,
      github: r.values.github,
      otherLinks: r.values.otherLinks,
      skills: r.values.skills,
      // a real number when the value is numeric, so Excel can sum/sort it
      years: r.values.years.trim() !== "" && Number.isFinite(years) ? years : r.values.years,
      check: needsChecking(r),
    });
    // ExcelJS gives strings a "General" cell type; force the text format on ID and phone cells.
    row.getCell("id").numFmt = TEXT;
    row.getCell("phone").numFmt = TEXT;
  }

  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: Math.max(1, rows.length + 1), column: 11 } };

  const out = await wb.xlsx.writeBuffer();
  return new Uint8Array(out as ArrayBuffer);
}
