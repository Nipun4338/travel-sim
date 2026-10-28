// Player settings (SPEC §13), kept in the save (IndexedDB, with the export code). Language lives in
// i18n, as it's needed before the save loads.
import { readSave, updateSave } from './save';

export type QualitySetting = 'auto' | 'low' | 'medium' | 'high';

export interface Settings {
  quality: QualitySetting;
  invertPitch: boolean;
  /** Scored mode: Taka, Fines, stars and failing. Off by default: it's a relaxing game. */
  scored: boolean;
  /** Volume levels 0..1 (SPEC §14). */
  volMaster: number;
  volMusic: number;
  volSfx: number;
  volVoice: number;
  /** Touch steering for the bus, and touch flying for the plane. */
  touchSteer: 'wheel' | 'tilt' | 'buttons';
  touchFlight: 'stick' | 'tilt';
}

const DEFAULTS: Settings = { quality: 'auto', invertPitch: false, scored: false, volMaster: 0.8, volMusic: 0.5, volSfx: 0.9, volVoice: 1, touchSteer: 'wheel', touchFlight: 'stick' };

export function loadSettings(): Settings { return { ...DEFAULTS, ...readSave().settings }; }

export function saveSettings(s: Settings): void { updateSave(d => { d.settings = { ...s }; }); }

/** Auto picks Low on touch phones and Medium elsewhere (SPEC §2 targets). */
export function effectiveQuality(q: QualitySetting): 'low' | 'medium' | 'high' {
  if (q !== 'auto') return q;
  const phone = (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(screen.width, screen.height) < 600;
  return phone ? 'low' : 'medium';
}
