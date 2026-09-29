import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import { open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { CHANNELS } from './shared.ts';
import type { OpenedText, SaveResult } from './shared.ts';

// HARDENED. Every setting below is deliberate; see README.md ("Never loosen"). Add features,
// do not weaken these.

// ------------------------------------------------------------------ constants

const APP_ORIGIN = 'app://local';
const DEV_URL = MAIN_WINDOW_VITE_DEV_SERVER_URL; // undefined in a packaged build
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const TEXT_EXTENSIONS = ['txt', 'md', 'csv'];

// Debug-only behaviour must be gated on this. A packaged app (app.isPackaged) has no DevTools.
const DEBUG = !app.isPackaged;

/**
 * The tool's permanent identity for its data. Set once when the starter is copied (a short name
 * plus random letters, e.g. 'bills-k3f9x2') and never changed, even when the tool is renamed:
 * renaming must not lose the data, and two tools with the same name must not share it.
 */
const TOOL_ID = 'set-when-copied';

/**
 * Where the tool keeps its own data: %LOCALAPPDATA%\WorkbenchTools\<TOOL_ID>\data (local, never
 * synced; Electron's default userData is the Roaming folder). WORKBENCH_DATA_DIR points a run at a
 * copy instead, which is how the workbench checks an older version against the user's current data.
 */
export function dataDir(): string {
  return process.env.WORKBENCH_DATA_DIR || path.join(process.env.LOCALAPPDATA ?? app.getPath('appData'), 'WorkbenchTools', TOOL_ID, 'data');
}

// Strict production policy. No remote origin appears anywhere. style-src has no
// 'unsafe-inline': the page sets no inline style attributes.
const CSP_PROD = [
  "default-src 'none'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  "worker-src 'self' blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "frame-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
// The Vite dev server injects <style> tags for CSS hot reload and talks to the page over a websocket.
const CSP_DEV = CSP_PROD.replace("style-src 'self'", "style-src 'self' 'unsafe-inline'").replace(
  "connect-src 'self'",
  "connect-src 'self' ws://localhost:*",
);

// ------------------------------------------------------------------ IPC

/** Only our own page may call the handlers (never a frame with another origin). */
function assertTrusted(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? '';
  const ok = url.startsWith(`${APP_ORIGIN}/`) || (DEV_URL !== undefined && url.startsWith(DEV_URL));
  if (!ok) throw new Error(`IPC from untrusted frame: ${url}`);
}

/** Reads a path that came out of the native Open dialog. The page never sends a path. */
async function readConfirmed(filePath: string): Promise<OpenedText> {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!TEXT_EXTENSIONS.includes(ext)) return { name, error: `unsupported file type ".${ext}" (use ${TEXT_EXTENSIONS.map((e) => `.${e}`).join(', ')})` };
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return { name, error: 'not a file' };
    if (info.size > MAX_FILE_BYTES) return { name, error: `file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB` };
    const text = new TextDecoder('utf-8').decode(await readFile(filePath)); // decode() drops a BOM
    return { name, text };
  } catch (e) {
    return { name, error: `could not read file: ${e instanceof Error ? e.message : String(e)}` };
  }
}

function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(CHANNELS.openTextFile, async (event): Promise<OpenedText | null> => {
    assertTrusted(event);
    const win = getWindow();
    const options: Electron.OpenDialogOptions = {
      title: 'Open a text file',
      properties: ['openFile'],
      filters: [{ name: 'Text files', extensions: TEXT_EXTENSIONS }],
    };
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return readConfirmed(result.filePaths[0]);
  });

  ipcMain.handle(CHANNELS.saveTextFile, async (event, text: unknown, suggestedName: unknown): Promise<SaveResult> => {
    assertTrusted(event); // validate every argument: they come from the page
    if (typeof text !== 'string' || Buffer.byteLength(text) > MAX_FILE_BYTES) {
      return { status: 'refused', reason: 'nothing to save' };
    }
    const base = typeof suggestedName === 'string' && suggestedName !== '' ? path.basename(suggestedName) : 'notes.txt';
    const win = getWindow();
    const options: Electron.SaveDialogOptions = {
      title: 'Save text as',
      defaultPath: base,
      filters: [{ name: 'Text files', extensions: TEXT_EXTENSIONS }],
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { status: 'cancelled' };
    const target = result.filePath;
    if (!TEXT_EXTENSIONS.includes(path.extname(target).slice(1).toLowerCase())) {
      return { status: 'refused', reason: `the file name must end in ${TEXT_EXTENSIONS.map((e) => `.${e}`).join(', ')}` };
    }
    // Exclusive create ('wx'): never truncates or overwrites an existing file, so a file the user
    // opened (an original) can never be written, even if they pick its name in the Save dialog.
    try {
      const handle = await open(target, 'wx');
      try {
        await handle.writeFile(text, 'utf8');
      } finally {
        await handle.close();
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') return { status: 'refused', reason: 'that file already exists; pick a new file name' };
      return { status: 'refused', reason: `could not write file: ${e instanceof Error ? e.message : String(e)}` };
    }
    return { status: 'saved', path: target, bytes: Buffer.byteLength(text) };
  });
}

// ------------------------------------------------------------------ own protocol for the packaged page

// A real origin (app://local) instead of file:// lets us attach the CSP as a response header and
// gives the page a proper same-origin scope.
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true } },
]);

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function registerAppProtocol(): void {
  const root = path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}`);
  protocol.handle('app', async (request) => {
    const url = new URL(request.url);
    const rel = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
    const file = path.normalize(path.join(root, rel));
    if (!file.startsWith(root + path.sep)) return new Response('forbidden', { status: 403 });
    try {
      const body = await readFile(file); // works inside app.asar
      return new Response(new Uint8Array(body), {
        headers: {
          'content-type': MIME[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
          'content-security-policy': CSP_PROD,
        },
      });
    } catch {
      return new Response('not found', { status: 404 });
    }
  });
}

// ------------------------------------------------------------------ hardening

function hardenSession(): void {
  const ses = session.defaultSession;

  // With spellcheck on (Electron's default on Windows) the browser process downloads a dictionary
  // from Google on the first launch of a fresh profile. The webRequest filter below never sees
  // that request. So: off, no languages, and an unreachable download URL as a last line.
  ses.setSpellCheckerEnabled(false);
  ses.setSpellCheckerLanguages([]);
  ses.setSpellCheckerDictionaryDownloadURL('http://127.0.0.1:1/');

  // Nothing may leave the machine. Only our own origin, the dev server and in-memory schemes are
  // allowed. Every blocked request is logged.
  ses.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const allowed =
      url.startsWith(`${APP_ORIGIN}/`) ||
      url.startsWith('blob:') ||
      url.startsWith('data:') ||
      url.startsWith('devtools:') ||
      (DEV_URL !== undefined && (url.startsWith(DEV_URL) || url.startsWith(DEV_URL.replace('http:', 'ws:'))));
    if (!allowed) console.warn(`[blocked request] ${details.method} ${url}`);
    callback({ cancel: !allowed });
  });

  // No camera, microphone, notifications, ... for anyone.
  ses.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  ses.setPermissionCheckHandler(() => false);

  if (!DEBUG || DEV_URL === undefined) return;
  ses.webRequest.onHeadersReceived((details, callback) => {
    callback({ responseHeaders: { ...details.responseHeaders, 'Content-Security-Policy': [CSP_DEV] } });
  });
}

function hardenContents(contents: Electron.WebContents): void {
  const isOurs = (url: string) => url.startsWith(`${APP_ORIGIN}/`) || (DEV_URL !== undefined && url.startsWith(DEV_URL));
  contents.on('will-navigate', (event, url) => {
    if (!isOurs(url)) event.preventDefault();
  });
  contents.on('will-redirect', (event, url) => {
    if (!isOurs(url)) event.preventDefault();
  });
  contents.on('will-attach-webview', (event) => event.preventDefault());
  contents.setWindowOpenHandler(() => ({ action: 'deny' })); // no window.open, no target=_blank
}

// ------------------------------------------------------------------ window

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1000,
    height: 700,
    show: false,
    backgroundColor: '#ffffff',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      webSecurity: true,
      allowRunningInsecureContent: false,
      devTools: DEBUG,
      spellcheck: false,
    },
  });
  mainWindow.setMenuBarVisibility(false);
  hardenContents(mainWindow.webContents);
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  if (DEV_URL) void mainWindow.loadURL(DEV_URL);
  else void mainWindow.loadURL(`${APP_ORIGIN}/index.html`);
}

app.whenReady().then(() => {
  if (app.isPackaged) Menu.setApplicationMenu(null);
  hardenSession();
  registerAppProtocol();
  registerIpc(() => mainWindow);
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Any other webContents that might get created (none today) gets the same navigation rules.
app.on('web-contents-created', (_event, contents) => hardenContents(contents));
