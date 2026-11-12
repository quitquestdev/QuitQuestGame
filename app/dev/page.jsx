import { notFound } from 'next/navigation';
import DevHarness from '../../components/dev/DevHarness';

export const metadata = {
  title: 'Quit Quest dev harness',
  robots: { index: false, follow: false },
};

/**
 * Visual check of every palette colour, type role and sprite.
 *
 * Available in `npm run dev` and on Vercel preview deployments (every pushed
 * branch other than the production one). Returns 404 on the production site.
 * NEXT_PUBLIC_ENABLE_DEV_HARNESS=1 forces it on for any other build.
 */
export default function DevHarnessPage() {
  const enabled =
    process.env.NODE_ENV !== 'production' ||
    process.env.VERCEL_ENV === 'preview' ||
    process.env.NEXT_PUBLIC_ENABLE_DEV_HARNESS === '1';
  if (!enabled) notFound();
  return <DevHarness />;
}
