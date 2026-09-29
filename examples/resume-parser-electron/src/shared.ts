// The whole surface between the sandboxed page and the main process: the API type and the
// IPC channel names. It is imported by main.ts, preload.ts and renderer.ts (types only there).

export interface OpenedFile {
  /** File name only (never the full path: the page has no use for it). */
  name: string;
  /** File bytes, read by the main process from a path the user picked in the Open dialog. */
  bytes?: Uint8Array;
  /** Set instead of `bytes` when the file could not be read. */
  error?: string;
}

export type SaveResult =
  | { status: "saved"; path: string; bytes: number }
  | { status: "cancelled" }
  | { status: "refused"; reason: string };

export interface ResumeApi {
  /** Shows the native multi-select Open dialog (.pdf .docx .txt) and returns the bytes of what was picked. */
  openResumes(): Promise<OpenedFile[]>;
  /** Shows the native Save dialog and writes a NEW .xlsx file. Never overwrites an opened resume. */
  saveXlsx(bytes: Uint8Array, suggestedName: string): Promise<SaveResult>;
  /** The saved skill list, or null if the user never saved one. */
  loadSkills(): Promise<string[] | null>;
  saveSkills(skills: string[]): Promise<void>;
}

export const CHANNELS = {
  openResumes: "resumes:open",
  saveXlsx: "xlsx:save",
  loadSkills: "skills:load",
  saveSkills: "skills:save",
} as const;
