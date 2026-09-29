// The page. Plain DOM, no framework. It reaches the outside world only through the `api` it is
// given (see api.mjs), and shows file text with textContent or .value, never innerHTML.
// No inline event attributes and no style="" attributes: the page's CSP forbids both.

import { addRecent, summarize } from './logic.mjs';

/**
 * @param {ReturnType<typeof import('./api.mjs').createBrowserApi>} api
 * @param {Document} doc
 */
export function startUi(api, doc) {
  /** @param {string} id */
  const el = (id) => {
    const found = doc.getElementById(id);
    if (!found) throw new Error(`index.html has no #${id}`);
    return found;
  };
  const openButton = /** @type {HTMLButtonElement} */ (el('open'));
  const saveButton = /** @type {HTMLButtonElement} */ (el('save'));
  const wrapBox = /** @type {HTMLInputElement} */ (el('wrap'));
  const textBox = /** @type {HTMLTextAreaElement} */ (el('text'));
  const recentList = el('recent');
  const exportButton = /** @type {HTMLButtonElement} */ (el('export-backup'));
  const restoreButton = /** @type {HTMLButtonElement} */ (el('restore-backup'));
  const status = el('status');

  let currentName = 'notes.txt';
  let settings = api.loadSettings();
  let data = api.loadData();

  /** @param {string} message */
  const say = (message) => {
    status.textContent = message;
  };

  function showSettings() {
    wrapBox.checked = settings.wrapLines;
    textBox.wrap = settings.wrapLines ? 'soft' : 'off';
  }

  function showRecent() {
    recentList.replaceChildren();
    if (data.recent.length === 0) {
      const none = doc.createElement('li');
      none.textContent = 'Nothing yet. Files you open show up here.';
      recentList.append(none);
      return;
    }
    for (const r of data.recent) {
      const item = doc.createElement('li');
      item.textContent = `${r.name}: ${r.lines} lines, ${r.words} words`;
      recentList.append(item);
    }
  }

  // Call the api straight from the click handler: the browser only opens its file picker
  // from a click, and an `await` before `api.openTextFile()` would lose that.
  openButton.addEventListener('click', async () => {
    const opened = await api.openTextFile();
    if (opened === null) return;
    if (opened.text === undefined) {
      say(`${opened.name}: ${opened.error ?? 'could not be read'}`);
      return;
    }
    currentName = opened.name;
    textBox.value = opened.text;
    const s = summarize(opened.text);
    say(`${opened.name}: ${s.lines} lines, ${s.words} words, ${s.characters} characters.`);
    data = addRecent(data, opened.name, s);
    api.saveData(data); // a full or blocked store only means the list is not kept; the file is open
    showRecent();
  });

  saveButton.addEventListener('click', async () => {
    const result = await api.saveTextFile(textBox.value, currentName);
    if (result.status === 'saved') say(`Saved ${result.bytes} bytes: ${result.path}`);
    else if (result.status === 'refused') say(`Not saved: ${result.reason}`);
    else say('Save cancelled.');
  });

  wrapBox.addEventListener('change', () => {
    settings = { ...settings, wrapLines: wrapBox.checked };
    showSettings();
    if (!api.saveSettings(settings)) say("This browser would not keep your settings. They apply until you close the page.");
  });

  exportButton.addEventListener('click', () => {
    const result = api.exportBackup();
    say(`Backup saved as ${result.fileName} (in your browser's downloads). Keep it somewhere safe.`);
  });

  restoreButton.addEventListener('click', async () => {
    const result = await api.restoreBackup();
    if (result.status === 'cancelled') return;
    if (result.status === 'refused') {
      say(`Not restored: ${result.reason}`);
      return;
    }
    settings = api.loadSettings();
    data = api.loadData();
    showSettings();
    showRecent();
    say(result.savedAt ? `Restored the backup from ${new Date(result.savedAt).toLocaleDateString()}.` : 'Restored the backup.');
  });

  showSettings();
  showRecent();
  say('Ready.');
}
