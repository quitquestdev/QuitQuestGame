const { PHASE_DEVELOPMENT_SERVER } = require('next/constants');

/**
 * Developer tools (the purchase mock and ad-slot outlines) follow the same
 * rule as the /dev harness: on in `npm run dev` and on Vercel previews, off
 * on the production site and in plain production builds. The value is
 * inlined at build time, so production bundles do not contain the tools.
 *
 * The build phase decides "dev", not NODE_ENV: NODE_ENV is not yet set when
 * Next.js loads this file.
 */
module.exports = (phase) => {
  const devTools =
    process.env.VERCEL_ENV === 'production'
      ? false
      : phase === PHASE_DEVELOPMENT_SERVER || process.env.VERCEL_ENV === 'preview' || process.env.QQ_DEV_TOOLS === 'true';

  /** @type {import('next').NextConfig} */
  return {
    reactStrictMode: true,
    swcMinify: true,
    poweredByHeader: false,
    // CREDITS.md is bundled as text for the in-app Credits screen, so the
    // screen always shows exactly what the file says.
    webpack(config) {
      config.module.rules.push({ test: /\.md$/, type: 'asset/source' });
      return config;
    },
    env: {
      QQ_DEV_TOOLS: devTools ? 'true' : 'false',
    },
  };
};
