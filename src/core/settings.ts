// Player settings (SPEC §13), remembered on the device. Language lives in i18n. M9 moves these
// into the IndexedDB save with the export code; until then, localStorage.

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  quality: QualitySetting;
  invertPitch: boolean;
  /** Scored mode: Taka, Fines, stars and failing. Off by default: it's a relaxing game. */
  scored: boolean;
}

const KEY = 'travel-sim.settings';
const DEFAULTS: Settings = { quality: 'auto', invertPitch: false, scored: false };

export function loadSettings(): Settings {
  try { return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }; } catch { return { ...DEFAULTS }; }
}

export function saveSettings(s: Settings): void {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* storage blocked */ }
}

/** Auto picks Low on touch phones and Medium elsewhere (SPEC §2 targets). */
export function effectiveQuality(q: QualitySetting): 'low' | 'medium' | 'high' {
  if (q !== 'auto') return q;
  const phone = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(screen.width, screen.height) < 600;
  return phone ? 'low' : 'medium';
}
