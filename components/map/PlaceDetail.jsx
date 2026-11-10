'use client';

/**
 * The panel under the world map for a tapped place: a milestone landmark,
 * a story signpost, a craving camp or the fortress. Shared by both views.
 */
import React from 'react';
import Sprite from '../Sprite';
import Button from '../ui/Button';
import { LANDMARK_NAMES, durationLabel, TIER_LABELS } from './places';

export default function PlaceDetail({ place, day, onClose, onOpenStory, onFight }) {
  const { type, data, active } = place;
  let body;
  if (type === 'landmark') {
    body = active ? (
      <>
        <div className="flex items-center gap-3">
          <Sprite id={data.icon} scale={2} />
          <div className="min-w-0">
            <p className="type-subheading text-brass-300">{data.title}</p>
            <p className="qq-label text-moss-300">Reached at {durationLabel(data.day)} smoke-free</p>
          </div>
        </div>
        <p className="type-body text-bone">{data.description}</p>
        <p className="qq-label text-moss-300">+{data.experience} XP</p>
      </>
    ) : (
      <>
        <p className="type-subheading text-stone-400">A landmark lies ahead</p>
        <p className="type-body text-bone">
          Something stirs in {LANDMARK_NAMES[place.kind]} here. It lights up at {durationLabel(data.day)} smoke-free.
        </p>
      </>
    );
  } else if (type === 'story') {
    body = active ? (
      <>
        <p className="type-subheading text-brass-300">Day {data.day}: {data.title}</p>
        <Button size="sm" onClick={() => onOpenStory?.(data.day)}>Read this chapter</Button>
      </>
    ) : (
      <>
        <p className="type-subheading text-stone-400">A story waits here</p>
        <p className="type-body text-bone">It unlocks on day {data.day}.</p>
      </>
    );
  } else if (type === 'camp') {
    body = (
      <>
        <p className="type-subheading text-rust-300">{TIER_LABELS[data.tier]}</p>
        <p className="type-body text-bone">{data.enemies.join(', ')} {data.enemies.length === 1 ? 'roams' : 'roam'} this camp.</p>
        {active ? (
          <Button tone="moss" onClick={() => onFight?.(data)}>Fight a {data.tier} craving</Button>
        ) : (
          <p className="type-caption text-stone-400">The road reaches this camp on day {data.day}. You can fight any craving from the Quest tab at any time.</p>
        )}
      </>
    );
  } else {
    body = (
      <>
        <p className="type-subheading text-rust-300">The Nicotine Lord's Fortress</p>
        {active ? (
          <>
            <p className="type-body text-bone">Six months free. The Nicotine Lord waits behind these walls.</p>
            <Button tone="moss" onClick={() => onFight?.(data)}>Challenge the Nicotine Lord</Button>
          </>
        ) : (
          <p className="type-body text-bone">
            The Nicotine Lord waits here at day 180. {Math.max(0, 180 - day)} day{180 - day === 1 ? '' : 's'} to go.
          </p>
        )}
      </>
    );
  }
  return (
    <div className="qq-inset space-y-2" role="dialog" aria-label="Place details">
      {body}
      <div className="flex justify-end">
        <Button size="sm" onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
