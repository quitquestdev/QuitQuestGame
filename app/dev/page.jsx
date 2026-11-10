import { notFound } from 'next/navigation';
import DevHarness from '../../components/dev/DevHarness';

export const metadata = {
  title: 'Quit Quest dev harness',
  robots: { index: false, follow: false },
};

/**
 * Visual check of every palette colour, type role and sprite.
 * Available in `npm run dev`. Hidden in production builds unless
 * NEXT_PUBLIC_ENABLE_DEV_HARNESS=1 is set (e.g. on a Vercel preview).
 */
export default function DevHarnessPage() {
  const enabled = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEV_HARNESS === '1';
  if (!enabled) notFound();
  return <DevHarness />;
}
