// The browser's version of `window.api`: the only place that touches files, downloads and
// localStorage. ui.mjs receives it as an argument and never reaches for the browser itself.
// openTextFile/saveTextFile have the same names and result shapes as the Electron starter's
// `Api` (src/shared.ts), so the UI code can move between the two.

import { backupFileName, makeBackup, normalizeData, normalizeSettings, parseBackup, safeFileName } from './logic.mjs';

export const MAX_FILE_BYTES = 50 * 1024 * 1024; // same cap as the Electron starter

/**
 * @typedef {{ name: string, text?: string, error?: string }} OpenedText
 * @typedef {{ status: 'saved', path: string, bytes: number } | { status: 'cancelled' } | { status: 'refused', reason: string }} SaveResult
 * @typedef {{ status: 'restored', savedAt: string } | { status: 'cancelled' } | { status: 'refused', reason: string }} RestoreResult
 */

/**
 * @param {{ toolId: string, toolName: string, dataVersion: number, document: Document, storage: Storage, now?: () => Date }} env
 */
export function createBrowserApi({ toolId, toolName, dataVersion, document, storage, now = () => new Date() }) {
  // Chrome and Edge give every file:// page the same localStorage, so every key starts with
  // this tool's own id. Never read or write a key without it.
  const settingsKey = `${toolId}:settings`;
  const dataKey = `${toolId}:data`;

  /** @param {string} key */
  function read(key) {
    try {
      const text = storage.getItem(key);
      return text === null ? undefined : JSON.parse(text);
    } catch {
      return undefined; // storage blocked, or the value is damaged: fall back to the defaults
    }
  }

  /** @param {string} key @param {unknown} value @returns {boolean} false when the browser refused (private mode, full) */
  function write(key, value) {
    try {
      storage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Starts a browser download. Browsers never overwrite: an existing name becomes "name (1).ext".
   * @param {string} text @param {string} fileName @param {string} mime
   */
  function download(text, fileName, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  /**
   * Shows the browser's file picker. It only opens from a click, so call this straight from a
   * click handler with no `await` before it. Resolves null if the user cancelled.
   * @param {string} accept
   * @returns {Promise<{ name: string, text?: string, error?: string } | null>}
   */
  function pickTextFile(accept) {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.addEventListener('cancel', () => resolve(null));
      input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return resolve(null);
        const name = safeFileName(file.name);
        if (file.size > MAX_FILE_BYTES) {
          return resolve({ name, error: `file is larger than ${MAX_FILE_BYTES / 1024 / 1024} MB` });
        }
        try {
          // decode() drops a BOM, as in the Electron starter
          resolve({ name, text: new TextDecoder('utf-8').decode(await file.arrayBuffer()) });
        } catch {
          resolve({ name, error: 'could not be read' });
        }
      });
      input.click();
    });
  }

  return {
    /** @returns {Promise<OpenedText | null>} */
    openTextFile() {
      return pickTextFile('.txt,.md,.csv,text/plain,text/csv,text/markdown');
    },

    /** @param {string} text @param {string} suggestedName @returns {Promise<SaveResult>} */
    async saveTextFile(text, suggestedName) {
      const bytes = new TextEncoder().encode(text).length;
      if (typeof text !== 'string' || bytes > MAX_FILE_BYTES) return { status: 'refused', reason: 'nothing to save' };
      const name = safeFileName(suggestedName, 'notes.txt');
      download(text, name, 'text/plain;charset=utf-8');
      // The browser decides where it goes (usually Downloads) and cannot tell the page.
      return { status: 'saved', path: `${name} (in your browser's downloads)`, bytes };
    },

    /** Settings are small and always available; a bad or missing value gives the defaults. */
    loadSettings() {
      return normalizeSettings(read(settingsKey));
    },
    /** @param {import('./logic.mjs').Settings} settings @returns {boolean} */
    saveSettings(settings) {
      return write(settingsKey, normalizeSettings(settings));
    },

    /** The tool's own data (what the Electron starter would keep in dataDir()). */
    loadData() {
      return normalizeData(read(dataKey));
    },
    /** @param {import('./logic.mjs').ToolData} data @returns {boolean} */
    saveData(data) {
      return write(dataKey, normalizeData(data));
    },

    /** Downloads settings + data as one JSON file. @returns {{ status: 'saved', fileName: string }} */
    exportBackup() {
      const when = now();
      const fileName = backupFileName(toolName, when);
      const settings = normalizeSettings(read(settingsKey));
      const data = normalizeData(read(dataKey));
      download(makeBackup({ toolId, dataVersion, settings, data, now: when }), fileName, 'application/json');
      return { status: 'saved', fileName };
    },

    /** Picks a backup file, checks it, and replaces settings + data with its contents. @returns {Promise<RestoreResult>} */
    restoreBackup() {
      return pickTextFile('.json,application/json').then((picked) => {
        if (picked === null) return { status: 'cancelled' };
        if (picked.text === undefined) return { status: 'refused', reason: `${picked.name}: ${picked.error ?? 'could not be read'}` };
        const result = parseBackup(picked.text, { toolId, dataVersion });
        if (!result.ok) return { status: 'refused', reason: result.reason };
        if (!write(settingsKey, result.settings) || !write(dataKey, result.data)) {
          return { status: 'refused', reason: 'The browser would not let the tool keep the restored data.' };
        }
        return { status: 'restored', savedAt: result.savedAt };
      });
    },
  };
}
