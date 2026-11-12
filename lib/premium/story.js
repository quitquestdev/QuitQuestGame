/**
 * Hook for Premium story content. NO CONTENT YET: this is where it plugs in.
 *
 * The 180-day story stays free forever. Premium chapters, when written, are
 * extra side tales that sit alongside it; they never replace or hold back a
 * free chapter.
 *
 * To add them:
 *   1. Add entries to PREMIUM_CHAPTERS below, in the same shape as the free
 *      chapters in components/QuitQuestRPG.jsx (storyContent.chapters):
 *        { day: 45, title: 'The Hermit of the Haze', text: '...', premium: true }
 *   2. The Story archive already calls premiumChaptersFor(day, isPremium) and
 *      lists what it returns after the free chapter for that day. Locked ones
 *      show a locked preview (title only) to free players.
 * No other change is needed: the entitlement check is already in place.
 */
const PREMIUM_CHAPTERS = [];

/** Premium side tales for a day: all of them, each marked locked or not. */
function premiumChaptersFor(day, isPremium) {
  return PREMIUM_CHAPTERS.filter((c) => c.day === day).map((c) => ({ ...c, locked: !isPremium }));
}

module.exports = { PREMIUM_CHAPTERS, premiumChaptersFor };
