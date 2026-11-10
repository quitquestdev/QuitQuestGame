'use client';

import React, { useState } from 'react';
import Sprite from '../Sprite';
import { useSpriteRegistry, loadSkinManifest } from '../../lib/sprites/SpriteProvider';
import { families } from '../../theme/palette';
import { typeRoles } from '../../theme/typography';

const FAMILY_NOTES = {
  indigo: 'Panels, sky, backgrounds',
  brass: 'Trim, borders, rewards, currency',
  rust: 'Danger, damage, enemies, cravings',
  moss: 'Positive meaning only: health, XP, recovery, streak, resist buttons',
  stone: 'Text, stone, disabled states',
  bone: 'Primary text',
};

const TYPE_SAMPLES = {
  title: 'The Legend of Ser Aldric',
  heading: 'Hall of Glory',
  subheading: 'Chapter One: The Awakening',
  body: 'Fight the urge with an epic battle. Every craving resisted adds to your legend.',
  story: 'You awaken in the Temple of Clean Air. The monks whisper of your courage. The first day without the Shadow’s touch begins.',
  caption: 'Heart rate and blood pressure normalising.',
  emphasis: 'Keep questing to unlock.',
  statXL: '180',
  statL: '$1,250.00',
  stat: '160/160 HP',
  label: 'Attack',
  micro: 'Lv 3 · +500 XP',
};

const WIDTHS = { full: null, 390: 390, 320: 320 };
const DEMO_SKIN_URL = '/assets/skins/dev-demo/manifest.json';

function Section({ title, children, note }) {
  return (
    <section className="mb-10">
      <h2 className="type-heading text-brass-400 mb-1">{title}</h2>
      {note && <p className="type-caption text-stone-400 mb-4">{note}</p>}
      {children}
    </section>
  );
}

function Tag({ children, tone = 'stone' }) {
  const tones = {
    stone: 'bg-stone-700 text-bone',
    rust: 'bg-rust-700 text-rust-300',
    brass: 'bg-brass-800 text-brass-300',
    indigo: 'bg-indigo-700 text-indigo-300',
  };
  return <span className={`type-micro px-1.5 py-0.5 ${tones[tone]}`}>{children}</span>;
}

function SpriteCard({ id }) {
  const registry = useSpriteRegistry();
  const animations = registry.listAnimations(id);
  const [anim, setAnim] = useState(animations[0]);
  const info = registry.resolve(id, anim);

  return (
    <div className="bg-indigo-800 border border-indigo-600 p-3">
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <code className="type-label text-bone break-all">{id}</code>
        {info.placeholder && <Tag tone="rust">placeholder</Tag>}
        {info.category && <Tag>{info.category}</Tag>}
        <Tag tone={info.source === 'skin' ? 'brass' : 'indigo'}>{info.source}</Tag>
      </div>
      <p className="type-micro text-stone-400 mb-2">
        {info.frameWidth}×{info.frameHeight}px · {info.frames.length} frame{info.frames.length === 1 ? '' : 's'}
        {info.fps ? ` · ${info.fps} fps` : ''}
        {info.loop ? '' : ' · once'}
      </p>
      {animations.length > 1 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {animations.map((a) => (
            <button
              key={a}
              onClick={() => setAnim(a)}
              className={`type-micro px-2 py-1 border ${a === anim ? 'bg-brass-500 text-indigo-900 border-brass-300' : 'bg-indigo-700 text-indigo-300 border-indigo-600'}`}
            >
              {a}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-end gap-4 flex-wrap">
        {[1, 2, 3].map((s) => (
          <div key={s} className="text-center">
            <div className="bg-indigo-950 p-1 inline-block">
              <Sprite id={id} animation={anim} scale={s} />
            </div>
            <p className="type-micro text-stone-500 mt-1">×{s}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DevHarness() {
  const registry = useSpriteRegistry();
  const [width, setWidth] = useState('full');
  const [skinOn, setSkinOn] = useState(false);
  const [skinError, setSkinError] = useState('');
  const ids = registry.listIds();

  const toggleSkin = async () => {
    if (skinOn) {
      registry.setSkins([]);
      setSkinOn(false);
      return;
    }
    const manifest = await loadSkinManifest(DEMO_SKIN_URL);
    if (!manifest) {
      setSkinError('Demo skin pack failed to load (see console).');
      return;
    }
    setSkinError('');
    registry.setSkins([manifest]);
    setSkinOn(true);
  };

  const frameWidth = WIDTHS[width];

  return (
    <div className="min-h-screen bg-indigo-950 text-bone">
      <header className="sticky top-0 z-20 bg-indigo-900 border-b border-brass-700 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3 max-w-5xl mx-auto">
          <div>
            <h1 className="type-subheading text-brass-400">Quit Quest dev harness</h1>
            <p className="type-micro text-stone-400">Development only · not shipped</p>
          </div>
          <div className="flex gap-1" role="group" aria-label="Preview width">
            {Object.keys(WIDTHS).map((w) => (
              <button
                key={w}
                onClick={() => setWidth(w)}
                className={`type-micro px-2 py-1 border ${width === w ? 'bg-brass-500 text-indigo-900 border-brass-300' : 'bg-indigo-800 text-indigo-300 border-indigo-600'}`}
              >
                {w === 'full' ? 'Full' : `${w}px`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main
        className="mx-auto px-4 py-6"
        style={{ maxWidth: frameWidth ? frameWidth : 1024, outline: frameWidth ? `1px dashed var(--c-indigo600)` : 'none' }}
      >
        <Section title="Palette" note="32 colours in five families. Nothing outside this list may appear in the UI.">
          {Object.entries(families).map(([family, scale]) => (
            <div key={family} className="mb-4">
              <p className="type-label text-bone mb-0.5">{family}</p>
              <p className="type-caption text-stone-400 mb-2">{FAMILY_NOTES[family]}</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-8 gap-2">
                {Object.entries(scale)
                  .sort(([a], [b]) => Number(b) - Number(a))
                  .map(([step, hex]) => {
                    const token = step === 'DEFAULT' ? family : `${family}${step}`;
                    return (
                      <div key={token}>
                        <div className="h-12 border border-indigo-600" style={{ background: hex }} />
                        <p className="type-micro text-bone mt-1">{token}</p>
                        <p className="type-micro text-stone-500">{hex}</p>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))}
        </Section>

        <Section title="Type" note="Pixel font for numbers, stats and short labels only. Cinzel for headings. Cormorant for everything you read.">
          <div className="space-y-4">
            {Object.entries(typeRoles).map(([role, t]) => (
              <div key={role} className="border-l-2 border-brass-700 pl-3">
                <p className="type-micro text-stone-500 mb-1">
                  .type-{role} · {t.family} {t.weight} {t.size}px
                </p>
                <p className={`type-${role} text-bone`}>{TYPE_SAMPLES[role]}</p>
              </div>
            ))}
          </div>
        </Section>

        <Section
          title={`Sprites (${ids.length})`}
          note="Every ID in the active manifests, at whole-number scales 1, 2 and 3 with nearest-neighbour scaling. Anything blurry is a bug."
        >
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <button
              onClick={toggleSkin}
              className={`type-label px-3 py-2 border ${skinOn ? 'bg-brass-500 text-indigo-900 border-brass-300' : 'bg-indigo-800 text-bone border-indigo-600'}`}
            >
              {skinOn ? 'Remove demo skin pack' : 'Apply demo skin pack'}
            </button>
            <span className="type-caption text-stone-400">
              Overrides <code>dev_test_gem</code> from a second manifest. No component changes.
            </span>
            {skinError && <span className="type-caption text-rust-300">{skinError}</span>}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {ids.map((id) => (
              <SpriteCard key={id} id={id} />
            ))}
          </div>
        </Section>

        <Section title="Fallbacks" note="An unknown ID shows this checkered block and logs a warning in development.">
          <div className="flex items-center gap-4">
            <Sprite id="example_missing_id" scale={2} />
            <code className="type-label text-stone-400">example_missing_id</code>
          </div>
        </Section>
      </main>
    </div>
  );
}
