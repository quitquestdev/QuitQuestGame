/**
 * App icon, favicon, PWA icons and splash image, built from the hero sprite
 * in the sprite manifest (hero_warrior, first idle frame) and the master
 * palette. Swap the knight's art in the manifest and re-run this to update
 * every icon.
 *
 *   npm run brand
 *
 * Outputs
 *   app/icon.png, app/apple-icon.png     picked up by Next.js automatically
 *   public/icons/icon-192.png, icon-512.png, icon-maskable-512.png  (PWA)
 *   assets/brand/splash-1284x2778.png    for the native (Expo) port
 *   assets/brand/icon-1024.png           store listing / native port
 */
const fs = require('fs');
const path = require('path');
const { Img } = require('../sprites/lib/image');
const { rgbOf } = require('../sprites/lib/color');

const ROOT = path.join(__dirname, '../..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/assets/sprites/manifest.json'), 'utf8'));

function heroFrame() {
  const entry = manifest.sprites.hero_warrior;
  if (!entry) throw new Error('hero_warrior is missing from the manifest');
  const rel = entry.animations.idle.path.replace('##', '01');
  return Img.load(path.join(ROOT, 'public', manifest.baseUrl, rel));
}

/** 40x40 native-pixel badge: brass bevel frame, indigo field, knight centred. */
function badge(knight) {
  const N = 40;
  const img = new Img(N, N);
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const d = Math.min(x, y, N - 1 - x, N - 1 - y);
      let token = 'indigo900';
      if (d === 0) token = 'indigo950';
      else if (d === 1) token = x <= y && x + y < N - 1 ? 'brass300' : y < x && x + y < N - 1 ? 'brass300' : 'brass600';
      else if (d === 2) token = 'brass500';
      else if (d === 3) token = 'indigo950';
      else if (y > 30) token = 'indigo800'; // ground
      img.set(x, y, rgbOf(token));
    }
  }
  // Notched corners.
  for (const [cx, cy] of [[0, 0], [N - 1, 0], [0, N - 1], [N - 1, N - 1]]) {
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2 - i; j++) img.set(Math.abs(cx - i), Math.abs(cy - j), [0, 0, 0, 0]);
  }
  return img.paste(knight, 4, 4);
}

function canvas(w, h, token) {
  const img = new Img(w, h);
  const c = rgbOf(token);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) img.set(x, y, c);
  return img;
}

function centred(w, h, art, token = 'indigo900') {
  return canvas(w, h, token).paste(art, Math.floor((w - art.w) / 2), Math.floor((h - art.h) / 2));
}

const knight = heroFrame();
const b = badge(knight);
const out = (rel, img) => {
  img.save(path.join(ROOT, rel));
  console.log(`${rel} ${img.w}x${img.h}`);
};

out('app/icon.png', centred(192, 192, b.scaleInt(4)));
out('app/apple-icon.png', centred(180, 180, b.scaleInt(4)));
out('public/icons/icon-192.png', centred(192, 192, b.scaleInt(4)));
out('public/icons/icon-512.png', centred(512, 512, b.scaleInt(12)));
// Maskable icons are cropped to a circle: keep the art inside the middle 80%.
out('public/icons/icon-maskable-512.png', centred(512, 512, b.scaleInt(9)));
out('assets/brand/icon-1024.png', centred(1024, 1024, b.scaleInt(24)));
out('assets/brand/splash-1284x2778.png', centred(1284, 2778, b.scaleInt(10), 'indigo950'));

/**
 * Share image (Open Graph / Twitter card), 1200x630: the knight's badge faces
 * the Nicotine Lord across a dithered horizon. Placeholder, like all brand art.
 * Next.js serves app/opengraph-image.png and app/twitter-image.png itself.
 */
function shareImage() {
  const W = 1200;
  const H = 630;
  const img = canvas(W, H, 'indigo950');
  // Sky bands, then a dithered horizon and ground, in palette steps of 6 px.
  const bands = ['indigo900', 'indigo800', 'indigo700'];
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const px = Math.floor(x / 6);
      const py = Math.floor(y / 6);
      let token = bands[Math.min(2, Math.floor(y / 140))];
      if (y > 450) token = (px + py) % 2 ? 'indigo800' : 'stone800';
      if (y > 480) token = 'stone800';
      if (y < 12 || y >= H - 12 || x < 12 || x >= W - 12) token = 'brass500';
      if (y < 6 || y >= H - 6 || x < 6 || x >= W - 6) token = 'indigo950';
      img.set(x, y, rgbOf(token));
    }
  }
  img.paste(b.scaleInt(9), 120, 135); // 360x360 badge
  const lordEntry = manifest.sprites.enemy_nicotine_lord;
  const lord = Img.load(path.join(ROOT, 'public', manifest.baseUrl, lordEntry.animations.idle.path.replace('##', '01')));
  img.paste(lord.scaleInt(6), 1200 - 120 - 384, 480 - 384 + 30); // 384x384, standing on the horizon
  return img;
}
const share = shareImage();
out('app/opengraph-image.png', share);
out('app/twitter-image.png', share);
