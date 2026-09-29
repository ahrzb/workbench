// The editable skill list, persisted as JSON in the app's userData folder. Pure node
// (fs + path only), so it is unit-tested without Electron. Relative imports carry
// extensions so node can run this file directly.
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

export const MAX_SKILLS = 500;
export const MAX_SKILL_LENGTH = 80;
const FILE = "skills.json";

/** Trims, drops blanks, removes case-insensitive duplicates. Throws on anything that is not a list of short strings. */
export function sanitizeSkills(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every((v) => typeof v === "string")) throw new Error("skills must be a list of text");
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value as string[]) {
    const s = raw.trim();
    if (s === "" || seen.has(s.toLowerCase())) continue;
    if (s.length > MAX_SKILL_LENGTH) throw new Error(`skill too long: "${s.slice(0, 20)}..."`);
    seen.add(s.toLowerCase());
    out.push(s);
  }
  if (out.length > MAX_SKILLS) throw new Error(`too many skills (max ${MAX_SKILLS})`);
  return out;
}

/** Returns null when there is no saved list yet or the file is unreadable / invalid (defaults are then used). */
export async function loadSkills(dir: string): Promise<string[] | null> {
  try {
    return sanitizeSkills(JSON.parse(await readFile(path.join(dir, FILE), "utf8")));
  } catch {
    return null;
  }
}

export async function saveSkills(dir: string, skills: unknown): Promise<void> {
  const clean = sanitizeSkills(skills);
  await mkdir(dir, { recursive: true });
  const target = path.join(dir, FILE);
  const tmp = `${target}.tmp`;
  await writeFile(tmp, JSON.stringify(clean, null, 2), "utf8");
  await rename(tmp, target); // atomic replace: a crash never leaves half a file
}
