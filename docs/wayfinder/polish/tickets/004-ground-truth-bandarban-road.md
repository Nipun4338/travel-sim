---
id: 004
title: Ground-truth the Bandarban road and its Stops
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

Three of the four Bandarban Stops are hand-placed and the hill road is lightly tagged in OSM. Where are the real stopping points (Milonchhari, Shoilo Propat, Chimbuk), and what does the road really have: road width and surface, hairpins, army checkpoints, viewpoints, roadside stalls, Bawm and Marma villages, typical vehicles? Use OSM history since 2026-10-26, satellite imagery that's free to view, travel write-ups and photos. Compare with the baked route in `data/raw/bandarban` and list where the game is off.

## Research

See [docs/research/bandarban-road.md](../../../research/bandarban-road.md) (checked 2026-10-31). OSM has had no Bandarban-specific edits since 2026-10-26, so the baked data is current. Three of the four Stops match the ground. Chimbuk's Stop and hero landmark sit about 100 m and 85 m from the summit complex visible in satellite imagery (about 22.0571, 92.2724). The biggest error: between km 2.57 and 3.74 the baked Route leaves the Thanchi Road for two untagged unclassified ways, cutting 0.23 km. The real Route is about 22.8 km, not 22.59. SPEC's Stop km figures (3.2 and 6.6) are stale; the baked Route has 2.22 and 5.46. The road has no width or surface tags, and no official width was found. Imagery suggests one unmarked paved lane of about 4–6 m, in line with the baked 5.5 m. The Route has 6 hairpins, climbs to 562 m and is 14 % at its steepest. OSM has three villages along it (Laimi, Saron and Murolong Para). Write-ups describe Bawm villages and Mru further off, stalls at Shoilo Propat, an army canteen and registration point at Chimbuk, joint army/BGB/police security from Y Junction (km 16.6) to Nilgiri, and traffic of Thanchi buses, jeeps and chander gari, CNGs and motorbikes. The game's Bandarban traffic has no buses. No checkpoint, viewpoint or Marma village could be placed from sources.

## Resolution

The baked data is current and the road width (5.5 m) holds. Fixes to carry forward:
- Between km 2.57 and 3.74 the Route cuts off the Thanchi Road; reroute it, giving about 22.8 km.
- Move the Chimbuk Stop and landmark about 100 m to the summit complex (around 22.0571, 92.2724).
- Update the stale SPEC Stop km figures.
- Bandarban traffic lacks Thanchi buses.
- Stalls at Shoilo Propat, the army canteen and registration point at Chimbuk, and the Laimi, Saron and Murolong Para villages are sourced. No checkpoint or viewpoint could be placed.
