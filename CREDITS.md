# Credits

Every third-party asset in Quit Quest is listed here with its source, author
and licence. Update this file whenever art, fonts or other assets are added.

**Placeholder art** (everything under `public/assets/sprites/placeholder/`) is
temporary alpha art and is **not for release**. Every manifest entry that uses
it is tagged `"placeholder": true`. Unmodified source files are kept in
`art-sources/placeholder/` (not shipped) so the art can be rebuilt with
`npm run sprites:placeholders`. All placeholder art was recoloured to the
master palette (`theme/palette.js`) and cropped or recomposed, never scaled.
Source PNGs were re-saved once as plain RGBA, pixel for pixel identical, so
the build script can read them.

## Attribution summary

| Item | Licence | Attribution required? |
|---|---|---|
| Dungeon Crawl Stone Soup tiles | CC0 1.0 | No (credit requested as a courtesy) |
| 16x16 Assorted RPG Icons | CC0 1.0 | No |
| RPG UI Icons | CC0 1.0 | No |
| Gothicvania Swamp | Public domain (author's licence) | No (credit appreciated) |
| Gothicvania Patreon Collection | Public domain (author's licence) | No (credit appreciated) |
| Cinzel, Cormorant Garamond, Jersey 10 fonts | SIL Open Font License 1.1 | **Yes: keep the licence notice** |

Nothing in the placeholder art requires attribution. The fonts do: the OFL
requires the copyright and licence notice to accompany the font files. The
notices ship inside each `@fontsource/*` package (`LICENSE`) and are
summarised below.

## Placeholder art

### Dungeon Crawl Stone Soup 32x32 tiles
- Source: https://opengameart.org/content/dungeon-crawl-32x32-tiles (uploaded by MedicineStorm)
- Also: https://github.com/crawl/tiles
- Authors: the Dungeon Crawl Stone Soup and RLTiles artists, including Eino Keskitalo, David Lawrence Ramsey, Enne Walker, Poor_Yurik, Stefan O'Rear, Jude Brown, Ixtli, Robert Vollmert, abrahamwl, dshaligram, Jesse Luehrs, David Ploog, Mitsuhiro Itakura, coolio and Denzi (full list in `art-sources/placeholder/dcss/README.txt`)
- Licence: CC0 1.0 (`art-sources/placeholder/dcss/LICENSE.txt`)
- Used for:
  - `hero_warrior`, `hero_mage`, `hero_rogue`: knight assembled from the player doll layers (human base, plate, leg armour, boots, plumed helm, broadsword, quartered shield); mage and rogue are palette swaps
  - `enemy_smoke_wraith` (silent_spectre), `enemy_cigarette_butt_goblin` (goblin, with a code-drawn cigarette added), `enemy_social_pressure_imp` (imp), `enemy_stress_demon` (hellion), `enemy_boredom_slime` (azure jelly)
  - Idle, attack, hurt and victory frames are generated from each still by the build script

### 16x16 Assorted RPG Icons
- Source: https://opengameart.org/content/16x16-assorted-rpg-icons
- Author: Shade
- Licence: CC0 1.0
- Used for: `icon_sword`, `icon_chest`, `icon_book`, `icon_potion`, `icon_water`

### RPG UI Icons
- Source: https://opengameart.org/content/rpg-ui-icons
- Author: OwlishMedia
- Licence: CC0 1.0
- Used for: `icon_strength`, `icon_flame`, `icon_special`

### Gothicvania Swamp
- Source: https://opengameart.org/content/gotthicvania-swamp
- Author: Luis Zuno (@ansimuz), https://www.patreon.com/ansimuz
- Licence: public domain, free for personal and commercial use (`art-sources/placeholder/gothicvania-swamp/public-license.txt`). The pack's music has a separate licence and is **not** used.
- Used for: `bg_forest_sky`, `bg_forest_trees`

### Gothicvania Patreon Collection
- Source: https://opengameart.org/content/gothicvania-patreons-collection
- Author: Luis Zuno (@ansimuz)
- Licence: public domain, free for personal and commercial use (`art-sources/placeholder/gothicvania-night-town/public-license.txt`)
- Used for: `bg_village_*` (Night Town layers), `bg_lair_sky`, `bg_lair_town` (Gothic Horror layers)

### Code-drawn (Quit Quest, no third-party source)
- `enemy_nicotine_lord` (64x64 boss), all `ui_*` pieces, `bg_forest_smog`, `bg_lair_smog`
- World map from above: `overworld_terrain`, `overworld_sea`, the shadows `overworld_shadow_*`, the markers `overworld_lm_*`, `overworld_story`, `overworld_camp`, `overworld_fortress`, the knight tokens `overworld_knight_*` and `overworld_cloud`
- World map on the road: the parallax layers `journey_sky`, `journey_far`, `journey_mid`, `journey_ground`, `journey_fore`, the smog `journey_fog`, the landmarks `journey_lm_*`, `journey_story`, `journey_camp`, `journey_fortress`, `journey_fortress_far`, `journey_grass`, and the knight's `walk` frames (built from the CC0 knight tile above)
- Icons: every `icon_*` sprite except the eight listed under the CC0 packs above (sword, chest, book, potion, water, strength, flame, special). That includes the hearts, coins, XP, shield, lung, trophies and medals, rarity gems, activity, health-milestone and location icons, arrows, check and lock.
- Premium knight skins (skin packs `premium-gilded`, `premium-midnight`, `premium-silver` in `public/assets/skins/`): palette recolours of the CC0 knight above, built by `npm run sprites:skins`. Placeholder art.
- `dev_test_gem` (dev harness only)

## Fonts

All self-hosted from npm (`@fontsource/*`), licensed under the SIL Open Font
License 1.1 (https://openfontlicense.org).

- **Cinzel**: Copyright 2020 The Cinzel Project Authors (https://github.com/NDISCOVER/Cinzel)
- **Cormorant Garamond**: Copyright 2015 The Cormorant Project Authors (https://github.com/CatharsisFonts/Cormorant)
- **Jersey 10**: Copyright 2023 The Soft Type Project Authors (https://github.com/scfried/soft-type-jersey)

## Tools

- `pngjs` (MIT) is used only by the build scripts and is not shipped.
