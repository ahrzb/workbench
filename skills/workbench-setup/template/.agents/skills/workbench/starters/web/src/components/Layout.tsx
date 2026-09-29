import { NavLink, Outlet } from 'react-router';
import { cn } from '@/lib/utils.ts';

const links = [
  { to: '/', label: 'Home', end: true },
  { to: '/books', label: 'Books', end: false },
];

export function Layout() {
  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-4">
      <header className="flex items-center justify-between border-b py-4">
        <span className="text-lg font-semibold">My site</span>
        <nav className="flex gap-4" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => cn('text-sm hover:underline', isActive ? 'font-semibold underline' : 'text-muted-foreground')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 py-8">
        <Outlet />
      </main>
      <footer className="border-t py-4 text-sm text-muted-foreground">Made with care.</footer>
    </div>
  );
}
