'use client';

/**
 * <Panel tone="default" />
 *
 * Dark translucent body, brass trim with notched corners, a lighter inner
 * edge on top/left and a darker one on bottom/right. The frame is the
 * manifest nine-slice `ui_panel_frame` (or its greening variant), drawn at
 * 2x with nearest-neighbour scaling, so a skin pack can restyle every panel.
 *
 * tone: default | raised | danger | parchment | sunken | legendary
 */
import React from 'react';
import { useSpriteRegistry } from '../../lib/sprites/SpriteProvider';
import { useGreening } from './Greening';

export function useFrameUrl(id, fallbackId) {
  const registry = useSpriteRegistry();
  let sprite = registry.resolve(id);
  if (sprite.missing && fallbackId) sprite = registry.resolve(fallbackId);
  return sprite.missing ? 'none' : `url(${sprite.frames[0]})`;
}

export default function Panel({ tone = 'default', as: Tag = 'div', className = '', style, children, ...rest }) {
  const { stage } = useGreening();
  const frame = useFrameUrl(stage ? `ui_panel_frame_g${stage}` : 'ui_panel_frame', 'ui_panel_frame');
  return (
    <Tag className={`qq-panel qq-panel--${tone} ${className}`} style={{ '--qq-frame': frame, ...style }} {...rest}>
      {children}
    </Tag>
  );
}
