'use client';

/**
 * The battle stage: parallax scene, hero on the left, enemy on the right.
 *
 * Presentational. It plays the engine's events (lib/battle/engine.js):
 *   hit    attacker lunges; a beat of hit-stop; the target recoils, shows its
 *          hurt frames (white hit flash, then a rust tint), a number floats
 *          up, palette particles burst, and the screen shakes
 *   heal   a green number and a few moss sparkles
 *   shield / charge / stun / taunt   small markers and a speech bubble
 *   victory / defeat                 victory pose; a calm "resting" knight
 *
 * Reduced Effects (setting or system reduce-motion): no shake, no lunges, no
 * white flashes and no particles; numbers and markers stay so nothing is
 * lost. No effect repeats faster than three times a second.
 */
import React, { useEffect, useRef, useState } from 'react';
import Sprite from '../Sprite';
import BattleScene from './BattleScene';

// Which scene each enemy fights in.
const SCENES = {
  enemy_social_pressure_imp: 'forest',
  enemy_smoke_wraith: 'forest',
  enemy_cigarette_butt_goblin: 'forest',
  enemy_stress_demon: 'village',
  enemy_boredom_slime: 'village',
  enemy_nicotine_lord: 'lair',
};

const MAX_PARTICLES = 24;
const HIT_STOP_MS = 90;
const IMPACT_MS = 200; // from the start of a lunge to the moment of impact

const PARTICLE_COLORS = {
  hit: ['bone', 'brass300', 'rust400'],
  big: ['bone', 'brass300', 'brass400', 'rust300'],
  hurt: ['rust300', 'rust400', 'bone'],
  heal: ['moss300', 'moss400', 'bone'],
  stun: ['brass300', 'bone'],
};

function useWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 400px)');
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return wide;
}

let nextId = 1;

export default function BattleField({
  enemySpriteId,
  enemyName,
  isBoss,
  heroSpriteId,
  heroName,
  events = { id: 0, list: [] },
  phase = 'player',
  shielded = false,
  charged = false,
  stunned = false,
  charging = false,
  reducedEffects = false,
}) {
  const wide = useWide();
  const heroScale = wide ? 3 : 2;
  const enemyScale = isBoss ? 2 : wide ? 3 : 2;
  const height = wide ? 250 : 184;

  const [hero, setHero] = useState({ anim: 'idle', key: 0, move: '' });
  const [foe, setFoe] = useState({ anim: 'idle', key: 0, move: '' });
  const [numbers, setNumbers] = useState([]);
  const [particles, setParticles] = useState([]);
  const [stage, setStage] = useState(''); // '' | 'qq-hitstop' | 'qq-shake' | 'qq-shake qq-shake--big'
  const [bubble, setBubble] = useState(null);
  const timers = useRef([]);
  const later = (fn, ms) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (setter, anim, move = '') => setter((s) => ({ anim, key: s.key + 1, move }));
  const settle = (setter) => setter((s) => ({ ...s, move: '' }));

  const float = (side, text, kind) => {
    const id = nextId++;
    setNumbers((n) => [...n, { id, side, text, kind }]);
    later(() => setNumbers((n) => n.filter((x) => x.id !== id)), 1000);
  };

  const burst = (side, kind, count) => {
    if (reducedEffects) return;
    const colors = PARTICLE_COLORS[kind] || PARTICLE_COLORS.hit;
    const fresh = Array.from({ length: count }, (_, i) => {
      const a = (i / count) * Math.PI * 2 + (i % 2 ? 0.3 : 0);
      const r = 18 + (i % 3) * 10;
      return { id: nextId++, side, color: colors[i % colors.length], dx: Math.round(Math.cos(a) * r), dy: Math.round(Math.sin(a) * r - 10) };
    });
    setParticles((p) => [...p, ...fresh].slice(-MAX_PARTICLES));
    later(() => setParticles((p) => p.filter((x) => !fresh.includes(x))), 650);
  };

  const shake = (big) => {
    if (reducedEffects) return;
    setStage(big ? 'qq-shake qq-shake--big' : 'qq-shake');
    later(() => setStage(''), big ? 320 : 220);
  };

  // Play each new batch of events.
  useEffect(() => {
    if (!events.list.length) return;
    let t = 0;
    for (const ev of events.list) {
      const at = t;
      if (ev.type === 'hit') {
        const toEnemy = ev.target === 'enemy';
        // Attacker lunges (no lunge with Reduced Effects).
        later(() => play(toEnemy ? setHero : setFoe, 'attack', reducedEffects ? '' : 'lunge'), at);
        // Impact: hit-stop, then shake, hurt frames, number and particles.
        later(() => { if (!reducedEffects) setStage('qq-hitstop'); }, at + IMPACT_MS);
        later(() => {
          setStage('');
          if (ev.amount > 0) {
            play(toEnemy ? setFoe : setHero, 'hurt', reducedEffects ? '' : toEnemy && !isBoss ? 'squash' : 'recoil');
            shake(ev.big);
            burst(toEnemy ? 'enemy' : 'hero', ev.big ? 'big' : toEnemy ? 'hit' : 'hurt', ev.big ? 12 : 6);
          }
          float(toEnemy ? 'enemy' : 'hero', ev.amount > 0 ? `-${ev.amount}` : 'Blocked!', toEnemy ? (ev.big ? 'big' : 'hit') : 'hurt');
          if (ev.blocked) float('hero', `${ev.blocked} blocked`, 'block');
        }, at + IMPACT_MS + HIT_STOP_MS);
        later(() => { settle(setHero); settle(setFoe); }, at + 600);
        t += 700;
      } else if (ev.type === 'heal') {
        later(() => {
          float(ev.target, `+${ev.amount}`, 'heal');
          burst(ev.target, 'heal', 5);
        }, at);
        t += 400;
      } else if (ev.type === 'stun') {
        later(() => burst('enemy', 'stun', 6), at);
      } else if (ev.type === 'taunt') {
        later(() => {
          setBubble({ id: nextId++, text: ev.text });
          later(() => setBubble(null), 2600);
        }, at);
      } else if (ev.type === 'phase') {
        later(() => {
          setBubble({ id: nextId++, text: ev.text, big: true });
          shake(true);
          later(() => setBubble(null), 2800);
        }, at);
      } else if (ev.type === 'charge' && ev.by === 'enemy') {
        later(() => play(setFoe, 'idle', reducedEffects ? '' : 'windup'), at);
      }
    }
  }, [events.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const won = phase === 'victory';
  const lost = phase === 'defeat';
  const heroAnim = won && hero.anim === 'idle' ? 'victory' : hero.anim;
  // With Reduced Effects the hurt flash frame is skipped: hold the tinted frame instead.
  const noFlash = reducedEffects;

  return (
    <BattleScene scene={SCENES[enemySpriteId] || 'forest'} height={height} className={`qq-inset p-0 qq-field ${stage}`} drift={!reducedEffects}>
      <div className="absolute inset-0" role="img" aria-label={`${heroName} versus ${enemyName}`}>
        {/* Hero */}
        <div className={`qq-actor qq-actor--hero ${hero.move ? `qq-move-${hero.move}` : ''} ${lost ? 'is-resting' : ''}`}>
          {charging && !reducedEffects && <span className="qq-chargeglow" aria-hidden="true" />}
          {shielded && <Sprite id="icon_shield" scale={2} className="qq-marker qq-marker--hero" label="" />}
          <Sprite
            key={`h${hero.key}`}
            id={heroSpriteId}
            animation={noFlash && heroAnim === 'hurt' ? 'hurt' : heroAnim}
            frame={noFlash && heroAnim === 'hurt' ? 1 : undefined}
            scale={heroScale}
            onAnimationEnd={() => setHero((s) => ({ ...s, anim: 'idle' }))}
          />
          {lost && <span className="qq-resting" aria-hidden="true">resting</span>}
        </div>

        {/* Enemy */}
        <div className={`qq-actor qq-actor--enemy ${foe.move ? `qq-move-${foe.move}` : ''} ${won ? 'qq-defeated' : ''}`}>
          {charged && <Sprite id="icon_lightning" scale={2} className="qq-marker qq-marker--enemy" label="" />}
          {stunned && <Sprite id="icon_sparkle" scale={2} className="qq-marker qq-marker--enemy" label="" />}
          <Sprite
            key={`e${foe.key}`}
            id={enemySpriteId}
            animation={foe.anim}
            frame={noFlash && foe.anim === 'hurt' ? 1 : undefined}
            scale={enemyScale}
            onAnimationEnd={() => setFoe((s) => ({ ...s, anim: 'idle' }))}
          />
        </div>

        {/* Taunts and announcements */}
        {bubble && (
          <p key={bubble.id} className={`qq-bubble ${bubble.big ? 'qq-bubble--big' : ''}`} role="status">
            {bubble.text}
          </p>
        )}

        {/* Floating numbers */}
        {numbers.map((n) => (
          <span
            key={n.id}
            className={`qq-damage qq-damage--${n.kind} ${reducedEffects ? 'qq-damage--still' : ''} absolute top-6 ${n.side === 'enemy' ? 'right-[14%]' : 'left-[14%]'}`}
            aria-hidden="true"
          >
            {n.text}
          </span>
        ))}

        {/* Particles (capped; none with Reduced Effects) */}
        {particles.map((p) => (
          <span
            key={p.id}
            className={`qq-particle qq-particle--${p.side}`}
            style={{ '--dx': `${p.dx}px`, '--dy': `${p.dy}px`, background: `var(--c-${p.color})` }}
            aria-hidden="true"
          />
        ))}
      </div>
    </BattleScene>
  );
}
