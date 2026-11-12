'use client';

/**
 * <Button tone="brass" />
 *
 * Bevelled pixel button from the manifest nine-slices `ui_button_<tone>`
 * (normal / pressed / disabled). Pressing swaps to the pressed frame and
 * drops the label 2px; nothing scales, so pixel art inside stays crisp.
 *
 * tone:     brass (default actions) | moss (positive actions only) | rust (danger)
 * size:     md (44px minimum, touch friendly) | sm
 * selected: pass true/false for toggles and tabs; true shows the pressed frame
 */
import React from 'react';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';

export default function Button({ tone = 'brass', size = 'md', selected, className = '', style, children, type = 'button', ...rest }) {
  const registry = useSpriteRegistry();
  const id = `ui_button_${tone}`;
  const url = (state) => {
    const s = registry.resolve(id, state);
    return s.missing ? 'none' : `url(${s.frames[0]})`;
  };
  return (
    <button
      type={type}
      className={`qq-btn qq-btn--${tone} qq-btn--${size} ${selected ? 'is-selected' : ''} ${className}`}
      style={{ '--btn-normal': url('normal'), '--btn-pressed': url('pressed'), '--btn-disabled': url('disabled'), ...style }}
      aria-pressed={selected === undefined ? undefined : !!selected}
      {...rest}
    >
      <span className="qq-btn__label">{children}</span>
    </button>
  );
}
