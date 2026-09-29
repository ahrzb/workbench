import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

// pdf.js needs its fonts, character maps and JS image decoders as files served from the page's own
// origin (the CSP allows nothing else). Copied into the build as pdfjs/<folder>/<name>, without hashes.
// The .wasm files are not copied: the CSP has no 'wasm-unsafe-eval', pdf.js uses its JS decoders.
function copyPdfjsAssets(): Plugin {
  const pkg = fileURLToPath(new URL('./node_modules/pdfjs-dist', import.meta.url));
  const folders: Record<string, (name: string) => boolean> = {
    standard_fonts: () => true,
    cmaps: () => true,
    iccs: () => true,
    wasm: (name) => name.endsWith('_nowasm_fallback.js') || name.startsWith('LICENSE'),
  };
  return {
    name: 'copy-pdfjs-assets',
    apply: 'build',
    generateBundle() {
      for (const [folder, wanted] of Object.entries(folders)) {
        for (const name of readdirSync(path.join(pkg, folder)).filter(wanted)) {
          this.emitFile({ type: 'asset', fileName: `pdfjs/${folder}/${name}`, source: readFileSync(path.join(pkg, folder, name)) });
        }
      }
    },
  };
}

// https://vitejs.dev/config
export default defineConfig({ plugins: [copyPdfjsAssets()] });
