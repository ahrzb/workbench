/// <reference types="vite/client" />

interface Window {
  /** Injected by preload.ts through contextBridge. */
  api: import('./shared.ts').Api;
}
