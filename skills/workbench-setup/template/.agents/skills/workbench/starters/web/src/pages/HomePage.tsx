import { Link } from 'react-router';
import { Button } from '@/components/ui/button.tsx';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card.tsx';

export function HomePage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
        <CardDescription>A small site to build on.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-start gap-4">
        <p>This is the home page. The Books page shows a list loaded with React Query.</p>
        <Button asChild>
          <Link to="/books">See the books</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
