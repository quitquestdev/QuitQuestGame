'use client';

/**
 * Distract: watch the pattern light up, then tap the same tiles in order
 * within a few seconds. Success stuns the enemy. A miss costs nothing but the
 * turn. One wrong tap is forgiven.
 *
 * The pattern lights at most two tiles a second, well under the three-per-
 * second flash limit, and uses a steady highlight rather than a flash.
 */
import React, { useEffect, useRef, useState } from 'react';
import Panel from '../ui/Panel';
import Sprite from '../Sprite';
import { makePattern, startDistract, tapDistract, timeoutDistract } from '../../lib/battle/distract';
import { ABILITIES } from '../../lib/battle/data/abilities';

const TILE_ICONS = ['icon_star', 'icon_leaf', 'icon_moon', 'icon_gem'];
const SHOW_MS = 520; // each tile stays lit this long while the pattern plays

export default function DistractPanel({ seed, onDone, fx }) {
  const cfg = ABILITIES.distract;
  const [pattern] = useState(() => makePattern(seed, cfg.length, cfg.tiles));
  const [lit, setLit] = useState(-1);
  const [stage, setStage] = useState('watch'); // watch | tap | done
  const [game, setGame] = useState(() => startDistract(pattern));
  const [left, setLeft] = useState(cfg.durationMs);
  const doneRef = useRef(false);

  // Play the pattern once.
  useEffect(() => {
    const timers = pattern.map((tile, i) => setTimeout(() => setLit(tile), i * SHOW_MS + 300));
    timers.push(setTimeout(() => { setLit(-1); setStage('tap'); }, pattern.length * SHOW_MS + 300));
    return () => timers.forEach(clearTimeout);
  }, [pattern]);

  // The tapping window.
  useEffect(() => {
    if (stage !== 'tap') return undefined;
    const started = Date.now();
    const t = setInterval(() => {
      const rem = cfg.durationMs - (Date.now() - started);
      setLeft(Math.max(0, rem));
      if (rem <= 0) {
        clearInterval(t);
        finish(timeoutDistract(game));
      }
    }, 100);
    return () => clearInterval(t);
  }, [stage]); // eslint-disable-line react-hooks/exhaustive-deps

  function finish(g) {
    if (doneRef.current) return;
    doneRef.current = true;
    setStage('done');
    setGame(g);
    setTimeout(() => onDone(g.success), 450);
  }

  const tap = (i) => {
    if (stage !== 'tap') return;
    if (fx) fx.tap();
    const g = tapDistract(game, i);
    setGame(g);
    if (g.done) finish(g);
  };

  return (
    <Panel tone="sunken" className="space-y-2 text-center">
      <p className="type-subheading text-bone">
        {stage === 'watch' ? 'Watch the pattern...' : stage === 'tap' ? `Tap it back! ${Math.ceil(left / 1000)}s` : game.success ? 'Nice! Stunned.' : 'Close one. No harm done.'}
      </p>
      <div className="qq-distract" role="group" aria-label="Pattern tiles">
        {TILE_ICONS.slice(0, cfg.tiles).map((icon, i) => (
          <button
            key={i}
            type="button"
            className={`qq-distract__tile ${lit === i ? 'is-lit' : ''}`}
            onClick={() => tap(i)}
            disabled={stage !== 'tap'}
            aria-label={`Tile ${i + 1}${lit === i ? ', lit' : ''}`}
          >
            <Sprite id={icon} scale={2} />
          </button>
        ))}
      </div>
      <p className="qq-label" aria-live="polite">{stage === 'tap' ? `${game.pos} of ${pattern.length}` : `${pattern.length} taps`}</p>
    </Panel>
  );
}
