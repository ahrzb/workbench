// Checks a tool's spec (tools/<tool>/model.json: the formal model, the flow and the backlog) against itself,
// the user's sample files and, with --trace, the tool's tests, and prints the gaps. The guide turns ASK gaps
// into questions in the user's words and settles MODEL and DESIGN gaps in the spec; BUILD gaps go to the
// maker. Real values from the samples are printed here (for the chat) and never written anywhere.
//   .workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool>            gaps, most costly first
//   .workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool> --trace    also: every built case has a test
//   .workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool> --json     the gaps as JSON
//   .workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool> --summary  the spec in short, for a brief
//   .workbench\scripts\run.cmd bun .workbench\scripts\model-check.ts <tool> --profile  what the samples look like (before a spec)
// Exit code: 0 no gaps; 1 there are; 2 the spec can't be read.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..', '..')
const [tool, ...flags] = process.argv.slice(2)
if (!tool || !/^[a-z0-9-]+$/.test(tool)) { console.error('Usage: model-check.ts <tool> [--trace] [--json | --summary | --profile]'); process.exit(2) }
const toolDir = path.join(root, 'tools', tool)
const samplesDir = path.join(toolDir, 'samples')

// ---------- samples ----------
const moneyRe = /^-?\s?[£$€]?\s?-?\d{1,3}(?:[ ,]?\d{3})*(?:\.\d{1,2})?$/
type Table = { file: string; header: string[]; rows: string[][] }
function parseCsv(text: string): string[][] {
  text = text.replace(/^\uFEFF/, '')
  const first = text.split(/\r?\n/, 1)[0]
  const sep = [',', ';', '\t'].sort((a, b) => first.split(b).length - first.split(a).length)[0]
  const out: string[][] = []
  let row: string[] = [], cell = '', q = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ } else if (c === '"') q = false; else cell += c
    } else if (c === '"') q = true
    else if (c === sep) { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((v) => v !== '')) out.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((v) => v !== '')) out.push(row)
  return out
}
const tables = new Map<string, Table>()
const unreadable: string[] = []
if (existsSync(samplesDir)) {
  for (const f of readdirSync(samplesDir)) {
    const p = path.join(samplesDir, f)
    if (/\.(csv|tsv|txt)$/i.test(f)) {
      const all = parseCsv(readFileSync(p, 'utf8'))
      if (all.length) tables.set(f.toLowerCase(), { file: f, header: all[0].map((h) => h.trim()), rows: all.slice(1) })
    } else unreadable.push(f)
  }
}

if (flags.includes('--profile')) { profile(); process.exit(0) }

// ---------- model ----------
type Fact = { id: string; says: string; rule: string; where?: string; args?: Record<string, unknown>; source?: string; hard?: boolean; cost?: string }
type Move = { id?: string; from: string[]; event: string; to: string; onlyIf?: string; source?: string }
type Life = { thing: string; statusAt?: string; stages: { id: string; means?: string }[]; workedOut?: { word: string; rule: string }[]; moves: Move[]; never?: { from: string; event?: string; to?: string }[]; refused?: { from: string; event: string; source?: string }[] }
type Model = {
  version: number; job?: { when?: string; who?: string; wants?: string; so?: string }; kind?: string[]
  startsWhen?: { type: string; what: string }[]; steps?: string[]; firstVersionThrough?: number
  sources?: { id: string; file: string; rowIs?: string }[]
  things?: { id: string; word?: string; toldApartBy?: string[]; from?: string; changes?: string; ends?: string; history?: string }[]
  facts?: Fact[]; ignored?: { where: string; why: string }[]; lives?: Life[]
  cases?: { id: string; says: string; about?: string[]; said: string }[]
  promises?: { to: string; says: string; case?: string }[]
  screens?: { id: string; word?: string; shows?: string[]; actions?: { label: string; does?: string; greyedWhen?: string }[]; empty?: string }[]
  backlog?: { id: string; milestone?: number; canDo: string; quote?: string; cases?: string[]; facts?: string[]; screens?: string[]; status: string }[]
}
const modelPath = path.join(toolDir, 'model.json')
if (!existsSync(modelPath)) { console.error(`No model yet: tools/${tool}/model.json. Use --profile to look at the samples first.`); process.exit(2) }
let model: Model
try { model = JSON.parse(readFileSync(modelPath, 'utf8')) } catch (e) { console.error(`model.json is not valid JSON: ${(e as Error).message}`); process.exit(2) }

if (flags.includes('--summary')) { summary(); process.exit(0) }

// ---------- gaps ----------
type Evidence = { file: string; line: number; values: Record<string, string> }
type Gap = { kind: 'ask' | 'model' | 'design' | 'build'; cost: number; about: string; what: string; evidence?: Evidence[] }
const gaps: Gap[] = []
const COST: Record<string, number> = { ruins: 3, 'wrong-total': 3, annoying: 1 }
const gap = (g: Gap) => gaps.push(g)

const sourceById = new Map((model.sources ?? []).map((s) => [s.id, s]))
for (const s of model.sources ?? []) if (!tables.has(s.file.toLowerCase())) gap({ kind: 'model', cost: 2, about: `source ${s.id}`, what: `samples/${s.file} isn't there (or isn't a CSV file)` })
for (const f of unreadable) gap({ kind: 'model', cost: 1, about: `samples/${f}`, what: 'not a CSV: this script can only check CSV samples; check it another way or save a CSV copy' })

/** "source.column" -> table + column index, or a model gap. */
function col(where: string, about: string): { t: Table; i: number; name: string } | null {
  const dot = where.indexOf('.')
  const s = sourceById.get(where.slice(0, dot))
  if (dot < 0 || !s) { gap({ kind: 'model', cost: 2, about, what: `"${where}" should be <source id>.<column>` }); return null }
  const t = tables.get(s.file.toLowerCase())
  if (!t) return null
  const name = where.slice(dot + 1)
  const i = t.header.findIndex((h) => h.toLowerCase() === name.toLowerCase())
  if (i < 0) { gap({ kind: 'model', cost: 2, about, what: `column "${name}" isn't in ${t.file} (columns: ${t.header.join(', ')})` }); return null }
  return { t, i, name: t.header[i] }
}
const ev = (t: Table, r: number, cols: number[]): Evidence => ({ file: t.file, line: r + 2, values: Object.fromEntries(cols.map((c) => [t.header[c], t.rows[r][c] ?? ''])) })
const val = (t: Table, r: number, i: number) => (t.rows[r][i] ?? '').trim()

const mentioned = new Set<string>()
const mention = (where?: string) => { for (const w of (where ?? '').split('+')) if (w.trim()) mentioned.add(w.trim().toLowerCase()) }

// Things: identity first.
const thingIds = new Set((model.things ?? []).map((t) => t.id))
for (const th of model.things ?? []) {
  if (!th.toldApartBy?.length) gap({ kind: 'model', cost: 3, about: `thing ${th.id}`, what: 'no "toldApartBy": decide how two of them are told apart (never by name alone)' })
  for (const w of th.toldApartBy ?? []) mention(w)
  const cols = (th.toldApartBy ?? []).map((w) => col(w, `thing ${th.id}`))
  if (cols.length && cols.every(Boolean) && new Set(cols.map((c) => c!.t)).size === 1) {
    const t = cols[0]!.t, seen = new Map<string, number>()
    for (let r = 0; r < t.rows.length; r++) {
      const key = cols.map((c) => val(t, r, c!.i)).join(' | ')
      if (cols.some((c) => !val(t, r, c!.i))) gap({ kind: 'ask', cost: 3, about: `thing ${th.id}`, what: `a ${th.word ?? th.id} with nothing to tell it apart by`, evidence: [ev(t, r, cols.map((c) => c!.i))] })
      else if (seen.has(key)) gap({ kind: 'ask', cost: 3, about: `thing ${th.id}`, what: `two ${th.word ?? th.id} rows told apart by the same value: one thing or two?`, evidence: [ev(t, seen.get(key)!, cols.map((c) => c!.i)), ev(t, r, cols.map((c) => c!.i))] })
      else seen.set(key, r)
    }
  }
}

// Facts against the samples.
function dateRe(form: string): RegExp {
  const src = form.replace(/[.*+?^${}()|[\]\\/]/g, (c) => '\\' + c).replace('YYYY', '(\\d{4})').replace('MM', '(\\d{2})').replace('DD', '(\\d{2})').replace(/\bM\b/, '(\\d{1,2})').replace(/\bD\b/, '(\\d{1,2})')
  return new RegExp('^' + src + '$')
}
function validDate(v: string, form: string): boolean {
  const m = dateRe(form).exec(v); if (!m) return false
  const order = form.match(/YYYY|MM|DD|M|D/g)!
  const parts: Record<string, number> = {}
  order.forEach((o, k) => { parts[o[0]] = Number(m[k + 1]) })
  const d = new Date(Date.UTC(parts.Y, parts.M - 1, parts.D))
  return d.getUTCFullYear() === parts.Y && d.getUTCMonth() === parts.M - 1 && d.getUTCDate() === parts.D
}
for (const f of model.facts ?? []) {
  const about = `fact ${f.id}`
  if (!f.says) gap({ kind: 'model', cost: 1, about, what: 'no "says" sentence' })
  if (f.hard && (!f.source || f.source === 'guess')) gap({ kind: 'ask', cost: COST[f.cost ?? ''] ?? 2, about, what: `enforced, but only my guess: "${f.says}". Confirm it with the user, or make it a warning (hard: false)` })
  mention(f.where)
  for (const w of [f.args?.in, f.args?.per].flat().filter(Boolean) as string[]) mention(w)
  const broken = (what: string, evidence: Evidence[]) => gap({ kind: f.hard ? 'ask' : 'model', cost: f.hard ? (COST[f.cost ?? ''] ?? 3) : 0, about, what: `${f.hard ? 'enforced rule' : 'warning rule'} "${f.says}" ${what}`, evidence: evidence.slice(0, 5) })
  if (['derived', 'words'].includes(f.rule)) {
    if (!(model.cases ?? []).some((c) => c.about?.includes(f.id))) gap({ kind: 'model', cost: 1, about, what: `"${f.rule}" rule with no case that checks it` })
    continue
  }
  if (!f.where) { gap({ kind: 'model', cost: 1, about, what: 'no "where" (<source>.<column>)' }); continue }
  const cs = f.where.split('+').map((w) => col(w.trim(), about))
  if (cs.some((c) => !c)) continue
  const t = cs[0]!.t, i = cs[0]!.i, bad: Evidence[] = []
  const each = (test: (v: string, r: number) => boolean) => { for (let r = 0; r < t.rows.length; r++) if (!test(val(t, r, i), r)) bad.push(ev(t, r, cs.map((c) => c!.i))) }
  switch (f.rule) {
    case 'required': each((v) => v !== ''); if (bad.length) broken(`is blank in ${bad.length} of ${t.rows.length} rows`, bad); break
    case 'optional': break
    case 'unique': {
      const seen = new Map<string, number>()
      for (let r = 0; r < t.rows.length; r++) {
        const k = cs.map((c) => val(t, r, c!.i).toLowerCase()).join(' | ')
        if (cs.every((c) => !val(t, r, c!.i))) continue
        if (seen.has(k)) bad.push(ev(t, seen.get(k)!, cs.map((c) => c!.i)), ev(t, r, cs.map((c) => c!.i))); else seen.set(k, r)
      }
      if (bad.length) broken(`has ${bad.length / 2} repeat(s)`, bad); break
    }
    case 'one-of': {
      const ok = new Set(((f.args?.values as string[]) ?? []).map((v) => v.toLowerCase()))
      each((v) => !v || ok.has(v.toLowerCase())); if (bad.length) broken(`has other values: ${[...new Set(bad.map((b) => Object.values(b.values)[0]))].join(', ')}`, bad); break
    }
    case 'date': { const form = String(f.args?.form ?? 'YYYY-MM-DD'); each((v) => !v || validDate(v, form)); if (bad.length) broken(`isn't a ${form} date in ${bad.length} rows`, bad); break }
    case 'money': each((v) => !v || moneyRe.test(v)); if (bad.length) broken(`isn't an amount in ${bad.length} rows`, bad); break
    case 'refers-to': case 'mentions-one': case 'mentions-some': {
      const target = col(String(f.args?.in ?? ''), about); if (!target) break
      const keys = new Set(target.t.rows.map((_, r) => val(target.t, r, target.i).toLowerCase()).filter(Boolean))
      for (let r = 0; r < t.rows.length; r++) {
        const v = val(t, r, i).toLowerCase(); if (!v) continue
        const n = f.rule === 'refers-to' ? (keys.has(v) ? 1 : 0) : [...keys].filter((k) => new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(v)).length
        if (n === 0 || (f.rule === 'mentions-one' && n > 1)) bad.push({ ...ev(t, r, [i]), values: { ...ev(t, r, [i]).values, found: String(n) } })
      }
      if (bad.length) broken(`doesn't point to exactly ${f.rule === 'mentions-some' ? 'at least one' : 'one'} ${target.t.file} ${target.name} in ${bad.length} rows`, bad); break
    }
    case 'same-per': {
      const per = (Array.isArray(f.args?.per) ? f.args!.per as string[] : [String(f.args?.per ?? '')]).map((w) => col(w, about))
      if (per.some((p) => !p)) break
      const seen = new Map<string, number>()
      for (let r = 0; r < t.rows.length; r++) {
        const k = per.map((p) => val(t, r, p!.i).toLowerCase()).join(' | ')
        const prev = seen.get(k)
        if (prev === undefined) seen.set(k, r); else if (val(t, prev, i) !== val(t, r, i)) bad.push(ev(t, prev, [...per.map((p) => p!.i), i]), ev(t, r, [...per.map((p) => p!.i), i]))
      }
      if (bad.length) broken('differs for the same key', bad); break
    }
    case 'follows': {
      // A typed value that should agree with other data ("Lapsed" while payments say otherwise).
      // args.ok is a JavaScript expression, true when this row agrees; it sees `row` (this row, by column
      // header), rows('<source>') (all rows of a source), mentions(text, key) and today ('YYYY-MM-DD').
      const expr = String(f.args?.ok ?? '')
      if (!expr) { gap({ kind: 'model', cost: 1, about, what: '"follows" needs args.ok: an expression that is true when the row agrees' }); break }
      const asObjects = (tb: Table) => tb.rows.map((r) => Object.fromEntries(tb.header.map((h, k) => [h, (r[k] ?? '').trim()])))
      const rowsOf = (id: string) => { const s = sourceById.get(id); const tb = s && tables.get(s.file.toLowerCase()); return tb ? asObjects(tb) : [] }
      const mentions = (text: string, key: string) => !!key && new RegExp(`(^|[^a-z0-9])${key.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(String(text).toLowerCase())
      let ok: (...a: unknown[]) => unknown
      try { ok = new Function('row', 'rows', 'mentions', 'today', `return (${expr})`) as typeof ok } catch (e) { gap({ kind: 'model', cost: 2, about, what: `args.ok doesn't read as an expression: ${(e as Error).message}` }); break }
      const today = new Date().toISOString().slice(0, 10)
      // Show each disagreeing row by what tells it apart (its thing's key column), plus the typed value.
      const srcId = f.where.split('.')[0]
      const keyName = (model.things ?? []).map((th) => th.toldApartBy?.[0]).find((w) => w?.startsWith(srcId + '.'))?.slice(srcId.length + 1)
      const keyCol = keyName ? t.header.findIndex((h) => h.toLowerCase() === keyName.toLowerCase()) : -1
      const objs = asObjects(t)
      for (let r = 0; r < objs.length; r++) {
        let res: unknown
        try { res = ok(objs[r], rowsOf, mentions, today) } catch (e) { gap({ kind: 'model', cost: 2, about, what: `args.ok failed on line ${r + 2}: ${(e as Error).message}` }); break }
        if (!res) bad.push(ev(t, r, keyCol >= 0 && keyCol !== i ? [keyCol, i] : [i]))
      }
      if (bad.length) gap({ kind: 'ask', cost: COST[f.cost ?? ''] ?? 2, about, what: `the typed value disagrees with the files in ${bad.length} rows ("${f.says}"): set by hand, or should it follow from the data?`, evidence: bad.slice(0, 5) })
      break
    }
    default: gap({ kind: 'model', cost: 1, about, what: `unknown rule "${f.rule}" (use required, optional, unique, one-of, date, money, refers-to, mentions-one, mentions-some, same-per, follows, derived, words)` })
  }
}
// A broken enforced rule already asks about it; drop the plain "confirm my guess" for the same fact.
for (let k = gaps.length - 1; k >= 0; k--) {
  const g = gaps[k]
  if (g.what.startsWith('enforced, but only my guess') && gaps.some((o) => o !== g && o.about === g.about && o.what.startsWith('enforced rule'))) gaps.splice(k, 1)
}
for (const ig of model.ignored ?? []) mention(ig.where)

// Lifecycles: every stage x event is decided; nothing unreachable; no overlaps; every status word known.
for (const life of model.lives ?? []) {
  const about = `life of ${life.thing}`
  if (!thingIds.has(life.thing)) gap({ kind: 'model', cost: 1, about, what: `"${life.thing}" isn't one of the things` })
  const stages = new Set(life.stages.map((s) => s.id))
  const events = [...new Set(life.moves.filter((m) => !m.from.includes('(new)')).map((m) => m.event))]
  for (const m of life.moves) for (const s of [...m.from, m.to]) if (s !== '(new)' && !stages.has(s)) gap({ kind: 'model', cost: 2, about, what: `move ${m.id ?? m.event} names unknown stage "${s}"` })
  for (const s of stages) for (const e of events) {
    const moves = life.moves.filter((m) => m.from.includes(s) && m.event === e)
    const never = (life.never ?? []).some((n) => n.from === s && (!n.event || n.event === '*' || n.event === e))
    const refused = (life.refused ?? []).find((x) => x.from === s && x.event === e)
    if (!moves.length && !never && !refused) gap({ kind: 'model', cost: 2, about, what: `"${e}" on a ${s} ${life.thing} isn't decided: add a move, a "never", or a "refused" (refusing is the safe default)` })
    if (moves.filter((m) => !m.onlyIf).length > 1 || (moves.length > 1 && moves.some((m) => !m.onlyIf))) gap({ kind: 'model', cost: 2, about, what: `"${e}" on ${s} has overlapping moves ${moves.map((m) => m.id ?? m.to).join(', ')}: give each an onlyIf that can't both be true` })
    for (const m of moves) for (const n of life.never ?? []) if (n.from === s && n.to && (n.to === '*' || n.to === m.to)) gap({ kind: 'model', cost: 3, about, what: `move ${m.id ?? e} breaks never ${n.from} -> ${n.to}` })
  }
  for (const r of life.refused ?? []) if (r.source === 'guess') gap({ kind: 'ask', cost: 1, about, what: `refusing "${r.event}" on a ${r.from} ${life.thing} is my guess (safe default). Ask only if the samples or story hint it happens` })
  const reach = new Set(['(new)'])
  for (let grew = true; grew;) { grew = false; for (const m of life.moves) if (m.from.some((f) => reach.has(f)) && !reach.has(m.to)) { reach.add(m.to); grew = true } }
  for (const s of stages) if (!reach.has(s)) gap({ kind: 'model', cost: 2, about, what: `stage ${s} can't be reached from (new)` })
  if (life.statusAt) {
    mention(life.statusAt)
    const c = col(life.statusAt, about)
    if (c) {
      const known = new Set([...stages, ...(life.workedOut ?? []).map((w) => w.word)].map((s) => s.toLowerCase()))
      const odd = new Map<string, Evidence[]>()
      for (let r = 0; r < c.t.rows.length; r++) { const v = val(c.t, r, c.i); if (v && !known.has(v.toLowerCase())) odd.set(v, [...(odd.get(v) ?? []), ev(c.t, r, [c.i])]) }
      for (const [word, rows] of odd) gap({ kind: 'ask', cost: 2, about, what: `"${word}" in ${c.t.file} ${c.name} is no stage: a stage of its own, another word for one, or worked out from other columns?`, evidence: rows.slice(0, 3) })
    }
  }
}

// A status typed by hand (a life's status column, or a one-of column named like a status) goes stale: it
// needs a "follows" fact saying when it agrees with the other files, so rows that disagree come up.
const typed = new Set([
  ...(model.lives ?? []).map((l) => l.statusAt),
  ...(model.facts ?? []).filter((f) => f.rule === 'one-of' && /status|stage|state|paid|done|sent|active|lapsed|open|closed/i.test(f.where ?? '')).map((f) => f.where),
].filter(Boolean).map((w) => w!.toLowerCase()))
for (const w of typed) if (!(model.facts ?? []).some((f) => f.rule === 'follows' && f.where?.toLowerCase() === w))
  gap({ kind: 'model', cost: 2, about: `column ${w}`, what: 'typed by hand: add a "follows" fact saying when each value agrees with the other files (e.g. Lapsed but paid this year doesn\'t), so rows that disagree come up' })

// Columns nothing explains: the omission guard.
for (const s of model.sources ?? []) {
  const t = tables.get(s.file.toLowerCase()); if (!t) continue
  for (const h of t.header) if (!mentioned.has(`${s.id}.${h}`.toLowerCase())) gap({ kind: 'model', cost: 2, about: `column ${s.id}.${h}`, what: 'no fact, thing or stage uses it: model it, or add it to "ignored" with why' })
}
for (const [f, t] of tables) if (!(model.sources ?? []).some((s) => s.file.toLowerCase() === f)) gap({ kind: 'model', cost: 2, about: `samples/${t.file}`, what: 'a sample file no source describes' })

// Cases and promises.
const factIds = new Set((model.facts ?? []).map((f) => f.id))
for (const c of model.cases ?? []) {
  for (const a of c.about ?? []) if (!factIds.has(a)) gap({ kind: 'model', cost: 1, about: `case ${c.id}`, what: `about unknown fact ${a}` })
  if (c.said === 'waiting') gap({ kind: 'ask', cost: 2, about: `case ${c.id}`, what: `waiting for the user: "${c.says}"` })
}
for (const p of model.promises ?? []) if (!p.case || !(model.cases ?? []).some((c) => c.id === p.case)) gap({ kind: 'model', cost: 2, about: `promise to ${p.to}`, what: `"${p.says}" has no case that checks it` })
if (!model.job?.wants) gap({ kind: 'model', cost: 1, about: 'job', what: 'no job story (when / who / wants / so)' })
if (!model.steps?.length) gap({ kind: 'model', cost: 1, about: 'steps', what: 'no steps of the usual way' })
if (!model.startsWhen?.length) gap({ kind: 'model', cost: 1, about: 'starts when', what: 'nothing says what starts it (something arrives, a date, something expected that never comes)' })

// The flow: every event has a way to do it on some screen; every action is a real event; screens say their empty state.
const actions = (model.screens ?? []).flatMap((s) => (s.actions ?? []).map((a) => ({ screen: s.id, ...a })))
if (model.screens?.length) {
  for (const life of model.lives ?? []) for (const e of new Set(life.moves.map((m) => m.event)))
    if (!actions.some((a) => a.does === `${life.thing}:${e}`)) gap({ kind: 'design', cost: 2, about: `life of ${life.thing}`, what: `no screen lets the user "${e}" (add an action with does: "${life.thing}:${e}")` })
  for (const a of actions) if (a.does?.includes(':')) {
    const [thing, e] = [a.does.slice(0, a.does.indexOf(':')), a.does.slice(a.does.indexOf(':') + 1)]
    if (!(model.lives ?? []).some((l) => l.thing === thing && l.moves.some((m) => m.event === e))) gap({ kind: 'design', cost: 2, about: `screen ${a.screen}`, what: `action "${a.label}" does ${a.does}, which the spec doesn't have` })
  }
  for (const s of model.screens ?? []) if (!s.empty) gap({ kind: 'design', cost: 1, about: `screen ${s.id}`, what: 'no empty state: what it says before there is anything to show' })
}

// The backlog: every item points at real cases, facts and screens, and has at least one case that proves it.
const STATUS = ['proposed', 'confirmed', 'built', 'tried', 'accepted']
const caseById = new Map((model.cases ?? []).map((c) => [c.id, c]))
const screenIds = new Set((model.screens ?? []).map((s) => s.id))
for (const b of model.backlog ?? []) {
  const about = `backlog ${b.id}`
  if (!STATUS.includes(b.status)) gap({ kind: 'model', cost: 1, about, what: `status "${b.status}" isn't one of ${STATUS.join(', ')}` })
  if (!b.cases?.length) gap({ kind: 'model', cost: 2, about, what: `"${b.canDo}" has no case that shows it works` })
  for (const c of b.cases ?? []) if (!caseById.has(c)) gap({ kind: 'model', cost: 2, about, what: `case ${c} doesn't exist` })
  for (const f of b.facts ?? []) if (!factIds.has(f)) gap({ kind: 'model', cost: 1, about, what: `fact ${f} doesn't exist` })
  for (const s of b.screens ?? []) if (!screenIds.has(s)) gap({ kind: 'design', cost: 1, about, what: `screen ${s} doesn't exist` })
}

// --trace: the code is made from the backlog. Every case of a built item has a test named with its id ("[C4] ..."),
// and every id in a test is a real case.
if (flags.includes('--trace')) {
  const testFiles: string[] = []
  const walkT = (d: string) => { if (!existsSync(d)) return; for (const e of readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walkT(p) } else if (/\.test\.(m?[jt]s|tsx)$|[\\/]test[\\/].*\.(m?[jt]s)$/.test(p)) testFiles.push(p) } }
  walkT(path.join(toolDir, 'app', 'test')); walkT(path.join(toolDir, 'app', 'src'))
  const inTests = new Set<string>()
  for (const f of testFiles) for (const m of readFileSync(f, 'utf8').matchAll(/\[(C\d+)\]/g)) inTests.add(m[1])
  for (const b of model.backlog ?? []) if (['built', 'tried', 'accepted'].includes(b.status))
    for (const c of b.cases ?? []) if (!inTests.has(c)) gap({ kind: 'build', cost: 2, about: `backlog ${b.id}`, what: `case ${c} ("${caseById.get(c)?.says ?? '?'}") has no test named "[${c}] ..."` })
  for (const c of inTests) if (!caseById.has(c)) gap({ kind: 'build', cost: 1, about: `test [${c}]`, what: 'names a case the spec doesn\'t have: built from no backlog item?' })
}

const ORDER: Record<string, number> = { ask: 0, model: 1, design: 2, build: 3 }
gaps.sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || b.cost - a.cost)
if (flags.includes('--json')) console.log(JSON.stringify(gaps, null, 2))
else {
  const n = (k: string) => gaps.filter((g) => g.kind === k).length
  console.log(`SPEC ${tool}: ${n('ask')} to ask the user, ${n('model') + n('design')} to settle in the spec${flags.includes('--trace') ? `, ${n('build')} for the maker` : ''}`)
  for (const g of gaps) {
    console.log(`${g.kind.toUpperCase()} [${g.about}] ${g.what}`)
    for (const e of g.evidence ?? []) console.log(`    ${e.file} line ${e.line}: ${Object.entries(e.values).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')}`)
  }
}
process.exit(gaps.length ? 1 : 0)

// ---------- outputs ----------
function summary() {
  const m = model, out: string[] = [`MODEL SUMMARY ${tool}`]
  if (m.job) out.push(`Job: when ${m.job.when}, ${m.job.who} wants ${m.job.wants}, so ${m.job.so}`)
  if (m.steps?.length) out.push('Steps:', ...m.steps.map((s, k) => `  ${k + 1}. ${s}${m.firstVersionThrough === k + 1 ? '   <- first version up to here' : ''}`))
  for (const th of m.things ?? []) out.push(`Thing ${th.id} ("${th.word ?? th.id}"): told apart by ${th.toldApartBy?.join(' + ') || '?'}; comes from ${th.from ?? '?'}; ends: ${th.ends ?? '-'}`)
  for (const f of m.facts ?? []) out.push(`  ${f.id} ${f.hard ? 'ENFORCED' : 'warn'} ${f.rule}${f.where ? ` @${f.where}` : ''}: ${f.says}`)
  for (const l of m.lives ?? []) {
    out.push(`Life of ${l.thing}: stages ${l.stages.map((s) => s.id).join(' / ')}${l.workedOut?.length ? `; worked out: ${l.workedOut.map((w) => w.word).join(', ')}` : ''}`)
    for (const mv of l.moves) out.push(`  ${mv.from.join(', ')} --${mv.event}--> ${mv.to}${mv.onlyIf ? ` [only if ${mv.onlyIf}]` : ''}`)
    for (const n of l.never ?? []) out.push(`  never ${n.from} -> ${n.to ?? n.event ?? '*'}`)
  }
  for (const c of m.cases ?? []) out.push(`Case ${c.id} (${c.said}): ${c.says}`)
  for (const p of m.promises ?? []) out.push(`Promise to ${p.to}: ${p.says}`)
  for (const s of m.screens ?? []) out.push(`Screen ${s.id} ("${s.word ?? s.id}"): shows ${s.shows?.join('; ') ?? '?'}; actions ${(s.actions ?? []).map((a) => `${a.label} [${a.does ?? '-'}]${a.greyedWhen ? ` greyed when ${a.greyedWhen}` : ''}`).join(', ') || '-'}; empty: ${s.empty ?? '?'}`)
  for (const b of m.backlog ?? []) out.push(`Backlog ${b.id} (${b.status}, milestone ${b.milestone ?? '?'}): you can ${b.canDo}; cases ${b.cases?.join(', ') ?? '-'}; screens ${b.screens?.join(', ') ?? '-'}`)
  console.log(out.join('\n'))
}

function profile() {
  if (!tables.size) { console.log(`No CSV samples in tools/${tool}/samples/.${unreadable.length ? ` Not read: ${unreadable.join(', ')}` : ''}`); return }
  for (const t of tables.values()) {
    console.log(`${t.file}: ${t.rows.length} rows, ${t.header.length} columns`)
    for (let i = 0; i < t.header.length; i++) {
      const vs = t.rows.map((r) => (r[i] ?? '').trim())
      const filled = vs.filter(Boolean), distinct = new Set(filled.map((v) => v.toLowerCase()))
      const share = (re: RegExp | ((v: string) => boolean)) => { const n = filled.filter((v) => (typeof re === 'function' ? re(v) : re.test(v))).length; return n && n >= filled.length * 0.8 ? n : 0 }
      const odd = (n: number) => (n < filled.length ? ` (${filled.length - n} not)` : '')
      let looks = 'text', n = 0
      if ((n = share(/^\d{4}-\d{2}-\d{2}$/))) looks = 'date YYYY-MM-DD' + odd(n)
      else if ((n = share(/^\d{1,2}[/.]\d{1,2}[/.]\d{4}$/))) looks = 'date with / or .' + odd(n)
      else if ((n = share((v) => moneyRe.test(v)))) looks = (filled.some((v) => /^0\d/.test(v)) ? 'digits with leading zeros (keep as text)' : 'number/amount') + odd(n)
      else if (distinct.size <= 12 && distinct.size <= filled.length / 2) looks = `few words: ${[...distinct].join(', ')}`
      const multi = filled.filter((v) => /[+;&]|\band\b/.test(v)).length
      console.log(`  ${t.header[i]}: ${looks}; ${vs.length - filled.length} blank; ${distinct.size} distinct${distinct.size === filled.length && filled.length === vs.length && vs.length ? ' (could tell rows apart)' : ''}${multi ? `; ${multi} cells look like several values` : ''}`)
    }
  }
  if (unreadable.length) console.log(`Not read (not CSV): ${unreadable.join(', ')}`)
}
