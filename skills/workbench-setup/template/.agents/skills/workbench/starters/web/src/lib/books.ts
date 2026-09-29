// Pure logic for the example list page: reading the data file and filtering it.
// No React and no imports here, so `npm test` can run it directly. Rules the site must get right
// live in files like this one, not inside components.

export interface Book {
  id: string;
  title: string;
  author: string;
  year: number;
}

/** Turns the parsed contents of public/data/books.json into books, or throws a plain-English error. */
export function parseBooks(data: unknown): Book[] {
  if (!Array.isArray(data)) throw new Error('The list could not be read.');
  return data.map((row: unknown, index) => {
    if (typeof row !== 'object' || row === null) throw new Error(`Row ${index + 1} of the list is not readable.`);
    const { id, title, author, year } = row as Record<string, unknown>;
    if (typeof id !== 'string' || typeof title !== 'string' || typeof author !== 'string' || typeof year !== 'number') {
      throw new Error(`Row ${index + 1} of the list is missing something.`);
    }
    return { id, title, author, year };
  });
}

/** Case-insensitive match on title or author. An empty (or blank) search keeps everything. */
export function filterBooks(books: Book[], query: string): Book[] {
  const q = query.trim().toLowerCase();
  if (q === '') return books;
  return books.filter((b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q));
}
