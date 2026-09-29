/// <reference types="vite/client" />
// Ambient (no top-level import/export) so the `declare module` below is a real declaration.

declare module 'mammoth/mammoth.browser.js' {
  const mammoth: { extractRawText(input: { arrayBuffer: ArrayBuffer }): Promise<{ value: string }> };
  export default mammoth;
}

interface Window {
  /** Injected by preload.ts through contextBridge. */
  resumeApi: import('./shared.ts').ResumeApi;
}
