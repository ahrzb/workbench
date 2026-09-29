// Main-process change loop. Forge's Vite plugin rebuilds the main bundle on save, but does not restart
// Electron by itself: you type `rs` in the terminal that runs `npm start`. This script plays that
// terminal: it starts `npm start` with a piped stdin and measures
//   rebuild = file write -> new .vite/build/main.js contains the edit
//   restart = writing `rs` -> new window reports the new width (over CDP)
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { connect } from './cdp.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const src = 'src/main.ts';
const original = readFileSync(src, 'utf8');
process.on('exit', () => writeFileSync(src, original));

const log = openSync(path.join(tmpdir(), 'resume-parser-dev-main.log'), 'w');
const child = spawn('cmd', ['/c', 'scripts\\dev-start.cmd'], { stdio: ['pipe', log, log], windowsHide: true });
let c = await connect(9333, 120000);
console.log('window 1 up, innerWidth', await c.evaluate('innerWidth'));
c.close();

async function widthNow() {
  try {
    const p = await connect(9333, 300);
    const w = await p.evaluate('innerWidth');
    p.close();
    return w;
  } catch {
    return null;
  }
}

const out = [];
for (const w of [1400, 1450, 1500]) {
  const t0 = performance.now();
  writeFileSync(src, original.replace('width: 1500,', `width: ${w},`));
  while (!readFileSync('.vite/build/main.js', 'utf8').includes(`width: ${w},`)) await sleep(10);
  const tBuild = performance.now();
  await sleep(300); // let the plugin finish its own bookkeeping
  const tRs = performance.now();
  child.stdin.write('rs\n');
  let tUp = NaN;
  const expected = w - 14;
  while (performance.now() - tRs < 60000) {
    if ((await widthNow()) === expected) { tUp = performance.now(); break; }
    await sleep(30);
  }
  out.push({ width: w, rebuildMs: Math.round(tBuild - t0), restartMs: Math.round(tUp - tRs - 0), totalMsIncl300Wait: Math.round(tUp - t0) });
  console.log(JSON.stringify(out.at(-1)));
  await sleep(1000);
}
writeFileSync(src, original);
try { execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F']); } catch {}
process.exit(0);
