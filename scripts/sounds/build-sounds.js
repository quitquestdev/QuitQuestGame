/**
 * Placeholder sound effects, synthesized in code (no third-party audio):
 *   npm run sounds:placeholders
 *
 * Short 8-bit style blips written as 16-bit mono WAV files, plus
 * public/assets/sounds/manifest.json. Every entry is tagged placeholder: true
 * and listed by `npm run release:check` until real sounds replace them.
 * Volumes are kept low and nothing is longer than a second.
 */
const fs = require('fs');
const path = require('path');

const RATE = 22050;
const OUT = path.join(__dirname, '../../public/assets/sounds');

// Simple oscillators.
const square = (f, t) => (Math.sin(2 * Math.PI * f * t) >= 0 ? 1 : -1);
const triangle = (f, t) => 2 * Math.abs(2 * ((t * f) % 1) - 1) - 1;
let seed = 7;
const noise = () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return (seed / 0x7fffffff) * 2 - 1;
};

/** notes: [{ f, ms, wave, vol, slide }] played in sequence. */
function synth(notes, master = 0.35) {
  const samples = [];
  for (const n of notes) {
    const len = Math.round((n.ms / 1000) * RATE);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      const p = i / len;
      const f = n.f * (1 + (n.slide || 0) * p);
      const env = Math.min(1, i / (RATE * 0.004)) * (1 - p) ** (n.decay || 1.5);
      const w = n.wave === 'noise' ? noise() : n.wave === 'triangle' ? triangle(f, t) : n.wave === 'rest' ? 0 : square(f, t);
      samples.push(w * env * (n.vol ?? 1) * master);
    }
  }
  return samples;
}

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVE', 8);
  h.write('fmt ', 12);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

const SOUNDS = {
  hit: synth([{ f: 160, ms: 70, wave: 'noise', vol: 0.9, decay: 2 }, { f: 110, ms: 60, wave: 'square', vol: 0.5, slide: -0.5 }]),
  heal: synth([{ f: 523, ms: 70, wave: 'triangle' }, { f: 659, ms: 70, wave: 'triangle' }, { f: 784, ms: 120, wave: 'triangle' }]),
  charge: synth([{ f: 220, ms: 450, wave: 'triangle', slide: 1, decay: 0.6, vol: 0.7 }]),
  victory: synth([{ f: 523, ms: 110 }, { f: 659, ms: 110 }, { f: 784, ms: 110 }, { f: 1047, ms: 320, decay: 1 }], 0.25),
  tap: synth([{ f: 880, ms: 35, wave: 'square', vol: 0.5, decay: 3 }]),
  rest: synth([{ f: 392, ms: 160, wave: 'triangle' }, { f: 330, ms: 160, wave: 'triangle' }, { f: 262, ms: 300, wave: 'triangle', decay: 1 }], 0.25),
};

fs.mkdirSync(path.join(OUT, 'placeholder'), { recursive: true });
const manifest = { id: 'default-sounds', version: 1, baseUrl: '/assets/sounds/', sounds: {} };
for (const [id, samples] of Object.entries(SOUNDS)) {
  const rel = `placeholder/${id}.wav`;
  fs.writeFileSync(path.join(OUT, rel), wav(samples));
  manifest.sounds[id] = { path: rel, durationMs: Math.round((samples.length / RATE) * 1000), placeholder: true, source: 'code' };
}
fs.writeFileSync(path.join(OUT, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`wrote ${Object.keys(SOUNDS).length} sounds`);
