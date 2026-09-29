// The whole surface between the sandboxed page and the main process: the API type and the
// IPC channel names. Imported by main.ts, preload.ts and renderer.ts (types only there).
// To add a feature: add a channel here, a handler in main.ts, one named function in preload.ts.

export interface OpenedText {
  /** File name only (never the full path: the page has no use for it). */
  name: string;
  /** File text, read by the main process from a path the user picked in the Open dialog. */
  text?: string;
  /** Set instead of `text` when the file could not be read. */
  error?: string;
}

export type SaveResult =
  | { status: 'saved'; path: string; bytes: number }
  | { status: 'cancelled' }
  | { status: 'refused'; reason: string };

export interface Api {
  /** Shows the native Open dialog. Returns null if the user cancelled. */
  openTextFile(): Promise<OpenedText | null>;
  /** Shows the native Save dialog and writes a NEW file. Never overwrites an existing file. */
  saveTextFile(text: string, suggestedName: string): Promise<SaveResult>;
}

export const CHANNELS = {
  openTextFile: 'text:open',
  saveTextFile: 'text:save',
} as const;
