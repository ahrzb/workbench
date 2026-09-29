import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';
import { Input } from '@/components/ui/input.tsx';
import { fetchBooks } from '@/lib/api.ts';
import { filterBooks } from '@/lib/books.ts';
import type { Book } from '@/lib/books.ts';

export function BooksPage() {
  const [search, setSearch] = useState('');
  const books = useQuery({ queryKey: ['books'], queryFn: fetchBooks });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Books</h1>
      <Input
        type="search"
        placeholder="Search by title or author"
        aria-label="Search by title or author"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />

      {books.isPending && <p className="text-muted-foreground">Loading...</p>}
      {books.isError && (
        <div className="flex flex-col items-start gap-2">
          <p role="alert">{books.error.message}</p>
          <Button variant="outline" onClick={() => void books.refetch()}>
            Try again
          </Button>
        </div>
      )}
      {books.isSuccess && <BookList books={filterBooks(books.data, search)} />}
    </div>
  );
}

function BookList({ books }: { books: Book[] }) {
  if (books.length === 0) return <p className="text-muted-foreground">Nothing matches that search.</p>;
  return (
    <ul className="flex flex-col gap-3">
      {books.map((book) => (
        <li key={book.id}>
          <Card size="sm">
            <CardHeader>
              <CardTitle>{book.title}</CardTitle>
              <CardDescription>
                {book.author}, {book.year}
              </CardDescription>
            </CardHeader>
          </Card>
        </li>
      ))}
    </ul>
  );
}
