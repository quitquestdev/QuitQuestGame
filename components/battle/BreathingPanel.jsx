'use client';

/**
 * Breathe: a gentle paced-breathing round that powers the knight's strike.
 *
 * The ring grows for about four seconds (breathe in: hold the button) and
 * shrinks for about six (breathe out: let go). The score rewards keeping in
 * step, never breathing harder or faster, and the cue never asks anyone to
 * hold their breath. The player can pick a shorter round, skip it for a fair
 * strike, or stop at any time.
 *
 * Input comes through a BreathInput (lib/battle/breathInput.js). This panel
 * uses the touch one; any other source producing the same samples works.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';
import { ABILITIES } from '../../lib/battle/data/abilities';
import { cueAt, scoreBreath } from '../../lib/battle/breath';
import { createTouchBreathInput } from '../../lib/battle/breathInput';

export default function BreathingPanel({ heroClass = 'warrior', onDone, onCancel, fx, reducedEffects = false, input: inputProp = null }) {
  const cfg = ABILITIES.breathe;
  const input = useMemo(() => inputProp || createTouchBreathInput(), [inputProp]);
  const [run, setRun] = useState(null); // { cycles, t0 }
  const [now, setNow] = useState(0);
  const [holding, setHolding] = useState(false);
  const [result, setResult] = useState(null);
  const lastPhase = useRef(null);
  const finished = useRef(false);
  const opts = run ? { inhaleMs: cfg.inhaleMs, exhaleMs: cfg.exhaleMs, cycles: run.cycles } : null;
  const cue = run ? cueAt(now, opts) : null;

  useEffect(() => input.subscribe((s) => setHolding(s.active)), [input]);

  // Clock: ~20 updates a second is plenty for a smooth, calm ring.
  useEffect(() => {
    if (!run) return undefined;
    const t = setInterval(() => setNow(Date.now() - run.t0), 50);
    return () => clearInterval(t);
  }, [run]);

  // Haptic pulse at each change of phase; finish when the cue is done.
  useEffect(() => {
    if (!cue) return;
    if (cue.phase !== lastPhase.current) {
      lastPhase.current = cue.phase;
      if (cue.phase === 'inhale' || cue.phase === 'exhale') fx && fx.haptic(cue.phase);
      if (cue.phase === 'done') finish();
    }
  }); // eslint-disable-line react-hooks/exhaustive-deps

  function start(cycles) {
    finished.current = false;
    lastPhase.current = null;
    input.start();
    setRun({ cycles, t0: Date.now() });
    setNow(0);
    fx && fx.sound('charge');
  }

  function finish(early = false) {
    if (finished.current) return;
    finished.current = true;
    const samples = input.stop();
    let score;
    if (!run) score = cfg.skipScore;
    else if (early) {
      // Stopping early is fine: score what was done, never below a skip.
      const done = Math.max(1, Math.floor(now / (cfg.inhaleMs + cfg.exhaleMs)));
      score = Math.max(cfg.skipScore, now > 3000 ? scoreBreath(samples, { ...opts, cycles: done }) : 0);
    } else score = scoreBreath(samples, opts);
    setResult(score);
    setTimeout(() => onDone(score), 900);
  }

  const press = (e) => {
    e.preventDefault();
    if (run && !finished.current) input.press();
  };
  const release = () => input.release();
  const onKey = (e) => {
    if (e.key !== ' ' && e.key !== 'Enter') return;
    e.preventDefault();
    if (e.type === 'keydown' && !e.repeat) press(e);
    if (e.type === 'keyup') release();
  };

  if (result !== null) {
    return (
      <Panel tone="raised" className="text-center space-y-1" role="status">
        <Sprite id="icon_breath" scale={2} className="mx-auto block" />
        <p className="type-subheading text-moss-300">{result >= 0.85 ? 'Beautifully steady.' : result >= 0.6 ? 'Nice and steady.' : 'Good. Every breath counts.'}</p>
        <p className="qq-label">Strike power {Math.round((cfg.minMult + (1 - cfg.minMult) * result) * 100)}%</p>
      </Panel>
    );
  }

  if (!run) {
    return (
      <Panel tone="sunken" className="space-y-3 text-center">
        <p className="type-subheading text-bone">Breathe with the ring</p>
        <p className="type-caption text-bone">Hold the button while the ring grows and breathe in gently. Let go while it shrinks and breathe out slowly. Go at your own pace.</p>
        <div className="flex flex-wrap justify-center gap-2">
          <Button tone="moss" onClick={() => start(cfg.cycles)}>Begin ({Math.round(((cfg.inhaleMs + cfg.exhaleMs) * cfg.cycles) / 1000)}s)</Button>
          <Button size="sm" onClick={() => start(cfg.shortCycles)}>Shorter ({Math.round(((cfg.inhaleMs + cfg.exhaleMs) * cfg.shortCycles) / 1000)}s)</Button>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button size="sm" onClick={() => finish()}>Skip, just strike</Button>
          <Button size="sm" onClick={onCancel}>Back</Button>
        </div>
      </Panel>
    );
  }

  const inhale = cue.phase === 'inhale';
  // Ring size: grows over the inhale, shrinks over the exhale.
  const size = cue.phase === 'done' ? 0.55 : inhale ? 0.55 + 0.45 * cue.progress : 1 - 0.45 * cue.progress;
  const secsLeft = Math.ceil(((inhale ? cfg.inhaleMs : cfg.exhaleMs) * (1 - cue.progress)) / 1000);

  return (
    <Panel tone="sunken" className="space-y-2 text-center">
      <p className="type-subheading text-bone" aria-live="polite">{inhale ? 'Breathe in...' : 'Breathe out...'} <span className="qq-label">{secsLeft}</span></p>
      {reducedEffects ? (
        <div className="qq-breathbar" aria-hidden="true"><span style={{ width: `${Math.round(size * 100)}%` }} /></div>
      ) : (
        <div className="qq-breathring" aria-hidden="true">
          <span className={`qq-breathring__ring ${holding ? 'is-holding' : ''}`} style={{ transform: `scale(${size.toFixed(3)})` }} />
        </div>
      )}
      <button
        type="button"
        className={`qq-holdbtn ${holding ? 'is-holding' : ''}`}
        onPointerDown={press}
        onPointerUp={release}
        onPointerLeave={release}
        onPointerCancel={release}
        onKeyDown={onKey}
        onKeyUp={onKey}
        onContextMenu={(e) => e.preventDefault()}
        aria-pressed={holding}
      >
        {holding ? 'Breathing in' : inhale ? 'Hold to breathe in' : 'Let go, breathe out'}
      </button>
      <p className="qq-label">Breath {Math.min(run.cycles, cue.cycle + 1)} of {run.cycles}</p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button size="sm" onClick={() => finish(true)}>Stop and strike now</Button>
      </div>
    </Panel>
  );
}
