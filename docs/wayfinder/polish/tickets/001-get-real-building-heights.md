---
id: 001
title: Find how to get real building heights for the play corridors
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

The bake gives most buildings a default height from OSM tags only, so the skyline is wrong. Which free sources give real heights along the Dhaka corridor (Farmgate → Airport), Line 6 (Uttara North → Motijheel) and Bandarban town? Check Google Open Buildings 2.5D Temporal (access without an Earth Engine account?, coverage, accuracy, licence and credit), and any alternatives (Microsoft/Overture building heights, GHSL, OSM `building:levels` growth since 2026-10-26). For each: how to download just our boxes, how heights join to OSM footprints, and the expected error.

## Research

Findings: [docs/research/building-heights.md](../../../research/building-heights.md) (checked 2026-10-31). Google Open Buildings 2.5D Temporal (2023, 4 m effective, 0–100 m) covers all three play areas. It needs no Earth Engine account: the public bucket `open-buildings-temporal-data` serves Cloud Optimized GeoTIFFs. Two 12.5 km tiles cover Dhaka and Line 6, and three cover Bandarban. A range read of their exact-4 m overview fetches about 15 MB for the bus corridor and 25 MB for Line 6, against 1.7 GB for a whole tile. Sample blocks give plausible heights: Farmgate median 12 m (p99 47 m), Banani median 13 m (p99 55 m), Bandarban median 5 m. The bake's flat 5-floor default is wrong both ways. Join by taking the median or p75 of presence-masked pixels inside each OSM footprint, after OSM `height`/`building:levels`. The only published accuracy is 1.5 m MAE in the Global North; no Bangladesh figure exists. Licence: CC BY 4.0 or ODbL, crediting Sentinel/ESA and Sirko et al. 2023. The alternatives add nothing. OSM tags have not grown since 2026-10-26 (12.5% levels in the corridor, 6.7% on Line 6, 0 of 900 in Bandarban). Microsoft has no Bangladesh heights (all `-1`), Overture's Bangladesh heights are OSM's (inferred), and GHSL is 100 m only.

## Resolution

Use Google Open Buildings 2.5D Temporal (2023 layer), range-read from the public bucket with no account: about 15 MB for the bus corridor and 25 MB for Line 6. Keep OSM `height` and `building:levels` first, and fill the rest from the median or p75 of footprint pixels. Credit it under CC BY 4.0. The alternatives add nothing. Accuracy in Bangladesh is unmeasured, so ticket 005's side-by-sides should spot-check it.
