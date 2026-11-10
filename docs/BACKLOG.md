# Backlog

Requests to pick up after the current restyle stage. Newest first.

## In-game world map (requested during Stage 4)

**Status: first version on `feature/world-map`; rebuilt as a healing journey on `feature/world-map-journey`, awaiting review.** Possible later phase: branching side regions (out of scope for now).

Original notes:

A visual map of the world that shows where the hero currently is.

What the game already has to build on:
- The 180-day story is split into six chapters (Awakening, Journey, Trials,
  Transformation, Mastery, Legend), each 30 days, plus milestone entries to
  day 365. Chapter boundaries come from `storyChapter` in
  `components/QuitQuestRPG.jsx`.
- The dashboard already names a location per knight level: Forest Path,
  Enchanted Forest, Mountain Peak, Royal Castle, Dragon's Lair.
- The Story tab has a "Journey Map" view, but it is a grid of day numbers,
  not a map of places.

Open questions to settle before building:
- Where it lives: its own tab, a replacement for the Journey Map view, or a
  panel on the dashboard.
- Whether locations follow story chapters (6 regions over 180 days), knight
  level (5 regions), or both.
- What is interactive: tapping a region to read its chapter, showing upcoming
  locked regions, marking milestone days along a path.

Art: needs a map background and location markers through the sprite
manifest (placeholder first, same pipeline as Stage 2), so a skin pack can
restyle it.
