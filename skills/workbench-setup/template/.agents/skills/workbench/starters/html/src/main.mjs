// Entry point: the only file that knows the tool's identity and touches the real browser.
import { createBrowserApi } from './api.mjs';
import { startUi } from './ui.mjs';

// Set TOOL_ID once (a short name plus 6 random letters, `bills-k3f9x2`) and never change it:
// it prefixes every localStorage key and is checked when a backup is restored.
// Raise DATA_VERSION only together with the upgrade code in logic.mjs (normalizeData / parseBackup).
// The tool's name is the <title> in index.html; it also names out/<title>.html and the backup files.
const TOOL_ID = 'html-starter-abcdef';
const DATA_VERSION = 1;
// `node build.mjs --try` builds a copy to try out next to the one in use: it sets this to true, which
// gives that copy its own storage (practice data) and marks the page. Leave it false here.
const TRYING_OUT = false;
const TOOL_NAME = document.title;
if (TRYING_OUT) {
  document.title = `${TOOL_NAME} (trying out: practice data)`;
  const note = document.createElement('p');
  note.className = 'trying-out';
  note.textContent = 'Trying out a new version. It keeps its own practice data; your usual copy is not changed. Restore a backup from your usual copy to practise on your real data.';
  document.body.prepend(note);
}

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

startUi(createBrowserApi({ toolId: TOOL_ID, storageId: TRYING_OUT ? `${TOOL_ID}:trying-out` : TOOL_ID, toolName: TOOL_NAME, dataVersion: DATA_VERSION, document, storage: pickStorage() }), document);
