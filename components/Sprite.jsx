'use client';

/**
 * <Sprite id="enemy_smoke_wraith" scale={3} />
 *
 * The only way the UI draws pixel art. Takes a manifest ID, never a path.
 *
 * - scale must be a whole number (1, 2, 3...). Anything else is rounded and
 *   warned about in development, because fractional scaling blurs pixels.
 * - Rendered with nearest-neighbour scaling (`.sprite` in globals.css).
 * - Animates through the manifest frames at the manifest fps. Looping
 *   animations repeat; one-shot animations stop on the last frame and call
 *   onAnimationEnd.
 * - Shows the first frame only when the user prefers reduced motion.
 * - Unknown IDs render a visible checkered placeholder instead of crashing.
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSpriteRegistry } from '../lib/sprites/SpriteProvider';

const isDev = process.env.NODE_ENV !== 'production';
const warnedScales = new Set();

function wholeScale(scale, id) {
  const s = Number(scale);
  if (Number.isInteger(s) && s >= 1) return s;
  const fixed = Math.max(1, Math.round(s) || 1);
  if (isDev && !warnedScales.has(`${id}:${scale}`)) {
    warnedScales.add(`${id}:${scale}`);
    // eslint-disable-next-line no-console
    console.warn(`[sprites] <Sprite id="${id}"> scale ${scale} is not a whole number; using ${fixed}`);
  }
  return fixed;
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  return reduced;
}

export default function Sprite({
  id,
  animation,
  scale = 2,
  playing = true,
  frame: forcedFrame,
  onAnimationEnd,
  label,
  className = '',
  style,
}) {
  const registry = useSpriteRegistry();
  const sprite = registry.resolve(id, animation);
  const s = wholeScale(scale, id);
  const reducedMotion = usePrefersReducedMotion();
  const [frame, setFrame] = useState(0);

  const frameKey = sprite.frames.join('|');

  // Restart from frame 0 whenever the art or animation changes.
  useEffect(() => setFrame(0), [frameKey]);

  // Preload every frame so animation never flickers.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    sprite.frames.forEach((src) => {
      const img = new window.Image();
      img.src = src;
    });
  }, [frameKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const animate = playing && !reducedMotion && forcedFrame === undefined && sprite.frames.length > 1 && sprite.fps > 0;

  // Latest callback, so the timer never calls a stale one.
  const onEndRef = useRef(onAnimationEnd);
  onEndRef.current = onAnimationEnd;

  useEffect(() => {
    const oneShot = !sprite.loop && sprite.frames.length > 1 && sprite.fps > 0;
    if (!animate) {
      // Reduced motion: hold the first frame, but still report the end of a
      // one-shot animation after its normal duration so callers can move on.
      if (!oneShot || !onEndRef.current) return undefined;
      const t = setTimeout(() => onEndRef.current?.(), (sprite.frames.length * 1000) / sprite.fps);
      return () => clearTimeout(t);
    }
    let f = 0;
    const timer = setInterval(() => {
      const next = f + 1;
      if (next < sprite.frames.length) {
        f = next;
      } else if (sprite.loop) {
        f = 0;
      } else {
        clearInterval(timer);
        onEndRef.current?.();
        return;
      }
      setFrame(f);
    }, 1000 / sprite.fps);
    return () => clearInterval(timer);
  }, [animate, frameKey, sprite.fps, sprite.loop]); // eslint-disable-line react-hooks/exhaustive-deps

  const width = sprite.frameWidth * s;
  const height = sprite.frameHeight * s;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  if (sprite.missing) {
    return (
      <span
        className={`sprite sprite-missing ${className}`}
        style={{ width, height, ...style }}
        title={isDev ? `missing sprite: ${id}` : undefined}
        data-sprite-id={id}
        {...a11y}
      />
    );
  }

  const index = Math.min(forcedFrame ?? frame, sprite.frames.length - 1);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sprite.frames[index]}
      width={width}
      height={height}
      alt={label || ''}
      draggable={false}
      className={`sprite ${className}`}
      style={{ width, height, ...style }}
      data-sprite-id={id}
      data-sprite-source={sprite.source}
      {...(label ? {} : { 'aria-hidden': true })}
    />
  );
}

/** Native size of a sprite ID, for layout maths. */
export function useSpriteSize(id, animation) {
  const registry = useSpriteRegistry();
  const sprite = registry.resolve(id, animation);
  return useMemo(() => ({ width: sprite.frameWidth, height: sprite.frameHeight }), [sprite.frameWidth, sprite.frameHeight]);
}
