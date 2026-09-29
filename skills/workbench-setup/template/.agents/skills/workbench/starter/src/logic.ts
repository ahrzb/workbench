// Plain logic with no Electron and no DOM, so `npm test` can check it in milliseconds.
// Put every rule the tool must get right (parsing, sums, checks) in files like this one.
// Use only syntax Node can strip types from (no enums, no parameter properties).

export interface TextSummary {
  lines: number;
  words: number;
  characters: number;
}

/** Counts lines, words and characters. An empty text has 0 lines. */
export function summarize(text: string): TextSummary {
  const trimmed = text.trim();
  if (trimmed === '') return { lines: 0, words: 0, characters: text.length };
  return {
    lines: text.replace(/\r?\n$/, '').split(/\r?\n/).length,
    words: trimmed.split(/\s+/).length,
    characters: text.length,
  };
}
