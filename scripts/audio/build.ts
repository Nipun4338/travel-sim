// Turns the Freesound previews in data/audio-src/ into the game's sounds: `npm run audio`.
// Each sound is cut (loops from a steady stretch, one-shots around the event), made mono,
// loudness-normalised and encoded as AAC .m4a into public/audio/ (SPEC §14: mono, 64–96 kbps).
// Cut points come from loudness envelopes of each recording (see docs/audio/sound-list.md).
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

interface Recipe { src: string; start?: number; dur?: number; loop?: boolean; lufs?: number; fadeOut?: number; }

const RECIPES: Record<string, Recipe> = {
  // Bus
  'bus-engine-1': { src: 'bus-engine-1', loop: true, lufs: -18 },
  'bus-engine-2': { src: 'bus-engine-2', loop: true, lufs: -18 },
  'bus-ride': { src: 'bus-ride', start: 60, dur: 20, loop: true, lufs: -22 },
  door: { src: 'door', start: 0.85, dur: 2.2, fadeOut: 0.8, lufs: -16 },
  'air-hiss': { src: 'door', start: 0.9, dur: 1.6, fadeOut: 0.9, lufs: -18 },
  'bus-horn': { src: 'bus-horn', start: 0.8, dur: 1.9, fadeOut: 0.15, lufs: -14 },
  // Traffic
  bell: { src: 'bell', start: 0, dur: 1.7, fadeOut: 0.3, lufs: -18 },
  whistle: { src: 'whistle', start: 1.25, dur: 0.9, fadeOut: 0.1, lufs: -16 },
  // Plane: the steady mid-power stretch, re-pitched with throttle in the game
  prop: { src: 'prop', start: 30, dur: 12, loop: true, lufs: -16 },
  wind: { src: 'wind', loop: true, lufs: -20 },
  squeal: { src: 'squeal', start: 0.86, dur: 0.6, fadeOut: 0.3, lufs: -16 },
  // Ambience and weather
  street: { src: 'street', start: 5, dur: 40, loop: true, lufs: -24 },
  crows: { src: 'crows', lufs: -22 },
  forest: { src: 'forest', start: 10, dur: 40, loop: true, lufs: -24 },
  river: { src: 'river', loop: true, lufs: -24 },
  crickets: { src: 'crickets', start: 30, dur: 25, loop: true, lufs: -26 },
  'rain-city': { src: 'rain-city', start: 10, dur: 30, loop: true, lufs: -22 },
  'rain-window': { src: 'rain-window', loop: true, lufs: -22 },
  wipe: { src: 'wipers', start: 1.38, dur: 1.35, fadeOut: 0.25, lufs: -20 },
  // Interface and music
  click: { src: 'click', dur: 0.5, lufs: -20 },
  jingle: { src: 'jingle', start: 0, dur: 3, fadeOut: 0.8, lufs: -18 },
  music: { src: 'music', loop: true, lufs: -22 },
};

const IN = join('data', 'audio-src'), OUT = join('public', 'audio');
mkdirSync(OUT, { recursive: true });
let total = 0;
for (const [name, r] of Object.entries(RECIPES)) {
  const src = join(IN, `${r.src}.mp3`);
  if (!existsSync(src)) { console.log(`  skip ${name}: ${src} missing`); continue; }
  const filters = ['aformat=channel_layouts=mono', `loudnorm=I=${r.lufs ?? -18}:TP=-1.5:LRA=11`];
  // Loops get a few milliseconds of fade so the seam doesn't click; one-shots fade out as set.
  if (r.loop) filters.push('afade=t=in:d=0.02');
  if (r.dur && (r.fadeOut || r.loop)) filters.push(`afade=t=out:st=${Math.max(0, r.dur - (r.fadeOut ?? 0.02))}:d=${r.fadeOut ?? 0.02}`);
  const args = ['-y', '-hide_banner', '-loglevel', 'error'];
  if (r.start) args.push('-ss', String(r.start));
  args.push('-i', src);
  if (r.dur) args.push('-t', String(r.dur));
  args.push('-af', filters.join(','), '-ar', '44100', '-c:a', 'aac', '-b:a', r.loop && (r.dur ?? 0) > 15 ? '64k' : '80k', join(OUT, `${name}.m4a`));
  execFileSync('ffmpeg', args);
  const bytes = statSync(join(OUT, `${name}.m4a`)).size;
  total += bytes;
  console.log(`  ${name.padEnd(13)} ${(bytes / 1024).toFixed(0).padStart(5)} KB`);
}
console.log(`Done: ${(total / 1e6).toFixed(2)} MB in ${OUT}`);
