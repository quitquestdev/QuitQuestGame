/**
 * Quit Quest master palette: 32 colours in five families.
 *
 * This is the only place colours are defined. Every colour in the UI, in
 * Tailwind classes, and in generated placeholder sprites must come from here.
 *
 * Families run dark to light. Shadows lean toward violet and highlights lean
 * warm, the hue-shifted ramps that give SNES-era art its depth.
 *
 *   indigo  panels, sky, backgrounds          (8)
 *   brass   trim, borders, rewards, currency  (6)
 *   rust    danger, damage, enemies, cravings (6)
 *   moss    recovery and growth ONLY          (6)  green is a meaning colour
 *   stone   text, bone, stone                 (6)
 *
 * Plain CommonJS with no imports so it can be shared by the Next.js app,
 * tailwind.config.js, Node scripts, and a future React Native build.
 */

const palette = {
  // Indigo and slate: near-black indigo up to soft periwinkle
  indigo950: '#0c0a18',
  indigo900: '#15132b',
  indigo800: '#1f1d40',
  indigo700: '#2c2b57',
  indigo600: '#3b3d73',
  indigo500: '#505891',
  indigo400: '#6c79b0',
  indigo300: '#97a3d2',

  // Muted brass: warm antique metal, never bright yellow
  brass800: '#3b2814',
  brass700: '#5c3e1e',
  brass600: '#84602c',
  brass500: '#a8823d',
  brass400: '#c7a65c',
  brass300: '#e0c98f',

  // Rust and crimson: deep blood to ember
  rust800: '#360f19',
  rust700: '#5b1a22',
  rust600: '#872a27',
  rust500: '#ae432e',
  rust400: '#cf6a40',
  rust300: '#e89b69',

  // Moss and forest: recovery, health, XP, positive actions only
  moss800: '#14251c',
  moss700: '#213e2a',
  moss600: '#325a35',
  moss500: '#4c7a3e',
  moss400: '#719d50',
  moss300: '#a3c477',

  // Warm neutrals: stone greys up to bone
  stone800: '#29241f',
  stone700: '#3e3731',
  stone600: '#5b5249',
  stone500: '#7e7365',
  stone400: '#a79b89',
  bone: '#ece0c6',
};

/** Families as Tailwind-style scales, e.g. families.brass[500]. */
const families = {
  indigo: pick('indigo'),
  brass: pick('brass'),
  rust: pick('rust'),
  moss: pick('moss'),
  stone: pick('stone'),
  bone: { DEFAULT: palette.bone },
};

function pick(prefix) {
  const out = {};
  for (const [name, hex] of Object.entries(palette)) {
    const m = name.match(new RegExp(`^${prefix}(\\d+)$`));
    if (m) out[m[1]] = hex;
  }
  return out;
}

/** Hex to rgba() string, for translucent panel tints. */
function withAlpha(hex, alpha) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

module.exports = { palette, families, withAlpha };
