import { app, BrowserWindow, dialog, ipcMain, Menu, protocol, session } from 'electron';
import type { IpcMainInvokeEvent } from 'electron';
import started from 'electron-squirrel-startup';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CHANNELS } from './shared.ts';
import type { OpenedFile, SaveResult } from './shared.ts';
import { loadSkills, saveSkills } from './skillStore.ts';

// Squirrel runs the exe with --squirrel-install / --squirrel-uninstall etc. to create and
// remove shortcuts. Handle that and quit before doing anything else.
if (started) app.quit();

// ------------------------------------------------------------------ constants

const APP_ORIGIN = 'app://local';
const DEV_URL = MAIN_WINDOW_VITE_DEV_SERVER_URL; // undefined in a packaged build
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const RESUME_EXTENSIONS = ['pdf', 'docx', 'txt'];

// Debug-only hooks. They are ignored in a packaged app (app.isPackaged), so the shipped exe
// has no way to load files except the native Open dialog.
const DEBUG = !app.isPackaged;
if (DEBUG && process.env.RESUME_PARSER_DATA_DIR) app.setPath('userData', process.env.RESUME_PARSER_DATA_DIR);

// Strict production policy. No remote origin appears anywhere. The pdf.js worker is a
// same-origin file (worker-src 'self'). style-src has no 'unsafe-inline': the page sets no
// inline style attributes.
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

// ------------------------------------------------------------------ files the user confirmed

/** Absolute paths that came out of a native Open dialog the user confirmed. Nothing else is ever read. */
const confirmedResumes = new Set<string>();
const samePath = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();

async function readConfirmed(filePath: string): Promise<OpenedFile> {
  const name = path.basename(filePath);
  const ext = path.extname(filePath).slice(1).toLowerCase();
  if (!RESUME_EXTENSIONS.includes(ext)) return { name, error: `unsupported file type ".${ext}" (use .pdf, .docx or .txt)` };
  try {
    const info = await stat(filePath);
    if (!info.isFile()) return { name, error: 'not a file' };
    if (info.size > MAX_FILE_BYTES) return { name, error: `file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB` };
    confirmedResumes.add(path.resolve(filePath).toLowerCase());
    return { name, bytes: new Uint8Array(await readFile(filePath)) };
  } catch (e) {
    return { name, error: `could not read file: ${e instanceof Error ? e.message : String(e)}` };
  }
}

// ------------------------------------------------------------------ IPC

/** Only our own page may call the handlers (never a frame with another origin). */
function assertTrusted(event: IpcMainInvokeEvent): void {
  const url = event.senderFrame?.url ?? '';
  const ok = url.startsWith(`${APP_ORIGIN}/`) || (DEV_URL !== undefined && url.startsWith(DEV_URL));
  if (!ok) throw new Error(`IPC from untrusted frame: ${url}`);
}

function registerIpc(getWindow: () => BrowserWindow | null): void {
  ipcMain.handle(CHANNELS.openResumes, async (event): Promise<OpenedFile[]> => {
    assertTrusted(event);
    let paths: string[];
    if (DEBUG && process.env.RESUME_PARSER_DEBUG_FILES) {
      paths = process.env.RESUME_PARSER_DEBUG_FILES.split(';').filter(Boolean);
    } else {
      const win = getWindow();
      const options: Electron.OpenDialogOptions = {
        title: 'Open resumes',
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Resumes (PDF, Word, text)', extensions: RESUME_EXTENSIONS },
          { name: 'All files', extensions: ['*'] },
        ],
      };
      const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options);
      if (result.canceled) return [];
      paths = result.filePaths;
    }
    return Promise.all(paths.map(readConfirmed));
  });

  ipcMain.handle(CHANNELS.saveXlsx, async (event, bytes: unknown, suggestedName: unknown): Promise<SaveResult> => {
    assertTrusted(event);
    if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_BYTES) {
      return { status: 'refused', reason: 'nothing to save' };
    }
    const base = typeof suggestedName === 'string' ? path.basename(suggestedName) : 'resumes.xlsx';
    const win = getWindow();
    const options: Electron.SaveDialogOptions = {
      title: 'Export to Excel',
      defaultPath: base.toLowerCase().endsWith('.xlsx') ? base : `${base}.xlsx`,
      filters: [{ name: 'Excel workbook', extensions: ['xlsx'] }],
    };
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options);
    if (result.canceled || !result.filePath) return { status: 'cancelled' };
    const target = result.filePath;
    if (path.extname(target).toLowerCase() !== '.xlsx') return { status: 'refused', reason: 'the file name must end in .xlsx' };
    for (const opened of confirmedResumes) {
      if (samePath(opened, target)) return { status: 'refused', reason: 'that is one of your resumes; pick a new file name' };
    }
    await writeFile(target, bytes); // a NEW file chosen in the Save dialog; the source resumes are never written
    return { status: 'saved', path: target, bytes: bytes.byteLength };
  });

  ipcMain.handle(CHANNELS.loadSkills, async (event) => {
    assertTrusted(event);
    return loadSkills(app.getPath('userData'));
  });

  ipcMain.handle(CHANNELS.saveSkills, async (event, skills: unknown) => {
    assertTrusted(event);
    await saveSkills(app.getPath('userData'), skills);
  });
}

// ------------------------------------------------------------------ own protocol for the packaged page

// A real origin (app://local) instead of file:// gives the page a proper same-origin scope for
// the pdf.js worker, and lets us attach the CSP as a response header.
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

const blockedRequests: string[] = [];

function hardenSession(): void {
  const ses = session.defaultSession;

  // Found by watching the sockets of a fresh profile: with spellcheck on (Electron's default on
  // Windows) the browser process downloads en-US-10-1.bdic from Google on first launch. That is a
  // network request that the webRequest filter below never sees. Turn spellcheck off entirely.
  ses.setSpellCheckerEnabled(false);
  ses.setSpellCheckerLanguages([]);

  // Belt and braces: nothing may leave the machine. Only our own origin, the dev server, and
  // in-memory schemes are allowed. Every blocked request is logged.
  ses.webRequest.onBeforeRequest((details, callback) => {
    const url = details.url;
    const allowed =
      url.startsWith(`${APP_ORIGIN}/`) ||
      url.startsWith('blob:') ||
      url.startsWith('data:') ||
      url.startsWith('devtools:') ||
      (DEV_URL !== undefined && (url.startsWith(DEV_URL) || url.startsWith(DEV_URL.replace('http:', 'ws:'))));
    if (!allowed) {
      blockedRequests.push(url);
      console.warn(`[blocked request] ${details.method} ${url}`);
    }
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
    width: 1500,
    height: 860,
    show: false,
    title: 'Resume Parser (Electron)',
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
  if (DEBUG && process.env.RESUME_PARSER_DEVTOOLS === '1') mainWindow.webContents.openDevTools({ mode: 'detach' });
}

if (!started) {
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
}
