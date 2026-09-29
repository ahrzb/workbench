// Watches the dev window over CDP. Reports how long the gap is between the old Electron
// process going away (debug port stops answering) and the new window having rendered.
import { connect } from './cdp.mjs';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const isUp = async () => {
  try {
    const c = await connect(9333, 200);
    const ok = (await c.evaluate("!!document.getElementById('open') && document.readyState === 'complete'")) === true;
    const w = await c.evaluate('innerWidth');
    c.close();
    return ok ? w : null;
  } catch { return null; }
};
const first = await isUp();
console.log('initial innerWidth', first);
let tDead;
for (;;) { if ((await isUp()) === null) { tDead = performance.now(); break; } await sleep(10); }
console.log('old window gone');
let w;
for (;;) { w = await isUp(); if (w !== null) break; await sleep(10); }
console.log('restart gap (old process gone -> new window rendered):', Math.round(performance.now() - tDead), 'ms; new innerWidth', w);
process.exit(0);
