// Pure pieces of the deploy and URL check (no wrangler, no network except probe()), so `npm test`
// can prove them. Used by deploy.mjs and check-url.mjs.

/** wrangler.jsonc has comments (line and block); JSON.parse does not accept them. Comment markers inside strings are kept. */
export function stripJsonComments(text) {
  let out = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const next = text[i + 1];
    if (c === '"') {
      let j = i + 1;
      while (j < text.length && text[j] !== '"') j += text[j] === '\\' ? 2 : 1;
      out += text.slice(i, j + 1);
      i = j + 1;
    } else if (c === '/' && next === '/') {
      while (i < text.length && text[i] !== '\n') i++;
    } else if (c === '/' && next === '*') {
      const end = text.indexOf('*/', i + 2);
      i = end === -1 ? text.length : end + 2;
    } else {
      out += c;
      i++;
    }
  }
  return out;
}

export function parseWranglerConfig(text) {
  return JSON.parse(stripJsonComments(text));
}

/**
 * What the tool's NOTES.md records, and whether a deploy may even start. One line each, anywhere in the file:
 *   - Cloudflare account: <name> (<32-character account id>), confirmed by the user <date>
 *   - Visibility: private                      (default when nothing is written)
 *   - Visibility: public (confirmed <date>: "<their words>")
 *   - Access: on (all Workers in the account | this Worker), set up <date>
 *   - Address: on (verified <date>)            written only after the first successful go-live
 * `accountId` is what deploy.mjs was given with --account; it must be the confirmed one.
 * Returns { ok: false, message } or { ok: true, expected, addressOn, accessOn, accessAllWorkers }.
 */
export function preflight(notesText, config, accountId) {
  const notes = notesText ?? '';
  const refuse = (message) => ({ ok: false, message });
  if (typeof config.name !== 'string' || config.name === '' || config.name === 'set-when-copied') {
    return refuse('wrangler.jsonc still has the placeholder name. Set it once (short name plus 6 random letters) before the first deploy.');
  }
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(config.name)) {
    return refuse(`The site name "${config.name}" is not allowed: use lowercase letters, digits and dashes, at most 63 characters, not starting or ending with a dash.`);
  }
  if (config.workers_dev !== false) {
    return refuse('wrangler.jsonc must say "workers_dev": false. A plain wrangler deploy then never gives the site an address; deploy.mjs switches it on for a go-live or an update, and only after Access is recorded.');
  }
  if (config.preview_urls !== false) return refuse('wrangler.jsonc must say "preview_urls": false. Test-version addresses are extra addresses that Access may not cover.');
  if (config.routes !== undefined || config.route !== undefined) {
    return refuse('wrangler.jsonc has "routes" (a custom domain). Follow the "Own address" part of README.md first; deploy.mjs does not deploy custom domains yet.');
  }
  if (!/^[0-9a-f]{32}$/.test(accountId ?? '')) return refuse('Give the Cloudflare account explicitly: npm run deploy -- --account <32-character account id>. Nothing is uploaded without it.');
  const accountLine = /^\s*[-*]?\s*Cloudflare account:(.*)$/im.exec(notes)?.[1] ?? '';
  if (!accountLine.includes(accountId) || !/\bconfirmed\b/i.test(accountLine)) {
    return refuse('NOTES.md does not record that the user confirmed this Cloudflare account. Show them the account name and email from wrangler whoami, ask, then write: Cloudflare account: <name> (<id>), confirmed by the user <date>.');
  }
  const visibility = /^\s*[-*]?\s*Visibility:\s*(.+)$/im.exec(notes)?.[1] ?? 'private';
  const expected = /^public\b/i.test(visibility.trim()) ? 'public' : 'private';
  if (expected === 'public' && !/\bconfirmed\b/i.test(visibility)) {
    return refuse('NOTES.md says the site is public but not that the user confirmed it. Ask them (README, "Making it public"), then write: Visibility: public (confirmed <date>: "<their words>").');
  }
  const accessLine = /^\s*[-*]?\s*Access:\s*on\b(.*)$/im.exec(notes);
  return { ok: true, expected, addressOn: /^\s*[-*]?\s*Address:\s*on\b/im.test(notes), accessOn: accessLine !== null, accessAllWorkers: /all workers/i.test(accessLine?.[1] ?? '') };
}

/** 'protected' = asks for sign-in or refuses; 'public' = serves the site to anyone; 'unknown' = neither (not found, error, no answer). */
export function classifyProbe({ status, location }) {
  if ([301, 302, 303, 307, 308].includes(status)) {
    try {
      const host = new URL(location ?? '', 'https://example.invalid').hostname;
      if (host === 'cloudflareaccess.com' || host.endsWith('.cloudflareaccess.com')) return 'protected';
    } catch {
      return 'unknown';
    }
    return 'unknown';
  }
  if (status === 401 || status === 403) return 'protected';
  if (status >= 200 && status < 300) return 'public';
  return 'unknown';
}

/** Asks for the home page the way a browser without a login would. Never follows redirects. */
export async function probe(url) {
  try {
    const response = await fetch(url, { redirect: 'manual', headers: { accept: 'text/html' }, signal: AbortSignal.timeout(15_000) });
    await response.body?.cancel();
    const location = response.headers.get('location') ?? undefined;
    return { status: response.status, location, verdict: classifyProbe({ status: response.status, location }) };
  } catch (error) {
    return { status: 0, verdict: 'unknown', error: error instanceof Error ? error.message : String(error) };
  }
}

/** The site addresses in wrangler's output (https links, without Cloudflare's own docs and dashboard). */
export function findSiteUrls(output) {
  const ignored = ['dash.cloudflare.com', 'developers.cloudflare.com', 'cloudflare.com', 'github.com'];
  const urls = (output.match(/https:\/\/[^\s"'<>]+/g) ?? []).map((u) => u.replace(/[.,;)]+$/, ''));
  return [...new Set(urls.filter((u) => !ignored.includes(new URL(u).hostname)))];
}

/** A copy of the config that publishes nothing: no workers.dev address, no previews, no custom routes. */
export function offlineConfig(config) {
  return { name: config.name, compatibility_date: config.compatibility_date, assets: config.assets, workers_dev: false, preview_urls: false };
}

/** The same site with its workers.dev address switched on (the only place that ever happens). */
export function liveConfig(config) {
  return { ...offlineConfig(config), workers_dev: true };
}
