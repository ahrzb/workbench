// The order of a deploy, driven with fakes: no wrangler, no Cloudflare, no network. What matters:
// nothing is uploaded to a wrong or unconfirmed account, the first upload has no address, and the
// real site only gets an address after Access is proven on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deployFlow } from '../scripts/deploy-flow.mjs';

const ACCOUNT = 'a'.repeat(32);
const config = { name: 'bills-k3f9x2', compatibility_date: '2026-09-26', assets: { directory: './dist', not_found_handling: 'single-page-application' }, workers_dev: false, preview_urls: false };
const base = `- Cloudflare account: My Account (${ACCOUNT}), confirmed by the user 2026-09-30\n`;
const notesFirst = base;
const notesAccessAll = `${base}- Access: on (all Workers in the account)\n`;
const notesAccessOne = `${base}- Access: on (this Worker)\n`;
const notesLive = `${notesAccessAll}- Address: on (verified 2026-09-30)\n`;
const notesPublic = `${base}- Visibility: public (confirmed 2026-09-30: "yes, anyone")\n`;

const SITE_URL = 'https://bills-k3f9x2.someone.workers.dev';
const CANARY_URL = 'https://bills-k3f9x2-check.someone.workers.dev';

/** Runs the flow against fakes. `real` / `canary` give the verdicts each address returns, in order (the last one repeats). */
async function run({ notes, args = { account: ACCOUNT }, who = `You are logged in.\n${ACCOUNT}`, real = ['protected'], canary = ['protected'], build = 0, deployStatus = 0, printUrl = true }) {
  const calls = [];
  const said = [];
  const warned = [];
  const files = {};
  const queues = { [SITE_URL]: [...real], [CANARY_URL]: [...canary] };
  const ctx = {
    args,
    notes,
    config,
    wrangler: async (wranglerArgs) => {
      calls.push(wranglerArgs.join(' '));
      if (wranglerArgs[0] === 'whoami') return { status: 0, stdout: who, stderr: '' };
      if (wranglerArgs[0] === 'delete') return { status: 0, stdout: 'Successfully deleted', stderr: '' };
      const configFile = wranglerArgs[wranglerArgs.indexOf('--config') + 1];
      if (configFile === '.wrangler-offline.jsonc') return { status: 0, stdout: 'No targets deployed', stderr: '' };
      if (configFile === '.wrangler-live.jsonc') return { status: deployStatus, stdout: printUrl ? `Deployed\n  ${SITE_URL}` : 'Deployed', stderr: '' };
      if (configFile?.endsWith('/wrangler.jsonc')) return { status: 0, stdout: `Deployed\n  ${CANARY_URL}`, stderr: '' };
      return { status: 1, stdout: '', stderr: 'unexpected wrangler call: only deploys with an explicit config are allowed' };
    },
    build: async () => {
      calls.push('build');
      return { status: build, stdout: '', stderr: 'build error' };
    },
    probe: async (url) => {
      calls.push(`probe ${url}`);
      const queue = queues[url];
      const verdict = queue.length > 1 ? queue.shift() : queue[0];
      return { status: verdict === 'protected' ? 302 : verdict === 'public' ? 200 : 404, verdict };
    },
    sleep: async () => {},
    writeAppFile: async (rel, text) => {
      files[rel] = JSON.parse(text);
    },
    removeAppFile: async (rel) => {
      calls.push(`remove ${rel}`);
    },
    withTempSite: async (siteFiles, fn) => {
      files.canary = { config: JSON.parse(siteFiles['wrangler.jsonc']), html: siteFiles['dist/index.html'] };
      return fn('/tmp/site');
    },
    say: (line) => said.push(line),
    warn: (line) => warned.push(line),
  };
  const code = await deployFlow(ctx);
  return { code, calls, said, warned, files };
}
const uploads = (calls) => calls.filter((c) => c.startsWith('deploy'));

test('nothing is uploaded without an explicit, confirmed account that this login can use', async () => {
  const cases = [
    [{ notes: notesFirst, args: {} }, 1, /--account/],
    [{ notes: notesFirst, args: { account: 'b'.repeat(32) } }, 1, /does not record that the user confirmed this Cloudflare account/],
    [{ notes: '', args: { account: ACCOUNT } }, 1, /does not record/],
    [{ notes: notesFirst, who: 'You are logged in.\nSomeone Else ' + 'c'.repeat(32) }, 1, /not to the account/],
    [{ notes: notesFirst, who: 'You are not authenticated. Please run `wrangler login`.' }, 4, /not logged in/],
  ];
  for (const [input, code, message] of cases) {
    const result = await run(input);
    assert.equal(result.code, code, message.source);
    assert.match(result.warned.join('\n'), message);
    assert.deepEqual(uploads(result.calls), [], 'no upload');
    assert.equal(result.calls.includes('build'), false, 'not even a build');
  }
});

test('the first upload has no address at all and is never probed', async () => {
  const result = await run({ notes: notesFirst });
  assert.equal(result.code, 0);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-offline.jsonc']);
  assert.deepEqual(result.files['.wrangler-offline.jsonc'], { name: config.name, compatibility_date: config.compatibility_date, assets: config.assets, workers_dev: false, preview_urls: false });
  assert.equal(result.calls.some((c) => c.startsWith('probe')), false);
  assert.ok(result.calls.includes('remove .wrangler-offline.jsonc'), 'the temporary config is removed');
  assert.match(result.said.join('\n'), /NO address/);
});

test('going live needs Access recorded as on, and still uploads nothing without it', async () => {
  const result = await run({ notes: notesFirst, args: { account: ACCOUNT, goLive: true } });
  assert.equal(result.code, 1);
  assert.match(result.warned.join('\n'), /does not say Cloudflare Access is on/);
  assert.deepEqual(uploads(result.calls), []);
});

test('going live behind all-Workers Access: the throwaway test page goes first and is deleted, then the real site', async () => {
  const result = await run({ notes: notesAccessAll, args: { account: ACCOUNT, goLive: true } });
  assert.equal(result.code, 0);
  assert.deepEqual(result.calls.filter((c) => c.startsWith('deploy') || c.startsWith('delete')), [
    'deploy --config /tmp/site/wrangler.jsonc',
    'delete --name bills-k3f9x2-check --force',
    'deploy --config .wrangler-live.jsonc',
  ]);
  assert.equal(result.files.canary.config.name, 'bills-k3f9x2-check');
  assert.equal(result.files.canary.config.workers_dev, true);
  assert.equal(result.files.canary.html.includes('bills'), false, 'the test page holds nothing of the site');
  assert.match(result.said.join('\n'), /Live and private/);
  assert.equal(result.files['.wrangler-live.jsonc'].workers_dev, true, 'the address is switched on only in the temporary copy');
  assert.ok(result.calls.includes('remove .wrangler-live.jsonc'));
});

test('a new Worker may need a moment to pick up Access: the test page passes once it asks for sign-in', async () => {
  const result = await run({ notes: notesAccessAll, args: { account: ACCOUNT, goLive: true }, canary: ['public', 'public', 'unknown', 'protected'] });
  assert.equal(result.code, 0);
  assert.equal(result.calls.filter((c) => c === 'probe ' + CANARY_URL).length, 4);
});

test('if the test page stays open to everyone, the real site is never given an address', async () => {
  const result = await run({ notes: notesAccessAll, args: { account: ACCOUNT, goLive: true }, canary: ['public'] });
  assert.equal(result.code, 1);
  assert.match(result.warned.join('\n'), /NOT working/);
  assert.deepEqual(uploads(result.calls), ['deploy --config /tmp/site/wrangler.jsonc']);
  assert.ok(result.calls.includes('delete --name bills-k3f9x2-check --force'), 'the test page is removed again');
  assert.equal(result.calls.filter((c) => c === 'probe ' + CANARY_URL).length, 10, 'it waited before giving up');
});

test('if the test page gives no clear answer, the real site is not given an address either', async () => {
  const result = await run({ notes: notesAccessAll, args: { account: ACCOUNT, goLive: true }, canary: ['unknown'] });
  assert.equal(result.code, 3);
  assert.deepEqual(uploads(result.calls), ['deploy --config /tmp/site/wrangler.jsonc']);
});

test('per-Worker Access cannot be tested beforehand: no test page, and the result is checked right after', async () => {
  const result = await run({ notes: notesAccessOne, args: { account: ACCOUNT, goLive: true } });
  assert.equal(result.code, 0);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-live.jsonc']);
  assert.equal(result.files.canary, undefined);
});

test('later updates (Address: on) deploy and check; a private site that turns out public is taken offline at once', async () => {
  let result = await run({ notes: notesLive });
  assert.equal(result.code, 0);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-live.jsonc']);

  result = await run({ notes: notesLive, real: ['public'] });
  assert.equal(result.code, 2);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-live.jsonc', 'deploy --config .wrangler-offline.jsonc']);
  assert.equal(result.files['.wrangler-offline.jsonc'].workers_dev, false);
  assert.match(result.warned.join('\n'), /EMERGENCY/);
});

test('an address that gives no clear answer is reported as not verified', async () => {
  const result = await run({ notes: notesLive, real: ['unknown'] });
  assert.equal(result.code, 3);
  assert.match(result.warned.join('\n'), /NOT verified/);
  assert.equal(result.calls.filter((c) => c === 'probe ' + SITE_URL).length, 5, 'it retried while the address came up');
});

test('a public site: no test page, and "still asks for sign-in" is a reminder, not an emergency', async () => {
  let result = await run({ notes: notesPublic, args: { account: ACCOUNT, goLive: true }, real: ['public'] });
  assert.equal(result.code, 0);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-live.jsonc']);

  result = await run({ notes: notesPublic, args: { account: ACCOUNT, goLive: true }, real: ['protected'] });
  assert.equal(result.code, 5);
  assert.deepEqual(uploads(result.calls), ['deploy --config .wrangler-live.jsonc'], 'nothing is taken offline');
});

test('a failed build or upload stops with a clear code', async () => {
  let result = await run({ notes: notesFirst, build: 1 });
  assert.equal(result.code, 4);
  assert.deepEqual(uploads(result.calls), []);

  result = await run({ notes: notesLive, deployStatus: 1 });
  assert.equal(result.code, 4);

  result = await run({ notes: notesLive, printUrl: false });
  assert.equal(result.code, 3);
  assert.match(result.warned.join('\n'), /printed no site address/);
});
