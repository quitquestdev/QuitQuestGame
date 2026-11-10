const plugin = require('tailwindcss/plugin');
const { palette, families } = require('./theme/palette');
const { fontFamilies, typeRoles } = require('./theme/typography');

/** `.type-<role>` classes generated from theme/typography.js. */
const typeClasses = Object.fromEntries(
  Object.entries(typeRoles).map(([role, t]) => [
    `.type-${role}`,
    {
      fontFamily: fontFamilies[t.family],
      fontWeight: String(t.weight),
      fontSize: `${t.size}px`,
      lineHeight: String(t.lineHeight),
      letterSpacing: `${t.letterSpacing}em`,
      fontStyle: t.italic ? 'italic' : 'normal',
      textTransform: 'none',
    },
  ]),
);

/** Every palette token as a CSS variable, e.g. var(--c-brass500). */
const paletteVars = Object.fromEntries(Object.entries(palette).map(([k, v]) => [`--c-${k}`, v]));

/**
 * Tailwind's default colours are replaced entirely, so a colour class that is
 * not in the master palette generates nothing. Use the palette families:
 * indigo, brass, rust, moss, stone, bone (see theme/palette.js).
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Type roles are a small design-system API and may be chosen dynamically.
  safelist: [{ pattern: /^type-/ }, { pattern: /^qq-/ }],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...families,
    },
    extend: {
      fontFamily: {
        // New type system (see theme/typography.js).
        pixel: [fontFamilies.pixel],
        display: [fontFamilies.display],
        body: [fontFamilies.body],
      },
      // Stepped timing and even pixel distances keep pixel art crisp in motion.
      animation: {
        'twinkle': 'twinkle 5s steps(5, end) infinite',
        'float': 'float 3s steps(10, end) infinite',
        'bounce-slow': 'bounce-slow 2s steps(4, end) infinite',
        'fade-in': 'fade-in 0.4s steps(4, end)',
        'pulse-slow': 'pulse-slow 2s steps(4, end) infinite',
      },
      keyframes: {
        twinkle: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
      },
    },
  },
  plugins: [
    plugin(({ addBase, addComponents }) => {
      addBase({ ':root': paletteVars });
      addComponents(typeClasses);
    }),
  ],
}
