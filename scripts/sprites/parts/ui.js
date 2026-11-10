/**
 * UI pieces, drawn in code:
 *
 *   ui_panel_frame   24x24 nine-slice (8px corners): notched corners, brass
 *                    trim, 1px light inner edge top/left, 1px dark bottom/right.
 *                    Centre is transparent; the panel body tint comes from CSS.
 *   ui_button_<tone> 24x24 nine-slice, animations = states: normal, pressed,
 *                    disabled. Tones: brass (default), moss (positive actions
 *                    only), rust (danger / cravings).
 *   ui_bar_frame     12x10 three-slice progress bar track with end caps
 *                    (4px caps, 4px repeatable middle, 4px-tall track).
 *   ui_bar_fill_<tone> 2x4 repeating fill with a highlight row on top.
 */
const { Img } = require('../lib/image');
const { rgbOf } = require('../lib/color');
const { add } = require('../lib/manifest');

/**
 * Inset distance from the edge of a rectangle whose corners are cut by a
 * 45-degree notch of `notch` pixels. Negative = outside the shape.
 * Also returns which side the nearest edge is on: light (top/left) or dark.
 */
function inset(x, y, w, h, notch) {
  const sides = [
    { d: x, light: true },
    { d: y, light: true },
    { d: w - 1 - x, light: false },
    { d: h - 1 - y, light: false },
    { d: x + y - notch, light: true },
    { d: w - 1 - x + (h - 1 - y) - notch, light: false },
    { d: w - 1 - x + y - notch, light: null },
    { d: x + (h - 1 - y) - notch, light: null },
  ];
  return sides.reduce((a, b) => (b.d < a.d ? b : a));
}

function frame({ size = 24, notch = 3, rings, fill }) {
  const img = new Img(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const { d, light } = inset(x, y, size, size, notch);
      if (d < 0) continue;
      const ring = rings[d];
      if (ring) {
        const token = light === true ? ring[0] : light === false ? ring[2] : ring[1];
        if (token) img.set(x, y, rgbOf(token));
      } else if (fill) {
        img.set(x, y, rgbOf(fill));
      }
    }
  }
  return img;
}

// Ring tokens: [top/left, diagonal corners, bottom/right]
const PANEL_RINGS = [
  ['indigo950', 'indigo950', 'indigo950'], // outer outline
  ['brass300', 'brass500', 'brass600'], // bright trim
  ['brass500', 'brass600', 'brass700'], // trim body
  ['indigo500', 'indigo800', 'indigo950'], // inner highlight / shadow line
];

const TONES = {
  brass: { light: 'brass300', mid: 'brass500', dark: 'brass700', top: 'brass400', fill: 'brass500', deep: 'brass600' },
  moss: { light: 'moss300', mid: 'moss500', dark: 'moss700', top: 'moss400', fill: 'moss500', deep: 'moss600' },
  rust: { light: 'rust300', mid: 'rust500', dark: 'rust700', top: 'rust400', fill: 'rust500', deep: 'rust600' },
};

function button(tone, state) {
  if (state === 'disabled') {
    return frame({
      rings: [['indigo950', 'indigo950', 'indigo950'], ['stone500', 'stone600', 'stone700'], ['stone600', 'stone600', 'stone700']],
      fill: 'stone700',
    });
  }
  const t = TONES[tone];
  if (state === 'pressed') {
    // Bevel inverts: shadow on top/left, light on bottom/right; body darker.
    return frame({
      rings: [['indigo950', 'indigo950', 'indigo950'], [t.dark, t.dark, t.mid], [t.deep, t.deep, t.deep]],
      fill: t.deep,
    });
  }
  return frame({
    rings: [['indigo950', 'indigo950', 'indigo950'], [t.light, t.mid, t.dark], [t.top, t.mid, t.deep]],
    // Uniform centre: it is the stretchable part of the nine-slice.
    fill: t.fill,
  });
}

function barFrame() {
  // 12x10: 4px caps either side of a 4px repeatable middle. Track rows 3..6.
  const rows = [
    '..XXXXXXXX..',
    '.XbbbbbbbbX.',
    'XbXXXXXXXXdX',
    'XbXttttttXdX',
    'XbXttttttXdX',
    'XbXttttttXdX',
    'XbXttttttXdX',
    'XbXXXXXXXXdX',
    '.XddddddddX.',
    '..XXXXXXXX..',
  ];
  const legend = { X: 'indigo950', b: 'brass400', d: 'brass700', t: 'indigo900' };
  const img = new Img(12, 10);
  rows.forEach((r, y) => [...r].forEach((c, x) => c !== '.' && img.set(x, y, rgbOf(legend[c]))));
  return img;
}

function barFill(tone) {
  const t = TONES[tone];
  const img = new Img(2, 4);
  [t.light, t.mid, t.mid, t.dark].forEach((tok, y) => {
    img.set(0, y, rgbOf(tok));
    img.set(1, y, rgbOf(tok));
  });
  return img;
}

module.exports = function buildUi() {
  const o = { category: 'ui', source: 'code' };
  add('ui_panel_frame', 'idle', [frame({ rings: PANEL_RINGS })], { ...o, file: 'ui_panel_frame_idle', meta: { slice: 8 } });
  for (const tone of Object.keys(TONES)) {
    for (const state of ['normal', 'pressed', 'disabled']) {
      add(`ui_button_${tone}`, state, [button(tone, state)], { ...o, file: `ui_button_${tone}_${state}`, meta: { slice: 8 }, defaultAnimation: 'normal' });
    }
    add(`ui_bar_fill_${tone}`, 'idle', [barFill(tone)], { ...o, file: `ui_bar_fill_${tone}_idle`, meta: { repeatX: true } });
  }
  add('ui_bar_frame', 'idle', [barFrame()], { ...o, file: 'ui_bar_frame_idle', meta: { sliceX: 4, track: { x: 3, y: 3, height: 4 } } });
};
