# Feature inventory (Stage 0 baseline)

Snapshot of everything the app does as of `main` @ `3c689a1`, the version deployed to Vercel.
Every later stage of the 16-bit restyle is checked against this list. Nothing here may be
removed or simplified. Baseline screenshots at 320px and 390px are in `docs/baseline/`.

Source: `components/QuitQuestRPG.jsx` (single component, ~2,270 lines), Next.js 14 App Router,
Tailwind, `lucide-react`. Persistence is browser `localStorage` under key `quitQuestData`.

## App shell
- [ ] Setup flow vs. playing state (`gameState`), restored from localStorage on load
- [ ] Auto-save of game state, user data, battle state, story chapter, unlocked days on every change
- [ ] Header: title, small hero avatar, hero name, current day
- [ ] Five-tab navigation: Quest, Story, Battle, Glory, Hero
- [ ] Story tab dot when a new chapter unlocked today; Battle tab dot while a battle is in progress
- [ ] Particle burst on achievement unlock and battle victory (3 s)
- [ ] "Level Up!" overlay when knight level increases (2 s)

## Setup (5 steps)
- [ ] Step progress bar ("Step N of 5")
- [ ] 1 Hero name (max 20 chars, focus is preserved across re-renders)
- [ ] 2 Class choice: Warrior, Mage, Rogue (with selected check mark)
- [ ] 3 Quit date (date input, max today; future date rejected on submit with an alert)
- [ ] 4 Cigarettes per day (1 to 100)
- [ ] 5 Price per pack (0.01 to 100)
- [ ] Previous / Next with per-step validation; final button "Begin Quest!"
- [ ] Animated star field and title banner

## Derived stats (recomputed whenever user data changes)
- [ ] Days smoke-free, money saved, cigarettes avoided (20 per pack)
- [ ] Knight level 1 to 5 by days (<7, <30, <100, <365, 365+)
- [ ] Health message by day band; next goal text
- [ ] Health percentage = min(100, 50 + days × 0.5)
- [ ] XP to next level from thresholds 0 / 100 / 600 / 1600 / 4100 / 14100
- [ ] Current and longest streak
- [ ] Story chapter 1 to 7 by day band

## Dashboard (Quest tab)
- [ ] "New Story Chapter Unlocked" banner with Read Now button
- [ ] Craving Emergency panel: Mild / Medium / Strong buttons start a battle
- [ ] Hero card: avatar with level badge, name, level and class, days smoke-free, battles won
- [ ] Health bar and Experience bar (XP bar fills by `totalExperience % 500`)
- [ ] Environment card that changes with knight level (5 environments)
- [ ] Gold Saved card with up to five coin markers (one per $100)
- [ ] Enemies Defeated card (cigarettes avoided) with up to five skull markers (one per 500)
- [ ] Healthy Activities: Walk, Exercise, Meditate, Water (each +10 XP, re-checks achievements)
- [ ] Health Status panel with up to four milestone icons (1, 7, 30, 100 days)
- [ ] Decorative emoji background that changes with level

## Battle
- [ ] Six enemies with HP, attack, XP. Renamed in Stage 2 (stats unchanged): Social Pressure Imp (was Nicotine Imp), Smoke Wraith (was Smoke Specter), Stress Demon (was Craving Demon), Boredom Slime (was Tar Monster), The Nicotine Lord (was Addiction Dragon, now flagged as boss). Added: Cigarette-Butt Goblin (70 HP, 9 atk, 60 XP)
- [ ] Intensity picks enemy at random from a tier: mild = imp, wraith, goblin; medium = stress demon; strong = slime, Nicotine Lord
- [ ] Player max HP = 100 + level × 20
- [ ] Attack: 10 + level × 5 + random 0 to 9 damage; builds combo and +20 special charge
- [ ] Special at 100 charge: Warrior ×2.5 Mighty Strike, Mage ×2 Fireball, Rogue ×1.8 Shadow Strike
- [ ] Enemy turn after 1.5 s: attack + random 0 to 7
- [ ] Enemy and player HP bars; battle stage (Stage 5) with parallax scene per enemy, hero and enemy sprites with attack, hurt and victory frames, hit flash and floating damage/heal numbers (replaces the lunge animations and VS divider)
- [ ] Victory: XP = enemy XP + combo × 10, battles won +1, cravings defeated +1, perfect victory if full HP
- [ ] Defeat message; Continue Quest returns to dashboard
- [ ] Battle log (only the last line is shown after the battle)

## Story
- [ ] Three views: Today's Story, Story Archive, Journey Map
- [ ] 33 dated entries from day 1 to 365, prologue and epilogue text, 10 Daily Wisdom snippets with `{heroName}`
- [ ] Today: today's entry or a Daily Wisdom snippet, plus stories read / chapter / days counters
- [ ] Archive: day stepper and number input clamped to unlocked days, chapter label, quick jump to 14 milestone days
- [ ] Journey Map: six chapter tiles, 180-day grid (story days marked, today highlighted, locked days disabled), legend, progress bar and percent of the 6-month journey
- [ ] Story text in Merriweather on a parchment panel
- [ ] Today's entry is added to `storyProgress` automatically

## Achievements (Glory tab, "Hall of Glory")
- [ ] 68 achievements in 7 categories: health (14, real medical milestones from 20 minutes to 15 years), time (18), money (10), battle (9), activity (8), streak (4), avoidance (5)
- [ ] Unlock checks for minutes, hours, days, money, cigarettes, battles, perfect wins, streak, activity counts; XP awarded on unlock
- [ ] Sticky header with unlocked and total counts and completion bar
- [ ] Card grid: icon, title, description, +XP, rarity badge (common to legendary) and rarity colour; locked cards show a lock, "???" and a hint
- [ ] Footer: remaining-count message, or a completion message when everything is unlocked

## Profile (Hero tab)
- [ ] Large avatar, name, level and class, "N Days Strong!"
- [ ] World Regrowth toggle (added Stage 4): streak greening on/off, saved in `userData.settings.worldGreening`, on by default

## Avatar
- [ ] Class icon and colour (Warrior shield, Mage sparkles, Rogue sword)
- [ ] Border, glow and ring grow with level; crown at level 5; level badge

## In code but not reachable from the UI (keep, do not delete)
- `usePotion` (heal 50), `defend` attack type, `fleeBattle`
- `resetProgress` (confirm, wipe state and localStorage)
- Activity types breathing, social, hobby, meal; special events weekend, party, stress, coffee, driving
- `userData.settings` (dailyReminders, notificationsEnabled)
- `prologue` and `epilogue` story text, `getNextGoal` output, `cravingsDefeated`

## Behaviour quirks at baseline (recorded, not fixed)
- The Level Up overlay shows on every page load for anyone above level 1, because derived stats start at level 1.
- Minute and hour achievements only unlock once a full day has passed, because days are floored before conversion.
- Screens are defined inside the main component, so the Story tab's selected day and view reset whenever parent state changes.
- XP bar uses `% 500`, which does not match the XP level thresholds.
- At 320px the "LV 3" badge wraps onto two lines and the header name wraps. (Fixed in Stage 4.)
- Next.js warns that `viewport` and `themeColor` belong in a `viewport` export.
