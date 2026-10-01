// Checks a tool's stylesheet against its own design system (the tokens in :root) with the arithmetic rules
// from Refactoring UI: values on the scales, few sizes and weights, readable contrast, no colours or shadows
// typed outside the tokens, few borders, one radius, one main button per screen. For the designer; runs
// before impeccable's detector, offline, inside Codex's sandbox. Desktop tools (Electron, one HTML file).
//   .workbench\scripts\run.cmd bun .workbench\scripts\design-check.ts <tool>
// Prints DESIGN-CHECK <tool>: <n> findings, then one line each. Exit 1 if there are findings.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dir, '..', '..')
const tool = process.argv[2]
if (!tool || !/^[a-z0-9-]+$/.test(tool)) { console.error('Usage: design-check.ts <tool>'); process.exit(2) }
const app = path.join(root, 'tools', tool, 'app')
const src = path.join(app, 'src')
if (!existsSync(src)) { console.error(`No tools/${tool}/app/src yet.`); process.exit(2) }

const cssFiles: string[] = []
const walk = (d: string) => { for (const e of readdirSync(d)) { const p = path.join(d, e); if (statSync(p).isDirectory()) walk(p); else if (p.endsWith('.css')) cssFiles.push(p) } }
walk(src)
if (!cssFiles.length) { console.error(`No stylesheet in tools/${tool}/app/src.`); process.exit(2) }
if (cssFiles.some((f) => /@tailwind|@import\s+["']tailwindcss/.test(readFileSync(f, 'utf8')))) { console.log(`DESIGN-CHECK ${tool}: a Tailwind site; use impeccable's detector on the built page instead.`); process.exit(0) }

type Finding = { where: string; what: string }
const findings: Finding[] = []
const add = (where: string, what: string) => findings.push({ where, what })

// ---------- tokens ----------
const tokens = new Map<string, string>()
const rules: { file: string; line: number; selector: string; decls: [string, string][] }[] = []
for (const file of cssFiles) {
  const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  const re = /([^{}]+)\{([^{}]*)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    const selector = m[1].trim(), body = m[2]
    const line = text.slice(0, m.index + m[1].length).split('\n').length
    const decls = [...body.matchAll(/([a-z-]+)\s*:\s*([^;]+)/gi)].map((d) => [d[1].trim().toLowerCase(), d[2].trim()] as [string, string])
    if (selector === ':root') for (const [k, v] of decls) if (k.startsWith('--')) tokens.set(k, v)
    rules.push({ file: path.relative(root, file).replace(/\\/g, '/'), line, selector, decls })
  }
}
const resolve = (v: string, depth = 0): string => depth > 10 ? v : v.replace(/var\((--[a-z0-9-]+)(?:,\s*([^)]+))?\)/gi, (_, n, fb) => resolve(tokens.get(n) ?? fb ?? '', depth + 1))

// ---------- colour ----------
type RGB = [number, number, number]
function parseColour(v: string): RGB | null {
  v = resolve(v).trim().toLowerCase()
  if (v === 'white' || v === '#fff' || v === '#ffffff') return [255, 255, 255]
  if (v === 'black') return [0, 0, 0]
  let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(v)
  if (m) { const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1]; return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB }
  m = /^hsla?\(\s*([\d.]+)(?:deg)?[\s,]+([\d.]+)%[\s,]+([\d.]+)%/.exec(v)
  if (m) {
    const h = +m[1] / 360, s = +m[2] / 100, l = +m[3] / 100
    const f = (n: number) => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))) }
    return [f(0), f(8), f(4)]
  }
  m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/.exec(v)
  return m ? [+m[1], +m[2], +m[3]] : null
}
const lum = (c: RGB) => { const [r, g, b] = c.map((x) => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4 }); return 0.2126 * r + 0.7152 * g + 0.0722 * b }
const ratio = (a: RGB, b: RGB) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

// 1. Readable role pairs (WCAG: text 4.5:1; controls' borders and focus 3:1).
const pairs: [string, string, number, string][] = [
  ['--text', '--surface', 4.5, 'main text'], ['--text-2', '--surface', 4.5, 'secondary text'], ['--text-3', '--surface', 4.5, 'quiet text'],
  ['--text-2', '--surface-sunken', 4.5, 'secondary text on the toolbar/status tone'], ['--text-3', '--surface-sunken', 4.5, 'quiet text on the sunken tone'],
  ['--on-action', '--action', 4.5, 'text on the main button'], ['--border-control', '--surface', 3, 'the border that shows where a box or button is'],
  ['--focus', '--surface', 3, 'the keyboard focus ring'], ['--link', '--surface', 4.5, 'links'],
]
for (const [fg, bg, min, what] of pairs) {
  if (!tokens.has(fg) || !tokens.has(bg)) continue
  const a = parseColour(`var(${fg})`), b = parseColour(`var(${bg})`)
  if (a && b && ratio(a, b) < min) add(`:root ${fg} on ${bg}`, `${what} is ${ratio(a, b).toFixed(2)}:1, needs ${min}:1`)
}

// ---------- rules outside :root ----------
const SPACE = new Set([0, 1, 2, 3, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192, 256, 384, 512, 640, 768])
const sizes = new Set<string>(), weights = new Set<string>(), radii = new Set<string>()
let borders = 0
for (const r of rules) {
  if (r.selector === ':root') continue
  const at = `${r.file}:${r.line} ${r.selector}`
  const props = new Map(r.decls)
  for (const [k, v] of r.decls) {
    // 2. Colours and shadows only from the tokens.
    if (/^(color|background|background-color|border|border-color|border-(top|right|bottom|left)|outline|box-shadow|fill|stroke)$/.test(k)) {
      const lit = v.replace(/var\([^)]*\)/g, '').match(/#[0-9a-f]{3,8}\b|\b(rgb|hsl)a?\([^)]*\)|\b(white|black|red|blue|green|gray|grey)\b/gi)
      if (lit) add(at, `${k}: ${v} types a colour directly; use a token (${lit.join(', ')})`)
    }
    if (k === 'box-shadow' && v !== 'none' && !/^var\(--shadow-\d\)$/.test(v)) add(at, `box-shadow: ${v} is not one of --shadow-1..4`)
    // 3. Spacing on the scale.
    if (/^(margin|padding|gap|row-gap|column-gap|top|left|right|bottom|width|height|min-width|min-height|max-width|max-height)(-|$)/.test(k))
      for (const n of [...resolve(v).matchAll(/(-?\d+(?:\.\d+)?)px/g)].map((m) => Math.abs(+m[1]))) if (!SPACE.has(n)) add(at, `${k}: ${v}: ${n}px is not on the spacing scale (4 8 12 16 24 32 48 64 ...)`)
    // 4. Sizes, weights.
    if (k === 'font-size') { sizes.add(resolve(v)); if (/em|%/.test(v)) add(at, `font-size: ${v} in em/%: sizes compound; use a --text- token`) }
    if (k === 'font') { const s = /(\d+px)/.exec(resolve(v)); if (s) sizes.add(s[1]) }
    if (k === 'font-weight') weights.add(resolve(v))
    if (k === 'border-radius' && !/999|50%/.test(resolve(v))) radii.add(resolve(v))
    if (/^border(-top|-right|-bottom|-left)?$/.test(k) && !/none|^0/.test(v)) borders++
    if (k === 'text-transform' && v === 'uppercase' && !props.has('letter-spacing')) add(at, 'capitals without letter-spacing: add var(--tracking-caps)')
    if (k === 'line-height' && /px/.test(v)) add(at, `line-height: ${v} in px; use --lh-tight or --lh-base`)
  }
  // 5. A pair this rule sets itself.
  const fg = props.get('color'), bg = props.get('background') ?? props.get('background-color')
  if (fg && bg) { const a = parseColour(fg), b = parseColour(bg); if (a && b && ratio(a, b) < 4.5) add(at, `text ${fg} on ${bg} is ${ratio(a, b).toFixed(2)}:1, needs 4.5:1`) }
  // A text box or button must show where it is: its border 3:1 against the page.
  if (/\b(input|textarea|select|button)\b/.test(r.selector) && !/:hover|:focus|:active|\.primary/.test(r.selector)) {
    const b = props.get('border') ?? props.get('border-color')
    const c = b && parseColour((resolve(b).match(/#[0-9a-f]{3,8}\b|(?:rgb|hsl)a?\([^)]*\)/i) ?? [''])[0])
    const page = parseColour(tokens.has('--surface') ? 'var(--surface)' : '#fff')
    if (c && page && ratio(c, page) < 3) add(at, `the border that shows where this ${r.selector} is, is ${ratio(c, page).toFixed(2)}:1 against the page; needs 3:1`)
  }
}
const scale = new Set(['14px', '16px', '20px', '24px', '30px', '36px'])
for (const s of sizes) if (!scale.has(s)) add('font sizes', `${s} is not on the type scale (14 16 20 24 30 36)`)
if (sizes.size > 5) add('font sizes', `${sizes.size} different sizes; a tool screen needs about 3-4`)
for (const w of weights) if (!['400', '600', 'normal'].includes(w)) add('font weights', `weight ${w}: use 400 or 600 (nothing lighter than 400)`)
if (radii.size > 2) add('corners', `${radii.size} different corner radii (${[...radii].join(', ')}); pick one per tool`)
if (borders > 6) add('borders', `${borders} borders; separate with space or a background tone first`)

// 6. One main button per screen (static HTML of the app and its sketches).
for (const f of [path.join(app, 'index.html'), ...(existsSync(path.join(root, 'tools', tool, 'sketches')) ? readdirSync(path.join(root, 'tools', tool, 'sketches')).filter((n) => n.endsWith('.html') && n !== 'data-map.html').map((n) => path.join(root, 'tools', tool, 'sketches', n)) : [])]) {
  if (!existsSync(f)) continue
  const n = (readFileSync(f, 'utf8').match(/<button[^>]*class="[^"]*\bprimary\b/g) ?? []).length
  if (n > 1) add(path.relative(root, f).replace(/\\/g, '/'), `${n} main (primary) buttons; one per screen, the rest quieter`)
}

console.log(`DESIGN-CHECK ${tool}: ${findings.length} findings`)
for (const f of findings) console.log(`  ${f.where}: ${f.what}`)
process.exit(findings.length ? 1 : 0)
