import { Route, Routes } from 'react-router';
import { Layout } from '@/components/Layout.tsx';
import { BooksPage } from '@/pages/BooksPage.tsx';
import { HomePage } from '@/pages/HomePage.tsx';
import { NotFoundPage } from '@/pages/NotFoundPage.tsx';

// Add a page: make it in src/pages/, add a <Route> here and a link in Layout.tsx.
export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="books" element={<BooksPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
