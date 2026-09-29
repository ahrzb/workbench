// The only supported way to publish, from tools/<name>/app/:
//   npm run deploy -- --account <32-character account id>              first upload: NO address, nobody can open it
//   npm run deploy -- --account <id> --go-live                          switch the address on (needs Access recorded)
//   npm run deploy -- --account <id>                                    later updates, once NOTES.md says "Address: on"
// The order and the checks are in deploy-flow.mjs; this file only connects them to wrangler, vite and the network.
// It refuses, before uploading anything, unless NOTES.md records the account the user confirmed.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { deployFlow } from './deploy-flow.mjs';
import { parseWranglerConfig, probe } from './lib.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const argv = process.argv.slice(2);
const accountAt = argv.indexOf('--account');
const args = { account: accountAt === -1 ? undefined : argv[accountAt + 1], goLive: argv.includes('--go-live') };

const read = (rel) => {
  try {
    return readFileSync(path.join(app, rel), 'utf8');
  } catch {
    return undefined; // no NOTES.md: nothing recorded, so the flow says what to do
  }
};
const spawn = (script, scriptArgs, env = {}) => {
  const r = spawnSync(process.execPath, [script, ...scriptArgs], { cwd: app, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false', ...env } });
  return { status: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
};

const code = await deployFlow({
  args,
  notes: read('../NOTES.md'),
  config: parseWranglerConfig(read('wrangler.jsonc') ?? '{}'),
  // The account id is passed to wrangler too, so it cannot pick another account by itself.
  wrangler: async (wranglerArgs) => spawn('node_modules/wrangler/bin/wrangler.js', wranglerArgs, { CLOUDFLARE_ACCOUNT_ID: args.account ?? '' }),
  build: async () => spawn('node_modules/vite/bin/vite.js', ['build']),
  probe,
  sleep,
  writeAppFile: async (rel, text) => writeFileSync(path.join(app, rel), text),
  removeAppFile: async (rel) => rmSync(path.join(app, rel), { force: true }),
  withTempSite: async (files, fn) => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'wb-site-check-'));
    try {
      for (const [rel, text] of Object.entries(files)) {
        mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
        writeFileSync(path.join(dir, rel), text);
      }
      return await fn(dir.replaceAll('\\', '/'));
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
  say: (line) => console.log(line),
  warn: (line) => console.error(line),
});
process.exit(code);
