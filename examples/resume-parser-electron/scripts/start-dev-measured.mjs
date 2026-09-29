// Launches `npm start` (Forge + Vite dev server + Electron, debugging port 9333), and measures
// wall time from spawn to "first window has rendered the table header" (polled over CDP).
// The dev server keeps running afterwards (log: %TEMP%\resume-parser-dev.log).
import { spawn } from 'node:child_process';
import { openSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { connect } from './cdp.mjs';

const log = openSync(path.join(tmpdir(), 'resume-parser-dev.log'), 'w');
const t0 = performance.now();
const child = spawn('cmd', ['/c', 'scripts\\dev-start.cmd'], { detached: true, stdio: ['ignore', log, log], windowsHide: true });
child.unref();
console.log('spawned pid', child.pid);
const c = await connect(9333, 120000);
for (;;) {
  try {
    if ((await c.evaluate("!!document.getElementById('open') && document.readyState === 'complete'")) === true) break;
  } catch {}
  await new Promise((r) => setTimeout(r, 20));
}
console.log('time to first rendered window (dev, cold vite server):', ((performance.now() - t0) / 1000).toFixed(2), 's');
c.close();
process.exit(0);
