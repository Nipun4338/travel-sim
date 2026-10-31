---
id: 008
title: Spot-check the Open Buildings heights against known towers
labels: [wayfinder:task]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

AFK. Before the real heights become the shared foundation, are they trustworthy in Bangladesh? Range-read the Open Buildings 2.5D tiles for the corridor (see [Find how to get real building heights](001-get-real-building-heights.md)), compare about 5 named Dhaka towers on the Banani–Mohakhali stretch with their known floor counts, and check Bandarban outside the town. The answer records the error seen, the median-or-p75 choice, and the plausibility rules (an outlier cutoff, the ~3-storey Bandarban cap) the bake should apply.

## Findings

2026-10-31, AFK. Instead of guessing floor counts for 5 towers, the check used every building in the Line 6 bake (`data/raw/line6/buildings.json`, which also covers the bus corridor) that has an OSM `height` or `building:levels` tag: 17,091 buildings, 12,462 of them with at least one built Google pixel inside. The 4 m overview of the two 2023 Dhaka tiles and the Bandarban town tile was range-read anonymously, about 30 s in all, with a throwaway script in the session scratchpad (not kept). Errors are in floors of 3.2 m, with OSM taken as truth. OSM has its own mistakes, so the numbers are a little pessimistic.

| Heights from | Mean error, all | 1–3 fl | 4–10 fl | 11+ fl |
|---|---|---|---|---|
| Today's bake default (flat ~5 fl) | 2.6 fl | 3.4 (too tall) | 1.1 | 10.4 (too short) |
| Google, **p75** of footprint pixels | **1.6 fl** | 1.0 | 2.1 (1.7 too low) | 4.0 (2.1 too low) |
| Google, median | 1.6 fl | 1.0 | 2.3 | 4.3 |
| Google p75 × 1.3 | 1.7 fl | 1.5 | 1.8 | 4.9 |

- Overall, 45% of buildings land within ±1 floor and 70% within ±2 (r = 0.70). Google runs about 30% low on 4–10 storey buildings. Scaling it up fixes mid-rise but breaks low-rise and towers, so no scaling.
- **Named towers** (OSM floors → Google p75): Sena Kalyan Bhaban 28 → 27, Grameen Bank Tower 23 → 26, Ahmed Tower 26 → 22, Trade Intercontinental 32 → 25, City Center 37 → 27. City Center hits the dataset's 100 m clip (about 31 floors). Some misses are OSM errors or lag: one tag claims 81 floors, and a few 25–34 floor tags read about 7 floors, which looks like buildings finished after the 2023 imagery.
- **No pixel inside** (26% of buildings, median footprint 46 m²): the tagged ones are mostly sheds (median 1.3 floors). Treating them as 1 floor (mean error 0.8) beats the nearest pixel (0.9) and is far better than the 5-floor default.
- Untagged Dhaka buildings come out at a median of 2.9 floors, p90 5.9, p99 11, max 29.5. That's a believable skyline.
- **Bandarban:** only 21 of the 89 baked buildings have a built pixel, at 3–6 m except three (10, 12 and 19 m). The other 49 lie outside the town tile, so the bake needs the two other tiles under `30ad4_2023_06_30/`.

## Resolution

Google Open Buildings is good enough to be the shared foundation. It halves the error of today's flat default and puts real towers in place. Rules for the bake:

1. OSM `height` → OSM `building:levels` (ignore any tag above 45 floors) → Google **p75** of the built pixels (presence > 0.5) whose centres fall inside the footprint, unscaled → **1 floor** when no pixel falls inside and the footprint is under 100 m² → the per-type default otherwise.
2. No calibration factor. Mid-rise reads about 1.7 floors low; accept that.
3. The 100 m clip stays. The few taller towers are on the hero-landmark list or have OSM tags.
4. Bandarban: read all three tiles, and cap anything more than about 2 km from the town centre at 10 m (about 3 storeys).
