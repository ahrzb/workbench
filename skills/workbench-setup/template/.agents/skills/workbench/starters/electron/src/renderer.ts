// The page. Plain TypeScript and DOM, no framework. It reaches the outside world only through
// window.api (see preload.ts). Put file text into the page with textContent or .value, never innerHTML.
import './index.css';
import { summarize } from './logic.ts';

const openButton = document.querySelector<HTMLButtonElement>('#open')!;
const saveButton = document.querySelector<HTMLButtonElement>('#save')!;
const textBox = document.querySelector<HTMLTextAreaElement>('#text')!;
const status = document.querySelector<HTMLElement>('#status')!;

let currentName = 'notes.txt';

openButton.addEventListener('click', async () => {
  const opened = await window.api.openTextFile();
  if (opened === null) return;
  if (opened.text === undefined) {
    status.textContent = `${opened.name}: ${opened.error ?? 'could not be read'}`;
    return;
  }
  currentName = opened.name;
  textBox.value = opened.text;
  const s = summarize(opened.text);
  status.textContent = `${opened.name}: ${s.lines} lines, ${s.words} words, ${s.characters} characters.`;
});

saveButton.addEventListener('click', async () => {
  const result = await window.api.saveTextFile(textBox.value, currentName);
  if (result.status === 'saved') status.textContent = `Saved ${result.bytes} bytes to ${result.path}`;
  else if (result.status === 'refused') status.textContent = `Not saved: ${result.reason}`;
  else status.textContent = 'Save cancelled.';
});
