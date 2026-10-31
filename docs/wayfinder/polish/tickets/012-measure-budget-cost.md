---
id: 012
title: Measure what the chosen fixes cost on the minimum phone
labels: [wayfinder:task]
status: closed
assignee: nipun4338
blocked_by: [008, 009, 010, 011]
---

## Question

AFK. With heights verified and the street life, station and ridge approaches prototyped, what do they cost against the SPEC §2 budgets (30 fps on the minimum phone, ≤ 60 MB per Region-mode)? Measure the prototypes, then say which of the conditional items (Line 6 road traffic, Dhaka weathering, Bandarban vegetation) fit.

## Findings

2026-10-31, AFK. These numbers are measured from the baked Regions in `public/regions/`; the additions are estimated from the three prototypes. Nothing ran on a Helio G99 phone.

**Download today** (the budget is ≤ 60 MB per Region-mode). On disk Line 6 is 55 MB, but more than 20 MB of that is a JSON lane graph that compresses about 2.3×.

| Region | On disk | gzip, everything | GLB not compressed in transit, JSON gzip |
|---|---|---|---|
| Dhaka (bus) | 24 MB | 10 MB | 20 MB |
| Line 6 (metro) | 55 MB | 22 MB | 43 MB |
| Bandarban (bus) | 35 MB | 13 MB | 34 MB |

**Triangles baked today** (meshopt GLB, about 4.7 bytes per triangle):

| Region | LOD 0 | LOD 1 | Busiest LOD 0 chunk |
|---|---|---|---|
| Dhaka | 2.24 M | 1.34 M | 134k |
| Line 6 | 4.29 M | 2.40 M | 134k |
| Bandarban | 6.80 M | 2.35 M | **287k** |

**What the chosen fixes add** (worst case adds the GLB growth uncompressed):

| Fix | Baked triangles | Download | On screen (LOD 0 within 350 m) |
|---|---|---|---|
| Real heights ([spot-check](008-spot-check-building-heights.md)) | about neutral. Most buildings get shorter (median 2.9 floors against the flat ~5), so fewer pass the 15 m LOD 1 cut; towers add a little | ~0 | ~0 |
| Street life, Dhaka (D on commercial stretches, C elsewhere; [ticket](009-choose-street-life-approach.md)) | prototype D adds ~24k per km of street, C ~12k. Over 13 km that's ≈ 250k | +1.2 MB, plus the atlas (~0.3 MB file, ~5 MB GPU) | about +17k triangles, plus 1 extra draw call per chunk for the atlas and 1 for the wire lines |
| Street life, Line 6 (C density, both sides, 18 km) | ≈ 220k | +1.0 MB | ≈ +10k |
| Line 6 stations ([ticket](010-shape-line6-station-models.md)) | 12 × 7.6k + 2 × 8k + Farmgate 6.6k + Uttara North ~3k ≈ 117k, against today's ~27k | +0.5 MB | one or two stations, ≈ +12k |
| Bandarban ridge ([ticket](011-ridge-feel-bandarban.md)) | deeper canopy strip: no change in triangle count. Backdrop: 36 km at 120 m is 180k, **too many**; at 240 m it is 45k and reads the same through 16 km of haze | +0.3 MB | +45k (backdrop, always drawn), and the longer fog distance doesn't load more chunks (LOD distances stay at 2.8 km) |

After the fixes, the worst-case downloads come to about **Dhaka 22 MB, Line 6 45 MB and Bandarban 35 MB**, all under 60 MB. The budget doesn't need raising. Line 6 keeps the least headroom; shipping the lane graph gzip-compressed (or trimming it for metro, which only needs it for the minimap) would win back most of it.

## Resolution

Everything chosen fits the SPEC §2 download budget with room to spare, so **the budget stays at 60 MB**. The conditional items:

1. **Traffic on the road under the viaduct (Line 6): fits.** Metro mode already downloads the lane graph (for the minimap), so it costs no download. It adds a few dozen instanced vehicles to the frame.
2. **Dhaka weathering: fits.** It's a palette and texture pass with no new geometry.
3. **Bandarban vegetation: only the jhum patches**, as ground colour (free). Undergrowth is cut: Bandarban already has the heaviest chunks (287k triangles at LOD 0), so undergrowth would only be considered as a High-tier extra.

Rules for the build:
- Make the Bandarban backdrop at **240 m** spacing (about 45k triangles), not 120 m.
- Keep the street-life atlas to one 1024² texture per Region.

The frame-rate check on a real Helio G99 / Snapdragon 680 phone is still owed. It belongs in the build of each release; the v1 map already left it open in [Prototype hill fog, rain and night lighting](../../tickets/024-prototype-fog-and-rain.md).
