/**
 * Layered battle backgrounds for parallax, from Gothicvania packs by Luis
 * Zuno (public domain), recoloured to the palette, plus a code-drawn smog
 * layer for each scene.
 *
 * Every layer of a scene is the same height (shorter layers are padded and
 * anchored to the bottom, never scaled) and tiles horizontally.
 * meta: { scene, layer (0 = farthest), parallax (0 = fixed .. 1 = moves with
 * the foreground), tileX: true }
 */
const path = require('path');
const { Img } = require('../lib/image');
const { quantize, rgbOf, nearestToken } = require('../lib/color');
const { add, ROOT } = require('../lib/manifest');

const SRC = path.join(ROOT, 'art-sources/placeholder');

// Night scenes: no moss (green is a meaning colour). Lightness drives the
// mapping onto the given base families (chromaWeight 0), so a green or olive
// forest becomes an indigo night forest. Only warm, saturated light sources
// (lanterns, windows, embers) keep their hue, in brass or rust.
const warmLights = ([r, g, b]) =>
  r > 110 && r - b > 70 && r >= g ? nearestToken([r, g, b], { families: ['brass', 'rust'] }) : null;

const night = (families) => ({ families, chromaWeight: 0, override: warmLights });
const NIGHT = night(['indigo']);

function layer(file, height, opts = NIGHT) {
  const img = quantize(Img.load(path.join(SRC, file)), opts).img;
  return img.h === height ? img : img.pad(img.w, height, 'bottom');
}

/**
 * Tileable smog: a few thin wavy horizontal ribbons in the lower part of the
 * frame, ordered-dithered so the scene shows through. The waves use whole
 * periods across the width, so the layer tiles seamlessly.
 */
function smog(width, height, { top = 0.62, tokens = ['indigo600', 'indigo500', 'stone500'] } = {}) {
  const img = new Img(width, height);
  const TAU = Math.PI * 2;
  const ribbons = [
    { at: top, amp: 3, k: 1, phase: 0, thick: 3 },
    { at: top + (1 - top) * 0.35, amp: 4, k: 2, phase: 0.3, thick: 4 },
    { at: top + (1 - top) * 0.7, amp: 3, k: 1, phase: 0.6, thick: 5 },
  ];
  for (let x = 0; x < width; x++) {
    const u = x / width;
    ribbons.forEach((r, i) => {
      const yc = r.at * height + r.amp * Math.sin(TAU * (u * r.k + r.phase));
      const t = r.thick * (0.65 + 0.35 * Math.sin(TAU * (u * (r.k + 2) + r.phase * 2)));
      for (let y = Math.floor(yc - t); y <= Math.ceil(yc + t); y++) {
        const d = Math.abs(y - yc) / t; // 0 at the core, 1 at the edge
        if (d > 1) continue;
        const on = d < 0.35 ? (x + y) % 2 === 0 : (x + y) % 4 === 0 && (x * 3 + y) % 8 < 4;
        if (on) img.set(x, y, rgbOf(tokens[Math.min(tokens.length - 1, d < 0.35 ? i : 0)]));
      }
    });
  }
  return img;
}

function scene(name, layers) {
  layers.forEach(({ id, img, parallax, source }, i) => {
    add(`bg_${name}_${id}`, 'idle', [img], {
      category: 'backgrounds',
      file: `bg_${name}_${id}_idle`,
      source,
      meta: { scene: name, layer: i, parallax, tileX: true },
    });
  });
}

module.exports = function buildBackgrounds() {
  const sw = 'gothicvania-swamp';
  scene('forest', [
    { id: 'sky', img: layer(`${sw}/background.png`, 256), parallax: 0.1, source: 'gothicvania' },
    { id: 'trees', img: layer(`${sw}/mid-layer-01.png`, 256, night(['indigo', 'stone'])), parallax: 0.5, source: 'gothicvania' },
    { id: 'smog', img: smog(128, 256), parallax: 1, source: 'code' },
  ]);

  const nt = 'gothicvania-night-town/night-town-background';
  scene('village', [
    { id: 'sky', img: layer(`${nt}-sky.png`, 224), parallax: 0, source: 'gothicvania' },
    { id: 'clouds', img: layer(`${nt}-clouds.png`, 224), parallax: 0.15, source: 'gothicvania' },
    { id: 'mountains', img: layer(`${nt}-mountains.png`, 224), parallax: 0.3, source: 'gothicvania' },
    { id: 'forest', img: layer(`${nt}-forest.png`, 224), parallax: 0.55, source: 'gothicvania' },
    { id: 'town', img: layer(`${nt}-town.png`, 224, night(['indigo', 'stone'])), parallax: 0.8, source: 'gothicvania' },
  ]);

  // The boss lair: a smog-choked sky lit from below in rust.
  const gh = 'gothicvania-gothic-horror';
  scene('lair', [
    { id: 'sky', img: layer(`${gh}/clouds.png`, 176, { families: ['rust', 'indigo'], chromaWeight: 0 }), parallax: 0.1, source: 'gothicvania' },
    { id: 'town', img: layer(`${gh}/town.png`, 176, night(['indigo'])), parallax: 0.45, source: 'gothicvania' },
    { id: 'smog', img: smog(128, 176, { top: 0.55, tokens: ['rust700', 'stone700', 'stone600'] }), parallax: 1, source: 'code' },
  ]);
};
