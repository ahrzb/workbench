// Entry point: the only file that knows the tool's identity and touches the real browser.
import { createBrowserApi } from './api.mjs';
import { startUi } from './ui.mjs';

// Set TOOL_ID once (a short name plus 6 random letters, `bills-k3f9x2`) and never change it:
// it prefixes every localStorage key and is checked when a backup is restored.
// Raise DATA_VERSION only together with the upgrade code in logic.mjs (normalizeData / parseBackup).
// The tool's name is the <title> in index.html; it also names out/<title>.html and the backup files.
const TOOL_ID = 'html-starter-abcdef';
const DATA_VERSION = 1;

// Some browser settings block localStorage for file:// pages (even reading `localStorage` throws).
// The tool then still works; saving reports failure and the page says so.
function pickStorage() {
  try {
    return localStorage;
  } catch {
    return {
      getItem: () => null,
      setItem: () => {
        throw new Error('storage is blocked');
      },
    };
  }
}

startUi(createBrowserApi({ toolId: TOOL_ID, toolName: document.title, dataVersion: DATA_VERSION, document, storage: pickStorage() }), document);
