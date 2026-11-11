'use client';

/**
 * After a battle. Victory: a short celebration, XP, loot and one supportive
 * line. Defeat: the knight is resting, nothing is lost, try again any time.
 * Leaving: stepping away is always fine. No streak talk, no shaming, and the
 * support panel is one tap away.
 */
import React, { useState } from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';
import SupportPanel from './SupportPanel';
import { useReducedEffects } from '../map/useJourneyMap';

const CONFETTI = ['brass300', 'moss300', 'bone', 'rust300', 'brass400', 'moss400', 'indigo300', 'bone', 'brass300', 'moss300'];

const VICTORY_LINES = [
  'You rode it out. That took real strength.',
  'The wave passed, and you are still standing.',
  'Another craving weathered. Well done, knight.',
  'You gave it a few minutes, and it faded.',
];

export default function BattleResults({ result, onContinue, onRetry, onUrgeAgain, reducedEffects: reducedSetting = false }) {
  const reducedEffects = useReducedEffects(reducedSetting);
  const [help, setHelp] = useState(false);
  const { outcome, rewards, enemyName, mode, seed = 0 } = result;

  return (
    <div className="space-y-4" aria-live="polite">
      {outcome === 'victory' && (
        <Panel tone="legendary" className="text-center space-y-2 qq-result qq-result--win relative overflow-hidden">
          {/* A short burst of palette confetti (none with Reduced Effects) */}
          {!reducedEffects &&
            CONFETTI.map((c, i) => (
              <span
                key={i}
                className="qq-confetti"
                style={{ left: `${8 + i * 9}%`, background: `var(--c-${c})`, animationDelay: `${(i % 4) * 0.12}s` }}
                aria-hidden="true"
              />
            ))}
          <Sprite id="icon_trophy" scale={3} className="mx-auto block" />
          <h2 className="type-title text-brass-300">Victory!</h2>
          <p className="type-body text-bone">{VICTORY_LINES[seed % VICTORY_LINES.length]}</p>
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
            <p className="type-statL text-moss-300">+{rewards.xp} XP</p>
            {rewards.perfect && <p className="qq-label text-brass-300 self-center">Flawless!</p>}
          </div>
          {rewards.loot && <p className="type-caption text-bone">Found: {rewards.loot}</p>}
          {rewards.capped && (
            <p className="type-caption text-stone-400">
              XP is lighter after several battles in a day, so it stays fair. Urge Mode and every support tool stay here whenever you need them.
            </p>
          )}
        </Panel>
      )}

      {outcome === 'defeat' && (
        <Panel tone="raised" className="text-center space-y-2 qq-result">
          <Sprite id="icon_moon" scale={3} className="mx-auto block" />
          <h2 className="type-heading text-bone">Your knight is resting</h2>
          <p className="type-body text-bone">
            {enemyName} won this round, and that is okay. Cravings come in waves, and nothing you have earned is lost. Try again whenever you like, or take a breather first.
          </p>
        </Panel>
      )}

      {outcome === 'retreat' && (
        <Panel tone="raised" className="text-center space-y-2 qq-result">
          <Sprite id="icon_hut" scale={3} className="mx-auto block" />
          <h2 className="type-heading text-bone">You stepped away</h2>
          <p className="type-body text-bone">That is always allowed. Your progress is safe, and the battle will be here if you want it.</p>
        </Panel>
      )}

      <div className="flex flex-wrap justify-center gap-2">
        {outcome !== 'victory' && onRetry && <Button tone="moss" onClick={onRetry}>Try again</Button>}
        {outcome === 'victory' && mode === 'urge' && onUrgeAgain && <Button size="sm" onClick={onUrgeAgain}>Still have the urge? Fight again</Button>}
        <Button onClick={onContinue}>Continue</Button>
        <Button size="sm" onClick={() => setHelp((h) => !h)}>{help ? 'Hide help' : 'Need more help'}</Button>
      </div>
      {help && <SupportPanel onClose={() => setHelp(false)} />}
    </div>
  );
}
