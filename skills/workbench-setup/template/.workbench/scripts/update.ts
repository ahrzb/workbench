// Updates this project's workbench to the latest release in one go (Windows; macOS mostly untested).
//   .workbench\scripts\run.cmd bun .workbench\scripts\update.ts [-CheckOnly]
//   macOS: .tools/bun/bun .workbench/scripts/update.ts [--check-only]
// It needs the network and writes .agents\ and .codex\, which Codex's sandbox protects: run it once,
// with approval. Only the workbench's own files change; tools\, notes, history, .tools and data are never
// touched. Downloads only from the source in .workbench\VERSION, at the exact commit of its latest release.
// Keeps a copy of the old files and a save point first; if anything fails, it puts everything back.
// Exit: 0 updated or already up to date; 1 failed (and undone); 3 old one-tool layout (see update.md).
import { createHash } from 'node:crypto'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const win = process.platform === 'win32'
const root = path.resolve(import.meta.dir, '..', '..')
const checkOnly = process.argv.slice(2).some((a) => /^(-|--)check-?only$/i.test(a))
const P = (rel: string) => path.join(root, rel)
const owned = ['.agents/skills/workbench', '.agents/skills/impeccable', '.impeccable/config.json', '.workbench/scripts',
  '.workbench/session-brief.md', '.codex/hooks', '.codex/hooks.json', 'AGENTS.md', '.gitignore', '.gitattributes', '.workbench/VERSION']

// Child processes get the project's own tools first on PATH, like run.cmd does.
const sep = win ? ';' : ':'
const toolsPath = ['bun', 'node', 'git/cmd'].map((d) => P('.tools/' + d)).filter(existsSync)
const env = { ...process.env, PATH: [...toolsPath, process.env.PATH ?? ''].join(sep) }

function run(cmd: string[]) {
  const r = Bun.spawnSync(cmd, { cwd: root, env, stdout: 'pipe', stderr: 'pipe' })
  return { ok: r.exitCode === 0, out: r.stdout.toString() }
}
function getText(url: string): string | null {
  const r = run(['curl', '-fsSL', '-A', 'workbench-update', url])
  return r.ok ? r.out : null
}
function getJson<T>(url: string): T {
  const text = getText(url)
  if (text === null) throw new Error(`Could not download ${url} (no network here, or it's blocked).`)
  return JSON.parse(text) as T // GitHub API reply; the fields used are checked below
}
function lines(text: string): string[] {
  const l = text.split(/\r?\n/)
  if (l.length && l[l.length - 1] === '') l.pop()
  return l
}
function readLines(file: string): string[] { return lines(readFileSync(file, 'utf8')) }
function field(ls: string[], name: string): string {
  const l = ls.find((x) => x.startsWith(name + ':'))
  return l === undefined ? '' : l.slice(name.length + 1).trim()
}
function ver(v: string): number[] {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v)
  if (!m) throw new Error(`'${v}' is not a version number.`)
  return [+m[1], +m[2], +m[3]]
}
function cmp(a: string, b: string): number {
  const x = ver(a), y = ver(b)
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] - y[i]
  return 0
}
function files(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) out.push(...files(p)); else out.push(p)
  }
  return out
}
const hash = (f: string) => createHash('sha256').update(readFileSync(f)).digest('hex')

function savePoint(message: string): boolean {
  return run([process.execPath, P('.workbench/scripts/save.ts'), message]).ok
}

function main() {
  // 1. Which release.
  const verLines = readLines(P('.workbench/VERSION'))
  const current = field(verLines, 'version')
  const source = field(verLines, 'source')
  if (!/^[\w.-]+\/[\w.-]+$/.test(source)) throw new Error(`VERSION names no valid source: '${source}'.`)
  const tag = getJson<{ tag_name?: string }>(`https://api.github.com/repos/${source}/releases/latest`).tag_name
  const next = `${tag}`.replace(/^v/, '')
  if (!/^\d+\.\d+\.\d+$/.test(next)) throw new Error(`Unexpected release tag '${tag}'.`)
  if (cmp(next, current) <= 0) { console.log(`UP_TO_DATE: this project has workbench ${current}, the latest.`); return 0 }
  if (checkOnly) { console.log(`AVAILABLE: workbench ${next} (this project has ${current}).`); return 0 }
  if (existsSync(P('app/package.json')) && !existsSync(P('tools'))) {
    console.log('OLD_LAYOUT: this project still has its one tool in app\\. Move it into tools\\<name>\\ first (update.md), then run this again.')
    return 3
  }
  const sha = getJson<{ sha?: string }>(`https://api.github.com/repos/${source}/commits/${tag}`).sha ?? ''
  if (!/^[0-9a-f]{40}$/.test(String(sha))) throw new Error(`Could not find the commit of ${tag}.`)

  // 2. Download that exact commit (a tag can move; the commit can't).
  const work = P('.workbench/update')
  rmSync(work, { recursive: true, force: true })
  mkdirSync(work, { recursive: true })
  const zip = path.join(work, 'release.zip')
  if (!run(['curl', '-fsSL', '-A', 'workbench-update', '-o', zip, `https://github.com/${source}/archive/${sha}.zip`]).ok) throw new Error(`Could not download release ${next}.`)
  if (!run(['tar', '-xf', zip, '-C', work]).ok) throw new Error('Could not unpack the release.')
  const topName = readdirSync(work, { withFileTypes: true }).find((e) => e.isDirectory())?.name
  if (!topName) throw new Error('Could not unpack the release.')
  const top = path.join(work, topName)
  const tpl = path.join(top, 'skills', 'workbench-setup', 'template')
  const tplVersion = field(readLines(path.join(tpl, '.workbench', 'VERSION')), 'version')
  if (tplVersion !== next) throw new Error(`The release says ${tplVersion} inside, not ${next}; not applied.`)

  // 3. A way back the update can't touch: a copy of every owned path, and a save point.
  const before = path.join(work, 'before')
  for (const o of owned) {
    const src = P(o)
    if (!existsSync(src)) continue
    const dst = path.join(before, o)
    mkdirSync(path.dirname(dst), { recursive: true })
    cpSync(src, dst, { recursive: true, force: true })
  }
  if (!savePoint(`before updating the workbench to ${next}`)) {
    rmSync(work, { recursive: true, force: true })
    throw new Error('Could not make the save point before updating; nothing was changed.')
  }
  let hooksChanged = true
  if (existsSync(P('.codex/hooks.json'))) hooksChanged = hash(P('.codex/hooks.json')) !== hash(path.join(tpl, '.codex', 'hooks.json'))

  const restoreBefore = () => {
    for (const o of owned) {
      const dst = P(o), b = path.join(before, o)
      rmSync(dst, { recursive: true, force: true })
      if (existsSync(b)) {
        mkdirSync(path.dirname(dst), { recursive: true })
        cpSync(b, dst, { recursive: true, force: true })
      }
    }
    for (const f of files(before)) {
      const rel = path.relative(before, f)
      if (!existsSync(P(rel)) || hash(P(rel)) !== hash(f)) throw new Error(`Could not restore ${rel}; the old copy is in ${before}.`)
    }
  }

  try {
    // 4. Replace the owned files (whole folders, so files the release removed are gone too).
    for (const o of owned) {
      if (['.gitignore', '.gitattributes', '.workbench/VERSION'].includes(o)) continue
      const dst = P(o), src = path.join(tpl, o)
      rmSync(dst, { recursive: true, force: true })
      if (existsSync(src)) {
        mkdirSync(path.dirname(dst), { recursive: true })
        cpSync(src, dst, { recursive: true, force: true })
      }
    }
    // .gitignore / .gitattributes: the new file, plus lines this project added to the old one.
    for (const f of ['.gitignore', '.gitattributes']) {
      const newLines = readLines(path.join(tpl, f))
      const oldLines = existsSync(path.join(before, f)) ? readLines(path.join(before, f)) : []
      const raw = getText(`https://raw.githubusercontent.com/${source}/v${current}/skills/workbench-setup/template/${f}`)
      // Case-insensitive, like the PowerShell -contains this replaces.
      const newSet = new Set(newLines.map((l) => l.toLowerCase()))
      const oldTemplate = raw === null ? null : new Set(lines(raw).map((l) => l.toLowerCase()))
      const extra = oldLines.filter((l) => l.trim() && !newSet.has(l.toLowerCase()) && (oldTemplate === null || !oldTemplate.has(l.toLowerCase())))
      const out = extra.length > 0 ? [...newLines, '', '# Kept from this project', ...extra] : newLines
      writeFileSync(P(f), out.join('\n') + '\n')
    }
    // 5. Check the new version starts: the startup check prints the brief, and save points still work.
    const hook = JSON.parse(readFileSync(P('.codex/hooks.json'), 'utf8')).hooks.SessionStart[0].hooks[0]
    const hookCmd: string = (win && hook.commandWindows) || hook.command
    const brief = run(win ? ['powershell', '-NoProfile', '-NonInteractive', '-Command', hookCmd] : ['sh', '-c', hookCmd]).out
    if (!/Workbench session brief/.test(brief)) throw new Error('The new startup check did not print the brief.')
    if (win) {
      // (no %h in the arguments: Bun refuses cmd.exe special characters when running a .cmd file)
      if (!run([P('.workbench/scripts/git.cmd'), 'log', '-1', '--oneline']).ok) throw new Error('Save points did not work with the new version.')
    } else if (run(['xcode-select', '-p']).ok) {
      if (!run(['git', `--git-dir=${P('.workbench/history')}`, `--work-tree=${root}`, '-c', 'safe.directory=*', 'log', '-1', '--format=%h']).ok) throw new Error('Save points did not work with the new version.')
    }
  } catch (e) {
    const why = (e as Error).message
    restoreBefore()
    console.log(`FAILED_AND_UNDONE: ${why} Everything is back as it was (workbench ${current}).`)
    return 1
  }

  // 6. The design engine the new version pins (the update removed the old one with its folder).
  // bootstrap.ps1 may rename the bun.exe running this script; that is intended.
  if (win && existsSync(P('.tools'))) {
    if (!run(['powershell', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', P('.workbench/scripts/bootstrap.ps1')]).ok) {
      console.log('NOTE: the design engine could not be downloaded now; bootstrap.ps1 will fetch it next time.')
    }
  }

  // 7. Finish: VERSION last, then a save point.
  const date = field(readLines(path.join(tpl, '.workbench', 'VERSION')), 'date')
  writeFileSync(P('.workbench/VERSION'), `version: ${next}\ndate: ${date}\nsource: ${source}\ncommit: ${sha}\n`)
  savePoint(`Updated the workbench to ${next}`)

  // What changed, in the release's own plain words.
  const notes: string[] = []
  let take = false
  for (const l of readLines(path.join(top, 'CHANGES.md'))) {
    const m = /^## (\d+\.\d+\.\d+)/.exec(l)
    if (m) { take = cmp(m[1], current) > 0 && cmp(m[1], next) <= 0; continue }
    if (take && l.startsWith('- ')) notes.push(l)
  }
  rmSync(work, { recursive: true, force: true })
  console.log(`UPDATED: workbench ${current} -> ${next} (commit ${sha.slice(0, 7)}).`)
  if (hooksChanged) console.log('HOOKS_CHANGED: Codex will ask to review the startup check again.')
  console.log('WHAT_CHANGED:')
  for (const n of notes) console.log(n)
  return 0
}

try {
  process.exit(main())
} catch (e) {
  console.error((e as Error).message)
  process.exit(1)
}
