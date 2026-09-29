// RENDERER ONLY (sandboxed page). PDF -> text layer and page pictures with pdf.js. Nothing here
// touches the disk or the network: the bytes come from main (Open dialog) and the pictures go back
// to main through window.api.aiReadPage. The PDF is parsed HERE, never in main (untrusted format).
//
// Works under the strict CSP: the worker comes from 'self' (Vite ?url import), there is no eval (pdf.js 6
// has none), no WebAssembly (useWasm is off; pdf.js falls back to its JS decoders), and the fonts and
// character maps come from the page's own origin (copied there by copyPdfjsAssets in vite.renderer.config.mts).
import * as pdfjs from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { AI_MAX_PNG_BYTES, AI_MAX_PNG_SIDE } from './shared.ts';
import { toTextLayer } from './text-layer.ts';
import type { TextLayer } from './text-layer.ts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

const ASSETS = new URL('pdfjs/', document.baseURI).href;

export type PdfDocument = PDFDocumentProxy;

/** Opens a PDF. The array is handed to the worker and cannot be used afterwards. Throws an Error with a plain message. */
export async function openPdf(bytes: Uint8Array): Promise<PdfDocument> {
  try {
    return await pdfjs.getDocument({
      data: bytes,
      useWasm: false,
      enableXfa: false,
      standardFontDataUrl: `${ASSETS}standard_fonts/`,
      cMapUrl: `${ASSETS}cmaps/`,
      cMapPacked: true,
      iccUrl: `${ASSETS}iccs/`,
      wasmUrl: `${ASSETS}wasm/`,
    }).promise;
  } catch (e) {
    const name = (e as { name?: string }).name;
    if (name === 'PasswordException') throw new Error('This PDF is protected with a password.');
    if (name === 'InvalidPDFException') throw new Error('This file is not a readable PDF.');
    throw new Error(`Could not open this PDF: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export function closePdf(doc: PdfDocument): Promise<void> {
  return doc.loadingTask.destroy();
}

interface Item {
  str: string;
  hasEOL: boolean;
  width: number;
  height: number;
  transform: number[];
}

/** One page's text in reading order: a space where there is a visible gap, a newline at each line end. */
function pageText(items: unknown[]): string {
  let out = '';
  let prev: Item | undefined;
  for (const it of items) {
    if (typeof (it as Item).str !== 'string') continue; // marked-content markers
    const cur = it as Item;
    if (prev && !/\s$/.test(out) && !/^\s/.test(cur.str)) {
      const sameLine = Math.abs(cur.transform[5] - prev.transform[5]) < Math.max(prev.height, 1) * 0.5;
      const gap = cur.transform[4] - (prev.transform[4] + prev.width);
      if (!sameLine || gap > Math.max(prev.height, 1) * 0.15) out += sameLine ? ' ' : '\n';
    }
    out += cur.str;
    if (cur.hasEOL) out += '\n';
    prev = cur;
  }
  return out;
}

/**
 * The text a PDF already contains. `enough` says every page has real text: code can read it and the AI
 * (slow, uses the user's allowance) can be skipped. Pages with `hasText[i] === false` are pictures.
 * The text layer can hold text you cannot see on the page: it is data like any other, never instructions.
 */
export async function readTextLayer(doc: PdfDocument): Promise<TextLayer> {
  const pages: string[] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    pages.push(pageText((await page.getTextContent()).items));
    page.cleanup();
  }
  return toTextLayer(pages);
}

/**
 * One page as PNG bytes for aiReadPage: white background, longest side about `targetSide` pixels
 * (1600 reads small print well and costs about 9k tokens). Shrinks by itself if the PNG would be over the size cap.
 */
export async function renderPageToPng(doc: PdfDocument, pageNumber: number, targetSide = 1600): Promise<Uint8Array> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    let side = Math.min(targetSide, AI_MAX_PNG_SIDE);
    for (let attempt = 0; attempt < 5; attempt++) {
      const viewport = page.getViewport({ scale: side / Math.max(base.width, base.height) });
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(viewport.width));
      canvas.height = Math.max(1, Math.round(viewport.height));
      try {
        await page.render({ canvas, viewport, background: '#ffffff' }).promise;
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
        if (blob && blob.size <= AI_MAX_PNG_BYTES) return new Uint8Array(await blob.arrayBuffer());
      } finally {
        canvas.width = 0; // frees the pixels now
        canvas.height = 0;
      }
      side = Math.round(side * 0.7);
    }
    throw new Error(`Page ${pageNumber} is too detailed to send.`);
  } finally {
    page.cleanup();
  }
}
