# Quit Quest RPG

A gamified quit-smoking app that turns your journey into a 16-bit RPG adventure.

## Features

- **Character creation:** name your hero and choose a class (Warrior, Mage or Rogue), each a knight in its own colours.
- **Progress tracking:** days smoke-free, money saved and cigarettes avoided.
- **Story:** 180+ days of story content in six chapters, with a story archive and a 180-day journey map.
- **Craving battles:** turn-based battles against addiction-themed enemies (a smoke wraith, a cigarette-butt goblin, a social pressure imp, a stress demon, a boredom slime and the Nicotine Lord) on a parallax battlefield.
- **Achievements:** 68 achievements across health milestones, time, money, battles, activities, streaks and cigarettes avoided.
- **Health milestones:** real recovery milestones from 20 minutes to 15 years.
- **Activity logging:** walks, exercise, meditation and water.
- **World regrowth:** as the streak grows, moss creeps into the interface (can be turned off on the Hero tab).

## Running it

Requires Node 18 or newer.

```bash
npm ci
npm run dev
```

Open http://localhost:3000 for the game and http://localhost:3000/dev for the dev harness, which shows every palette colour, type style, sprite, battle scene and UI component.

```bash
npm run build && npm start
```

Every push to a branch also builds a **Vercel preview**. `/dev` works on previews and returns 404 on the production site, so a stage can be reviewed from the preview link without running anything locally.

| Script | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm run sprites:placeholders` | Rebuild all placeholder art from `art-sources/` |
| `npm run brand` | Rebuild app icons and splash from the hero sprite |
| `npm run release:check` | List placeholder art and check every frame file |
| `npm run release:check:strict` | Same, but fail while any placeholder art remains |

## Project structure

```
app/                     Next.js App Router: layout, global CSS, icons, web manifest
  dev/                   Dev harness route (/dev)
components/
  QuitQuestRPG.jsx       The game: state, rules and screens
  Sprite.jsx             The only way pixel art is drawn
  SpriteBackground.jsx   Tiled sprite backgrounds
  ui/                    Panel, Button, ProgressBar, streak greening
  battle/                BattleScene (parallax) and BattleField (animation, damage numbers)
  dev/                   Dev harness
lib/sprites/             Sprite registry and React provider (no DOM in the registry)
theme/
  palette.js             The 32-colour master palette
  typography.js          Type roles (pixel, display, body)
public/assets/sprites/   Sprite manifest and art, by category
  placeholder/           Temporary alpha art, NOT FOR RELEASE
public/assets/skins/     Skin-pack manifests (dev-demo is an example)
art-sources/             Unmodified sources of the placeholder art (not shipped)
assets/brand/            Large icon and splash images for the native port
scripts/                 Sprite, brand and release-check scripts
docs/                    Feature inventory, backlog, baseline screenshots
CREDITS.md               Every third-party asset, author and licence
```

## Look and feel rules

- **Palette:** only the 32 colours in `theme/palette.js` (indigo, brass, rust, moss, stone and bone). Tailwind's default colours are removed, so `bg-indigo-800` works and `bg-blue-500` generates nothing.
- **Green is a meaning colour.** Moss appears only for positive things: health, XP and recovery progress, completed achievements, the smoke-free day counter, and positive actions such as fighting a craving or logging an activity. It is never decoration.
- **Type:** Cinzel for headings, Cormorant Garamond for reading text, Jersey 10 only for numbers, stats and short labels. Use the `.type-*` classes generated from `theme/typography.js`.
- **Pixels:** sprites and UI frames render with nearest-neighbour scaling at whole-number scales (usually 2x). Motion uses stepped timing and whole-pixel distances. Nothing zooms, and no filters shift colours off the palette.
- **Components:** use `Panel`, `Button` (brass, moss or rust) and `ProgressBar` from `components/ui` instead of styling boxes by hand.

## Art and the sprite manifest

All art is loaded through the sprite manifest. Components never reference an image path; they ask for a stable ID:

```jsx
<Sprite id="enemy_smoke_wraith" animation="attack" scale={3} />
```

The default manifest is `public/assets/sprites/manifest.json`. Each entry looks like this:

```json
"enemy_smoke_wraith": {
  "category": "enemies",
  "frameWidth": 32,
  "frameHeight": 32,
  "placeholder": true,
  "animations": {
    "idle":   { "path": "enemies/smoke_wraith_idle_##.png", "frames": 4, "fps": 5 },
    "attack": { "path": "enemies/smoke_wraith_attack_##.png", "frames": 4, "fps": 12, "loop": false }
  }
}
```

### Manifest rules

1. **IDs are stable** and lowercase with underscores: `hero_warrior`, `enemy_nicotine_lord`, `icon_heart`, `bg_forest_trees`, `ui_button_moss`. Code only ever uses the ID.
2. **File names** follow `name_action_NN.png`, for example `knight_attack_01.png` or `boss_nicotine_lord_idle_01.png`. In the manifest, `##` stands for the frame number.
3. **PNG, transparent background, native size, never pre-scaled.** Every frame of an entry is exactly `frameWidth` x `frameHeight`. The app scales by whole numbers with nearest-neighbour sampling.
4. **Colours** should come from the master palette. The release check warns about anything else.
5. **Placeholder art** lives in `sprites/placeholder/` and is tagged `"placeholder": true`.
6. **Missing IDs** fall back from the skin pack to the default manifest, then to a visible checkered placeholder, with a warning in development.

The sizes the game expects:

| Kind | Size | Animations |
|---|---|---|
| Hero (`hero_warrior`, `hero_mage`, `hero_rogue`) | 32x32 | idle, attack, hurt, victory |
| Enemies (`enemy_*`) | 32x32 | idle, attack, hurt |
| Boss (`enemy_nicotine_lord`) | 64x64 | idle, attack, hurt |
| Icons (`icon_*`) | 16x16 | idle (one frame) |
| Battle backgrounds (`bg_<scene>_<layer>`) | any width that tiles, one height per scene | idle; `meta.scene`, `meta.layer`, `meta.parallax` |
| UI pieces (`ui_*`) | nine-slice: 24x24 with 8px corners | buttons use normal, pressed, disabled |

### Swapping in new art

1. Export each frame as a PNG at native size with a transparent background, named `name_action_NN.png`.
2. Put the files in the category folder: `public/assets/sprites/characters`, `enemies`, `icons`, `backgrounds` or `ui`.
3. In `manifest.json`, point the entry's `path` at the new files, set `frames` and `fps`, and set `"placeholder": false`. Keep the ID the same.
4. Run `npm run release:check` to confirm the files exist, the sizes match and the colours are on palette. If the hero changed, run `npm run brand` to regenerate the icons.
5. Open `/dev` to see the art at 1x, 2x and 3x.

`npm run sprites:placeholders` never overwrites an entry whose `placeholder` flag is `false`, so rebuilding the placeholders is safe once real art is in.

### Skin packs

A skin pack is a second manifest with its own `id`, `baseUrl` and only the IDs it changes. It can replace a single animation and inherit the rest from the default art. Load it and layer it on top:

```js
import { defaultRegistry, loadSkinManifest } from './lib/sprites/SpriteProvider';

const pack = await loadSkinManifest('/assets/skins/dev-demo/manifest.json');
if (pack) defaultRegistry.setSkins([pack]); // later packs override earlier ones
```

Every `Sprite`, panel, button and battle scene updates without code changes. A pack that fails to load or validate is ignored, and the default art stays. The dev harness has an "Apply demo skin pack" button that shows this working.

## Credits

See [CREDITS.md](CREDITS.md). The placeholder art is CC0 or public domain; the fonts are under the SIL Open Font License.

Copyright

Copyright © 2022-2025 Jonathan Klimoski. All rights reserved.

This software and associated documentation files (the "Software") are protected by copyright law and international treaties. Unauthorized reproduction or distribution of this Software, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.

All Rights Reserved. No part of this Software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of Jonathan Klimoski, the copyright holder.
