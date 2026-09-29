// Measures dev-loop latency against a running `npm start` (started with --remote-debugging-port=9333).
//  css:      edit a CSS variable in src/index.css  -> Vite HMR (no page reload)
//  renderer: edit a string in src/renderer.ts      -> the module has no HMR boundary, so Vite reloads the page
//  main:     edit the window width in src/main.ts  -> Forge rebuilds the main bundle and restarts Electron
// Each time is: fs write -> observed change in the real window, polled every 20 ms over CDP.
// All edited files are restored at the end.
import { readFileSync, writeFileSync } from 'node:fs';
import { connect } from './cdp.mjs';

const files = { css: 'src/index.css', renderer: 'src/renderer.ts', main: 'src/main.ts' };
const restore = () => { for (const [k, f] of Object.entries(files)) writeFileSync(f, original[k]); };
process.on("exit", restore);
const original = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readFileSync(f, 'utf8')]));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function until(c, expr, expected, timeoutMs = 60000) {
  const t0 = performance.now();
  while (performance.now() - t0 < timeoutMs) {
    try { if ((await c.evaluate(expr)) === expected) return performance.now() - t0; } catch {}
    await sleep(20);
  }
  return NaN;
}

let c = await connect(9333, 30000);
const results = { css: [], renderer: [], main: [] };

for (const [i, v] of ['#1d4ed9', '#1d4eda', '#1d4edb'].entries()) {
  writeFileSync(files.css, original.css.replace('--blue: #1d4ed8;', `--blue: ${v};`));
  const ms = await until(c, "getComputedStyle(document.documentElement).getPropertyValue('--blue').trim()", v);
  results.css.push(ms); console.log('css HMR', i + 1, ms.toFixed(0), 'ms');
  await sleep(500);
}

for (const [i, v] of ['A', 'B', 'C'].entries()) {
  writeFileSync(files.renderer, original.renderer.replace('Skill list (', `Skill list ${v} (`));
  const ms = await until(c, "document.getElementById('skills-summary').textContent.slice(0, 14)", `Skill list ${v} (`);
  results.renderer.push(ms); console.log('renderer TS edit (page reload)', i + 1, ms.toFixed(0), 'ms');
  await sleep(800);
  c.close(); c = await connect(9333, 30000);
}

for (const [i, w] of [1400, 1450, 1500].entries()) {
  const expected = w - 14; // window width minus the frame -> CSS px of the page, at any DPI (DIP units)
  writeFileSync(files.main, original.main.replace('width: 1500,', `width: ${w},`));
  const t0 = performance.now();
  // the old process dies, a new one opens the debugging port again; poll for the new width
  let ms = NaN;
  while (performance.now() - t0 < 90000) {
    try {
      const probe = await connect(9333, 200);
      const width = await probe.evaluate('innerWidth');
      probe.close();
      if (width === expected || width === w - 16 || width === w - 14) { ms = performance.now() - t0; break; }
    } catch {}
    await sleep(50);
  }
  results.main.push(ms); console.log('main-process restart', i + 1, ms.toFixed(0), 'ms');
  await sleep(1500);
}

for (const [k, f] of Object.entries(files)) writeFileSync(f, original[k]);
console.log(JSON.stringify(results));
