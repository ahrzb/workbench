// Plain logic with no DOM and no browser APIs, so `node --test` can check it in milliseconds.
// Put every rule the tool must get right (parsing, sums, checks, data upgrades) in files like this one.
// Same role as logic.ts in the Electron starter; `summarize` is identical so the two starters match.
// Only relative imports and `export function|const|class` are allowed in src/ (build.mjs inlines them).

/**
 * @typedef {{ lines: number, words: number, characters: number }} TextSummary
 * @typedef {{ name: string } & TextSummary} RecentFile
 * @typedef {{ wrapLines: boolean }} Settings
 * @typedef {{ recent: RecentFile[] }} ToolData
 */

/**
 * Counts lines, words and characters. An empty text has 0 lines.
 * @param {string} text
 * @returns {TextSummary}
 */
export function summarize(text) {
  const trimmed = text.trim();
  if (trimmed === '') return { lines: 0, words: 0, characters: text.length };
  return {
    lines: text.replace(/\r?\n$/, '').split(/\r?\n/).length,
    words: trimmed.split(/\s+/).length,
    characters: text.length,
  };
}

// ---- Settings and data: what the page keeps between visits -----------------------------------
// Whatever is read back from storage or from a backup file is untrusted: always normalize it.

export const DEFAULT_SETTINGS = Object.freeze({ wrapLines: true });
export const MAX_RECENT = 8;

/**
 * @param {unknown} raw
 * @returns {Settings}
 */
export function normalizeSettings(raw) {
  const r = isPlainObject(raw) ? raw : {};
  return { wrapLines: typeof r.wrapLines === 'boolean' ? r.wrapLines : DEFAULT_SETTINGS.wrapLines };
}

/**
 * Data upgrades from older versions belong here (see "Changing how data is stored" in stack.md).
 * @param {unknown} raw
 * @returns {ToolData}
 */
export function normalizeData(raw) {
  const r = isPlainObject(raw) ? raw : {};
  const list = Array.isArray(r.recent) ? r.recent : [];
  /** @type {RecentFile[]} */
  const recent = [];
  for (const item of list) {
    if (!isPlainObject(item) || typeof item.name !== 'string') continue;
    recent.push({
      name: item.name.slice(0, 200),
      lines: count(item.lines),
      words: count(item.words),
      characters: count(item.characters),
    });
    if (recent.length === MAX_RECENT) break;
  }
  return { recent };
}

/**
 * Puts a file on top of the recent list; a file opened again moves up instead of repeating.
 * @param {ToolData} data
 * @param {string} name
 * @param {TextSummary} summary
 * @returns {ToolData}
 */
export function addRecent(data, name, summary) {
  const rest = data.recent.filter((r) => r.name !== name);
  return { recent: [{ name, ...summary }, ...rest].slice(0, MAX_RECENT) };
}

// ---- Backup file ------------------------------------------------------------------------------
// localStorage belongs to one browser profile and can be cleared, so the page can write its own
// data to a JSON file and read it back. The file says which tool and which data version wrote it.

export const BACKUP_FORMAT = 'workbench-backup';
const MAX_BACKUP_CHARS = 5 * 1024 * 1024;

/**
 * @param {{ toolId: string, dataVersion: number, settings: Settings, data: ToolData, now: Date }} input
 * @returns {string} the JSON text of the backup file
 */
export function makeBackup({ toolId, dataVersion, settings, data, now }) {
  return JSON.stringify(
    { format: BACKUP_FORMAT, toolId, dataVersion, savedAt: now.toISOString(), settings, data },
    null,
    2,
  );
}

/**
 * Checks a backup file's text. Refuses (with a sentence for the user) anything that is not this
 * tool's backup, or that a newer version of the tool wrote.
 * @param {string} text
 * @param {{ toolId: string, dataVersion: number }} expected
 * @returns {{ ok: true, settings: Settings, data: ToolData, savedAt: string } | { ok: false, reason: string }}
 */
export function parseBackup(text, expected) {
  if (text.length > MAX_BACKUP_CHARS) return { ok: false, reason: 'This file is too large to be a backup.' };
  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'This is not a backup file from this tool.' };
  }
  if (!isPlainObject(parsed) || parsed.format !== BACKUP_FORMAT) {
    return { ok: false, reason: 'This is not a backup file from this tool.' };
  }
  if (parsed.toolId !== expected.toolId) {
    return { ok: false, reason: 'This backup belongs to a different tool.' };
  }
  const version = parsed.dataVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, reason: 'This backup file is damaged.' };
  }
  if (version > expected.dataVersion) {
    return { ok: false, reason: 'This backup was made by a newer version of the tool. Open the newer version to restore it.' };
  }
  return {
    ok: true,
    settings: normalizeSettings(parsed.settings),
    data: normalizeData(parsed.data),
    savedAt: typeof parsed.savedAt === 'string' ? parsed.savedAt : '',
  };
}

/**
 * `<name>-backup-yyyy-mm-dd-hhmm.json` in local time, the same stamp the Electron tools use for backup folders.
 * @param {string} name
 * @param {Date} now
 */
export function backupFileName(name, now) {
  const p = (/** @type {number} */ n) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}-${p(now.getHours())}${p(now.getMinutes())}`;
  return `${safeFileName(name)}-backup-${stamp}.json`;
}

/**
 * A name that is safe to give to a download: no folders, no characters Windows refuses.
 * @param {string} name
 * @param {string} [fallback]
 */
export function safeFileName(name, fallback = 'file') {
  const cleaned = String(name)
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s-]+|[.\s-]+$/g, '')
    .slice(0, 120);
  return cleaned === '' ? fallback : cleaned;
}

/** @param {unknown} v @returns {v is Record<string, unknown>} */
function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** @param {unknown} v */
function count(v) {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}
