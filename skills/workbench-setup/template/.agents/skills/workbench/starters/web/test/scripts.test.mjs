// The small pieces of the deploy guard: what it refuses, how it reads an answer from the internet, and
// that wrangler's config still parses. No wrangler, no Cloudflare: the "internet" is a local server.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { classifyProbe, findSiteUrls, liveConfig, offlineConfig, parseWranglerConfig, preflight, probe, stripJsonComments } from '../scripts/lib.mjs';

const app = fileURLToPath(new URL('..', import.meta.url));
const ACCOUNT = 'a'.repeat(32);
const good = { name: 'bills-k3f9x2', compatibility_date: '2026-09-26', assets: { directory: './dist' }, workers_dev: false, preview_urls: false };
const accountLine = `- Cloudflare account: My Account (${ACCOUNT}), confirmed by the user 2026-09-30\n`;
const privateNotes = `${accountLine}- Visibility: private\n- Access: on (all Workers in the account)\n`;

test('the shipped wrangler.jsonc parses, serves single-page-app addresses and keeps preview addresses off', async () => {
  const config = parseWranglerConfig(await readFile(path.join(app, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.assets.not_found_handling, 'single-page-application');
  assert.equal(config.workers_dev, false, 'a plain wrangler deploy publishes nothing');
  assert.equal(config.preview_urls, false);
  assert.equal(config.routes, undefined);
});

test('stripJsonComments removes comments but not comment-like text inside strings', () => {
  const text = '{\n // line\n "a": "https://x.example/*not a comment*/", /* block\n over lines */ "b": 1 // tail\n}';
  assert.deepEqual(JSON.parse(stripJsonComments(text)), { a: 'https://x.example/*not a comment*/', b: 1 });
});

test('preflight: the account must be given explicitly and recorded as confirmed by the user', () => {
  assert.deepEqual(preflight(privateNotes, good, ACCOUNT), { ok: true, expected: 'private', addressOn: false, accessOn: true, accessAllWorkers: true });
  assert.match(preflight(privateNotes, good, undefined).message, /--account/);
  assert.match(preflight(privateNotes, good, 'not-an-id').message, /--account/);
  assert.match(preflight(privateNotes, good, 'b'.repeat(32)).message, /does not record that the user confirmed this Cloudflare account/);
  assert.match(preflight('- Access: on\n', good, ACCOUNT).message, /does not record that the user confirmed/);
  assert.match(preflight(undefined, good, ACCOUNT).message, /does not record that the user confirmed/);
  assert.match(preflight(`- Cloudflare account: My Account (${ACCOUNT})\n`, good, ACCOUNT).message, /does not record that the user confirmed/);
});

test('preflight reads what NOTES.md says about Access and the address', () => {
  const notes = `${accountLine}- Access: on (this Worker)\n- Address: on (verified 2026-09-30)\n`;
  assert.deepEqual(preflight(notes, good, ACCOUNT), { ok: true, expected: 'private', addressOn: true, accessOn: true, accessAllWorkers: false });
  assert.deepEqual(preflight(accountLine, good, ACCOUNT), { ok: true, expected: 'private', addressOn: false, accessOn: false, accessAllWorkers: false });
  assert.equal(preflight(`${accountLine}- Access: off\n`, good, ACCOUNT).accessOn, false);
});

test('preflight: public needs the user\'s confirmation on record', () => {
  assert.match(preflight(`${accountLine}- Visibility: public\n`, good, ACCOUNT).message, /not that the user confirmed/);
  const ok = preflight(`${accountLine}- Visibility: public (confirmed 2026-09-30: "yes, anyone can see my portfolio")\n`, good, ACCOUNT);
  assert.equal(ok.expected, 'public');
});

test('preflight refuses the placeholder name, bad names, preview addresses and custom routes', () => {
  const check = (config) => preflight(privateNotes, config, ACCOUNT).message;
  assert.match(check({ ...good, name: 'set-when-copied' }), /placeholder/);
  for (const name of ['My_Site', '-site', 'site-', 'a'.repeat(64)]) assert.match(check({ ...good, name }), /not allowed/, name);
  assert.match(check({ ...good, workers_dev: true }), /workers_dev/);
  assert.match(check({ ...good, workers_dev: undefined }), /workers_dev/);
  assert.match(check({ ...good, preview_urls: true }), /preview_urls/);
  assert.match(check({ ...good, preview_urls: undefined }), /preview_urls/);
  assert.match(check({ ...good, routes: [{ pattern: 'a.example.com', custom_domain: true }] }), /custom domain/);
});

test('classifyProbe: sign-in redirects and refusals are protected, a served page is public, the rest is unknown', () => {
  assert.equal(classifyProbe({ status: 302, location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login/x?kid=1' }), 'protected');
  assert.equal(classifyProbe({ status: 302, location: 'https://cloudflareaccess.com/login' }), 'protected');
  assert.equal(classifyProbe({ status: 403 }), 'protected');
  assert.equal(classifyProbe({ status: 401 }), 'protected');
  assert.equal(classifyProbe({ status: 200 }), 'public');
  assert.equal(classifyProbe({ status: 302, location: 'https://evilcloudflareaccess.com/login' }), 'unknown');
  assert.equal(classifyProbe({ status: 302, location: 'https://elsewhere.example/' }), 'unknown');
  assert.equal(classifyProbe({ status: 302 }), 'unknown');
  assert.equal(classifyProbe({ status: 404 }), 'unknown');
  assert.equal(classifyProbe({ status: 0 }), 'unknown');
});

/** Starts a local server answering every request with `respond(res)`; returns its address and a stop function. */
async function serve(respond) {
  const server = http.createServer((_req, res) => respond(res));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}/`, stop: () => new Promise((resolve) => server.close(resolve)) };
}

test('probe asks like a stranger and never follows the redirect', async () => {
  const cases = [
    [(res) => { res.writeHead(302, { location: 'https://team.cloudflareaccess.com/cdn-cgi/access/login/site' }); res.end(); }, 'protected', 302],
    [(res) => { res.writeHead(403); res.end('blocked'); }, 'protected', 403],
    [(res) => { res.writeHead(200, { 'content-type': 'text/html' }); res.end('<html>the site</html>'); }, 'public', 200],
    [(res) => { res.writeHead(404); res.end(); }, 'unknown', 404],
  ];
  for (const [respond, verdict, status] of cases) {
    const server = await serve(respond);
    try {
      const result = await probe(server.url);
      assert.equal(result.verdict, verdict);
      assert.equal(result.status, status);
    } finally {
      await server.stop();
    }
  }
});

test('probe reports no clear answer, not a crash, when nothing answers', async () => {
  const server = await serve((res) => res.end());
  const url = server.url;
  await server.stop();
  const result = await probe(url);
  assert.equal(result.verdict, 'unknown');
  assert.equal(result.status, 0);
  assert.ok(result.error);
});

test('findSiteUrls picks the site address out of wrangler output and ignores Cloudflare\'s own links', () => {
  const output = [
    'Uploaded bills-k3f9x2 (2.51 sec)',
    'Deployed bills-k3f9x2 triggers (1.10 sec)',
    '  https://bills-k3f9x2.someone.workers.dev',
    'Current Version ID: 1234',
    'See https://developers.cloudflare.com/workers/ and https://dash.cloudflare.com/x.',
  ].join('\n');
  assert.deepEqual(findSiteUrls(output), ['https://bills-k3f9x2.someone.workers.dev']);
  assert.deepEqual(findSiteUrls('nothing here'), []);
});

test('offlineConfig keeps the site but publishes no address', () => {
  const offline = offlineConfig({ ...good, routes: ['a.example.com/*'] });
  assert.deepEqual(offline, { name: good.name, compatibility_date: good.compatibility_date, assets: good.assets, workers_dev: false, preview_urls: false });
});

test('liveConfig is the offline config with only the workers.dev address switched on', () => {
  assert.deepEqual(liveConfig({ ...good, routes: ['a.example.com/*'] }), { name: good.name, compatibility_date: good.compatibility_date, assets: good.assets, workers_dev: true, preview_urls: false });
});

test('deploy.mjs itself refuses before touching wrangler: no account, or an account nobody confirmed', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'wb-web-'));
  try {
    // A copy with no node_modules: even if a check were skipped, wrangler could not run.
    const site = path.join(root, 'tools', 'demo', 'app');
    await mkdir(path.join(site, 'scripts'), { recursive: true });
    await cp(path.join(app, 'scripts'), path.join(site, 'scripts'), { recursive: true });
    await writeFile(path.join(site, 'wrangler.jsonc'), JSON.stringify(good));
    const deploy = (...extra) => spawnSync(process.execPath, ['scripts/deploy.mjs', ...extra], { cwd: site, encoding: 'utf8' });

    let result = deploy();
    assert.equal(result.status, 1);
    assert.match(result.stderr, /NOT DEPLOYED: Give the Cloudflare account explicitly/);

    result = deploy('--account', ACCOUNT); // no NOTES.md
    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not record that the user confirmed this Cloudflare account/);

    await writeFile(path.join(root, 'tools', 'demo', 'NOTES.md'), accountLine);
    result = deploy('--account', 'b'.repeat(32));
    assert.equal(result.status, 1);
    assert.match(result.stderr, /does not record that the user confirmed this Cloudflare account/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
