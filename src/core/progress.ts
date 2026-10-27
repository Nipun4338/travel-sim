// Progress and career stats (SPEC §15): which Legs and Challenges are done, best results, and the
// career totals shown on the mode select. Device-only; M9 moves this into IndexedDB with an
// export/import save code. Everything is playable from the start except the unlock order.

export interface BestRun { done: boolean; stars?: number; taka?: number; }
export interface BestChallenge extends BestRun { grade?: 'butter' | 'good' | 'firm'; }

export interface Career {
  km: number;
  passengers: number;
  stops: number;
  flightsLanded: number;
  bestLandingSink?: number;
  taka: number;
}

export interface Progress {
  legs: Record<string, BestRun>;            // "<region>:<leg n | full>"
  challenges: Record<string, BestChallenge>;
  career: Career;
}

const KEY = 'travel-sim.progress';
const LANDMARKS_KEY = 'travel-sim.landmarks';

export function loadProgress(): Progress {
  let p: Progress;
  try { p = JSON.parse(localStorage.getItem(KEY) ?? 'null'); } catch { p = null as unknown as Progress; }
  p ??= { legs: {}, challenges: {}, career: { km: 0, passengers: 0, stops: 0, flightsLanded: 0, taka: 0 } };
  // Challenges finished before progress existed (M6 kept a plain list).
  try {
    for (const id of JSON.parse(localStorage.getItem('travel-sim.flight.done') ?? '[]') as string[]) p.challenges[id] ??= { done: true };
  } catch { /* ignore */ }
  return p;
}

function save(p: Progress): void {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage blocked */ }
}

export const legKey = (region: string, leg: number | 'full') => `${region}:${leg}`;

/** Leg n (1-based) unlocks once Leg n−1 is done; the Full Route once every Leg is. */
export function legUnlocked(p: Progress, region: string, leg: number | 'full', legCount: number): boolean {
  if (leg === 'full') return Array.from({ length: legCount }, (_, i) => p.legs[legKey(region, i + 1)]?.done).every(Boolean);
  return leg === 1 || !!p.legs[legKey(region, leg - 1)]?.done;
}

export function challengeUnlocked(p: Progress, ids: string[], index: number): boolean {
  return index === 0 || !!p.challenges[ids[index - 1]]?.done;
}

function better<T extends BestRun>(old: T | undefined, now: T): T {
  if (!old) return now;
  return {
    ...old, ...now, done: old.done || now.done,
    stars: Math.max(old.stars ?? 0, now.stars ?? 0) || undefined,
    taka: Math.max(old.taka ?? 0, now.taka ?? 0) || undefined,
  };
}

export function recordLeg(region: string, leg: number | 'full', run: BestRun & { km: number; passengers: number; stops: number }): void {
  const p = loadProgress();
  p.legs[legKey(region, leg)] = better(p.legs[legKey(region, leg)], { done: run.done, stars: run.stars, taka: run.taka });
  p.career.km += run.km;
  p.career.passengers += run.passengers;
  p.career.stops += run.stops;
  p.career.taka += run.taka ?? 0;
  save(p);
}

export function recordChallenge(id: string, r: BestChallenge): void {
  const p = loadProgress();
  const old = p.challenges[id];
  const order = ['firm', 'good', 'butter'];
  const grade = !old?.grade || (r.grade && order.indexOf(r.grade) > order.indexOf(old.grade)) ? r.grade ?? old?.grade : old.grade;
  p.challenges[id] = { ...better(old, r), grade };
  p.career.taka += r.taka ?? 0;
  save(p);
}

export function recordLanding(sinkMs: number): void {
  const p = loadProgress();
  p.career.flightsLanded++;
  if (p.career.bestLandingSink === undefined || sinkMs < p.career.bestLandingSink) p.career.bestLandingSink = sinkMs;
  save(p);
}

export function landmarksFound(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(LANDMARKS_KEY) ?? '[]')); } catch { return new Set(); }
}

export function saveLandmarks(s: Set<string>): void {
  try { localStorage.setItem(LANDMARKS_KEY, JSON.stringify([...s])); } catch { /* storage blocked */ }
}
