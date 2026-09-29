// Pure, deterministic resume parser. No Tauri, DOM or network imports: it can be
// run by node, bun, vitest or the browser. Input is plain text; output carries a
// per-field flag so the UI can highlight what needs a human look.

export type Flag = "found" | "not_found" | "uncertain";

export interface Field {
  value: string;
  flag: Flag;
  /** Short human-readable reason, shown as a tooltip. */
  note?: string;
}

export type FieldKey =
  | "name"
  | "email"
  | "phone"
  | "linkedin"
  | "github"
  | "otherLinks"
  | "skills"
  | "years";

export interface ParsedResume {
  fields: Record<FieldKey, Field>;
  sections: { experience: boolean; education: boolean; skills: boolean };
}

export interface ParseOptions {
  /** Skills to look for (case-insensitive). Defaults to DEFAULT_SKILLS. */
  skills?: string[];
  /** "Present" in date ranges resolves to this. Injectable for deterministic tests. */
  now?: Date;
}

export const DEFAULT_SKILLS: string[] = [
  "Excel",
  "Microsoft Word",
  "PowerPoint",
  "Outlook",
  "Google Sheets",
  "SQL",
  "Python",
  "JavaScript",
  "TypeScript",
  "Java",
  "C++",
  "C#",
  "HTML",
  "CSS",
  "React",
  "Node.js",
  "Git",
  "Docker",
  "AWS",
  "Azure",
  "Linux",
  "Power BI",
  "Tableau",
  "SAP",
  "Salesforce",
  "Project Management",
  "Scrum",
  "Agile",
  "Jira",
  "Data Analysis",
  "Bookkeeping",
  "Accounting",
  "QuickBooks",
  "Payroll",
  "Recruiting",
  "Customer Service",
  "Communication",
  "Leadership",
  "Negotiation",
  "Time Management",
  "Public Speaking",
  "Photoshop",
  "Figma",
  "SEO",
  "Social Media",
  "Copywriting",
];

const notFound = (note?: string): Field => ({ value: "", flag: "not_found", note });

// ---------------------------------------------------------------- text helpers

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[\u200b\ufeff]/g, "")
    .replace(/\t/g, "  ");
}

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const URL_RE =
  /\b(?:https?:\/\/|www\.)[^\s<>"']+|\b(?:[a-z]{2,3}\.)?(?:linkedin\.com|github\.com|gitlab\.com|bitbucket\.org)\/[^\s<>"']+/gi;

const blank = (s: string) => s.replace(/./g, " ");

/** Text with emails and URLs blanked out (same length), so phone/name logic can't trip over them. */
function withoutEmailsAndUrls(text: string): string {
  return text.replace(EMAIL_RE, blank).replace(URL_RE, blank);
}

// ---------------------------------------------------------------- sections

type SectionKey = "experience" | "education" | "skills" | "other";

const HEADINGS: Record<string, SectionKey> = {
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  "relevant experience": "experience",
  "employment history": "experience",
  "work history": "experience",
  employment: "experience",
  "career history": "experience",
  education: "education",
  "education and training": "education",
  "academic background": "education",
  qualifications: "education",
  skills: "skills",
  "technical skills": "skills",
  "key skills": "skills",
  "core skills": "skills",
  "core competencies": "skills",
  "skills and tools": "skills",
  "skills and abilities": "skills",
  // headings we only need to recognise so they end the previous section
  summary: "other",
  "professional summary": "other",
  profile: "other",
  objective: "other",
  projects: "other",
  certifications: "other",
  certificates: "other",
  languages: "other",
  interests: "other",
  references: "other",
  awards: "other",
  publications: "other",
  volunteering: "other",
  contact: "other",
  "contact information": "other",
  "personal details": "other",
};

function headingKey(line: string): SectionKey | null {
  const t = line
    .trim()
    .replace(/^[\s\-–—_=*#•|:.]+|[\s\-–—_=*#:|.]+$/g, "")
    .replace(/\s*&\s*/g, " and ")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!t || t.length > 40) return null;
  return HEADINGS[t] ?? null;
}

function splitSections(lines: string[]): { bodies: Record<SectionKey, string[]>; seen: Set<SectionKey>; firstHeading: number } {
  const bodies: Record<SectionKey, string[]> = { experience: [], education: [], skills: [], other: [] };
  const seen = new Set<SectionKey>();
  let current: SectionKey | null = null;
  let firstHeading = -1;
  lines.forEach((line, i) => {
    const h = headingKey(line);
    if (h) {
      current = h;
      seen.add(h);
      if (firstHeading < 0) firstHeading = i;
      return;
    }
    if (current) bodies[current].push(line);
  });
  return { bodies, seen, firstHeading };
}

// ---------------------------------------------------------------- email

function findEmail(text: string): Field {
  const found = [...text.matchAll(EMAIL_RE)].map((m) => m[0].replace(/[.,;:]+$/, ""));
  const unique = [...new Set(found.map((e) => e.toLowerCase()))];
  if (unique.length === 0) return notFound("no email address in the text");
  const first = found.find((e) => e.toLowerCase() === unique[0])!;
  if (unique.length > 1) return { value: first, flag: "uncertain", note: `${unique.length} different emails: ${unique.join(", ")}` };
  return { value: first, flag: "found" };
}

// ---------------------------------------------------------------- phone

const PHONE_LABEL_RE = /(?:tel|telephone|phone|mobile|mob|cell|call|whatsapp)\W{0,3}$/i;
const YEAR_RANGE_RE = /^(?:19|20)\d{2}\s*[-–—]\s*(?:19|20)\d{2}$/;

function findPhone(text: string): Field {
  const cleaned = withoutEmailsAndUrls(text);
  const candidates: { raw: string; digits: string; strong: boolean }[] = [];
  for (const line of cleaned.split("\n")) {
    // Two or more spaces = layout gap (columns, right-aligned dates): never join across it.
    for (const seg of line.split(/\s{2,}/)) {
      for (const m of seg.matchAll(/(?<![\w])\(?(?:\+|00)?\(?\d[\d ()\-.–]{6,}\d(?!\w)/g)) {
        const raw = m[0].trim().replace(/[\s\-.–(]+$/, "");
        const digits = raw.replace(/\D/g, "");
        const hasPlus = /^\(?(?:\+|00)/.test(raw);
        const labelled = PHONE_LABEL_RE.test(seg.slice(Math.max(0, (m.index ?? 0) - 14), m.index ?? 0));
        if (YEAR_RANGE_RE.test(raw)) continue;
        if (/^\d{4}[-./]\d{2}[-./]\d{2}$/.test(raw) || /^\d{1,2}[-./]\d{1,2}[-./](?:19|20)\d{2}$/.test(raw)) continue;
        const min = hasPlus ? 8 : 9;
        const okLen = digits.length >= min && digits.length <= 15;
        const okLabelled = labelled && digits.length >= 7 && digits.length <= 15;
        if (!okLen && !okLabelled) continue;
        candidates.push({ raw, digits, strong: okLen });
      }
    }
  }
  if (candidates.length === 0) return notFound("no phone number pattern in the text");
  const distinct = new Map<string, (typeof candidates)[number]>();
  for (const c of candidates) if (!distinct.has(c.digits)) distinct.set(c.digits, c);
  const list = [...distinct.values()];
  const best = list.find((c) => c.strong) ?? list[0];
  if (!best.strong) return { value: best.raw, flag: "uncertain", note: "short number, checked only because of a phone label" };
  if (list.length > 1) return { value: best.raw, flag: "uncertain", note: `${list.length} numbers: ${list.map((c) => c.raw).join(" / ")}` };
  return { value: best.raw, flag: "found" };
}

// ---------------------------------------------------------------- links
function findLinks(text: string): { linkedin: Field; github: Field; otherLinks: Field } {
  const noEmails = text.replace(EMAIL_RE, blank);
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const m of noEmails.matchAll(URL_RE)) {
    const u = m[0].replace(/[.,;:)\]}>]+$/, "");
    const key = u.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/+$/, "");
    if (!seen.has(key)) {
      seen.add(key);
      urls.push(u);
    }
  }
  const parsed = urls.map((u) => {
    let host = "";
    let path: string[] = [];
    try {
      const url = new URL(/^https?:\/\//i.test(u) ? u : `https://${u}`);
      host = url.hostname.toLowerCase().replace(/^www\./, "");
      path = url.pathname.split("/").filter(Boolean);
    } catch {
      /* leave host empty: falls into "other" */
    }
    return { u, host, path };
  });
  const isHost = (h: string, d: string) => h === d || h.endsWith("." + d);

  const li = parsed.filter((p) => isHost(p.host, "linkedin.com"));
  const gh = parsed.filter((p) => isHost(p.host, "github.com"));
  const other = parsed.filter((p) => !isHost(p.host, "linkedin.com") && !isHost(p.host, "github.com"));

  let linkedin: Field = notFound();
  if (li.length) {
    const profile = li.find((p) => p.path[0] === "in" || p.path[0] === "pub");
    linkedin = profile
      ? { value: profile.u, flag: "found" }
      : { value: li[0].u, flag: "uncertain", note: "LinkedIn link is not a /in/ profile link" };
  }

  let github: Field = notFound();
  if (gh.length) {
    const profile = gh.find((p) => p.path.length === 1);
    if (profile) github = { value: profile.u, flag: "found" };
    else github = { value: `https://github.com/${gh[0].path[0] ?? ""}`, flag: "uncertain", note: `derived from ${gh[0].u}` };
  }

  const otherLinks: Field = other.length
    ? { value: other.map((p) => p.u).join("; "), flag: "found" }
    : notFound();
  return { linkedin, github, otherLinks };
}

// ---------------------------------------------------------------- name

const NOT_A_NAME =
  /\b(analyst|engineer|developer|manager|designer|consultant|specialist|director|assistant|administrator|coordinator|officer|accountant|intern|architect|scientist|lead|executive|representative|recruiter|technician|programmer|resume|curriculum|vitae|cv|profile|summary|objective|contact|experience|education|skills|references|address|page|university|college|school|inc|ltd|llc|gmbh)\b/i;
const PARTICLES = new Set(["de", "da", "del", "di", "van", "von", "der", "den", "la", "le", "el", "al", "bin", "bint", "ibn", "dos", "das", "du", "st."]);

function titleCase(s: string): string {
  return s.toLowerCase().replace(/(^|[\s\-'’])(\p{L})/gu, (_, p: string, c: string) => p + c.toUpperCase());
}

function nameFromLine(line: string): { name: string; shouty: boolean } | null {
  let piece = line.trim().replace(/^(?:full\s+)?name\s*[:\-]\s*/i, "");
  piece = piece.split(/\s+[|•·\/–—]\s+|\s+-\s+|\s{2,}|,/)[0].trim();
  if (!piece || /[\d@:]/.test(piece)) return null;
  if (NOT_A_NAME.test(piece) || /(?:^|\s)\p{L}+['’](?:m|re|ve|ll|d|t|s)(?:\s|$)/iu.test(piece)) return null; // job titles, "I'm ...", "Don't ..."
  const tokens = piece.split(/\s+/);
  if (tokens.length < 2 || tokens.length > 4) return null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (i > 0 && i < tokens.length - 1 && PARTICLES.has(t.toLowerCase())) continue;
    if (!/^\p{Lu}[\p{L}'’.\-]*$/u.test(t)) return null;
  }
  const letters = piece.replace(/[^\p{L}]/gu, "");
  const shouty = letters.length > 3 && letters === letters.toUpperCase();
  return { name: shouty ? titleCase(piece) : piece, shouty };
}

function findName(lines: string[], email: Field, firstHeading: number): Field {
  const nonEmpty: string[] = [];
  const limit = firstHeading >= 0 ? firstHeading : lines.length;
  for (let i = 0; i < limit && nonEmpty.length < 15; i++) if (lines[i].trim()) nonEmpty.push(lines[i]);
  for (let i = 0; i < nonEmpty.length; i++) {
    const cand = nameFromLine(nonEmpty[i]);
    if (cand) {
      if (i <= 2) return { value: cand.name, flag: "found", note: cand.shouty ? "converted from ALL CAPS" : undefined };
      return { value: cand.name, flag: "uncertain", note: `taken from line ${i + 1}, not the top of the page` };
    }
  }
  if (email.value) {
    const local = email.value.split("@")[0];
    const parts = local.split(/[._\-]+/).filter((p) => /^\p{L}{2,}$/u.test(p));
    if (parts.length >= 2 && parts.length <= 3) return { value: titleCase(parts.join(" ")), flag: "uncertain", note: "guessed from the email address" };
  }
  return notFound("no plausible name line near the top");
}

// ---------------------------------------------------------------- skills
function findSkills(text: string, skills: string[]): Field {
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const raw of skills) {
    const skill = raw.trim();
    if (!skill || seen.has(skill.toLowerCase())) continue;
    seen.add(skill.toLowerCase());
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const re = new RegExp(`(?<![\\p{L}\\p{N}+#])${escaped}(?![\\p{L}\\p{N}+#])`, "iu");
    if (re.test(text)) hits.push(skill);
  }
  return hits.length ? { value: hits.join(", "), flag: "found" } : notFound("none of the skills in your list appear in the text");
}

// ---------------------------------------------------------------- years of experience

const MON = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\.?";
const DATE = `(?:(?:${MON}\\s*,?\\s*|\\d{1,2}\\/)?(?:19|20)\\d{2})`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until)\\s*(${DATE}|present|current|now|today|ongoing)`, "gi");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function monthIndex(token: string, now: Date): number | null {
  const t = token.trim().toLowerCase();
  if (/^(present|current|now|today|ongoing)$/.test(t)) return now.getFullYear() * 12 + now.getMonth();
  const year = Number(t.match(/(?:19|20)\d{2}/)?.[0]);
  if (!year) return null;
  const named = MONTHS.findIndex((m) => t.startsWith(m));
  const numeric = t.match(/^(\d{1,2})\//);
  let month = 6; // year only: mid-year, so "2015 - 2019" is 4 years, not 5
  if (named >= 0) month = named;
  else if (numeric) month = Math.min(11, Math.max(0, Number(numeric[1]) - 1));
  return year * 12 + month;
}

function rangesMonths(lines: string[], now: Date): number | null {
  const intervals: [number, number][] = [];
  for (const line of lines) {
    for (const m of line.matchAll(RANGE_RE)) {
      const a = monthIndex(m[1], now);
      const b = monthIndex(m[2], now);
      if (a === null || b === null || b < a) continue;
      intervals.push([a, b]);
    }
  }
  if (!intervals.length) return null;
  intervals.sort((x, y) => x[0] - y[0]);
  let total = 0;
  let [cs, ce] = intervals[0];
  for (const [s, e] of intervals.slice(1)) {
    if (s <= ce) ce = Math.max(ce, e);
    else {
      total += ce - cs;
      [cs, ce] = [s, e];
    }
  }
  return total + (ce - cs);
}

const EXPLICIT_YEARS_RE =
  /(\d{1,2}(?:\.\d)?)\s*\+?\s*(?:years?|yrs?)\b(?:\s+of)?(?:\s+(?:professional|relevant|work|industry|total|hands-on))?\s+(?:of\s+)?experience/gi;

function findYears(text: string, lines: string[], bodies: Record<SectionKey, string[]>, seen: Set<SectionKey>, now: Date): Field {
  const explicit = [...text.matchAll(EXPLICIT_YEARS_RE)].map((m) => Number(m[1])).filter((n) => n > 0 && n < 60);
  if (explicit.length) {
    const distinct = [...new Set(explicit)];
    const max = Math.max(...distinct);
    return distinct.length === 1
      ? { value: String(max), flag: "found", note: "stated in the text" }
      : { value: String(max), flag: "uncertain", note: `text states several values: ${distinct.join(", ")}` };
  }
  if (seen.has("experience")) {
    const months = rangesMonths(bodies.experience, now);
    if (months === null) return notFound("Experience section has no date ranges");
    return { value: String(Math.round((months / 12) * 2) / 2), flag: "found", note: "sum of date ranges in Experience (overlaps merged, rounded to 0.5)" };
  }
  const anywhere = rangesMonths(
    lines.filter((l) => !bodies.education.includes(l)),
    now,
  );
  return anywhere === null
    ? notFound("no Experience heading and no date ranges")
    : { value: "", flag: "uncertain", note: "date ranges exist but there is no Experience heading, so they were not summed" };
}

// ---------------------------------------------------------------- entry point

export function parseResume(rawText: string, opts: ParseOptions = {}): ParsedResume {
  const text = normalize(rawText);
  const lines = text.split("\n");
  const { bodies, seen, firstHeading } = splitSections(lines);
  const now = opts.now ?? new Date();

  const email = findEmail(text);
  const links = findLinks(text);
  return {
    fields: {
      name: findName(lines, email, firstHeading),
      email,
      phone: findPhone(text),
      linkedin: links.linkedin,
      github: links.github,
      otherLinks: links.otherLinks,
      skills: findSkills(text, opts.skills ?? DEFAULT_SKILLS),
      years: findYears(text, lines, bodies, seen, now),
    },
    sections: {
      experience: seen.has("experience"),
      education: seen.has("education"),
      skills: seen.has("skills"),
    },
  };
}
