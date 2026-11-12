import Link from 'next/link';

export const metadata = { title: 'Path not found | Quit Quest' };

// A friendly fallback for any unknown address. Plain markup (no game state),
// in the palette and type roles of the rest of the app.
export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-indigo-950">
      <div className="qq-panel qq-panel--raised text-center space-y-3 max-w-sm w-full">
        <p className="qq-label">Error 404</p>
        <h1 className="type-heading text-brass-300">This path is lost in the fog</h1>
        <p className="type-body text-bone">The page you were looking for is not here. Your quest and progress are safe.</p>
        <Link href="/" className="qq-link type-subheading inline-block">Back to Quit Quest</Link>
      </div>
    </main>
  );
}
