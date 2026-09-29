// Runs in the sandboxed preload context. It exposes four named functions to the page and
// nothing else: no ipcRenderer, no fs, no `require`, no raw channel names.
import { contextBridge, ipcRenderer } from 'electron';
import { CHANNELS } from './shared.ts';
import type { ResumeApi } from './shared.ts';

const api: ResumeApi = {
  openResumes: () => ipcRenderer.invoke(CHANNELS.openResumes),
  saveXlsx: (bytes, suggestedName) => ipcRenderer.invoke(CHANNELS.saveXlsx, bytes, suggestedName),
  loadSkills: () => ipcRenderer.invoke(CHANNELS.loadSkills),
  saveSkills: (skills) => ipcRenderer.invoke(CHANNELS.saveSkills, skills),
};

contextBridge.exposeInMainWorld('resumeApi', api);
