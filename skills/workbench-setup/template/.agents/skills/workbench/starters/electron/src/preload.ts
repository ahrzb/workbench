// Runs in the sandboxed preload context. It exposes a few named functions to the page and
// nothing else: no ipcRenderer, no fs, no `require`, no raw channel names, no generic invoke.
import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from './shared.ts';
import type { Api } from './shared.ts';

const api: Api = {
  openTextFile: () => ipcRenderer.invoke(CHANNELS.openTextFile),
  saveTextFile: (text, suggestedName) => ipcRenderer.invoke(CHANNELS.saveTextFile, text, suggestedName),
};

contextBridge.exposeInMainWorld('api', api);
