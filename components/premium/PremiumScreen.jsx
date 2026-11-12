'use client';

/**
 * The Premium screen: what Premium includes, the real store price, buy and
 * Restore Purchases. No countdowns, no pressure, and nothing here ever
 * blocks the free game. It never opens on its own during a battle or a
 * craving: players reach it from Settings, a locked preview, or a one-time
 * milestone note they can dismiss.
 *
 * Talks only to useEntitlements(). The price comes from the store, localized,
 * so it can change in App Store Connect and Google Play Console without a
 * code change.
 */
import React, { useEffect, useState } from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';
import { useEntitlements } from './EntitlementProvider';
import { PRODUCTS, PURCHASE_MESSAGES } from '../../lib/monetization/config';

const INCLUDES = [
  { icon: 'icon_target', title: 'Advanced stats', text: 'Your streak, cravings resisted week by week, battle results by craving strength, and the healthy activities you log.' },
  { icon: 'icon_chest', title: 'Savings projections', text: 'What you have saved and what you will save at each milestone and over the next year, from the costs you entered.' },
  { icon: 'icon_helmet', title: 'Three knight skins', text: 'Gilded Paladin, Midnight Warden and Silver Templar armour for your knight, in battle and on the world map.' },
  { icon: 'icon_shield', title: 'No ads', text: 'Premium removes every ad in the app.' },
];

const ALWAYS_FREE = 'The quit tracker, craving battles, the 180-day story, the world map, health milestones and achievements stay free, always.';

export default function PremiumScreen({ onClose }) {
  const { isPremium, purchasesAvailable, unavailableReason, offers, purchase, restore, purchasing, restoring, pending, errorMessage, reloadOffers } = useEntitlements();
  const [justUnlocked, setJustUnlocked] = useState(false);
  const [note, setNote] = useState('');
  const offer = offers.find((o) => o.id === PRODUCTS.PREMIUM_LIFETIME);

  // If prices failed to load earlier, try again when the screen opens.
  useEffect(() => {
    if (purchasesAvailable && !offer) reloadOffers();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const buy = async () => {
    setNote('');
    const r = await purchase(PRODUCTS.PREMIUM_LIFETIME);
    if (r.ok) setJustUnlocked(true);
    else if (r.code === 'pending') setNote(PURCHASE_MESSAGES.pending);
  };
  const doRestore = async () => {
    setNote('');
    const r = await restore();
    if (r.ok) setNote(r.restored ? 'Premium restored. Welcome back.' : 'We did not find an earlier Premium purchase for this account.');
  };

  return (
    <div className="space-y-4">
      <Panel tone="legendary" className="text-center space-y-2">
        <Sprite id="icon_crown" scale={3} className="mx-auto block" />
        <h2 className="type-title text-brass-300">Quit Quest Premium</h2>
        <p className="type-body text-bone">A one-time purchase that adds extras to your quest and supports the game.</p>
      </Panel>

      {(justUnlocked || isPremium) && (
        <Panel tone="raised" className="text-center space-y-2" role="status">
          <Sprite id="icon_check" scale={2} className="mx-auto block" />
          <p className="type-heading text-moss-300">{justUnlocked ? 'Premium unlocked!' : 'Premium is unlocked'}</p>
          <p className="type-body text-bone">Thank you for supporting Quit Quest. Everything below is ready to use now.</p>
        </Panel>
      )}

      <Panel className="space-y-3">
        <h3 className="type-heading text-brass-300">Premium includes</h3>
        <ul className="space-y-3">
          {INCLUDES.map((f) => (
            <li key={f.title} className="flex gap-3 items-start">
              <Sprite id={f.icon} scale={2} className="shrink-0" />
              <div className="min-w-0">
                <p className="type-subheading text-bone">{f.title}</p>
                <p className="type-caption text-stone-400">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
        <p className="type-caption text-bone">{ALWAYS_FREE}</p>
      </Panel>

      {!isPremium && (
        <Panel tone="raised" className="space-y-3 text-center">
          {purchasesAvailable ? (
            offer ? (
              <>
                <p className="type-statL text-brass-300">{offer.priceString}</p>
                <p className="type-caption text-bone">One payment. No subscription.</p>
                <Button tone="moss" onClick={buy} disabled={purchasing || pending}>
                  {purchasing ? 'Waiting for the store...' : `Unlock Premium for ${offer.priceString}`}
                </Button>
              </>
            ) : (
              <>
                <p className="type-body text-bone">The price could not be loaded from the store right now.</p>
                <Button size="sm" onClick={reloadOffers}>Try again</Button>
              </>
            )
          ) : (
            <p className="type-body text-bone">
              {unavailableReason === 'web'
                ? 'Premium is purchased in the Quit Quest apps for iOS and Android. Purchases are not available on the web.'
                : 'Purchases are not available on this device right now.'}
            </p>
          )}
          {pending && <p className="type-caption text-brass-300">{PURCHASE_MESSAGES.pending}</p>}
        </Panel>
      )}

      {(note || errorMessage) && (
        <p className="type-caption text-bone text-center" role="status">{note || errorMessage}</p>
      )}

      <Panel tone="sunken" className="space-y-2 text-center">
        {purchasesAvailable && (
          <Button size="sm" onClick={doRestore} disabled={restoring}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Button>
        )}
        <p className="type-caption text-stone-400">
          Premium is a one-time purchase, so there is nothing to cancel. Purchases are made and managed through your App Store or Google Play account.
        </p>
      </Panel>

      <div className="text-center">
        <Button size="sm" onClick={onClose}>
          <Sprite id="icon_arrow_left" scale={1} />Back
        </Button>
      </div>
    </div>
  );
}
