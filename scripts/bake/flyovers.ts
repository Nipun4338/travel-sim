// Flyover height profiles (SPEC §4 elevated roads), shared by the Region and Flight Zone bakes.
// OSM gives flyovers a `layer`, not a height, so decks sit at a height per layer; where a deck's
// end meets a ground road it ramps down to street level at a flyover-like grade, and where it meets
// a deck at another height it eases between the two, instead of stopping in mid-air.

export type XZ = [number, number];
export interface FlyWay { id: number; nodes: number[]; tags: Record<string, string>; pts: XZ[]; }

const RAMP_GRADE = 0.06;      // Dhaka flyover ramps are about 5–6%
const DRIVABLE = /^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street)(_link)?$/;

export const pathLength = (pts: XZ[]) => pts.reduce((s, p, i) => (i ? s + Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) : 0), 0);

/** Deck height above ground for an elevated road: Elevated Expressway (layer 3+), its ramps (2), flyovers (1). */
export function deckHeight(tags: Record<string, string>): number {
  const layer = parseInt(tags.layer ?? '1', 10) || 1;
  return layer >= 3 ? 16 : layer === 2 ? 12 : 7;
}

export function isElevatedWay(w: FlyWay): boolean {
  const layer = parseInt(w.tags.layer ?? '0', 10) || 0;
  const bridge = !!w.tags.bridge && w.tags.bridge !== 'no';
  return layer >= 2 || (bridge && layer >= 1 && pathLength(w.pts) > 120);
}

/** For each elevated drivable way: its deck height above ground at distance `s` along it. */
export function flyoverProfiles(ways: FlyWay[]): Map<number, (s: number) => number> {
  const roads = ways.filter(w => DRIVABLE.test(w.tags.highway ?? ''));
  const elevated = new Set(roads.filter(isElevatedWay));
  const byEnd = new Map<number, FlyWay[]>();
  for (const w of roads) for (const n of [w.nodes[0], w.nodes[w.nodes.length - 1]]) {
    if (!byEnd.has(n)) byEnd.set(n, []);
    byEnd.get(n)!.push(w);
  }
  // What the deck should meet at an end: the ground, a neighbouring deck, or nothing (cut off).
  const endTarget = (w: FlyWay, node: number, own: number): number => {
    const others = (byEnd.get(node) ?? []).filter(o => o !== w);
    const decks = others.filter(o => elevated.has(o));
    if (decks.length) return (own + Math.max(...decks.map(o => deckHeight(o.tags)))) / 2;
    return others.length ? 0 : own;
  };
  const out = new Map<number, (s: number) => number>();
  for (const w of elevated) {
    const own = deckHeight(w.tags), len = pathLength(w.pts);
    const a = endTarget(w, w.nodes[0], own), b = endTarget(w, w.nodes[w.nodes.length - 1], own);
    // Ramp lengths from the grade, never more than 45% of the way each.
    const ra = Math.min(len * 0.45, Math.abs(own - a) / RAMP_GRADE), rb = Math.min(len * 0.45, Math.abs(own - b) / RAMP_GRADE);
    const ease = (t: number) => t * t * (3 - 2 * t);
    // The two ramps never overlap (each is at most 45% of the way).
    out.set(w.id, s => {
      if (ra > 0 && s < ra) return a + (own - a) * ease(s / ra);
      if (rb > 0 && len - s < rb) return b + (own - b) * ease((len - s) / rb);
      return own;
    });
  }
  return out;
}
