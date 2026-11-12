'use client';

/**
 * <ProgressBar value={73} tone="moss" label="Health" />
 *
 * Track with pixel end caps (`ui_bar_frame`, three-slice) and a fill tile
 * with a highlight row (`ui_bar_fill_<tone>`), both at 2x from the manifest.
 *
 * tone: moss (health, XP, recovery, completed: positive meaning only)
 *       rust (enemy HP, danger) | brass (neutral progress, e.g. setup steps)
 */
import React from 'react';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';

export default function ProgressBar({ value = 0, max = 100, tone = 'moss', label, className = '', animate = true }) {
  const registry = useSpriteRegistry();
  const frame = registry.resolve('ui_bar_frame');
  const fill = registry.resolve(`ui_bar_fill_${tone}`);
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div
      className={`qq-bar ${className}`}
      style={{ '--bar-frame': frame.missing ? 'none' : `url(${frame.frames[0]})` }}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
    >
      <div
        className={`qq-bar__fill ${animate ? 'qq-bar__fill--animate' : ''}`}
        style={{ width: `${pct}%`, '--bar-fill': fill.missing ? 'none' : `url(${fill.frames[0]})` }}
      />
    </div>
  );
}
