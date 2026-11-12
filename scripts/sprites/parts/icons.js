/**
 * 16x16 icons. Some are cropped from CC0 packs and recoloured; the rest are
 * drawn here as ASCII grids (one character per pixel, '.' = transparent).
 * In every grid X is the outline (indigo950).
 */
const path = require('path');
const { Img } = require('../lib/image');
const { grid } = require('../lib/grid');
const { quantize } = require('../lib/color');
const { outline } = require('../lib/anim');
const { polygon, ellipse, stroke, render } = require('../lib/raster');
const { add, ROOT } = require('../lib/manifest');

const SRC = path.join(ROOT, 'art-sources/placeholder');
const NO_GREEN = ['indigo', 'brass', 'rust', 'stone', 'bone'];

const BRASS = { h: 'brass300', m: 'brass500', d: 'brass700' };

const DRAWN = {
  heart: [[
    '................',
    '................',
    '...XXX....XXX...',
    '..XhhrX..XrrrX..',
    '.XhhrrrXXrrrrdX.',
    '.XhrrrrrrrrrrdX.',
    '.XrrrrrrrrrrrdX.',
    '.XrrrrrrrrrrddX.',
    '..XrrrrrrrrrdX..',
    '...XrrrrrrrdX...',
    '....XrrrrrdX....',
    '.....XrrrdX.....',
    '......XrdX......',
    '.......XX.......',
    '................',
    '................',
  ], { h: 'rust300', r: 'rust500', d: 'rust700' }],

  coin: [[
    '................',
    '................',
    '.....XXXXXX.....',
    '....XhhhhhmX....',
    '...XhhmmmmmdX...',
    '...XhmhhhmmdX...',
    '...XhmhmmmmdX...',
    '...XhmhmmmmdX...',
    '...XhmhmmmmdX...',
    '...XhmmmmmmdX...',
    '...XmmmmmmddX...',
    '....XmmmmddX....',
    '.....XXXXXX.....',
    '................',
    '................',
    '................',
  ], BRASS],

  coins: [[
    '................',
    '................',
    '................',
    '.....XXXXXX.....',
    '....XhhhhhhX....',
    '....XmmmmmmX....',
    '...XXXXXXXXXX...',
    '..XhhhhhhhhhhX..',
    '..XmmmmmmmmmmX..',
    '..XddddddddddX..',
    '..XhhhhhhhhhhX..',
    '..XmmmmmmmmmmX..',
    '..XddddddddddX..',
    '...XXXXXXXXXX...',
    '................',
    '................',
  ], BRASS],

  // XP is progress, so it is moss (green = positive meaning).
  xp: [[
    '................',
    '.......XX.......',
    '......XwhX......',
    '.....XhhmmX.....',
    '....XhhmmmmX....',
    '...XhhmmmmmdX...',
    '..XhhmmmmmmddX..',
    '.XhhmmmmmmmmddX.',
    '..XmmmmmmmmddX..',
    '...XmmmmmmddX...',
    '....XmmmmddX....',
    '.....XmmddX.....',
    '......XmdX......',
    '.......XX.......',
    '................',
    '................',
  ], { w: 'bone', h: 'moss300', m: 'moss500', d: 'moss700' }],

  shield: [[
    '................',
    '..XXXXXXXXXXXX..',
    '..XbbbbbbbbbbX..',
    '..XbiiiiiiiiBX..',
    '..XbiiibbiiiBX..',
    '..XbiiibbiiIBX..',
    '..XbibbbbbbIBX..',
    '..XbibbbbbbIBX..',
    '..XbiiibbiIIBX..',
    '..XbiiibbiIIBX..',
    '...XbiibbIIBX...',
    '...XbiiiIIIBX...',
    '....XbiiIIBX....',
    '.....XbIIBX.....',
    '......XBBX......',
    '.......XX.......',
  ], { b: 'brass400', B: 'brass600', i: 'indigo500', I: 'indigo600' }],

  lung: [[
    '................',
    '......XttX......',
    '......XttX......',
    '..XXX.XttX.XXX..',
    '.XhhpXXttXXpppX.',
    'XhhpppXttXpppppX',
    'XhppppbXXbppppdX',
    'XhpppbpXXpbpppdX',
    'XhppppppXXppppdX',
    'XpppppppXXpppppX',
    'XpppppddXXpppddX',
    '.XpppddX.XppddX.',
    '..XXXXX...XXXX..',
    '................',
    '................',
    '................',
  ], { h: 'bone', p: 'rust300', d: 'rust400', t: 'stone400', b: 'rust500' }],

  trophy: [[
    '................',
    '...XXXXXXXXXX...',
    '.XXXhhhhhmmmdXX.',
    'X.XhhhhhmmmmdX.X',
    'X.XhhhhmmmmmdX.X',
    '.XXhhhmmmmmmdXX.',
    '...XhhmmmmmdX...',
    '....XhmmmmdX....',
    '.....XmmmdX.....',
    '......XmdX......',
    '......XmdX......',
    '.....XhmmdX.....',
    '....XXXXXXXX....',
    '....XhhmmmdX....',
    '....XXXXXXXX....',
    '................',
  ], BRASS],

  lock: [[
    '................',
    '......XXXX......',
    '.....XsXXsX.....',
    '....XsX..XsX....',
    '....XsX..XsX....',
    '....XsX..XsX....',
    '...XXXXXXXXXX...',
    '...XhhhhhhhmX...',
    '...XhmmmmmmdX...',
    '...XhmmXXmmdX...',
    '...XhmmXXmmdX...',
    '...XhmmmXmmdX...',
    '...XmmmmmmddX...',
    '...XXXXXXXXXX...',
    '................',
    '................',
  ], { s: 'stone400', ...BRASS }],

  scroll: [[
    '................',
    '...XXXXXXXXXX...',
    '..XrrrrrrrrrrX..',
    '..XRRRRRRRRRRX..',
    '...XppppppppX...',
    '...XpllllllpX...',
    '...XppppppppX...',
    '...XplllllppX...',
    '...XppppppppX...',
    '...XpllllllpX...',
    '...XppppppppX...',
    '...XplllppppX...',
    '..XrrrrrrrrrrX..',
    '..XRRRRRRRRRRX..',
    '...XXXXXXXXXX...',
    '................',
  ], { r: 'brass500', R: 'brass700', p: 'bone', l: 'stone500' }],

  skull: [[
    '................',
    '................',
    '.....XXXXXX.....',
    '....XbbbbbbX....',
    '...XbbbbbbbsX...',
    '..XbbbbbbbbbsX..',
    '..XbXXXbbXXXsX..',
    '..XbXXXbbXXXsX..',
    '..XbbbbXXbbbsX..',
    '...XbbbbbbbsX...',
    '....XbXbXbXX....',
    '....XbbbbbsX....',
    '.....XXXXXX.....',
    '................',
    '................',
    '................',
  ], { b: 'bone', s: 'stone400' }],

  crown: [[
    '................',
    '................',
    '................',
    '..X....X....X...',
    '.XhX..XhX..XhX..',
    '.XhmX.XhmX.XmmX.',
    '.XhmmXhmmmXmmmX.',
    '.XhmmmmmmmmmmdX.',
    '.XhmrmmmgmmrmdX.',
    '.XhmmmmmmmmmmdX.',
    '.XXXXXXXXXXXXXX.',
    '.XddddddddddddX.',
    '.XXXXXXXXXXXXXX.',
    '................',
    '................',
    '................',
  ], { ...BRASS, r: 'rust400', g: 'indigo400' }],

  castle: [[
    '......X..X......',
    '......XXXX......',
    '......XhsX......',
    '.X.X..XhsX..X.X.',
    '.XXXX.XhsX.XXXX.',
    '.XhsX.XhsX.XhsX.',
    '.XhsXXXhsXXXhsX.',
    '.XhssssssssssdX.',
    '.XhsXssssssXsdX.',
    '.XhssssXXssssdX.',
    '.XhsssXggXsssdX.',
    '.XhsssXggXsssdX.',
    '.XXXXXXggXXXXXX.',
    '................',
    '................',
    '................',
  ], { h: 'stone400', s: 'stone500', d: 'stone700', g: 'indigo900' }],

  lightning: [[
    '................',
    '.........XXX....',
    '........XhhX....',
    '.......XhhX.....',
    '......XhhX......',
    '.....XhhXXXX....',
    '....XhhhhhhX....',
    '....XXXXhhX.....',
    '.......XhX......',
    '......XhX.......',
    '.....XmX........',
    '....XmX.........',
    '....XX..........',
    '................',
    '................',
    '................',
  ], BRASS],

  hourglass: [[
    '................',
    '...XXXXXXXXXX...',
    '...XhhhhhhhmX...',
    '...XXXXXXXXXX...',
    '....XgsssssX....',
    '.....XgsssX.....',
    '......XgsX......',
    '.......XX.......',
    '......XgsX......',
    '.....XggsgX.....',
    '....XgsssssX....',
    '...XXXXXXXXXX...',
    '...XhhhhhhhmX...',
    '...XXXXXXXXXX...',
    '................',
    '................',
  ], { h: 'brass400', m: 'brass600', g: 'indigo400', s: 'brass300' }],
};

/** Medal with ribbon, in three metals. */
const MEDAL = [
  '................',
  '...XXXX..XXXX...',
  '...XaaaXXbbbX...',
  '....XaaaXbbX....',
  '.....XaaXbX.....',
  '.....XXXXXX.....',
  '....XhhhhmmX....',
  '...XhhmmmmmdX...',
  '...XhmmhhmmdX...',
  '...XhmhmmdmdX...',
  '...XhmmddmmdX...',
  '...XmmmmmmddX...',
  '....XmmmmddX....',
  '.....XXXXXX.....',
  '................',
  '................',
];
const METALS = {
  bronze: { h: 'rust300', m: 'rust400', d: 'rust600' },
  silver: { h: 'bone', m: 'stone400', d: 'stone600' },
  gold: BRASS,
};

/** No-smoking sign: a crossed-out lit cigarette. Drawn with shapes. */
function noSmoking() {
  const W = 16;
  const ring = ellipse(W, W, 8, 8, 7.5, 7.5).subtract(ellipse(W, W, 8, 8, 5.6, 5.6));
  const slash = stroke(W, W, [[4, 4], [12, 12]], 2);
  const paper = polygon(W, W, [[3, 7], [11, 7], [11, 9], [3, 9]]);
  const ember = polygon(W, W, [[11, 7], [13, 7], [13, 9], [11, 9]]);
  return render(W, W, [
    { mask: paper, ramp: ['stone500', 'stone400', 'bone'], base: 2, flat: true },
    { mask: ember, ramp: ['rust500', 'rust400', 'rust300'], base: 1, flat: true },
    { mask: ring.union(slash), ramp: ['rust700', 'rust600', 'rust500', 'rust400'], base: 2 },
  ]);
}

/** Crop one 16x16 cell from a sheet and recolour it. */
function cell(file, col, row, opts = {}) {
  const sheet = Img.load(path.join(SRC, file));
  return outline(quantize(sheet.crop(col * 16, row * 16, 16, 16), { families: NO_GREEN, chromaWeight: 0.7, ...opts }).img);
}

function sourced(file, opts = {}) {
  const img = Img.load(path.join(SRC, file));
  if (img.w !== 16 || img.h !== 16) throw new Error(`${file} is ${img.w}x${img.h}, expected 16x16`);
  return outline(quantize(img, { families: NO_GREEN, chromaWeight: 0.7, ...opts }).img);
}

module.exports = function buildIcons() {
  const icons = {};
  for (const [name, [rows, legend]] of Object.entries(DRAWN)) icons[name] = { img: grid(rows, legend), source: 'code' };
  for (const [metal, legend] of Object.entries(METALS)) {
    icons[`medal_${metal}`] = { img: grid(MEDAL, { ...legend, a: 'indigo500', b: 'rust500' }), source: 'code' };
  }
  icons.no_smoking = { img: noSmoking(), source: 'code' };

  const shade = 'shade-16x16-rpg-icons';
  icons.sword = { img: cell(`${shade}/weapons.png`, 2, 0), source: 'shade' };
  icons.chest = { img: cell(`${shade}/chests.png`, 3, 3), source: 'shade' };
  icons.book = { img: cell(`${shade}/books.png`, 3, 8), source: 'shade' };
  icons.potion = { img: cell(`${shade}/potions.png`, 3, 4), source: 'shade' };
  icons.water = { img: cell(`${shade}/potions.png`, 11, 6, { families: ['indigo', 'stone', 'bone', 'brass'] }), source: 'shade' };
  const owl = 'owlish-rpg-ui-icons';
  icons.strength = { img: sourced(`${owl}/strengthen.png`), source: 'owlish' };
  icons.flame = { img: sourced(`${owl}/smoulder.png`, { families: ['rust', 'brass', 'bone', 'indigo'] }), source: 'owlish' };
  icons.special = { img: sourced(`${owl}/special.png`, { families: ['brass', 'rust', 'bone', 'indigo'] }), source: 'owlish' };

  for (const [name, { img, source }] of Object.entries(icons)) {
    add(`icon_${name}`, 'idle', [img], { category: 'icons', file: `icon_${name}_idle`, source });
  }
};
