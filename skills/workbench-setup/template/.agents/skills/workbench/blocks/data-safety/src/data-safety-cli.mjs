// For the AI, not the user and not the packaged app: backs up, lists, copies and restores the tool's
// data from the command line, with the same code the tool itself uses. Run from tools\<name>\app\:
//   ..\..\..\.workbench\scripts\run.cmd node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --disable-warning=ExperimentalWarning src\data-safety-cli.mjs <command>
//   status                  the data version on disk and the version this code expects
//   backup <label words>    copy the data to the backups folder; prints the path (label e.g. "before newest bills first")
//   list                    the backups, newest first
//   copy                    copy the data to a new folder in Temp; prints the path to use as WORKBENCH_DATA_DIR
//   restore <name>          go back to a backup (keeps the current data as "before-restore"; the tool must be closed)
// TOOL_ID and DATA_VERSION are read from src\main.ts. WORKBENCH_DATA_DIR is honoured like the tool does.
import { readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { copyData, createDataSafety } from './data-safety.ts';

const mainSource = readFileSync(new URL('./main.ts', import.meta.url), 'utf8');
const toolId = /const TOOL_ID = '([^']+)'/.exec(mainSource)?.[1];
const expected = Number(/const DATA_VERSION = (\d+)/.exec(mainSource)?.[1]);
if (!toolId || toolId === 'set-when-copied' || !Number.isInteger(expected)) {
  console.error('src/main.ts needs a real TOOL_ID and a DATA_VERSION constant first.');
  process.exit(1);
}

function dataDir() {
  if (process.env.WORKBENCH_DATA_DIR) return process.env.WORKBENCH_DATA_DIR;
  if (!process.env.LOCALAPPDATA) throw new Error('LOCALAPPDATA is not set');
  return path.join(process.env.LOCALAPPDATA, 'WorkbenchTools', toolId, 'data');
}

const safety = createDataSafety({ dataDir });
const [command, ...rest] = process.argv.slice(2);

if (command === 'status') {
  let onDisk = 'no data yet';
  try {
    onDisk = String(JSON.parse(readFileSync(path.join(dataDir(), 'version.json'), 'utf8')).dataVersion);
  } catch {
    // no version file: fresh, or data from before versions existed
  }
  console.log(`data folder: ${dataDir()}\ndata version on disk: ${onDisk}\nversion this code expects: ${expected}\nbackups folder: ${safety.backupsDir()}`);
} else if (command === 'backup') {
  const label = rest.join(' ').trim();
  const made = await safety.backupNow(label === '' ? undefined : label);
  console.log(made ?? 'There is no data yet, so nothing was backed up.');
} else if (command === 'list') {
  for (const b of await safety.listBackups()) console.log(`${b.name}\t${b.stamp}\t${b.automatic ? 'automatic' : b.label}\t${b.files} files\t${b.bytes} bytes`);
} else if (command === 'copy') {
  const target = path.join(os.tmpdir(), `wb-check-${randomBytes(4).toString('hex')}`, 'data');
  await copyData(dataDir(), target);
  console.log(target);
} else if (command === 'restore' && rest.length === 1) {
  const result = await safety.restoreBackup(rest[0], { maxVersion: expected });
  console.log(result.ok ? `Restored. Current data was kept in: ${result.setAside ?? '(there was none)'}` : result.message);
  process.exitCode = result.ok ? 0 : 1;
} else {
  console.error('Usage: data-safety-cli.mjs status | backup <label words> | list | copy | restore <name>');
  process.exitCode = 1;
}
