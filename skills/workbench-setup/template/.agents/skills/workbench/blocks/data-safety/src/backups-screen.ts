// The "Backups" screen: lists the copies of the tool's data and lets the user go back to one.
// Runs in the sandboxed page and reaches main only through window.api. Text goes in with
// textContent, never innerHTML. The confirmation is a native dialog shown by main.ts, so the
// page can never restore anything on its own.
import './backups-screen.css';
import type { BackupInfo } from './shared.ts';

function kindOf(b: BackupInfo): string {
  if (b.automatic) return 'Automatic copy';
  if (b.label === 'before-restore') return 'Kept just before going back to a copy';
  if (b.label?.startsWith('before-upgrade')) return 'Kept just before your data was updated';
  if (b.label?.startsWith('before-change')) return 'Kept just before a change to the tool';
  return `Saved copy (${b.label})`;
}

function sizeOf(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** `toggle` shows or hides `panel`; `panel` is refreshed each time it opens. */
export function mountBackups(toggle: HTMLButtonElement, panel: HTMLElement): void {
  const heading = document.createElement('h2');
  heading.textContent = 'Your backups';
  const intro = document.createElement('p');
  intro.className = 'backups-intro';
  intro.textContent = 'Copies of your data, newest first. Going back to a copy keeps your current data as another copy first, so nothing is lost.';
  const list = document.createElement('ul');
  list.className = 'backups-list';
  const note = document.createElement('p');
  note.className = 'backups-note';
  note.setAttribute('role', 'status');
  panel.replaceChildren(heading, intro, list, note);

  async function refresh(): Promise<void> {
    const backups = await window.api.listBackups();
    list.replaceChildren();
    if (backups.length === 0) note.textContent = 'There are no copies yet.';
    for (const b of backups) {
      const item = document.createElement('li');
      const text = document.createElement('span');
      text.textContent = `${b.stamp} - ${kindOf(b)} - ${sizeOf(b.bytes)}, ${b.files} ${b.files === 1 ? 'file' : 'files'}`;
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Go back to this copy';
      button.addEventListener('click', async () => {
        const result = await window.api.restoreBackup(b.name);
        if (result.status === 'restored') note.textContent = 'Done. The tool is restarting with that copy.';
        else if (result.status === 'refused') note.textContent = result.reason;
        else note.textContent = 'Nothing was changed.';
      });
      item.append(text, button);
      list.append(item);
    }
  }

  toggle.addEventListener('click', async () => {
    panel.hidden = !panel.hidden;
    if (panel.hidden) return;
    note.textContent = '';
    await refresh();
  });
}
