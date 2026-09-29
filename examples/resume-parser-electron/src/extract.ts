// Text extraction from PDF / DOCX / TXT bytes. The libraries are injected, so the
// same code runs in the sandboxed renderer (pdf.js + mammoth browser build, see
// libs.ts) and in the node tests (pdf.js legacy build + the same mammoth bundle).
// Uses relative imports WITH extensions and no TypeScript-only syntax, so node can
// run it directly (type stripping).

export type ExtractResult = { ok: true; text: string } | { ok: false; reason: string };

interface PdfTextItem {
  str?: string;
  transform?: number[];
  width?: number;
  height?: number;
}

/** The small part of the pdf.js API we use. */
export interface PdfjsLike {
  getDocument(src: { data: Uint8Array }): {
    promise: Promise<{
      numPages: number;
      getPage(n: number): Promise<{ getTextContent(): Promise<{ items: PdfTextItem[] }> }>;
    }>;
    destroy(): Promise<void>;
  };
}

/** The small part of the mammoth API we use. */
export interface MammothLike {
  extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }>;
}

export interface ExtractLibs {
  pdfjs: PdfjsLike;
  mammoth: MammothLike;
}

/** Fewer visible characters than this means "there is no real text layer". */
const MIN_TEXT_CHARS = 20;

const NO_TEXT: ExtractResult = { ok: false, reason: "no text found (scanned?)" };

export async function extractText(fileName: string, bytes: Uint8Array, libs: ExtractLibs): Promise<ExtractResult> {
  const ext = fileName.toLowerCase().split(".").pop() ?? "";
  let text: string;
  try {
    if (ext === "pdf") text = await pdfText(bytes, libs.pdfjs);
    else if (ext === "docx") text = await docxText(bytes, libs.mammoth);
    else if (ext === "txt") text = txtText(bytes);
    else return { ok: false, reason: `unsupported file type ".${ext}" (use .pdf, .docx or .txt)` };
  } catch (e) {
    return { ok: false, reason: `could not read file: ${e instanceof Error ? e.message : String(e)}` };
  }
  return text.replace(/\s/g, "").length < MIN_TEXT_CHARS ? NO_TEXT : { ok: true, text };
}

// ------------------------------------------------------------------ TXT

function txtText(bytes: Uint8Array): string {
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    text = new TextDecoder("windows-1252").decode(bytes); // old Notepad / Word "ANSI" files
  }
  return text.replace(/^\uFEFF/, "");
}

// ------------------------------------------------------------------ DOCX

async function docxText(bytes: Uint8Array, mammoth: MammothLike): Promise<string> {
  const copy = bytes.slice(); // mammoth must not see (or detach) a view onto a larger buffer
  const out = await mammoth.extractRawText({ arrayBuffer: copy.buffer as ArrayBuffer });
  return out.value;
}

// ------------------------------------------------------------------ PDF

async function pdfText(bytes: Uint8Array, pdfjs: PdfjsLike): Promise<string> {
  // pdf.js transfers the buffer to its worker, so hand it a copy.
  const task = pdfjs.getDocument({ data: bytes.slice() });
  try {
    const doc = await task.promise;
    const pages: string[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      pages.push(itemsToLines(content.items).join("\n"));
    }
    return pages.join("\n\n");
  } finally {
    await task.destroy();
  }
}

interface Frag {
  x: number;
  y: number;
  width: number;
  size: number;
  str: string;
}

/**
 * Rebuild visual lines from pdf.js text items: group by baseline, sort left to right,
 * and turn horizontal gaps into spaces. A big gap (right-aligned dates, table columns)
 * becomes TWO spaces so the parser can tell a layout gap from a word gap. pdf.js
 * reports such a gap as one wide whitespace item, so those count as gaps too.
 */
export function itemsToLines(items: PdfTextItem[]): string[] {
  const frags: Frag[] = [];
  for (const it of items) {
    if (typeof it.str !== "string" || !it.transform) continue; // marked-content markers have no text
    const size = Math.hypot(it.transform[0], it.transform[1]) || it.height || 10;
    frags.push({ x: it.transform[4], y: it.transform[5], width: it.width ?? 0, size, str: it.str });
  }

  const rows: Frag[][] = [];
  for (const f of frags) {
    const row = rows.find((r) => Math.abs(r[0].y - f.y) <= Math.max(2, f.size * 0.3));
    if (row) row.push(f);
    else rows.push([f]);
  }
  rows.sort((a, b) => b[0].y - a[0].y); // top of the page first

  const lines: string[] = [];
  for (const row of rows) {
    row.sort((a, b) => a.x - b.x);
    let line = "";
    let prevEnd = Number.NaN;
    let pending = ""; // "" | " " | "  " from whitespace-only items
    for (const f of row) {
      if (f.str.trim() === "") {
        if (f.str !== "") pending = f.width > f.size * 1.0 ? "  " : pending || " ";
        prevEnd = Math.max(prevEnd || 0, f.x + f.width);
        continue;
      }
      if (line !== "") {
        const gap = f.x - prevEnd;
        let sep = pending;
        if (gap > f.size * 1.0) sep = "  ";
        else if (sep === "" && gap > f.size * 0.12) sep = " ";
        if (sep === " " && (line.endsWith(" ") || f.str.startsWith(" "))) sep = "";
        line += sep;
      }
      line += f.str;
      prevEnd = f.x + f.width;
      pending = "";
    }
    line = line.replace(/\s+$/, "");
    if (line !== "") lines.push(line);
  }
  return lines;
}
