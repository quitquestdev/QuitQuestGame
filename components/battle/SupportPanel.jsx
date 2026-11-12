'use client';

/**
 * Support: the US quitline and a plain note that the app is not medical
 * advice. Shown from "Need more help" in any battle or Urge Mode, on the
 * defeat screen, and in Settings. Works offline (it is just text and a tel: link).
 */
import React from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';

export default function SupportPanel({ onClose, compact = false }) {
  return (
    <Panel tone="raised" className="space-y-3" role="region" aria-label="Help and resources">
      <h3 className="type-subheading text-brass-300 flex flex-wrap items-center gap-2"><Sprite id="icon_heart" scale={2} />Help &amp; Resources</h3>
      <p className="type-body text-bone">
        Free, confidential help from a quit coach, in the US: call <a className="qq-link" href="tel:+18007848669">1-800-QUIT-NOW</a> (1-800-784-8669).
      </p>
      {!compact && (
        <p className="type-body text-bone">
          A craving usually rises and fades within a few minutes. Slow breaths, a glass of water, a short walk or texting a friend can help it pass.
        </p>
      )}
      <p className="type-caption text-stone-400">
        Quit Quest helps you track your quit and stay motivated. It is not a substitute for medical advice. Talk to a doctor or pharmacist about quit medicines and any health concerns.
      </p>
      {onClose && (
        <div className="flex justify-end">
          <Button size="sm" onClick={onClose}>Close</Button>
        </div>
      )}
    </Panel>
  );
}
