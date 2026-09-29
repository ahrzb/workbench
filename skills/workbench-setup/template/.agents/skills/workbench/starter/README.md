# Starter: hardened Electron + TypeScript

For the AI, not the user. Copy everything in this folder into `<project>/app/` and work there. Never scaffold with `create-electron-app`: its template is stale and not hardened.

## Files

| File | What it does |
|---|---|
| `package.json`, `package-lock.json` | Exact pins (`electron` is exact, the rest `^`). `overrides` swaps `@electron/rebuild` for 4.x so the install needs no `git`. Commit the lockfile. |
| `src/main.ts` | Main process: window, security settings, `app://` protocol with the CSP, IPC handlers (open a file, save a file). |
| `src/preload.ts` | The only bridge to the page: `window.api` with named functions. |
| `src/shared.ts` | The `Api` type and the IPC channel names. Change this first when adding a feature. |
| `src/renderer.ts`, `index.html`, `src/index.css` | The page. Plain DOM, no framework. |
| `src/logic.ts`, `test/logic.test.mjs` | Pure logic and its tests. Rules the tool must get right go here, not in `main.ts` or `renderer.ts`. |
| `forge.config.ts` | Packaging and the fuses. Rename `executableName` together with `productName` in `package.json`. |
| `vite.*.config.mts`, `tsconfig.json`, `forge.env.d.ts`, `src/globals.d.ts` | Build and type setup. Rarely touched. |

Rename the tool: `name`, `productName` (`package.json`), `executableName` (`forge.config.ts`), `<title>` and `<h1>` (`index.html`). The packaged exe is `out\<productName>-win32-x64\<executableName>.exe`.

## Run (from `app\`)

```
..\.workbench\scripts\run.cmd npm.cmd ci
..\.workbench\scripts\run.cmd npx.cmd install-electron --no
..\.workbench\scripts\run.cmd npm.cmd test
..\.workbench\scripts\run.cmd npm.cmd run typecheck
..\.workbench\scripts\run.cmd npm.cmd run package    # -> out\<productName>-win32-x64\
```

There is no dev server: `electron-forge start` runs Vite's dev server, which listens on a local port, and the tool opens no ports. To try a change, package it (about 20 s) and start `out\<productName>-win32-x64\<executableName>.exe`.

**Where the tool keeps its data:** `dataDir()` in `main.ts`: `%LOCALAPPDATA%\<productName>\data` (Electron's default `userData` is the Roaming folder, which can sync), or `WORKBENCH_DATA_DIR` when the workbench tests a version against a copy of the data. Never inside the project folder.

Always `npm.cmd` / `npx.cmd`, never a bare `npm`. `install-electron --no` fetches the Electron binary now, so a blocked download fails during setup instead of when the user first opens the tool.

Adding a dependency: `..\.workbench\scripts\run.cmd npm.cmd install <pkg>` (first ask whether the tool really needs it), then the native-module check below, then `npm test` and `npm run package`.

## Never loosen (all in `src/main.ts` unless noted)

- `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webSecurity: true`, `allowRunningInsecureContent: false`, `devTools` only when not packaged.
- The page loads from `app://local` (never `file://`, never a remote URL). The CSP is sent as a header: `default-src 'none'; script-src 'self'; ...`. No `unsafe-inline`, no `unsafe-eval`, no remote origin. That means no inline `<script>`, no `style=""` attributes, no CDN fonts or scripts.
- `session.webRequest.onBeforeRequest` cancels every request that is not `app://local`, `blob:` or `data:`. Do not add hosts. If the tool needs the network, that is a design decision with the user (see `safety.md`), not a code tweak.
- Spellcheck is off (session, `webPreferences`, download URL). A default Electron app phones Google for a dictionary on first launch.
- Navigation, redirects, `window.open`, `<webview>` are blocked. All permission requests are denied.
- `preload.ts` exposes named functions only. Never `ipcRenderer`, `fs`, `require`, or a generic `invoke(channel, ...)`.
- Every IPC handler calls `assertTrusted(event)` and validates its arguments (type, size). The page never sends a file path: main reads only what the native Open dialog returned and writes only what the Save dialog returned, with exclusive create (`wx`), so an original is never overwritten. Keep the size caps.
- Untrusted file formats (PDF, DOCX, images) are parsed in the sandboxed renderer, not in main.
- Debug hooks (env variables, DevTools) must be gated on `!app.isPackaged`.
- Fuses in `forge.config.ts`: `RunAsNode` off, `EnableNodeOptionsEnvironmentVariable` off, `EnableNodeCliInspectArguments` off, `GrantFileProtocolExtraPrivileges` off, cookie encryption on, ASAR integrity on, only-load-from-ASAR on.
- No native Node modules (they need a compiler, which needs admin).

## Native-module check (after every dependency change)

1. `package-lock.json`: entries with `"hasInstallScript": true`. Starter baseline: only `fsevents` (optional, macOS only). Anything new needs a look at what its install script does.
2. `binding.gyp` files anywhere under `node_modules`. Baseline: none.
3. `*.node` files. Baseline, all prebuilt inside the npm package and fine: `@rolldown/binding-*`, `lightningcss-*`, `@electron-internal/extract-zip`. A new `*.node` from a package that also has an install script or a `binding.gyp` means it compiles or downloads a binary.

Any real hit means: pick another package, or a pure-JS or WASM alternative. Do not install a compiler.

## Every build ends with

`npm test`, `npm run package`, then start the packaged exe and confirm it stays running and listens on nothing: `Get-NetTCPConnection -State Listen` and `Get-NetUDPEndpoint` filtered to the exe's process IDs must return nothing.
