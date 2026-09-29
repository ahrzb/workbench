// NOT part of `npm test` (it makes a real AI call and uses the user's allowance). Run by hand, on a made-up
// sample only:  ..\..\..\.workbench\scripts\run.cmd node test/live-ai-read.mjs <page.png> [path\to\codex.exe]
// Prints what came back, the checks' verdict, tokens and seconds. Default program: the one in node_modules.
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { AI_FIELDS } from '../src/ai-fields.ts';
import { AI_MODEL, aiReadImage, codexExePath } from '../src/ai-read.ts';
import { checkInvoice } from '../src/checks.ts';

const [png, exe] = process.argv.slice(2);
if (!png) throw new Error('usage: node test/live-ai-read.mjs <page.png> [codex.exe]');
const codexExe = exe ?? codexExePath({ isPackaged: false, resourcesPath: '', appPath: path.resolve('.') });
console.log(`model ${AI_MODEL}, program ${codexExe}`);
const r = await aiReadImage(new Uint8Array(readFileSync(png)), { fields: AI_FIELDS, codexExe });
console.log(JSON.stringify(r, null, 2));
if (r.ok) console.log('checks:', checkInvoice(r.data));
