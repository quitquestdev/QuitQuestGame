'use client';

/**
 * The battle stage: parallax scene, hero on the left, enemy on the right.
 *
 * Purely presentational. It reads the battle state the game already keeps
 * and turns changes into animation: an attack plays the attacker's attack
 * frames, a drop in HP plays the target's hurt frames (white hit flash, then
 * a rust tint) and floats a damage number; a rise in the hero's HP floats a
 * green heal number. Victory loops the hero's victory pose and fades the
 * enemy out in steps. The turn logic itself is untouched.
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
  enemyHP,
  playerHP,
  heroSpriteId,
  heroName,
  battleAnimation,
  enemyAnimation,
  inBattle,
  turn,
}) {
  const wide = useWide();
  const heroScale = wide ? 3 : 2;
  const enemyScale = isBoss ? 2 : wide ? 3 : 2;
  const height = wide ? 240 : 200;

  const [hero, setHero] = useState({ anim: 'idle', key: 0 });
  const [foe, setFoe] = useState({ anim: 'idle', key: 0 });
  const [numbers, setNumbers] = useState([]);
  const prev = useRef({ enemyHP, playerHP });
  const timers = useRef([]);

  const later = (fn, ms) => {
    const t = setTimeout(fn, ms);
    timers.current.push(t);
  };
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const play = (setter, anim) => setter((s) => ({ anim, key: s.key + 1 }));
  const float = (side, text, kind) => {
    const id = nextId++;
    setNumbers((n) => [...n, { id, side, text, kind }]);
    later(() => setNumbers((n) => n.filter((x) => x.id !== id)), 900);
  };

  // Attacks.
  useEffect(() => {
    if (battleAnimation === 'player-attack') play(setHero, 'attack');
  }, [battleAnimation]);
  useEffect(() => {
    if (enemyAnimation === 'enemy-attack') play(setFoe, 'attack');
  }, [enemyAnimation]);

  // HP changes -> hurt frames and floating numbers.
  useEffect(() => {
    const p = prev.current;
    if (turn <= 1) {
      // A fresh battle resets HP to full: not damage or healing.
      prev.current = { enemyHP, playerHP };
      setHero({ anim: 'idle', key: 0 });
      setFoe({ anim: 'idle', key: 0 });
      return;
    }
    if (enemyHP < p.enemyHP) {
      const dmg = p.enemyHP - enemyHP;
      later(() => {
        play(setFoe, 'hurt');
        float('enemy', `-${dmg}`, 'hit');
      }, 180);
    }
    if (playerHP < p.playerHP) {
      const dmg = p.playerHP - playerHP;
      later(() => {
        play(setHero, 'hurt');
        float('hero', `-${dmg}`, 'hurt');
      }, 180);
    } else if (playerHP > p.playerHP) {
      float('hero', `+${playerHP - p.playerHP}`, 'heal');
    }
    prev.current = { enemyHP, playerHP };
  }, [enemyHP, playerHP, turn]); // eslint-disable-line react-hooks/exhaustive-deps

  const won = !inBattle && enemyHP <= 0;
  const lost = !inBattle && playerHP <= 0;
  const heroAnim = won && hero.anim === 'idle' ? 'victory' : hero.anim;

  return (
    <BattleScene
      scene={SCENES[enemySpriteId] || 'forest'}
      height={height}
      className="qq-inset p-0"
    >
      <div className="absolute inset-0" role="img" aria-label={`${heroName} versus ${enemyName}`}>
        {/* Hero */}
        <div className={`absolute bottom-3 left-[6%] ${lost ? 'opacity-50' : ''}`}>
          <Sprite
            key={`h${hero.key}`}
            id={heroSpriteId}
            animation={heroAnim}
            scale={heroScale}
            onAnimationEnd={() => setHero((s) => ({ anim: 'idle', key: s.key }))}
          />
        </div>

        {/* Enemy */}
        <div className={`absolute bottom-3 right-[6%] ${won ? 'qq-defeated' : ''}`}>
          <Sprite
            key={`e${foe.key}`}
            id={enemySpriteId}
            animation={foe.anim}
            scale={enemyScale}
            onAnimationEnd={() => setFoe((s) => ({ anim: 'idle', key: s.key }))}
          />
        </div>

        {/* Floating numbers */}
        {numbers.map((n) => (
          <span
            key={n.id}
            className={`qq-damage qq-damage--${n.kind} absolute top-6 ${n.side === 'enemy' ? 'right-[14%]' : 'left-[14%]'}`}
            aria-hidden="true"
          >
            {n.text}
          </span>
        ))}
      </div>
    </BattleScene>
  );
}
