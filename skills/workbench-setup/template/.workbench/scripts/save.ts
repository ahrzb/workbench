// Makes a save point from an explicit list of permitted files, never from ignore rules
// (a .gitignore anywhere in the project could otherwise let documents or secrets in).
// The save point holds exactly the permitted files that exist now; everything else is left out.
//   .workbench\scripts\run.cmd bun .workbench\scripts\save.ts "<message in the user's words>"
//   .workbench\scripts\run.cmd bun .workbench\scripts\save.ts -List    shows what would be saved, saves nothing
// macOS: .tools/bun/bun .workbench/scripts/save.ts "<message>"   (or --list)
// Uses git (history in .workbench/history) when it is safe to run; on a Mac without usable git it
// copies the permitted files into .workbench/snapshots/<yyyy-mm-dd-hhmm>-<words>/ instead.
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..', '..')
const win = process.platform === 'win32'

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}

const args = process.argv.slice(2)
const list = args.some((a) => /^--?list$/i.test(a))
const message = args.find((a) => !/^--?list$/i.test(a)) ?? ''

// The permitted files, as paths relative to the project with forward slashes (matched ignoring
// case). Each tool lives in tools/<name>/ (name: lowercase letters, digits, hyphens): its notes,
// its words and its code.
const W = String.raw`\p{L}\p{N}_`
const allowed = [
  String.raw`^(\.gitignore|\.gitattributes|AGENTS\.md)$`,
  String.raw`^\.codex/hooks\.json$`,
  String.raw`^\.codex/hooks/session-start\.(ps1|sh)$`,
  String.raw`^\.codex/agents/[a-z0-9_-]+\.toml$`,
  String.raw`^\.agents/skills/workbench/[${W}./-]+\.(md|ts|tsx|mts|mjs|css|html|jsonc|txt)$`,
  String.raw`^\.agents/skills/workbench/starters/[a-z0-9-]+/(package|package-lock|tsconfig|components)\.json$`,
  String.raw`^\.agents/skills/workbench/starters/web/public/[${W}./-]+\.json$`,
  // The bundled design skill (never its engine .exe) and the project's design settings.
  String.raw`^\.agents/skills/impeccable/[${W}./-]+\.(md|json|toml|yaml|js|cmd)$`,
  String.raw`^\.agents/skills/impeccable/(LICENSE|scripts/VERSION|scripts/impeccable)$`,
  String.raw`^\.impeccable/config\.json$`,
  String.raw`^\.workbench/scripts/(bootstrap\.ps1|run\.cmd|git\.cmd|account\.ps1|account\.sh|[a-z0-9-]+\.ts)$`,
  String.raw`^\.workbench/(session-brief\.md|NOTES\.md|VERSION|account)$`,
  String.raw`^tools/[a-z0-9-]+/(NOTES|CONTEXT)\.md$`,
  // A tool's spec (the guide's: model, screens, backlog).
  String.raw`^tools/[a-z0-9-]+/model\.json$`,
  // A tool's design notes (impeccable's product and design records, briefs and reviews; no screenshots).
  String.raw`^tools/[a-z0-9-]+/(PRODUCT|DESIGN)\.md$`,
  String.raw`^tools/[a-z0-9-]+/\.impeccable/(config|design)\.json$`,
  String.raw`^tools/[a-z0-9-]+/\.impeccable/(surfaces|critique)/[${W}.-]+\.md$`,
  String.raw`^tools/[a-z0-9-]+/app/(package\.json|package-lock\.json|tsconfig\.json|index\.html|build\.mjs|forge\.config\.ts|forge\.env\.d\.ts|vite\.config\.ts|wrangler\.jsonc|components\.json|README\.md)$`,
  String.raw`^tools/[a-z0-9-]+/app/vite\.(main|preload|renderer)\.config\.mts$`,
  String.raw`^tools/[a-z0-9-]+/app/src/[${W}./-]+\.(ts|tsx|mts|mjs|css|html)$`,
  String.raw`^tools/[a-z0-9-]+/app/test/[${W}./-]+\.(ts|mjs)$`,
  String.raw`^tools/[a-z0-9-]+/app/scripts/[${W}.-]+\.mjs$`,
  // A website's published files: only what is meant to be public goes in public/.
  String.raw`^tools/[a-z0-9-]+/app/public/[${W}./-]+\.(txt|xml|json|svg|png|jpg|jpeg|webp|ico|webmanifest)$`,
].map((s) => new RegExp(s, 'iu'))

// Only these places are searched (never node_modules, builds, tools' copies in use, samples or data).
const places = ['.', '.codex', '.codex/hooks', '.codex/agents', '.workbench', '.workbench/scripts', '.impeccable']
const recurse = ['.agents/skills/workbench', '.agents/skills/impeccable']
const toolsDir = path.join(root, 'tools')
if (fs.existsSync(toolsDir) && fs.statSync(toolsDir).isDirectory()) {
  for (const t of fs.readdirSync(toolsDir, { withFileTypes: true })) {
    if (!t.isDirectory()) continue
    const b = `tools/${t.name}`
    places.push(b, `${b}/app`, `${b}/app/scripts`, `${b}/.impeccable`, `${b}/.impeccable/surfaces`, `${b}/.impeccable/critique`)
    recurse.push(`${b}/app/src`, `${b}/app/test`, `${b}/app/public`)
  }
}

function filesIn(rel: string, deep: boolean): string[] {
  const dir = path.join(root, rel)
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return []
  const out: string[] = []
  const walk = (d: string, prefix: string) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isFile()) out.push(prefix + e.name)
      else if (deep && e.isDirectory() && e.name.toLowerCase() !== 'node_modules') walk(path.join(d, e.name), `${prefix}${e.name}/`)
    }
  }
  walk(dir, rel === '.' ? '' : `${rel}/`)
  return out
}

const found = new Set<string>()
for (const [set, deep] of [[places, false], [recurse, true]] as const) {
  for (const place of set) {
    for (const rel of filesIn(place, deep)) {
      if (/\/node_modules\/|(^|\/)\.env/i.test(rel)) continue
      if (allowed.some((re) => re.test(rel))) found.add(rel)
    }
  }
}
const files = [...found].sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()) || (a < b ? -1 : a > b ? 1 : 0))

if (list) {
  for (const f of files) console.log(f)
  process.exit(0)
}
if (!message) fail("Give the save point a message in the user's words.")

function run(cmd: string[], quiet = false): number {
  const r = Bun.spawnSync(cmd, { cwd: root, stdin: 'ignore', stdout: quiet ? 'ignore' : 'inherit', stderr: quiet ? 'ignore' : 'inherit' })
  return r.exitCode ?? 1
}

// Which git to use: Windows always goes through git.cmd (history in .workbench\history). On macOS
// the project's own git, else one on PATH, but /usr/bin/git is only a stub unless the Xcode
// command line tools are installed.
let git: string[] | null = null
if (win) {
  git = [path.join(root, '.workbench', 'scripts', 'git.cmd')]
} else {
  const own = path.join(root, '.tools', 'git', 'bin', 'git')
  const onPath = Bun.which('git')
  let bin: string | null = null
  if (fs.existsSync(own)) bin = own
  else if (onPath && (onPath !== '/usr/bin/git' || run(['xcode-select', '-p'], true) === 0)) bin = onPath
  if (bin) {
    git = [bin, '--git-dir=.workbench/history', `--work-tree=${root}`, '-c', 'safe.directory=*', '-c', 'user.name=Workbench', '-c', 'user.email=workbench@localhost']
  }
}

if (git) {
  const history = path.join(root, '.workbench', 'history')
  if (!fs.existsSync(history)) {
    if (run([...git, 'init', '-q', '-b', 'main']) !== 0) fail('Could not prepare the save point.')
  }
  // The file list and the message go through files, so no name or word can be read as an option
  // (or mangled by cmd.exe on the way through git.cmd).
  const listFile = path.join(root, '.workbench', 'save-list.tmp')
  const msgFile = path.join(root, '.workbench', 'save-message.tmp')
  fs.writeFileSync(listFile, files.map((f) => f + '\0').join(''))
  fs.writeFileSync(msgFile, message)
  try {
    if (run([...git, 'read-tree', '--empty']) !== 0) fail('Could not prepare the save point.')
    if (files.length && run([...git, 'add', '-f', `--pathspec-from-file=${listFile}`, '--pathspec-file-nul']) !== 0) fail('Could not add the files.')
    if (run([...git, 'commit', '-q', '--allow-empty', '-F', msgFile]) !== 0) fail('Could not make the save point.')
  } finally {
    fs.rmSync(listFile, { force: true })
    fs.rmSync(msgFile, { force: true })
  }
} else {
  // No usable git: copy the permitted files into a dated folder.
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const stamp = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
  const words = message.replace(/[^A-Za-z0-9 _-]/g, '_').slice(0, 40)
  const dest = path.join(root, '.workbench', 'snapshots', `${stamp}-${words}`)
  for (const f of files) {
    const to = path.join(dest, f)
    fs.mkdirSync(path.dirname(to), { recursive: true })
    fs.copyFileSync(path.join(root, f), to)
    const st = fs.statSync(path.join(root, f))
    fs.utimesSync(to, st.atime, st.mtime)
  }
}
console.log(`Saved ${files.length} files: ${message}`)
