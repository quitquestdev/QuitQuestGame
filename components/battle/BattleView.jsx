'use client';

/**
 * The battle screen. Presentation only: the rules live in lib/battle/engine.js.
 *
 * Flow: the player sees the enemy's next move (its telegraphed intent), picks
 * an ability (some open a short mini-game first), the engine resolves it, and
 * after a beat the enemy carries out the move it showed. Events from the
 * engine drive every animation, so the visuals can change without touching
 * the rules.
 *
 * Props:
 *   battle        engine state (saved by the game)
 *   onChange(state, events)  store the new engine state
 *   onFinish(state)          the battle ended (victory, defeat or retreat)
 *   heroSpriteId, reducedEffects (setting; the system reduce-motion
 *   preference is added automatically), fx (sound + haptics)
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import ProgressBar from '../ui/ProgressBar';
import Sprite from '../Sprite';
import BattleField from './BattleField';
import AbilityBar from './AbilityBar';
import DistractPanel from './DistractPanel';
import BreathingPanel from './BreathingPanel';
import SupportPanel from './SupportPanel';
import { useReducedEffects } from '../map/useJourneyMap';
import { playerAct, enemyAct, available, isOver } from '../../lib/battle/engine';
import { ABILITIES } from '../../lib/battle/data/abilities';

const INTENT_ICONS = { attack: 'icon_sword', heavy: 'icon_swords', charge: 'icon_lightning', heal: 'icon_heart', taunt: 'icon_taunt', stunned: 'icon_sparkle' };

/** A short hint for each telegraph, so the counter-play is clear. */
const INTENT_HINTS = {
  attack: 'Delay softens it. Or strike first.',
  heavy: 'A big blow is coming. Delay or Distract!',
  charge: 'Winding up. A good moment to Breathe.',
  heal: 'Hit hard now, or Distract to stop it.',
  taunt: 'Just talk. A free moment for you.',
  stunned: 'Stunned! It loses its next move.',
};

const ENEMY_BEAT_MS = 950; // pause before the enemy acts, so the player's move reads
const RETURN_BEAT_MS = 650; // pause before the player's turn returns

export default function BattleView({ battle, onChange, onFinish, heroSpriteId, reducedEffects: reducedSetting = false, fx = null }) {
  const reducedEffects = useReducedEffects(reducedSetting);
  const [mode, setMode] = useState(null); // null | 'delay' | 'breathe' | 'distract'
  const [help, setHelp] = useState(false);
  const [events, setEvents] = useState({ id: 0, list: [] });
  const [tip, setTip] = useState(null);
  const [busy, setBusy] = useState(false);
  const timers = useRef([]);
  const battleRef = useRef(battle);
  battleRef.current = battle;
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));

  const emit = useCallback(
    (list) => {
      setEvents((e) => ({ id: e.id + 1, list }));
      if (fx) fx.play(list);
    },
    [fx],
  );

  // Bring the whole battle into view (the app header scrolls away) so the
  // health bars, field and ability bar all fit on a phone screen.
  const rootRef = useRef(null);
  useEffect(() => {
    const el = rootRef.current;
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'start', behavior: reducedEffects ? 'auto' : 'smooth' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // If the game was closed during the enemy's turn, finish that turn now.
  useEffect(() => {
    if (battle.phase === 'enemy' && !busy) runEnemy(battle);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function runEnemy(state) {
    setBusy(true);
    later(() => {
      const e = enemyAct(state);
      onChange(e.state, e.events);
      emit(e.events);
      if (isOver(e.state)) {
        later(() => onFinish(e.state), 900);
        return;
      }
      later(() => setBusy(false), RETURN_BEAT_MS);
    }, ENEMY_BEAT_MS);
  }

  const act = (action) => {
    const r = playerAct(battleRef.current, action);
    if (r.rejected) return;
    setMode(null);
    onChange(r.state, r.events);
    emit(r.events);
    const t = r.events.find((e) => e.type === 'tip');
    setTip(t ? { text: t.text, ability: action.type } : null);
    if (isOver(r.state)) {
      setBusy(true);
      later(() => onFinish(r.state), r.state.phase === 'retreat' ? 0 : 1100);
      return;
    }
    runEnemy(r.state);
  };

  /** Leave at any moment: cancels any pending enemy move. */
  const leave = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    const current = battleRef.current;
    if (isOver(current)) return;
    const r = playerAct({ ...current, phase: 'player' }, { type: 'retreat' });
    onChange(r.state, r.events);
    onFinish(r.state);
  };

  // DEV ONLY: end the fight at once (stripped from production builds).
  const devEnd = (outcome) => {
    timers.current.forEach(clearTimeout);
    const s = JSON.parse(JSON.stringify(battleRef.current));
    s.phase = outcome;
    if (outcome === 'victory') s.enemy.hp = 0;
    else s.hero.hp = 0;
    onChange(s, []);
    onFinish(s);
  };

  const choose = (id) => {
    if (fx) fx.tap();
    if (id === 'strike' || id === 'sip') act({ type: id });
    else setMode(id);
  };

  const avail = available(battle);
  const yourTurn = battle.phase === 'player' && !busy && !mode;
  const intent = battle.intent || { type: 'attack', label: 'Attack', power: 0 };
  const hero = battle.hero;
  const enemy = battle.enemy;

  return (
    <div ref={rootRef} className="space-y-3 qq-battle">
      {/* Top bar: who you face, and a quiet way out */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="qq-label">{battle.mode === 'urge' ? 'Urge Mode' : 'Battle'} &middot; turn {battle.turn}</p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setHelp((h) => !h)} aria-expanded={help}>Need more help</Button>
          {/* Leaving is always possible, even mid-turn or mid-breath. */}
          <Button size="sm" onClick={leave}>Leave</Button>
        </div>
      </div>

      {help && <SupportPanel onClose={() => setHelp(false)} compact={false} />}

      <Panel tone="danger" className="space-y-3 qq-battle__stage">
        {/* Enemy: name, health and its next move */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="type-subheading text-rust-300">{enemy.name}</span>
            <span className="type-stat text-bone">{enemy.hp}/{enemy.maxHp}</span>
          </div>
          <ProgressBar value={enemy.hp} max={enemy.maxHp} tone="rust" label={`${enemy.name} health`} className="qq-bar--lg" />
          <div className={`qq-intent qq-intent--${intent.type}`} role="status" aria-live="polite">
            <Sprite id={INTENT_ICONS[intent.type] || 'icon_sword'} scale={2} label="" />
            <div className="min-w-0">
              <p className="qq-intent__label">
                Next: {intent.label}
                {intent.power > 0 && <span className="qq-intent__power"> {intent.type === 'heal' ? '+' : ''}{intent.power}</span>}
              </p>
              <p className="qq-intent__hint">{INTENT_HINTS[intent.type]}</p>
            </div>
          </div>
        </div>

        <BattleField
          enemySpriteId={enemy.sprite}
          enemyName={enemy.name}
          isBoss={enemy.boss}
          heroSpriteId={heroSpriteId}
          heroName={hero.name}
          events={events}
          phase={battle.phase}
          shielded={hero.shield > 0 || mode === 'delay'}
          charging={mode === 'breathe'}
          charged={enemy.charged}
          stunned={enemy.stunned}
          reducedEffects={reducedEffects}
        />

        {/* Hero: name and health */}
        <div className="space-y-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-2">
            <span className="type-subheading text-bone">{hero.name}</span>
            <span className="type-stat text-bone">{hero.hp}/{hero.maxHp}</span>
          </div>
          <ProgressBar value={hero.hp} max={hero.maxHp} tone="moss" label="Your health" className="qq-bar--lg" />
        </div>
      </Panel>

      {/* Tip from the last ability: supportive, never medical */}
      {tip && (
        <p className="qq-tip" role="status">
          <Sprite id={ABILITIES[tip.ability].icon} scale={1} /> {tip.text}
        </p>
      )}

      {/* Turn indicator and the ability bar (stays within thumb reach) */}
      {!isOver(battle) && (
        <div className="qq-abilitydock">
          <p className={`qq-turn ${yourTurn ? 'is-yours' : ''}`} aria-live="polite">
            {mode ? ABILITIES[mode].name : yourTurn ? 'Your move' : battle.phase === 'enemy' || busy ? `${enemy.name} moves...` : ''}
          </p>
          {mode === 'distract' && <DistractPanel seed={battle.turn * 7919 + enemy.maxHp} onDone={(success) => act({ type: 'distract', success })} fx={fx} reducedEffects={reducedEffects} />}
          {mode === 'breathe' && (
            <BreathingPanel heroClass={hero.cls} onDone={(score) => act({ type: 'breathe', score })} onCancel={() => setMode(null)} fx={fx} reducedEffects={reducedEffects} />
          )}
          {mode === 'delay' && <DelayHold seconds={ABILITIES.delay.holdSeconds} onDone={() => act({ type: 'delay' })} />}
          {!mode && <AbilityBar available={avail} enabled={yourTurn} onChoose={choose} />}
        </div>
      )}

      {process.env.QQ_DEV_TOOLS === 'true' && !isOver(battle) && (
        <div className="flex flex-wrap gap-2 qq-dev-panel" aria-label="Developer tools">
          <span className="qq-label">DEV:</span>
          <Button size="sm" onClick={() => devEnd('victory')}>Win now</Button>
          <Button size="sm" onClick={() => devEnd('defeat')}>Lose now</Button>
        </div>
      )}
    </div>
  );
}

/** Delay: the knight holds the line for a few seconds, then the shield is up. */
function DelayHold({ seconds, onDone }) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (left <= 0) {
      onDone();
      return undefined;
    }
    const t = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [left]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Panel tone="sunken" className="text-center space-y-1">
      <Sprite id="icon_hourglass" scale={2} className="mx-auto block" />
      <p className="type-subheading text-bone">Hold the line... {left > 0 ? left : ''}</p>
      <p className="type-caption text-stone-400">Waiting it out. The urge is strongest right before it fades.</p>
    </Panel>
  );
}
