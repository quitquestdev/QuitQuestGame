'use client';

/**
 * The Battle tab when no fight is running: Urge Mode first and biggest,
 * then practice battles by craving strength (the same buttons as the
 * dashboard's Craving Emergency panel).
 */
import React from 'react';
import Panel from '../ui/Panel';
import Button from '../ui/Button';
import Sprite from '../Sprite';

export default function BattleCamp({ onUrge, onPractice }) {
  return (
    <div className="space-y-4">
      <Panel tone="danger" className="text-center space-y-3">
        <Sprite id="icon_swords" scale={3} className="mx-auto block" />
        <h2 className="type-heading text-rust-300">Feeling an urge?</h2>
        <p className="type-body text-bone">Start a short battle right now. Most cravings rise and fade within a few minutes.</p>
        <Button tone="moss" onClick={onUrge}>
          <Sprite id="icon_alert" scale={1} />Start Urge Mode
        </Button>
      </Panel>
      <Panel className="space-y-3 text-center">
        <h3 className="type-subheading text-brass-300">Practice battles</h3>
        <p className="type-caption text-bone">Pick how strong it feels.</p>
        <div className="grid grid-cols-3 gap-2">
          <Button tone="moss" onClick={() => onPractice('mild')}>Mild</Button>
          <Button tone="moss" onClick={() => onPractice('medium')}>Medium</Button>
          <Button tone="moss" onClick={() => onPractice('strong')}>Strong</Button>
        </div>
      </Panel>
    </div>
  );
}
