// Opens the new version of a tool as a "trying-out" copy, next to the version the user has in use.
//   .workbench\scripts\run.cmd bun .workbench\scripts\try.ts <tool>
// Electron: copies the packaged build to tools\<tool>\trying-out\ (so packaging again never collides with an
//   open trial), makes a fresh practice copy of the real data in %TEMP%\workbench-trying-out\<TOOL_ID>\data
//   (Temp because Codex's sandbox can write there, not in %LOCALAPPDATA%) and starts the copy on it
//   (its window title says "trying out", it has its own profile; tools\<tool>\current is never touched).
// One HTML file: builds out\<title> (trying out).html (own practice storage) and opens it.
// Website: says how to preview; starts nothing.
// Always ends with the versions to record under "Built with" in the tool's NOTES.
// Electron and one-HTML-file trials are Windows-only for now. Run it outside the sandbox (it opens a window).
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dir, '..', '..');
const win = process.platform === 'win32';

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const tool = process.argv[2] ?? '';
if (!tool) fail('Usage: try.ts <tool>');
if (!/^[a-z0-9-]+$/.test(tool)) fail(`Tool names are lowercase letters, digits and dashes: ${tool}`);

const toolDir = path.join(root, 'tools', tool);
const app = path.join(toolDir, 'app');
if (!existsSync(path.join(app, 'package.json'))) fail(`tools\\${tool}\\app has no app yet.`);

const nodeExe = path.join(root, '.tools', 'node', win ? 'node.exe' : path.join('bin', 'node'));
// The project's own tools first on PATH, as run.cmd does.
const toolPath = [path.join(root, '.tools', 'bun'), path.join(root, '.tools', 'node'), path.join(root, '.tools', 'git', 'cmd'), process.env.PATH ?? ''].join(path.delimiter);

const readText = (file: string) => readFileSync(file, 'utf8');

function lockVersion(name: string): string | null {
  const lockFile = path.join(app, 'package-lock.json');
  if (!existsSync(lockFile)) return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
  const m = new RegExp(`"node_modules/${escaped}":\\s*\\{\\s*"version":\\s*"([^"]+)"`).exec(readText(lockFile));
  return m ? m[1] : null;
}

const isWeb = existsSync(path.join(app, 'wrangler.jsonc'));
const isHtml = existsSync(path.join(app, 'build.mjs')) && !existsSync(path.join(app, 'forge.config.ts'));
let did = '';

if (!isWeb && !win) fail('Trying out an Electron tool or a one-HTML-file tool only works on Windows for now.');

if (isWeb) {
  console.log('A website is tried out with the local preview (this computer only): from the app folder,');
  console.log('  run.cmd npm.cmd run build, then run.cmd npm.cmd run preview (http://127.0.0.1:4173); stop it when done.');
  console.log('The live site is the version in use; only a deploy changes it.');
  did = 'website preview';
} else if (isHtml) {
  const build = Bun.spawnSync([nodeExe, 'build.mjs', '--try'], { cwd: app, env: { ...process.env, PATH: toolPath }, stdin: 'ignore', stdout: 'inherit', stderr: 'inherit' });
  if (build.exitCode !== 0) fail('The build failed (see above).');
  const outDir = path.join(app, 'out');
  const pages = existsSync(outDir)
    ? readdirSync(outDir, { withFileTypes: true })
        .filter((e) => e.isFile() && e.name.endsWith('(trying out).html'))
        .map((e) => ({ name: e.name, mtimeMs: statSync(path.join(outDir, e.name)).mtimeMs }))
        .sort((a, b) => b.mtimeMs - a.mtimeMs)
    : [];
  if (pages.length === 0) fail('The build made no "(trying out).html" page in out\\.');
  const page = pages[0];
  // Opens with the default program for .html, like double-clicking it.
  Bun.spawnSync(['rundll32.exe', 'url.dll,FileProtocolHandler', path.join(outDir, page.name)], { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' });
  console.log(`Opened ${page.name} in the browser. It keeps its own practice data; the copy in tools\\${tool}\\current is unchanged.`);
  did = 'trying-out page opened';
} else {
  const main = readText(path.join(app, 'src', 'main.ts'));
  const toolId = /const TOOL_ID = '([^']+)'/.exec(main)?.[1] ?? '';
  if (!toolId || toolId === 'set-when-copied') fail('src\\main.ts needs its real TOOL_ID first.');
  if (!main.includes('ON_A_COPY')) {
    fail("This tool is from before 0.2.4: copy the ON_A_COPY lines from the starter's main.ts into src\\main.ts first (stack.md, \"In use and trying out\"), then package again.");
  }
  const exeName = /executableName:\s*'([^']+)'/.exec(readText(path.join(app, 'forge.config.ts')))?.[1] ?? '';
  const outDir = path.join(app, 'out');
  const exe = (existsSync(outDir) ? readdirSync(outDir, { withFileTypes: true }) : [])
    .filter((e) => e.isDirectory() && e.name.endsWith('-win32-x64'))
    .map((e) => path.join(outDir, e.name, `${exeName}.exe`))
    .filter((f) => existsSync(f))
    .map((f) => ({ file: f, mtimeMs: statSync(f).mtimeMs }))
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0];
  if (!exe) fail('No packaged build yet: run.cmd npm.cmd run package first.');
  const srcDir = path.join(app, 'src');
  const newest = readdirSync(srcDir, { recursive: true, encoding: 'utf8' })
    .map((rel) => ({ name: path.basename(rel), stat: statSync(path.join(srcDir, rel)) }))
    .filter((f) => f.stat.isFile())
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)[0];
  if (newest && newest.stat.mtimeMs > exe.mtimeMs) fail(`The build is older than the code (${newest.name} changed since): run.cmd npm.cmd run package first.`);

  // Close the previous trying-out copy: anything running from tools\<tool>\trying-out or app\out only ever
  // had practice data (the version in use runs from current\). Get-Process, not WMI: Codex's sandbox
  // refuses WMI queries. A lookup that fails never stops the script.
  const trialApp = path.join(toolDir, 'trying-out');
  const dirs = [trialApp + path.sep, outDir + path.sep];
  let old: number[] = [];
  try {
    const found = Bun.spawnSync(
      [
        'powershell.exe',
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        "$d = $env:WB_DIRS -split '\\|'; Get-Process -ErrorAction SilentlyContinue | Where-Object { $p = $_.Path; $p -and @($d | Where-Object { $p.StartsWith($_, [StringComparison]::OrdinalIgnoreCase) }).Count -gt 0 } | ForEach-Object { $_.Id }",
      ],
      { env: { ...process.env, WB_DIRS: dirs.join('|') }, stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' },
    );
    old = found.stdout.toString().split(/\r?\n/).map((s) => Number(s.trim())).filter((n) => Number.isInteger(n) && n > 0);
  } catch {
    // a failed lookup never stops the script
  }
  if (old.length > 0) {
    for (const pid of old) {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // already gone
      }
    }
    Bun.sleepSync(2000);
    console.log('Closed the previous trying-out copy (it only had practice data).');
  }
  try {
    if (existsSync(trialApp)) rmSync(trialApp, { recursive: true, force: true });
  } catch {
    fail('The previous trying-out window is still open and could not be closed from here: ask the user to close the window whose title says "trying out", then run this again.');
  }
  cpSync(path.dirname(exe.file), trialApp, { recursive: true });
  const trialExe = path.join(trialApp, path.basename(exe.file));
  const tryRoot = path.join(os.tmpdir(), 'workbench-trying-out', toolId);
  const realData = path.join(process.env.LOCALAPPDATA ?? '', 'WorkbenchTools', toolId, 'data');
  let practice: string;
  if (existsSync(path.join(app, 'src', 'data-safety-cli.mjs'))) {
    // A consistent copy even while the version in use has its database open.
    const env: Record<string, string | undefined> = { ...process.env, PATH: toolPath };
    delete env.WORKBENCH_DATA_DIR;
    const cli = Bun.spawnSync(
      [nodeExe, '--disable-warning=MODULE_TYPELESS_PACKAGE_JSON', '--disable-warning=ExperimentalWarning', path.join('src', 'data-safety-cli.mjs'), 'practice'],
      { cwd: app, env, stdin: 'ignore', stdout: 'pipe', stderr: 'pipe' },
    );
    const out = [cli.stdout.toString(), cli.stderr.toString()].filter((s) => s.trim() !== '').join('\n').replace(/\s+$/, '');
    if (cli.exitCode !== 0) fail(out);
    practice = cli.stdout.toString().split(/\r?\n/).map((s) => s.trim()).filter((s) => s !== '').pop() ?? '';
    if (!practice) fail(out || 'The data-safety tool printed no practice folder.');
  } else {
    try {
      if (existsSync(tryRoot)) rmSync(tryRoot, { recursive: true, force: true });
    } catch (e) {
      fail(`Could not replace the old practice copy (${(e as Error).message}). If a window titled "trying out" is open, ask the user to close it, then run this again.`);
    }
    practice = path.join(tryRoot, 'data');
    if (existsSync(realData)) cpSync(realData, practice, { recursive: true });
    else mkdirSync(practice, { recursive: true });
  }
  // Detached and visible: the script ends while the window stays open.
  const child = Bun.spawn([trialExe], {
    env: { ...process.env, WORKBENCH_DATA_DIR: practice },
    stdin: 'ignore',
    stdout: 'ignore',
    stderr: 'ignore',
    detached: true,
    windowsHide: false,
  });
  child.unref();
  console.log(`Started the trying-out copy (process ${child.pid}) from tools\\${tool}\\trying-out on a fresh practice copy of the data: ${practice}`);
  console.log(`Its window title says 'trying out'. The version in use (tools\\${tool}\\current) and the real data were not touched.`);
  did = 'trying-out copy started';
}

// Versions, written into the tool's NOTES under "Built with" so it can be rebuilt the same way later.
let node = '';
try {
  node = Bun.spawnSync([nodeExe, '-v'], { stdin: 'ignore', stdout: 'pipe', stderr: 'ignore' }).stdout.toString().trim();
} catch {
  // no project Node yet: the line is left empty
}
const wb =
  readText(path.join(root, '.workbench', 'VERSION'))
    .split(/\r?\n/)
    .find((l) => /^version:/.test(l))
    ?.replace(/^version:\s*/, '') ?? '';
const pinned = ['electron', 'wrangler', 'vite', '@openai/codex']
  .map((pkg) => [pkg, lockVersion(pkg)] as const)
  .filter(([, v]) => v)
  .map(([pkg, v]) => `${pkg} ${v}`)
  .join(', ');
let model = '';
const aiRead = path.join(app, 'src', 'ai-read.ts');
if (existsSync(aiRead)) model = /AI_MODEL\s*=\s*'([^']+)'/.exec(readText(aiRead))?.[1] ?? '';
const kind = isWeb ? 'website (starters/web)' : isHtml ? 'one HTML file (starters/html)' : 'Electron (starters/electron)';
const blocks = [
  ['data-safety.ts', 'data-safety'],
  ['sheet.ts', 'excel'],
  ['ai-read.ts', 'ai-read'],
]
  .filter(([file]) => existsSync(path.join(app, 'src', file)))
  .map(([, name]) => name)
  .join(', ');
const pad = (n: number) => String(n).padStart(2, '0');
const today = new Date();
const date = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
const osName = win ? `Windows ${os.release()}.0` : `${os.type()} ${os.release()}`;
const always: [string, string][] = [
  ['Node.js', node],
  ['Pinned', pinned ? `${pinned}; every package: app\\package-lock.json` : 'every package: app\\package-lock.json'],
  ['AI model', model || 'none'],
  ['Last checked', `${date}, ${osName}, ${did}`],
];
// Only filled when empty: where the tool came from can't be seen later, so the first record stands.
const ifEmpty: [string, string][] = [
  ['Starter', `${kind}, workbench ${wb} or earlier`],
  ['Blocks', blocks ? `${blocks}, workbench ${wb} or earlier` : 'none'],
];
const notes = path.join(toolDir, 'NOTES.md');
if (existsSync(notes)) {
  const text = readText(notes);
  const nl = text.includes('\r\n') ? '\r\n' : '\n';
  const ls = text.split(/\r?\n/);
  let start = ls.indexOf('## Built with');
  if (start < 0) {
    let at = ls.indexOf('## Things that work');
    if (at < 0) at = ls.length;
    ls.splice(at, 0, '## Built with', '(Exact versions, so this tool can be rebuilt the same way later.)', '');
    start = at;
  }
  let end = start + 1;
  while (end < ls.length && !ls[end].startsWith('## ')) end++;
  for (const [pairs, overwrite] of [[always, true], [ifEmpty, false]] as const) {
    for (const [label, value] of pairs) {
      const line = `${label}: ${value}`;
      let found = -1;
      for (let i = start + 1; i < end; i++) {
        if (ls[i].startsWith(`${label}:`)) {
          found = i;
          break;
        }
      }
      if (found >= 0) {
        if (overwrite || ls[found].trim() === `${label}:`) ls[found] = line;
      } else {
        let ins = end;
        while (ins > start + 1 && ls[ins - 1].trim() === '') ins--;
        ls.splice(ins, 0, line);
        end++;
      }
    }
  }
  writeFileSync(notes, ls.join(nl), 'utf8');
  console.log('');
  console.log(`Recorded under "Built with" in tools\\${tool}\\NOTES.md: Node.js ${node}; ${always[1][1]}; last checked today. Check the Starter and Blocks lines are right.`);
}
