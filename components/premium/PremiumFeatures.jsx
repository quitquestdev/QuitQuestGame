'use client';

/**
 * Premium features and their locked previews.
 *
 * Every feature reads `useEntitlements()`; none touches billing. Free players
 * see the same panel filled with sample numbers under a dithered veil, with a
 * short note and a way to the Premium screen, so they can see what they would
 * get. Nothing here ever blocks the free game.
 */
import React, { useEffect, useMemo, useState } from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';
import { SpriteProvider, loadSkinManifest } from '../../lib/sprites/SpriteProvider';
import { createSpriteRegistry } from '../../lib/sprites/registry';
import defaultManifest from '../../public/assets/sprites/manifest.json';
import { useEntitlements } from './EntitlementProvider';
import { ENTITLEMENTS } from '../../lib/monetization/config';
import { SKINS, skinManifestUrl } from '../../lib/premium/skins';

export const money = (n) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const count = (n) => (Number(n) || 0).toLocaleString('en-US');

const ACTIVITY_LABELS = {
  walks: 'Walks',
  exercises: 'Exercise',
  meditations: 'Meditation',
  waterDrinks: 'Water',
  breathingExercises: 'Breathing',
  socialCalls: 'Calls with friends',
  hobbies: 'Hobbies',
  healthyMeals: 'Healthy meals',
};
const TIER_LABELS = { mild: 'Mild', medium: 'Medium', strong: 'Strong', boss: 'The Nicotine Lord', other: 'Other' };

/** A locked feature: the real panel with sample data, veiled, plus a way in. */
export function LockedPreview({ title, summary, onOpenPremium, children }) {
  return (
    <div className="qq-locked">
      <div className="qq-locked__content" aria-hidden="true" inert="">
        {children}
      </div>
      <div className="qq-locked__veil" aria-hidden="true" />
      <div className="qq-locked__card">
        <Panel tone="legendary" className="text-center space-y-2">
          <Sprite id="icon_lock" scale={2} className="mx-auto block" label="Premium feature" />
          <p className="type-subheading text-brass-300">{title}</p>
          <p className="type-caption text-bone">{summary}</p>
          <Button size="sm" onClick={onOpenPremium}>
            <Sprite id="icon_crown" scale={1} />See Premium
          </Button>
        </Panel>
      </div>
    </div>
  );
}

/** Gate: the feature for Premium players, its locked preview for everyone else. */
export function PremiumGate({ title, summary, onOpenPremium, preview, children }) {
  const { hasEntitlement } = useEntitlements();
  if (hasEntitlement(ENTITLEMENTS.PREMIUM)) return children;
  return (
    <LockedPreview title={title} summary={summary} onOpenPremium={onOpenPremium}>
      {preview}
    </LockedPreview>
  );
}

function Tile({ icon, label, value, sub }) {
  return (
    <Panel tone="sunken" className="text-center space-y-1 min-w-0">
      {icon && <Sprite id={icon} scale={2} className="mx-auto block" />}
      <p className="qq-label">{label}</p>
      <p className="type-statL text-bone break-words">{value}</p>
      {sub && <p className="type-caption text-stone-400">{sub}</p>}
    </Panel>
  );
}

/** A single-series column chart in one colour, with hover titles and a table view. */
function WeeklyBars({ weekly }) {
  const max = Math.max(1, ...weekly.map((w) => w.count));
  return (
    <figure className="space-y-2">
      <div className="qq-bars" role="img" aria-label={`Cravings resisted per week, last ${weekly.length} weeks: ${weekly.map((w) => `${w.label} ${w.count}`).join(', ')}`}>
        {weekly.map((w) => (
          <div key={w.start} className="qq-bars__col" title={`${w.label}: ${w.count} resisted`}>
            <span className="qq-bars__value">{w.count || ''}</span>
            <span className="qq-bars__bar" style={{ height: `${Math.round((w.count / max) * 100)}%` }} />
          </div>
        ))}
      </div>
      <div className="flex justify-between qq-label">
        <span>{weekly[0].label}</span>
        <span>{weekly[weekly.length - 1].label}</span>
      </div>
      <details className="qq-details">
        <summary className="qq-label">Table view</summary>
        <table className="qq-table">
          <thead><tr><th scope="col">Week</th><th scope="col">Resisted</th></tr></thead>
          <tbody>{weekly.map((w) => <tr key={w.start}><td>{w.label}</td><td>{w.count}</td></tr>)}</tbody>
        </table>
      </details>
    </figure>
  );
}

/** Horizontal bars for a short list (one colour, labels in text colours). */
function ListBars({ items }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="space-y-1" title={`${i.label}: ${i.value}`}>
          <div className="flex justify-between gap-2 qq-label"><span className="text-bone">{i.label}</span><span>{count(i.value)}</span></div>
          <div className="qq-hbar"><span className="qq-hbar__fill" style={{ width: `${Math.round((i.value / max) * 100)}%` }} /></div>
        </li>
      ))}
    </ul>
  );
}

export function AdvancedStats({ data }) {
  const d = data;
  const tiers = Object.entries(d.byTier);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile icon="icon_calendar" label="Current streak" value={`${count(d.streak.current)} days`} sub={`${d.streak.weeks} full weeks`} />
        <Tile icon="icon_trophy" label="Longest streak" value={`${count(d.streak.longest)} days`} />
        <Tile icon="icon_shield" label="Cravings resisted" value={count(d.totals.cravingsResisted)} />
        <Tile icon="icon_swords" label="Battles won" value={count(d.totals.battlesWon)} />
      </div>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">Cravings resisted per week</h3>
        {d.logged.fought ? <WeeklyBars weekly={d.weekly} /> : <p className="type-body text-bone">Battles you fight from now on are recorded here, week by week.</p>}
      </Panel>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">Battle results</h3>
        {d.logged.fought ? (
          <>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div><p className="type-statL text-bone">{d.logged.win}</p><p className="qq-label">Won</p></div>
              <div><p className="type-statL text-bone">{d.logged.loss}</p><p className="qq-label">Lost</p></div>
              <div><p className="type-statL text-bone">{d.logged.fled}</p><p className="qq-label">Retreated</p></div>
            </div>
            <p className="type-caption text-bone text-center">You won {d.logged.winRate}% of {d.logged.fought} recorded battles.</p>
            <table className="qq-table">
              <thead><tr><th scope="col">Craving</th><th scope="col">Won</th><th scope="col">Lost</th><th scope="col">Retreated</th></tr></thead>
              <tbody>{tiers.map(([tier, r]) => <tr key={tier}><td>{TIER_LABELS[tier] || tier}</td><td>{r.win}</td><td>{r.loss}</td><td>{r.fled}</td></tr>)}</tbody>
            </table>
          </>
        ) : (
          <p className="type-body text-bone">Every battle from now on is recorded: wins, losses and retreats, by craving strength.</p>
        )}
      </Panel>

      <Panel className="space-y-3">
        <h3 className="type-subheading text-brass-300">Healthy activities logged</h3>
        {d.activities.some((a) => a.count) ? (
          <ListBars items={d.activities.filter((a) => a.count).map((a) => ({ label: ACTIVITY_LABELS[a.key] || a.key, value: a.count }))} />
        ) : (
          <p className="type-body text-bone">Log walks, water and more from the Quest tab to see them here.</p>
        )}
      </Panel>
    </div>
  );
}

export function SavingsProjections({ data }) {
  const s = data;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Tile icon="icon_coins" label="Saved so far" value={money(s.sofar.money)} sub={`${count(s.sofar.cigarettes)} cigarettes not smoked`} />
        <Tile icon="icon_chest" label="Next 12 months" value={money(s.nextYear.money)} sub={`${count(s.nextYear.cigarettes)} cigarettes not smoked`} />
      </div>
      <Panel tone="sunken" className="space-y-1 text-center">
        <p className="qq-label">Every smoke-free</p>
        <p className="type-body text-bone">
          day keeps {money(s.perDay.money)} in your purse, a week {money(s.perWeek.money)}, a month {money(s.perMonth.money)}.
        </p>
      </Panel>
      {s.next && (
        <Panel tone="raised" className="space-y-1 text-center">
          <p className="qq-label">Next milestone: {s.next.label}</p>
          <p className="type-statL text-brass-300">{money(s.next.money)}</p>
          <p className="type-caption text-bone">in {s.next.daysToGo} day{s.next.daysToGo === 1 ? '' : 's'}, with {count(s.next.cigarettes)} cigarettes not smoked</p>
        </Panel>
      )}
      <Panel className="space-y-2">
        <h3 className="type-subheading text-brass-300">At each milestone</h3>
        <table className="qq-table">
          <thead><tr><th scope="col">Smoke-free for</th><th scope="col">Saved</th><th scope="col">Not smoked</th></tr></thead>
          <tbody>
            {s.milestones.map((m) => (
              <tr key={m.day} className={m.reached ? 'is-reached' : ''}>
                <td>{m.reached && <Sprite id="icon_check" scale={1} label="reached" className="mr-1" />}{m.label}</td>
                <td>{money(m.money)}</td>
                <td>{count(m.cigarettes)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="type-caption text-stone-400">Based on the cigarettes per day and pack price you entered, at 20 cigarettes a pack.</p>
      </Panel>
    </div>
  );
}

/** Sample data for the locked previews (clearly not the player's own). */
export const SAMPLE_STATS = {
  streak: { current: 46, longest: 46, weeks: 6 },
  totals: { battlesWon: 31, cravingsResisted: 31, perfectVictories: 9 },
  logged: { fought: 38, win: 31, loss: 4, fled: 3, winRate: 82, since: null },
  byTier: { mild: { win: 18, loss: 1, fled: 1 }, medium: { win: 9, loss: 2, fled: 2 }, strong: { win: 4, loss: 1, fled: 0 } },
  weekly: [3, 5, 4, 6, 3, 4, 2, 4].map((c, i) => ({ start: i, count: c, label: i === 7 ? 'This week' : `${7 - i}w ago` })),
  activities: [{ key: 'waterDrinks', count: 40 }, { key: 'walks', count: 22 }, { key: 'meditations', count: 12 }],
};
export const SAMPLE_SAVINGS = {
  perDay: { money: 9, cigarettes: 18 },
  perWeek: { money: 63, cigarettes: 126 },
  perMonth: { money: 270, cigarettes: 540 },
  sofar: { money: 414, cigarettes: 828 },
  nextYear: { money: 3285, cigarettes: 6570 },
  next: { label: '3 months', money: 810, cigarettes: 1620, daysToGo: 44 },
  milestones: [
    { day: 7, label: '1 week', money: 63, cigarettes: 126, reached: true },
    { day: 30, label: '1 month', money: 270, cigarettes: 540, reached: true },
    { day: 90, label: '3 months', money: 810, cigarettes: 1620, reached: false },
    { day: 365, label: '1 year', money: 3285, cigarettes: 6570, reached: false },
  ],
};

/** A registry per skin, so each portrait previews its own armour. */
function useSkinPreviews() {
  const [previews, setPreviews] = useState({});
  useEffect(() => {
    let live = true;
    Promise.all(SKINS.map(async (s) => [s.id, await loadSkinManifest(skinManifestUrl(s.id))])).then((pairs) => {
      if (!live) return;
      const out = {};
      for (const [id, m] of pairs) {
        if (!m) continue;
        const r = createSpriteRegistry(defaultManifest);
        r.setSkins([m]);
        out[id] = r;
      }
      setPreviews(out);
    });
    return () => {
      live = false;
    };
  }, []);
  return previews;
}

/**
 * Knight skins. Premium players choose one (or the classic look); free
 * players see the armour and a way to Premium.
 */
export function SkinPicker({ heroClass = 'warrior', selected = null, onSelect, onOpenPremium }) {
  const { hasEntitlement } = useEntitlements();
  const unlocked = hasEntitlement(ENTITLEMENTS.PREMIUM);
  const previews = useSkinPreviews();
  const classic = useMemo(() => createSpriteRegistry(defaultManifest), []);
  const options = [{ id: null, name: 'Classic', description: 'The armour you started with.' }, ...SKINS];
  return (
    <div className="space-y-3">
      <ul className="grid grid-cols-2 gap-3">
        {options.map((s) => {
          const registry = s.id ? previews[s.id] : classic;
          const isSel = (selected || null) === s.id;
          return (
            <li key={s.id || 'classic'}>
              <Panel tone={isSel ? 'raised' : 'sunken'} className="text-center space-y-2 h-full">
                <div className="qq-portrait mx-auto w-20 h-20">
                  {registry && (
                    <SpriteProvider registry={registry}>
                      <Sprite id={`hero_${heroClass}`} scale={2} label={`${s.name} armour`} />
                    </SpriteProvider>
                  )}
                </div>
                <p className="type-subheading text-bone">{s.name}</p>
                <p className="type-caption text-stone-400">{s.description}</p>
                {unlocked || !s.id ? (
                  <Button size="sm" selected={isSel} disabled={!unlocked && !!s.id} onClick={() => onSelect && onSelect(s.id)}>
                    {isSel ? 'Wearing' : 'Wear'}
                  </Button>
                ) : (
                  <span className="qq-chip qq-chip--locked px-2 py-0.5 text-base inline-flex items-center gap-1">
                    <Sprite id="icon_lock" scale={1} />Premium
                  </span>
                )}
              </Panel>
            </li>
          );
        })}
      </ul>
      {!unlocked && (
        <div className="text-center">
          <Button size="sm" onClick={onOpenPremium}><Sprite id="icon_crown" scale={1} />See Premium</Button>
        </div>
      )}
    </div>
  );
}
