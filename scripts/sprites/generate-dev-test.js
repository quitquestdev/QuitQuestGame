/**
 * Generates the Stage 1 test sprite used by the dev harness to prove the
 * Sprite component: frame animation, whole-number scaling, and skin override.
 *
 *   node scripts/sprites/generate-dev-test.js
 */
const path = require('path');
const { writeFrames } = require('./pixel');

const ROOT = path.join(__dirname, '../../public/assets');

// 16x16 gem. '*' is a glint that travels across the face over 4 frames.
const base = [
  '................',
  '.......XX.......',
  '......XhhX......',
  '.....XhhmmX.....',
  '....XhhmmmmX....',
  '...XhhmmmmmsX...',
  '...XhmmmmmmsX...',
  '...XhmmmmmssX...',
  '...XmmmmmmssX...',
  '....XmmmmssX....',
  '.....XmmssX.....',
  '......XmsX......',
  '.......XX.......',
  '................',
  '................',
  '................',
];

const glints = [[6, 3], [5, 5], [7, 7], [9, 9]];
const frames = glints.map(([x, y]) => base.map((row, ry) => (ry === y ? row.slice(0, x) + '*' + row.slice(x + 1) : row)));

writeFrames(path.join(ROOT, 'sprites/placeholder/dev_test_gem_idle'), frames, {
  X: 'indigo950', h: 'brass300', m: 'brass500', s: 'brass700', '*': 'bone',
});

// Same gem in rust, shipped by the demo skin pack to prove overriding works.
writeFrames(path.join(ROOT, 'skins/dev-demo/dev_test_gem_idle'), frames, {
  X: 'indigo950', h: 'rust300', m: 'rust500', s: 'rust700', '*': 'bone',
});

console.log('wrote dev test gem frames');
