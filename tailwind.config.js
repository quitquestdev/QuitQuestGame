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
 * not in the master palette generates nothing. Use the palette families
 * (indigo, brass, rust, moss, stone, bone) in new code.
 *
 * LEGACY ALIASES: the existing screens still use Tailwind's stock names
 * (slate, yellow, green...). Those names are remapped here onto the nearest
 * palette token so the whole UI already renders in palette colours. Stage 4
 * replaces them with the new components; delete this block when nothing
 * references a legacy name any more.
 */
const STOCK_SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

function alias(scale, overrides = {}) {
  const keys = Object.keys(scale).map(Number).sort((a, b) => a - b);
  const out = {};
  for (const shade of STOCK_SHADES) {
    const nearest = keys.reduce((best, k) => (Math.abs(k - shade) < Math.abs(best - shade) ? k : best));
    out[shade] = overrides[shade] || scale[nearest];
  }
  return out;
}

const legacy = {
  slate: alias(families.indigo),
  purple: alias(families.indigo),
  blue: alias(families.indigo),
  gray: alias(families.stone, { 50: palette.bone, 100: palette.bone, 200: palette.bone, 300: palette.stone400 }),
  yellow: alias(families.brass),
  amber: alias(families.brass),
  red: alias(families.rust),
  orange: alias(families.rust),
  pink: alias(families.rust),
  green: alias(families.moss),
  emerald: alias(families.moss),
  white: palette.bone,
  black: palette.indigo950,
};

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  // Type roles are a small design-system API and may be chosen dynamically.
  safelist: [{ pattern: /^type-/ }],
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      inherit: 'inherit',
      ...legacy,
      // Palette families last, so `indigo-*` resolves to the real tokens.
      ...families,
    },
    extend: {
      fontFamily: {
        // Legacy: still used by the current screens until Stage 4.
        'pixel-legacy': ['Poppins', 'system-ui', 'sans-serif'],
        // New type system (see theme/typography.js).
        pixel: [fontFamilies.pixel],
        display: [fontFamilies.display],
        body: [fontFamilies.body],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite',
        'twinkle': 'twinkle 5s infinite',
        'float': 'float 3s ease-in-out infinite',
        'scale-up': 'scale-up 0.5s ease-out',
        'bounce-slow': 'bounce-slow 2s ease-in-out infinite',
        'fade-in': 'fade-in 0.5s ease-out',
        'pulse-slow': 'pulse-slow 2s ease-in-out infinite',
      },
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        twinkle: {
          '0%, 100%': { opacity: '0' },
          '50%': { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        'scale-up': {
          '0%': { transform: 'scale(0)' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)' },
        },
        'bounce-slow': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(10px)' },
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
