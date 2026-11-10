# Quit Quest RPG

A gamified quit-smoking app that turns your journey into a 16-bit RPG adventure.

## Features

- **Character creation:** name your hero and choose a class (Warrior, Mage or Rogue), each a knight in its own colours.
- **Progress tracking:** days smoke-free, money saved and cigarettes avoided.
- **Story:** 180+ days of story content in six chapters, with a story archive and a 180-day journey map.
- **World map:** one road from the start of the quit to the Nicotine Lord's fortress at day 180. The world heals as the streak grows: smog lifts region by region, health milestones light up as landmarks, and the knight walks to today's position.
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
  map/                   World map: JourneyMap (renderer), MapParticles, place helpers
  Sprite.jsx             The only way pixel art is drawn
  SpriteBackground.jsx   Tiled sprite backgrounds
  ui/                    Panel, Button, ProgressBar, streak greening
  battle/                BattleScene (parallax) and BattleField (animation, damage numbers)
  dev/                   Dev harness
lib/sprites/             Sprite registry, React provider and idle preloading
lib/journey/             World map data layer: regions and day ranges, pure layout
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
| World map layers (`journey_*`) | see [World map](#world-map) | idle |

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

## World map

The world map (Story tab > World Map, or the World Map button on the Quest tab's location card) has two views of the same journey, chosen with the toggle above the map and remembered with progress:

- **From above** (the default): the whole land seen from above. You can drag, zoom and walk the knight along the road, and land you haven't reached yet is in shadow.
- **On the road**: a side-scrolling road with parallax layers.

Both show eight regions:

| Region | Quit days |
|---|---|
| Ashen Wastes | 0-3 |
| Smog Marsh | 4-14 |
| Thinning Haze | 15-30 |
| Mending Fields | 31-60 |
| Whispering Woods | 61-120 |
| Sunlit Heights | 121-179 |
| The Nicotine Lord's Fortress | 180 |
| The Long Road (epilogue: 9 months to 15 years) | 181+ |

The ranges follow the health milestones already in the game (the first three days hold the 20-minute to 3-day milestones; the marsh ends at 2 weeks, the haze at 1 month).

### How it is built

- **Data layer** (`lib/journey/`, no React and no game state):
  - `regions.js` lists the regions, day ranges, world sizes and parallax speeds. The art script and the renderer both read it.
  - `layout.js` turns a `JourneyData` object into positions: the day, the milestones (`{ id, day, title, description, icon, unlocked }`), story beats and encounters. Milestones are spaced so the knight stands exactly on them.
- **Adapter:** `journeyData()` in `components/QuitQuestRPG.jsx` builds `JourneyData` from the game's own health achievements, story chapters and battle tiers. The map only renders a layout, so a different data source can drive it without touching the renderer.
- **Renderer** (`components/map/JourneyMap.jsx`):
  - Five parallax layers (sky 0.25, far 0.5, mid 0.75, ground 1, foreground 1.25) at a whole-number scale (2x, or 1x on very narrow screens).
  - Places on the road: milestone landmarks, story signposts, craving camps and the fortress.
  - Fog and one-time reveals, the knight's walk, the time-of-day light and particles.
  - While you drag, layers move directly on the DOM in whole pixels.
- **Saved with progress:** `userData.journey.revealsSeen` (each reveal plays once), `userData.journey.lastDay` (where the knight walks from next time) and `userData.settings.reducedEffects`.
- **Places keep their existing behaviour:**
  - Milestone landmarks show the achievement's own title and description, and are lit when it is unlocked.
  - Signposts open the story archive.
  - Camps start the same battles as the Quest tab's Mild, Medium and Strong buttons.
  - The fortress starts the Nicotine Lord fight from day 180.
- **Reduced Effects** (Hero tab, or automatic with the system's reduce-motion setting):
  - turns off particles;
  - keeps background layers still while dragging;
  - shows reveals, the knight's walk and camera moves instantly;
  - pauses prop animations.

### The view from above

- **Geometry** (`lib/journey/overworld.js`, shared by the renderer and the art script):
  - The map is 320x240 native pixels.
  - `ROUTE` holds the road's waypoints for each region.
  - `pointForJourneyX()` projects any position from `layout.js` onto the map. The data layer is the same as the road view's, and it knows nothing about either view.
  - `TERRITORY` sets how far each region's land reaches from its stretch of road.
- **Renderer** (`components/map/OverworldMap.jsx`):
  - **Scale:** whole numbers only (Wider is 1x, then 2x, Closer is 3x). It starts at 2x, or 1x on very narrow screens.
  - **Moving around:** drag to pan; pinch, the buttons, `+`/`-` or ctrl + wheel to zoom; arrow keys to pan; Home to return to the knight.
  - **Shadow:** land not yet reached is shown by one shadow sprite per region. Its soft edge reaches a few pixels onto land already lit, and where two shadows meet they join without a seam. The first time the knight arrives in a region, its `lift` animation plays once, drawing the shadow back from the land you came from.
  - **Places:** milestone landmarks, camps and the fortress stay visible above the shadow as goals. Story signposts sit under it, so a region's chapters show once you arrive. Signposts are hidden at 1x so the zoomed-out view stays readable. Places are set beside the road, clear of each other.
  - **Ambience:** the knight walks the road from the last day you saw, glints move on the sea, two clouds drift over the land, and the time-of-day light follows the device clock.
- **Shared by both views** (`components/map/useJourneyMap.js`, `PlaceDetail.jsx`, `places.js`): reveals, Reduced Effects, the time of day and the place details panel. Reveals and the saved state (`revealsSeen`, `lastDay`) work the same in both views, so a region revealed in one is clear in the other.
- **Reduced Effects** turns off the walk, clouds and sea glints, and shows reveals and camera moves instantly.

### Map art in the manifest

All map art is code-drawn placeholder art (`npm run sprites:placeholders`, `scripts/sprites/parts/journey.js` for the road and `scripts/sprites/parts/overworld.js` for the view from above). To replace it, keep the ID and the size and point the manifest entry at the new files.

View from above:

| ID | Size | Animations | Notes |
|---|---|---|---|
| `overworld_terrain` | 320x240 | idle | The whole land, lit from the north-west; the road follows `ROUTE` |
| `overworld_sea` | 320x240 | idle (3) | Glints on open water, transparent elsewhere |
| `overworld_shadow_<region>` | varies | idle, lift (4) | One region's shadow, cropped; `meta.x`/`meta.y` place it on the map |
| `overworld_lm_beacon`, `_lantern`, `_spring`, `_tree`, `_stone` | 9x11 | lit, locked | Milestone landmarks |
| `overworld_story` | 7x9 | unlocked, locked | Story signpost |
| `overworld_camp` | 9x9 | idle, locked | Craving camp |
| `overworld_fortress` | 24x24 | idle | The Nicotine Lord's fortress |
| `overworld_knight_warrior`, `_mage`, `_rogue` | 9x13 | idle, walk | The knight on the map |
| `overworld_cloud` | 36x16 | idle | A drifting cloud |

A repainted terrain must keep the road where `ROUTE` puts it. The shadow sprites are built from the terrain (each pixel pushed down into the indigo family), so rebuild or redraw them together with it.

On the road:

| ID | Size | Animations | Notes |
|---|---|---|---|
| `journey_sky` | 630x120 | idle | Whole world at speed 0.25 plus 120px padding each side |
| `journey_far` | 940x120 | idle | Speed 0.5, padding 80 |
| `journey_mid` | 1250x120 | idle | Speed 0.75, padding 40 |
| `journey_ground` | 1560x120 | idle | The road the knight walks; trail on rows 100-107, props stand on row 99 |
| `journey_fore` | 2030x120 | idle | Speed 1.25, padding 40; keep it below row 106 so the knight stays visible |
| `journey_fog` | 1560x120 | idle, lift (4) | Smog over unreached land; `lift` dissolves it for a reveal |
| `journey_lm_beacon`, `_lantern`, `_spring`, `_tree`, `_stone` | 16x24 | lit, locked | Milestone landmarks |
| `journey_story` | 12x16 | unlocked, locked | Story signpost |
| `journey_camp` | 16x16 | idle, locked | Craving camp |
| `journey_fortress` | 64x64 | idle | The Nicotine Lord's fortress |
| `journey_fortress_far` | 32x24 | idle | The fortress on the horizon |
| `journey_grass` | 8x8 | idle | Swaying grass in the living regions |
| `hero_*` | 32x32 | walk | The knight's walk on the map |

The layer widths come from `lib/journey/regions.js`. If you change region widths, rebuild the placeholders or redraw the layers to the new sizes. Each layer's `meta.speed` and `meta.pad` tell the renderer how to place it. Run `npm run release:check` afterwards: it lists any map art still tagged as placeholder and checks every frame's size.

## Credits

See [CREDITS.md](CREDITS.md). The placeholder art is CC0 or public domain; the fonts are under the SIL Open Font License.

Copyright

Copyright © 2022-2025 Jonathan Klimoski. All rights reserved.

This software and associated documentation files (the "Software") are protected by copyright law and international treaties. Unauthorized reproduction or distribution of this Software, or any portion of it, may result in severe civil and criminal penalties, and will be prosecuted to the maximum extent possible under the law.

All Rights Reserved. No part of this Software may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of Jonathan Klimoski, the copyright holder.
