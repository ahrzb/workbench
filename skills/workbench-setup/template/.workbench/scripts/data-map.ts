// Makes a tool's data map: tools/<tool>/sketches/data-map.html, drawn from the tables under
// "### Where it goes" in tools/<tool>/NOTES.md. Needs nothing but Bun (works in Codex's sandbox: no
// network, nothing outside the project). Prints the path; link it at the top of your reply
// (stack.md, "Showing a page").
//   .workbench\scripts\run.cmd bun .workbench\scripts\data-map.ts <tool>
// macOS: .tools/bun/bun .workbench/scripts/data-map.ts <tool>
import fs from 'node:fs'
import path from 'node:path'

function fail(msg: string): never {
  console.error(msg)
  process.exit(1)
}
const readText = (file: string) => fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, '')

const tool = process.argv[2]
if (!tool) fail('Give the name of the tool: data-map.ts <tool>')
if (!/^[a-z0-9-]+$/i.test(tool)) fail(`Tool names are lowercase letters, digits and dashes: ${tool}`)

const root = path.resolve(import.meta.dir, '..', '..')
const toolDir = path.join(root, 'tools', tool)
const notesFile = path.join(toolDir, 'NOTES.md')
if (!fs.existsSync(notesFile)) fail(`tools\\${tool} has no NOTES.md.`)
const notes = readText(notesFile)
if (!/^###\s+Where it goes/im.test(notes)) fail('NOTES.md has no "### Where it goes" block under "## Data" yet.')
const name = /^# Notes:\s*(.+?)\s*$/im.exec(notes)?.[1] || tool

const page = readText(path.join(root, '.agents', 'skills', 'workbench', 'data-map.html'))
// Base64, so nothing in the notes can end the script element or be read as HTML.
const b64 = Buffer.from(notes, 'utf8').toString('base64')
// Same escaping as .NET's WebUtility.HtmlEncode: & < > " ' and everything from U+00A0 to U+00FF
// (and characters outside the basic plane) as numeric references.
const named: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }
const htmlName = name.replace(/[&<>"']|[\u00a0-\u00ff]|[\ud800-\udbff][\udc00-\udfff]/g, (c) => named[c] ?? `&#${c.codePointAt(0)};`)
const out = path.join(toolDir, 'sketches', 'data-map.html')
fs.mkdirSync(path.dirname(out), { recursive: true })
fs.writeFileSync(out, page.replaceAll('__NOTES_BASE64__', () => b64).replaceAll('__TOOL_NAME__', () => htmlName))
console.log(out)
