// The one place the page fetches data. Today it reads a static file from public/data/. When a real
// backend exists, only this file changes; React Query and the pages keep working as they are.
import { parseBooks } from './books.ts';
import type { Book } from './books.ts';

export async function fetchBooks(): Promise<Book[]> {
  const response = await fetch(`${import.meta.env.BASE_URL}data/books.json`);
  if (!response.ok) throw new Error('The list could not be loaded.');
  // A wrong file name does not give a 404 here: the host answers with the home page instead,
  // so a failed .json() means "not the file we expected".
  const data: unknown = await response.json().catch(() => {
    throw new Error('The list could not be read.');
  });
  return parseBooks(data);
}
