// Builds ONE self-contained file, out/<title>.html, from index.html + src/*.mjs + src/index.css.
// Plain Node, no dependencies:   ..\..\..\.workbench\scripts\run.cmd node build.mjs
//
// What it does:
//   1. inlines src/main.mjs and everything it imports (relative imports, `export function|const|class`
//      only) into one <script type="module">, and src/index.css into one <style>;
//   2. writes a strict Content-Security-Policy <meta> whose script-src/style-src are the sha256 hashes
//      of exactly those two blocks (never 'unsafe-inline'), and connect-src 'none';
//   3. refuses to write the file if it finds anything that loads or reaches outside the page.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const IMPORT_RE = /^import\s+(?:[\w*\s{},]+?\s+from\s+)?(['"])(.+?)\1[ \t]*;?[ \t]*$/gm;
const EXPORT_RE = /^export\s+(?=(?:async\s+function|function|const|let|class)\b)/gm;

// Line endings become \n before hashing: the browser's HTML parser does the same, so a CRLF file
// (Windows checkouts) would otherwise get a hash that does not match what the page runs.
const readText = (file) => readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

/** Reads `entry` and its relative imports, dependencies first, and returns one module's source. */
export function bundle(root, entry) {
  const done = new Set();
  const parts = [];
  function visit(rel) {
    const file = path.resolve(root, rel);
    if (done.has(file)) return;
    done.add(file);
    let source = readText(file);
    source = source.replace(IMPORT_RE, (_all, _q, spec) => {
      if (!spec.startsWith('./') && !spec.startsWith('../')) {
        throw new Error(`${rel}: "${spec}" is not a relative import. The page can only use its own files.`);
      }
      visit(path.relative(root, path.resolve(path.dirname(file), spec)));
      return '';
    });
    source = source.replace(EXPORT_RE, '');
    const left = source.match(/^\s*(export|import)\b(?!\s*\()/m);
    if (left) throw new Error(`${rel}: unsupported "${left[1]}" statement. Use one-line imports and \`export function|const|class\`.`);
    parts.push(`// ---- ${rel.replaceAll('\\', '/')}\n${source.trim()}\n`);
  }
  visit(entry);
  return parts.join('\n');
}

const sha256 = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;

/** Things the built file must not contain. Returns a list of problems (empty = fine). */
export function findProblems({ html, js, css }) {
  const problems = [];
  const markup = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
  for (const m of markup.matchAll(/<(link|iframe|frame|object|embed|base|form|img|audio|video|source)\b/gi)) {
    problems.push(`index.html has <${m[1]}>: nothing may be loaded from outside the page (pictures go in as data: URLs in CSS/JS)`);
  }
  for (const m of markup.matchAll(/\s(src|href|srcset|action|formaction|data|poster)\s*=/gi)) {
    problems.push(`index.html has a ${m[1]}= attribute; there must be no reference to another file or address`);
  }
  for (const m of markup.matchAll(/\s(on[a-z]+|style)\s*=/gi)) {
    problems.push(`index.html has an inline ${m[1]}= attribute; the policy forbids it (use addEventListener / CSS classes)`);
  }
  if (/<script\b/i.test(html)) problems.push('index.html has its own <script>; put code in src/');
  if (/<style\b/i.test(html)) problems.push('index.html has its own <style>; put CSS in src/index.css');
  // Comments may talk about url() or import(); only code is checked.
  const jsCode = js.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/@import|url\((?!\s*['"]?data:)/i.test(cssCode)) problems.push('CSS has @import or url(): only data: URLs may be used');
  const network = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|Worker|SharedWorker|eval)\s*\(|\bnew\s+(Function|WebSocket|EventSource|Worker|XMLHttpRequest)\b|\bimport\s*\(/;
  const bad = jsCode.match(network);
  if (bad) problems.push(`JS uses "${bad[0].trim()}": the page must not reach the network or run text as code`);
  for (const [label, text] of [['JS', js], ['CSS', css]]) {
    if (/<\/script|<\/style|<!--/i.test(text)) problems.push(`${label} contains "</script", "</style" or "<!--", which would end the inline block`);
    if (/\.style\.cssText|setAttribute\(\s*['"]style['"]/.test(text)) problems.push(`${label} sets a style attribute; the policy forbids it`);
  }
  return problems;
}

/** Warnings only: web addresses in the source are not loaded, but the user should know they are there. */
export function findAddresses({ js, css }) {
  return [...new Set([...(js + css).matchAll(/https?:\/\/[^\s'"`)<>]+/g)].map((m) => m[0]))];
}

const TRY_MARKER = 'const TRYING_OUT = false;';

/** `tryingOut`: builds `out/<title> (trying out).html`, a copy with its own practice storage (see main.mjs). */
export function build({ root = here, outDir = path.join(here, 'out'), tryingOut = false } = {}) {
  const template = readText(path.join(root, 'index.html'));
  for (const marker of ['build:csp', 'build:css', 'build:js']) {
    const n = template.split(`<!-- ${marker} -->`).length - 1;
    if (n !== 1) throw new Error(`index.html must contain <!-- ${marker} --> exactly once (found ${n})`);
  }
  const title = template.match(/<title>([^<]*)<\/title>/)?.[1].trim();
  if (!title) throw new Error('index.html needs a <title>: it names the built file and the backup files');
  const fileName = `${title.replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-').trim()}${tryingOut ? ' (trying out)' : ''}.html`;

  let js = bundle(root, 'src/main.mjs');
  if (tryingOut) {
    if (js.split(TRY_MARKER).length !== 2) throw new Error(`src/main.mjs must contain "${TRY_MARKER}" exactly once for --try`);
    js = js.replace(TRY_MARKER, 'const TRYING_OUT = true;');
  }
  const css = readText(path.join(root, 'src/index.css'));

  const problems = findProblems({ html: template, js, css });
  // Also catches two modules that declare the same top-level name, and any other syntax error.
  const scratch = mkdtempSync(path.join(tmpdir(), 'wb-html-'));
  try {
    writeFileSync(path.join(scratch, 'bundle.mjs'), js);
    const check = spawnSync(process.execPath, ['--check', path.join(scratch, 'bundle.mjs')], { encoding: 'utf8' });
    if (check.status !== 0) problems.push(`the bundled JS does not parse:\n${check.stderr.trim()}`);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  if (problems.length > 0) throw new Error(`Not built:\n- ${problems.join('\n- ')}`);

  const csp = [
    "default-src 'none'",
    `script-src ${sha256(js)}`,
    `style-src ${sha256(css)}`,
    'img-src data:',
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
  ].join('; ');

  const html = template
    .replace('<!-- build:csp -->', () => `<meta http-equiv="Content-Security-Policy" content="${csp}" />`)
    .replace('<!-- build:css -->', () => `<style>${css}</style>`)
    .replace('<!-- build:js -->', () => `<script type="module">${js}</script>`);

  mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, fileName);
  writeFileSync(file, html);
  return { file, html, csp, js, css, addresses: findAddresses({ js, css }) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = build({ tryingOut: process.argv.includes('--try') });
    for (const a of result.addresses) console.warn(`Note: the source mentions ${a} (it is text only, nothing is loaded from it)`);
    console.log(`Built ${result.file} (${Buffer.byteLength(result.html)} bytes)`);
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
