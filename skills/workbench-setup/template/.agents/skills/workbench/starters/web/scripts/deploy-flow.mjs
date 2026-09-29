// The order of a deploy, with everything that touches the outside world passed in (wrangler, the
// build, the network, temp files), so `npm test` can drive every branch with fakes and no Cloudflare.
// deploy.mjs wires in the real ones.
//
// The rule behind the order: nothing is ever reachable by the public before Access is proven on.
//   - The first upload has NO address (workers_dev off), so nothing can be opened, not even for a second.
//   - The address is switched on only with --go-live, and only when NOTES.md records Access as on.
//     For "Access on for all Workers" this is first tested on a throwaway empty Worker ("<name>-check",
//     page title "check", deleted again): if it asks for sign-in, account-level Access works and the real
//     site follows. If it does not, the real site is never given an address.
//   - After going live the address is asked for its home page like a stranger; a site recorded as private
//     that anyone can open is taken offline again straight away.
import { findSiteUrls, liveConfig, offlineConfig, preflight } from './lib.mjs';

// Exit codes: 0 done | 1 refused, nothing uploaded | 2 was public by mistake, taken offline |
// 3 uploaded but not verified | 4 wrangler or the build failed / not logged in | 5 recorded public but still asks for sign-in
export async function deployFlow(ctx) {
  const { args, notes, config, wrangler, build, probe, sleep, writeAppFile, removeAppFile, withTempSite, say, warn } = ctx;
  const refuse = (message, code = 1) => {
    warn(`NOT DEPLOYED: ${message}`);
    return code;
  };

  const check = preflight(notes, config, args.account);
  if (!check.ok) return refuse(check.message);
  const live = check.addressOn || args.goLive;
  if (live && check.expected === 'private' && !check.accessOn) {
    return refuse('NOTES.md does not say Cloudflare Access is on, so giving the site an address would let anyone in. Do "Private by default" in README.md first, then write: Access: on (<what it covers>).');
  }

  // 1. The account: wrangler is logged in per Windows user, not per project. Never upload to a guess.
  const who = await wrangler(['whoami']);
  const whoText = `${who.stdout}${who.stderr}`;
  if (/not authenticated/i.test(whoText)) return refuse('not logged in to Cloudflare. Run: node node_modules/wrangler/bin/wrangler.js login --device (the user clicks Allow in the browser).', 4);
  if (!whoText.includes(args.account)) {
    say(whoText);
    return refuse(`wrangler is logged in, but not to the account ${args.account} that the user confirmed. Nothing was uploaded. Ask the user which account to use.`);
  }
  say(`Account ${args.account} confirmed in NOTES.md and found in this wrangler login.`);

  // 2. Build.
  const built = await build();
  if (built.status !== 0) {
    warn(`${built.stdout ?? ''}${built.stderr ?? ''}`);
    return refuse('the build failed.', 4);
  }

  // 3. First upload: no address at all.
  if (!live) {
    await writeAppFile('.wrangler-offline.jsonc', JSON.stringify(offlineConfig(config), null, 2));
    let upload;
    try {
      upload = await wrangler(['deploy', '--config', '.wrangler-offline.jsonc']);
    } finally {
      await removeAppFile('.wrangler-offline.jsonc');
    }
    say(`${upload.stdout}${upload.stderr}`);
    if (upload.status !== 0) return refuse('the upload failed.', 4);
    say('Uploaded with NO address: nobody can open it yet. Next: set up Cloudflare Access (README, "Private by default"), record it in NOTES.md, then run this again with --go-live.');
    return 0;
  }

  // 4. Going live for the first time behind account-wide Access: prove it on a throwaway first.
  if (args.goLive && !check.addressOn && check.expected === 'private' && check.accessAllWorkers) {
    const verdict = await canary();
    if (verdict !== 'protected') {
      return refuse(
        verdict === 'public'
          ? 'a throwaway test page on this account was reachable without sign-in, so account-wide Access is NOT working. The real site was not given an address. Check "Protect all Workers" in the dashboard (README).'
          : 'could not tell whether account-wide Access works (the test page gave no clear answer). The real site was not given an address. Try again in a minute.',
        verdict === 'public' ? 1 : 3,
      );
    }
    say('Test page asked for sign-in: account-wide Access works.');
  }

  // 5. Upload with the address, then look at it like a stranger.
  await writeAppFile('.wrangler-live.jsonc', JSON.stringify(liveConfig(config), null, 2));
  let deploy;
  try {
    deploy = await wrangler(['deploy', '--config', '.wrangler-live.jsonc']);
  } finally {
    await removeAppFile('.wrangler-live.jsonc');
  }
  say(`${deploy.stdout}${deploy.stderr}`);
  if (deploy.status !== 0) return refuse('the upload failed.', 4);
  const urls = findSiteUrls(`${deploy.stdout}${deploy.stderr}`);
  if (urls.length === 0) {
    warn('Deployed, but wrangler printed no site address, so it was NOT verified. Do not tell the user it is live. Find the address in the dashboard and run: npm run check-url -- <address>');
    return 3;
  }
  let worst = 'protected';
  for (const url of urls) {
    let result = await probe(url);
    for (let attempt = 1; attempt < 5 && result.verdict === 'unknown'; attempt++) {
      await sleep(3000);
      result = await probe(url);
    }
    say(`${url}: ${result.verdict === 'protected' ? 'asks for sign-in' : result.verdict === 'public' ? 'PUBLIC, anyone can open it' : `no clear answer (status ${result.status})`}`);
    if (result.verdict === 'public') worst = 'public';
    else if (result.verdict === 'unknown' && worst !== 'public') worst = 'unknown';
  }

  if (worst === 'unknown') {
    warn('Deployed, but the address did not give a clear answer, so it is NOT verified. Do not tell the user it is live. Try: npm run check-url -- <address>');
    return 3;
  }
  if (check.expected === 'private' && worst === 'public') {
    warn('EMERGENCY: the site is recorded as private but anyone can open it. Taking it offline now.');
    await writeAppFile('.wrangler-offline.jsonc', JSON.stringify(offlineConfig(config), null, 2));
    let offline;
    try {
      offline = await wrangler(['deploy', '--config', '.wrangler-offline.jsonc']);
    } finally {
      await removeAppFile('.wrangler-offline.jsonc');
    }
    say(`${offline.stdout}${offline.stderr}`);
    warn(offline.status === 0
      ? 'The site is offline again (no address). Tell the user in plain words. Fix Access (README, "Private by default"), remove "Address: on" from NOTES.md, then go live again.'
      : 'COULD NOT take it offline. Tell the user NOW and have them open Workers & Pages > this site > Settings > Domains & Routes > workers.dev > Disable.');
    return 2;
  }
  if (check.expected === 'public' && worst === 'protected') {
    warn('Deployed, but it still asks for sign-in. The step that makes it public is not done yet (README, "Making it public").');
    return 5;
  }
  say(check.expected === 'private' ? 'Live and private: only people Access lets in can open it. Now write "Address: on (verified <date>)" in NOTES.md.' : 'Live and public. Now write "Address: on (verified <date>)" in NOTES.md.');
  return 0;

  /** Throwaway empty Worker with an address: 'protected' only if it asks for sign-in (waits up to ~45 s for a new Worker to pick up Access). */
  async function canary() {
    const name = `${config.name.slice(0, 56).replace(/-+$/, '')}-check`;
    const files = {
      'wrangler.jsonc': JSON.stringify({ name, compatibility_date: config.compatibility_date, assets: { directory: './dist' }, workers_dev: true, preview_urls: false }),
      'dist/index.html': '<!doctype html><title>check</title>',
    };
    let uploaded = false;
    let verdict = 'unknown';
    try {
      const up = await withTempSite(files, (dir) => wrangler(['deploy', '--config', `${dir}/wrangler.jsonc`]));
      if (up.status !== 0) return 'unknown';
      uploaded = true;
      const [url] = findSiteUrls(`${up.stdout}${up.stderr}`);
      if (!url) return 'unknown';
      for (let attempt = 0; attempt < 10 && verdict !== 'protected'; attempt++) {
        if (attempt > 0) await sleep(5000);
        verdict = (await probe(url)).verdict;
      }
      return verdict;
    } finally {
      if (uploaded) await wrangler(['delete', '--name', name, '--force']);
    }
  }
}
