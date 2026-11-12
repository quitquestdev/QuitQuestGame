import { allowIndexing, siteUrl } from '../lib/site';

// Before launch every crawler is turned away (NEXT_PUBLIC_QQ_ALLOW_INDEXING
// unset). At launch set it to 'true' and redeploy.
export default function robots() {
  if (!allowIndexing) return { rules: { userAgent: '*', disallow: '/' } };
  return { rules: { userAgent: '*', allow: '/', disallow: '/dev' }, host: siteUrl };
}
