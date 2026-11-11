'use client';

/**
 * The ability bar: one big button per ability, each with its icon, name and
 * a badge for its cooldown (turns to wait) or uses left. Sits at the bottom
 * of the battle, within thumb reach.
 */
import React from 'react';
import Sprite from '../Sprite';
import { ABILITIES, ABILITY_ORDER } from '../../lib/battle/data/abilities';

export default function AbilityBar({ available, enabled, onChoose }) {
  return (
    <div className="qq-abilities" role="group" aria-label="Abilities">
      {ABILITY_ORDER.map((id) => {
        const ab = ABILITIES[id];
        const a = available[id] || {};
        const ok = enabled && a.ok;
        const badge = a.reason === 'cooldown' ? `${a.cooldown}` : id === 'sip' ? `x${a.usesLeft}` : null;
        const why = a.reason === 'cooldown' ? `Ready in ${a.cooldown} turn${a.cooldown === 1 ? '' : 's'}.` : a.reason === 'no_uses' ? 'No sips left this battle.' : '';
        return (
          <button
            key={id}
            type="button"
            className={`qq-ability ${ok ? '' : 'is-off'}`}
            disabled={!ok}
            onClick={() => onChoose(id)}
            aria-label={`${ab.name}. ${ab.short} ${why}`.trim()}
            title={`${ab.name}: ${ab.short}`}
          >
            <Sprite id={ab.icon} scale={2} className="block mx-auto" />
            <span className="qq-ability__name">{ab.name}</span>
            {badge && <span className={`qq-ability__badge ${a.reason === 'cooldown' ? 'is-wait' : ''}`}>{badge}</span>}
          </button>
        );
      })}
    </div>
  );
}
