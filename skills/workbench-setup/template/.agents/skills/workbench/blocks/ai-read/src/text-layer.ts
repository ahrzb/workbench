// Pure helpers for "does the PDF already contain its text, so the AI is not needed?". No imports, tested
// in test/text-layer.test.mjs. The renderer (pdf-pages.ts) fills the pages in.

export interface TextLayer {
  /** Text of each page, in reading order, whitespace tidied. */
  pages: string[];
  /** Per page: enough real text that code can read it. Send only the pages that are false to the AI. */
  hasText: boolean[];
  /** All pages joined with a blank line. */
  text: string;
  /** True when every page has enough real text: code can read it and the AI can be skipped. */
  enough: boolean;
}

/** A scanned page has no text or a few stray characters. Under this many letters/digits, treat it as a picture. */
export const MIN_CHARS_PER_PAGE = 60;

export function tidy(text: string): string {
  return text.replace(/[ \t\u00a0]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

/** Letters and digits of any alphabet: what "real text" means. */
export function countReadable(text: string): number {
  return (text.match(/[\p{L}\p{N}]/gu) ?? []).length;
}

export function toTextLayer(pages: string[], minChars = MIN_CHARS_PER_PAGE): TextLayer {
  const tidied = pages.map(tidy);
  const hasText = tidied.map((p) => countReadable(p) >= minChars);
  return {
    pages: tidied,
    hasText,
    text: tidied.join('\n\n'),
    enough: hasText.length > 0 && hasText.every(Boolean),
  };
}
