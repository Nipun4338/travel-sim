// Liveries (SPEC §15): colour swaps on the same bus and plane models, unlocked by career Taka at
// set thresholds. Nothing is spent. Styles echo Dhaka's city buses and rickshaw art; none copies a
// real company's branding.
import type { BusLivery } from '../render/BusView';
import type { PlaneLivery } from '../render/PlaneView';
import { readSave, updateSave } from '../core/save';

export interface Livery<T> { id: string; unlockTk: number; colours: T; }

export const BUS_LIVERIES: Array<Livery<BusLivery>> = [
  { id: 'city', unlockTk: 0, colours: { lower: 0x1f6f3f, upper: 0xc8302a, stripe: 0xf2c200, roof: 0xd9d4ca } },
  { id: 'river', unlockTk: 5000, colours: { lower: 0x1d4f91, upper: 0xf1efe8, stripe: 0x2e86c1, roof: 0xd9d4ca } },
  { id: 'sunrise', unlockTk: 15000, colours: { lower: 0xe2711d, upper: 0xf6e7c1, stripe: 0x7b1e3a, roof: 0xe8dcc0 } },
  { id: 'teal', unlockTk: 30000, colours: { lower: 0x16a085, upper: 0xf7c600, stripe: 0x2e1a47, roof: 0xd9d4ca } },
  { id: 'rickshaw', unlockTk: 60000, colours: { lower: 0x7b1e3a, upper: 0xf7c600, stripe: 0xe74c3c, roof: 0x16a085 } },
];

export const PLANE_LIVERIES: Array<Livery<PlaneLivery>> = [
  { id: 'classic', unlockTk: 0, colours: { body: 0xf4f2ec, stripe: 0x1f6f3f, accent: 0xc8302a } },
  { id: 'monsoon', unlockTk: 8000, colours: { body: 0xe9eef3, stripe: 0x1d4f91, accent: 0x2e86c1 } },
  { id: 'mangrove', unlockTk: 20000, colours: { body: 0xf1efe4, stripe: 0x2f5a28, accent: 0x7fa84a } },
  { id: 'jute', unlockTk: 40000, colours: { body: 0xf3e3b0, stripe: 0x7b4a1e, accent: 0xf7c600 } },
];

export const careerTaka = () => readSave().progress?.career.taka ?? 0;

/** The chosen Livery if it's unlocked, else the default. */
/** The chosen livery's id (or the first one if it isn't unlocked), as Rooms send it to other players. */
export function currentLiveryId(kind: 'bus' | 'plane'): string {
  const list = kind === 'bus' ? BUS_LIVERIES : PLANE_LIVERIES;
  const id = readSave().liveries?.[kind];
  return list.find(l => l.id === id && l.unlockTk <= careerTaka())?.id ?? list[0].id;
}

export function currentLivery<T>(kind: 'bus' | 'plane'): T {
  const list = (kind === 'bus' ? BUS_LIVERIES : PLANE_LIVERIES) as Array<Livery<T>>;
  const id = readSave().liveries?.[kind];
  const pick = list.find(l => l.id === id && l.unlockTk <= careerTaka());
  return (pick ?? list[0]).colours;
}

export function chooseLivery(kind: 'bus' | 'plane', id: string): void {
  updateSave(d => { d.liveries = { bus: 'city', plane: 'classic', ...d.liveries, [kind]: id }; });
}
