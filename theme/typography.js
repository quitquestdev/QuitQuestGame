/**
 * Quit Quest type roles.
 *
 *   pixel   Jersey 10         numbers, stats, short button labels ONLY
 *   display Cinzel            major headings (Cinzel is all small caps by design,
 *                             so headings are never forced to uppercase)
 *   body    Cormorant Garamond descriptions, story text, longer copy
 *
 * Cormorant has a small x-height, so body roles stay at 17px or larger to read
 * at 320px wide. Jersey 10 was chosen over Pixelify Sans because its 5/S and
 * 2/Z are distinct, which matters for a numbers font. It has one weight and
 * small pixels, so pixel roles start at 16px and step in multiples of 4.
 *
 * Plain data so tailwind.config.js (web) and a future React Native StyleSheet
 * can both consume it. Sizes are in px; lineHeight is a multiplier.
 */

const fontFamilies = {
  pixel: '"Jersey 10", ui-monospace, monospace',
  display: 'Cinzel, Georgia, serif',
  body: '"Cormorant Garamond", Georgia, serif',
};

const typeRoles = {
  // Cinzel
  title: { family: 'display', weight: 700, size: 26, lineHeight: 1.15, letterSpacing: 0.02 },
  heading: { family: 'display', weight: 600, size: 19, lineHeight: 1.2, letterSpacing: 0.02 },
  subheading: { family: 'display', weight: 600, size: 15, lineHeight: 1.25, letterSpacing: 0.04 },

  // Cormorant Garamond
  body: { family: 'body', weight: 500, size: 18, lineHeight: 1.45, letterSpacing: 0 },
  story: { family: 'body', weight: 500, size: 19, lineHeight: 1.65, letterSpacing: 0.005 },
  caption: { family: 'body', weight: 600, size: 16, lineHeight: 1.35, letterSpacing: 0.01 },
  emphasis: { family: 'body', weight: 600, size: 18, lineHeight: 1.45, letterSpacing: 0, italic: true },

  // Jersey 10 (single weight)
  statXL: { family: 'pixel', weight: 400, size: 48, lineHeight: 1, letterSpacing: 0.01 },
  statL: { family: 'pixel', weight: 400, size: 32, lineHeight: 1, letterSpacing: 0.01 },
  stat: { family: 'pixel', weight: 400, size: 24, lineHeight: 1.05, letterSpacing: 0.02 },
  label: { family: 'pixel', weight: 400, size: 20, lineHeight: 1.1, letterSpacing: 0.03 },
  micro: { family: 'pixel', weight: 400, size: 16, lineHeight: 1.15, letterSpacing: 0.04 },
};

module.exports = { fontFamilies, typeRoles };
