/**
 * Site-wide web settings read from the environment (all public, non-secret).
 *
 *   NEXT_PUBLIC_QQ_SITE_URL         the site's public address, for share-image
 *                                   links (falls back to Vercel's own URL)
 *   NEXT_PUBLIC_QQ_ALLOW_INDEXING   'true' to let search engines index the site.
 *                                   Anything else (including unset) = noindex,
 *                                   so the site can be live before launch.
 */
const siteUrl =
  process.env.NEXT_PUBLIC_QQ_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
  'http://localhost:3000';

const allowIndexing = process.env.NEXT_PUBLIC_QQ_ALLOW_INDEXING === 'true';

module.exports = { siteUrl, allowIndexing };
