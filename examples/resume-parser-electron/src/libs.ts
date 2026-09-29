// Browser wiring for the extraction libraries. The pdf.js worker is a local asset that Vite
// bundles next to the page (`?url`), so there is no CDN and the CSP can stay `worker-src 'self'`.
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import mammoth from 'mammoth/mammoth.browser.js';
import type { ExtractLibs } from './extract.ts';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const libs: ExtractLibs = {
  pdfjs: pdfjs as unknown as ExtractLibs['pdfjs'],
  mammoth: mammoth as ExtractLibs['mammoth'],
};
