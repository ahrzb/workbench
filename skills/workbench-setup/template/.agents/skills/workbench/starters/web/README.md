# Starter: website (React on Cloudflare)

For the AI, not the user. Copy everything in this folder except this README into `tools/<name>/app/` and work there. A small React website that Cloudflare serves as static files: no backend, no database, no secrets. It is **private by default**: nobody can open it until Cloudflare Access is on, and deploying is refused unless the order below was followed.

## Pick this, Electron or HTML

- **This** when the user wants a website: something opened by address in a browser, by them or by other people, from any computer, without installing anything.
- **Electron** (`starters/electron/`) when the tool works on the user's own files or owns their data on their own computer, or needs an AI feature.
- **HTML-only** (`starters/html/`) for a tiny tool to double-click, or when programs can't run at all.

A website is on someone else's servers. Say so once, in plain words, before the first deploy: what is published is copied to Cloudflare, and anything a visitor is allowed to open can be downloaded by them (the pages, the files in `public/`, all the code). For a work site, ask once whether company rules cover publishing it ("Whose data" in [safety.md](../../safety.md#whose-data)); IT's OK comes first only if they say yes or aren't sure.

## Files

| File | What it does |
|---|---|
| `package.json`, `package-lock.json` | Exact lockfile. `wrangler` is pinned exactly (`4.144.0`), the rest `^`. `"type": "module"`. |
| `index.html`, `vite.config.ts`, `tsconfig.json` | Vite + React + TypeScript. `@/x` means `src/x`. `index.html` carries `<meta name="robots" content="noindex">` (private default). |
| `src/main.tsx`, `src/App.tsx` | Starts React with React Query and React Router; the `<Route>` list. |
| `src/components/Layout.tsx`, `src/pages/*.tsx` | Nav + page frame; Home, Books (list with a React Query fetch and a search box), Not found. |
| `src/components/ui/{button,card,input}.tsx`, `src/lib/utils.ts`, `components.json` | shadcn components, vendored (the exact output of the shadcn CLI), so it builds without network. |
| `src/index.css` | Tailwind v4 + the shadcn theme (colors, radius, font). There is no tailwind config file: change the theme here. Font is Inter from npm (`@fontsource-variable/inter`), not a CDN. |
| `src/lib/api.ts` | The one place that fetches. Today: `public/data/books.json`. A real backend later means only this file changes. |
| `src/lib/books.ts` | Pure logic (`parseBooks`, `filterBooks`), tested. Rules the site must get right go in files like this, not in components. |
| `public/robots.txt`, `public/data/books.json` | Copied as is into the site. `robots.txt` says `Disallow: /` (private default). The books file is fake example data: replace it or delete the Books page. |
| `wrangler.jsonc` | Cloudflare config: static files from `dist/`, every page address answered with `index.html`, `workers_dev: false`, `preview_urls: false`. |
| `scripts/deploy.mjs`, `scripts/deploy-flow.mjs`, `scripts/lib.mjs`, `scripts/check-url.mjs` | The only supported deploy, and the check "does this address ask for sign-in?". |
| `test/*.test.mjs` | `node --test`: the pure logic, and every branch of the deploy order with fakes (no Cloudflare). |

**Save-point allowlist** (`save.ts` needs these names for `tools/<name>/app/`): `package.json`, `package-lock.json`, `tsconfig.json`, `index.html`, `vite.config.ts`, `wrangler.jsonc`, `components.json`; `src/**/*.{ts,tsx,css}`; `scripts/*.mjs`; `test/*.mjs`; the published content under `public/` (`*.{txt,xml,json,svg,png,jpg,jpeg,webp,ico,webmanifest}`). Never `dist/`, `.wrangler/`, `node_modules/`. Only put in `public/` what is meant to be published: it is not private data, and it must never be the user's own working files.

## Set up (from `tools/<name>/app/`)

1. Copy the starter in. In `wrangler.jsonc` set `name` once to a short name plus 6 random letters (`bills-k3f9x2`; lowercase letters, digits, dashes; it becomes the address `<name>.<account subdomain>.workers.dev`; renaming later creates a second site). Set the visible title in `index.html` (`<title>`, description) and `src/components/Layout.tsx`.
2. `..\..\..\.workbench\scripts\run.cmd npm.cmd ci`. Nothing else to fetch (no browser download, no binary step). With install scripts off, Vite (rolldown, Tailwind's oxide) and workerd (used by `wrangler dev`) work, because their binaries come as prebuilt optional packages. esbuild is only used by wrangler to bundle Worker code, and this starter has none, so that path is not exercised.
3. `run.cmd npm.cmd test`, `run.cmd npm.cmd run typecheck`, `run.cmd npm.cmd run build` (-> `dist/`).
4. Native-module check as in `starters/electron/README.md`. Baseline for this starter: `hasInstallScript` only `esbuild`, `workerd`, `fsevents` (macOS-only), all just check a prebuilt binary; `binding.gyp` only inside `sharp/src` (unused, prebuilt `@img/sharp-*`); `*.node` files all prebuilt inside npm packages: `@rolldown/binding-*`, `@tailwindcss/oxide-*`, `lightningcss-*`, `@img/sharp-*`. Anything new: pick another package.

Adding a dependency: first ask whether the site needs it, then `run.cmd npm.cmd install <pkg>`, the check above, then test/typecheck/build.

## Look at it before handing over

`run.cmd npm.cmd run build`, then `run.cmd npm.cmd run preview` (Vite serves `dist/` on `http://127.0.0.1:4173`, this computer only) and open it in Edge like the user would: click through every page, try the search, open a wrong address. Stop the server you started when you are done (only that process). This, and `wrangler dev --ip 127.0.0.1` if you want the exact Cloudflare behaviour (workerd on `127.0.0.1:8787`), are the one exception to "the tool opens no ports": localhost only, short-lived, only while checking. `wrangler login` without `--device` also listens on `localhost:8976` for a minute; use `--device` and there is no port.

Cloudflare answers **every** unknown address with the home page and status 200, including a mistyped file name like `/data/nope.json`. That is why `api.ts` checks that what it got parses as data. Keep that habit for any file the page loads.

## shadcn, React Query, React Router, Tailwind

- More shadcn components: `run.cmd npx.cmd --yes shadcn@4.21.0 add <name> -y` (needs the network: ui.shadcn.com and npm). It writes into `src/components/ui/` and may add packages; then run the native-module check, `typecheck`, `test`, `build`. Don't run `init` again. Version 4.21.0 is what made `components.json` (style `radix-vega`, `cn` from the `cn` package, `radix-ui`); when you raise the pin, look at the diff it makes.
- Tailwind v4 through `@tailwindcss/vite`; classes in components, theme tokens in `src/index.css`. No inline `style=` unless there is no other way.
- React Query for anything fetched (`useQuery` with a `queryKey`; the client is created once in `main.tsx`). React Router for pages: add a page in `src/pages/`, a `<Route>` in `App.tsx`, a link in `Layout.tsx`. Router mode is the plain `<BrowserRouter>`; pages are found by Cloudflare's single-page-app fallback, so deep links and refresh work.
- Imports of local files carry the extension (`./books.ts`) and pure logic files import nothing, so `node --test` can run them.

## Deploy to Cloudflare

Deploying is a chain the AI runs but the user must first do a few clicks. Follow the order; `deploy.mjs` refuses otherwise and tests prove it.

### The rule and why the order is what it is

Cloudflare Access (Zero Trust) puts a sign-in page in front of the site. It **cannot** be switched on by the AI: `wrangler login` grants no Access scope, and asking the user for an API token with broad rights is not acceptable. So the user clicks it in the dashboard, and the site must never have a public address before that. Therefore:

1. **First upload has no address.** `deploy.mjs` uploads with `workers_dev: false` from a temporary config, so nothing can be opened, not even for a second. (`wrangler.jsonc` itself says `workers_dev: false`, so even a stray plain deploy publishes nothing. Never run `wrangler deploy` or `versions upload` yourself anyway: they upload to whichever account is logged in.)
2. **Access is set up in the dashboard** and recorded in NOTES.
3. **`--go-live`** gives it the address. With account-wide Access (below) it first proves Access on a throwaway empty page (`<name>-check`, title "check", deleted again): only if that page asks for sign-in does the real site get its address. Then it asks the new address for its home page like a stranger. If a site recorded as private answers to anyone, it is taken offline again at once (exit 2) and you tell the user.

The only thing that can ever be reachable without Access is that empty test page, for seconds, and only when the user's account-wide Access is not working. With per-Worker Access (path B) nothing can be tested beforehand: the user's word is the evidence, and a mistake is a few seconds of exposure, then automatic offline. Prefer path A.

### One-time, by the user (about 5 minutes; say it in these words, one step at a time)

1. Sign in at dash.cloudflare.com (create the account if there isn't one; turn on two-factor).
2. **Zero Trust**, in the left menu: choose a team name (anything), the **Free** plan, and enter payment details. Cloudflare asks for them even on Free; Free is not charged and covers up to 50 people. Tell the user this before they get there.
3. **Workers & Pages**: if it shows no "Your subdomain", pick one (it becomes `<site>.<subdomain>.workers.dev`).
4. Path A (the default): on **Workers & Pages** find the **Protect all Workers** card, **Enable Access**, **All traffic**, policy **Cloudflare account** (= people who sign in to this Cloudflare account, i.e. them; **Email domain** lets in everyone with an address at that domain, e.g. colleagues), **Enable Access**, **Apply Access**. The card now says enabled. From now on every site on this account asks for sign-in, including ones deployed later.
   Ask first, in their words: "Do you already have anything published on this Cloudflare account that people can open without signing in?" If yes, path A would lock those too: use path B for the new site.
5. Path B (only per site): after the first upload (step 1 above), **Workers & Pages** -> the site -> **Access** tab -> **Protect this Worker behind Access** -> **All traffic** -> policy -> **Apply Access**.

Letting one more person in later (not in the Cloudflare account): Zero Trust -> Access -> Applications -> the app -> edit the policy; for outside email addresses first add **One-time PIN** under Settings -> Authentication. Step by step with them.

### Login and account (per Windows user, not per project)

- `run.cmd npx.cmd wrangler login --device`: prints a code and opens the browser; the user clicks Allow. It grants wrangler the broad default set of scopes, kept in a plaintext file `%APPDATA%\xdg.config\.wrangler\config\default.toml`, shared by every project on this Windows account (that is how a login from another project or an earlier session can already be there). Never read, print or copy that file, never ask for an API token, never put a token in a file or command. `wrangler logout` removes it. Wrangler also keeps logs there and sends anonymous usage data unless `WRANGLER_SEND_METRICS=false` (deploy.mjs sets it).
- **Before the first deploy, always `run.cmd npx.cmd wrangler whoami`.** Tell the user, in one line, the email and account name it shows, and ask "is this the right account for this site?" (work and personal accounts are easy to mix up). Only then record it in NOTES and pass its id to deploy.

### The steps

Record in `tools/<name>/NOTES.md` under a "Website" heading (one line each; `deploy.mjs` reads them; the words in brackets are examples):

```
- Cloudflare account: <account name> (<32-character id>), confirmed by the user <date>
- Visibility: private
- Access: on (all Workers in the account), set up <date>        <- only after the user did step 4 (or 5: "this Worker")
- Address: on (verified <date>)                                  <- only after --go-live succeeded
```

From `tools/<name>/app/`:

```
..\..\..\.workbench\scripts\run.cmd npm.cmd run deploy -- --account <id>              # 1. first upload, NO address
..\..\..\.workbench\scripts\run.cmd npm.cmd run deploy -- --account <id> --go-live    # 2. after Access is recorded: address on, checked
..\..\..\.workbench\scripts\run.cmd npm.cmd run deploy -- --account <id>              # 3. every later update
```

Exit codes: `0` done as recorded | `1` refused, nothing uploaded (read the message; it names the fix) | `2` was public by mistake, taken offline: tell the user plainly, fix Access, remove "Address: on", start again | `3` uploaded but not verified: do not say it's live; `run.cmd node scripts/check-url.mjs <address> private` | `4` wrangler or the build failed / not logged in | `5` recorded public but still asks for sign-in (the public step isn't done).

Only after exit `0` from `--go-live` write `Address: on`, then tell the user the address and what they will see: a sign-in page first. To see it yourself: `run.cmd node scripts/check-url.mjs https://<address>` must print "asks for sign-in (private)". Never tell the user it's live on any other evidence. The deploy only keeps the built files; there is no data on the site to back up.

Updates use save points as usual: change, test, `npm run deploy -- --account <id>` (step 3), save point. "Go back": restore the files ([stack.md](../../stack.md#save-points)), rebuild, deploy again.

Taking a site down: `run.cmd npx.cmd wrangler delete --name <name> --force` (only sites this project deployed), then in the dashboard remove its Access rule if it has its own; note it in NOTES; the user may `wrangler logout`.

### Making it public

Ask **before** anything else; never suggest it as a side effect. For a **portfolio or other site meant for everyone, public is the natural answer**: say that, and that being found through search is something you can work on (SEO, below). For everything else the default stays private. One message, plain words, with your suggestion:

> "Right now only people you let in can open this, and they sign in first. Do you want anyone on the internet to be able to open it, and find it in Google? If yes: everything on it, all the pages and files, can be seen and copied by anyone. Is there anything on it you wouldn't put on a public notice board?"

Then read back what will be public (the pages, the files in `public/`) and get their yes in their own words. Only then, in this order:

1. NOTES: change the line to `Visibility: public (confirmed <date>: "<their words>")`. `deploy.mjs` refuses a public deploy without it.
2. The user, in the dashboard: **Workers & Pages** -> the site -> **Access** tab -> the option to make the Worker public (with path A this adds a bypass for this site only; with path B, turn its Access off). Say it in these words; then it's their click, not yours.
3. Site changes: remove `<meta name="robots" content="noindex">` from `index.html`; `public/robots.txt` -> `User-agent: *`, `Allow: /`, `Sitemap: https://<address>/sitemap.xml`; add `public/sitemap.xml` (see SEO).
4. `npm run deploy -- --account <id>`: exit `0` "Live and public". Exit `5` means step 2 isn't done yet.

Back to private: `Visibility: private`, Access back on (remove the bypass / re-protect the Worker), restore `noindex` and `Disallow: /`, deploy; the check must say private. Search engines may already have copies; removal is a request the user makes in each search engine (offer to explain).

### Own address (custom domain)

Not built. `deploy.mjs` refuses a `routes` entry on purpose. It needs a domain on Cloudflare (DNS moved there, which is the user's step and may cost money for the domain), `routes` with `custom_domain: true`, an Access rule for that hostname, and `deploy-flow.mjs` extended to look at that hostname too. Plan it as its own change with the user; `workers.dev` is fine to start. Cloudflare recommends a custom domain for anything important; `workers.dev` is meant for personal and hobby sites.

## SEO (public sites only)

- Every page needs a good title and description. The starter has one of each in `index.html`; per-page titles: set `document.title` in each page component (`useEffect`), and keep the description meaningful.
- Search engines run the page's JavaScript, but slowly, and chat apps and social previews do not. For sharing previews put static `og:title`, `og:description`, `og:image` in `index.html`. A site where being found is the whole point (a business) may later want its pages prerendered: a separate change, say so honestly.
- `public/robots.txt` allowing everything plus the sitemap line; `public/sitemap.xml` listing the real page addresses (one `<url><loc>` each; a small hand-kept file is fine while the pages are few).
- Real content in real text (not only in images), sensible headings, fast pages, a custom domain over time. Only the user can register the site in Google Search Console / Bing Webmaster Tools; offer to walk them through it.
- Private sites: keep `noindex` and `Disallow: /`; Access already hides everything.

## What to say plainly

- Data on a website is Cloudflare's, i.e. someone else's servers. There is no place for private data here: everything reachable by a visitor can be copied. No secrets in code, `public/` or config, ever. A backend or database is a separate, planned change (a Worker, with its own design and its own rules), not something to bolt on.
- Costs: Cloudflare Workers Free plan; requests for static files are free and unlimited (no Worker code runs); Zero Trust Free needs payment details on file and is not charged up to 50 people. File count and size limits: developers.cloudflare.com/workers/platform/limits/#static-assets. A domain name costs money.
- For a work site where company rules apply (or the user isn't sure), IT may need to say yes (forwardable message, `safety.md`): what it is, that files are copied to Cloudflare, who can sign in, that no company data goes on it.

## Verified (scratch project, Node 24.21.0 as `bootstrap.ps1` installs, Windows 11)

- Clean copy of this folder: `npm ci` (install scripts off), typecheck, 29 tests, `vite build`, `wrangler deploy --dry-run` all pass. `wrangler dev --ip 127.0.0.1` (workerd) and `vite preview` serve it; single-page fallback works, deep links too; a missing file answers 200 with the home page (as documented above).
- In Edge against the built site: home, Books list (React Query), search 5 -> 2 rows, wrong address shows the not-found page, no console errors.
- Deploy order, driven with fakes: nothing uploaded without an explicit, user-confirmed account found in the wrangler login; first upload has no address; go-live needs Access recorded; test page before the real site and deleted after; a public test page blocks the real address; a private site found public is taken offline; public sites need the confirmation line.

## Not verified

- Any real deploy: no deploy of this starter has been run. Untested against real Cloudflare: the shape of `wrangler whoami` (deploy-flow only checks that the account id appears in its text), that an Access-protected address answers an anonymous request with a redirect to `*.cloudflareaccess.com` (or 401/403), how long a new Worker takes to pick up account-wide Access (the test page waits about 45 seconds), and the exact dashboard wording (taken from Cloudflare's docs of Aug-Sep 2026).
- macOS; a custom domain; per-page SEO on a live site.
