---
title: Polish — make the current places exact
labels: [wayfinder:map]
---

## Destination

A build-ready polish spec that makes the places already in the game faithful to the real ones: the Dhaka bus corridor (Farmgate → Airport), the Bandarban road (town → Chimbuk) and MRT Line 6, plus skyline and landmarks only for the two Flight Zones. One section per place, each shippable as its own release (for example v1.3 Dhaka corridor, v1.4 Line 6, v1.5 Bandarban), with nothing left to decide before building.

## Notes

- Domain: the glossary is `/CONTEXT.md` (Region, Route, Stop, Leg, Run, Flight Zone, Helper…); the v1 decisions are in `/SPEC.md` and the [v1 map](../map.md).
- Skills each session: `grilling` and `domain-modeling`; `prototype` when a look has to be judged; `research` for AFK fact-finding.
- "Exact" means proportions, placement, colour and density, **not** photorealism. Priority order (user, 2026-10-31): building heights and skyline, landmarks, street life; then shape, vehicles, sound, time-and-place feel.
- References: the user's own photos and rides, plus free street-level imagery (Mapillary / KartaView). Fixes to OSM data stay as local overrides in the bake.
- Budgets from SPEC §2 hold: 30 fps on the minimum phone, ≤ 60 MB per Region-mode, flat-shaded low-poly style.
- Planning only, with one override: the Helper and Line 6 voice recordings are carried into this map as a task (user's choice), because they're the largest missing piece of feel.
- Audit at charting (2026-10-31): building heights are OSM-only (`scripts/bake/build.ts`, Google 2.5D never added; ~12% of Dhaka buildings have a real height); 22 scripted low-poly landmarks; Farmgate is the only modelled Line 6 station; no voice recordings yet; 3 of 4 Bandarban Stops are hand-placed.

## Decisions so far

<!-- one line per closed ticket: [title](link): gist -->

- [Find how to get real building heights for the play corridors](tickets/001-get-real-building-heights.md): Google Open Buildings 2.5D (2023), range-read with no account (~15 MB corridor, ~25 MB Line 6), filling in after OSM tags; CC BY 4.0; Bangladesh accuracy unproven.
- [Check street-level imagery coverage for the three places](tickets/002-check-street-level-imagery.md): no current free coverage (KartaView 2019 central Dhaka only; Street View banned by its terms), so the user's own photos are the main reference.
- [Research how the Line 6 stations really differ](tickets/003-research-line6-stations.md): four station types (standard, arched, Uttara North, Farmgate); side platforms, ~180 m, shared terracotta-and-grey-roof look; current roof and Farmgate model are off.
- [Ground-truth the Bandarban road and its Stops](tickets/004-ground-truth-bandarban-road.md): the Route takes a 1 km shortcut off the Thanchi Road and Chimbuk sits ~100 m off the summit; the road width holds; Thanchi buses are missing from traffic.
- [Capture in-game vs real side-by-side comparisons](tickets/005-capture-side-by-side-comparisons.md): 30 cab shots with notes (agent-judged, user-delegated); the headline gaps are generic Line 6 stations, a flat uniform Dhaka skyline with no street life, and Bandarban's wrong centre line and missing ridge views.

## Not yet specified

- **Street life approach**: how to make shop signs, billboards, rickshaw art, tea stalls and Stop crowds read as Dhaka (procedural, CC assets or hand-made, and how dense). Hangs on which gaps the ranking picks.
- **Landmark additions and upgrades**: which places on the corridor and Line 6 deserve a model (or an upgrade from simple to hero), and which existing ones are wrong in shape or position.
- **Vehicle accuracy**: whether the bus, CNG, rickshaw and Line 6 train need a closer pass, and against what reference.
- **Flight Zone skyline**: what "exact from the air" needs once corridor heights are settled (district height bands, river and lake shapes).
- **Time-and-place feel**: traffic density by time of day, haze, colour palette per place.
- **Budget check**: what real heights and extra props cost on the minimum phone, measured once the fixes are chosen.
- **Release plan**: the order of the per-place releases and what goes in each.

## Out of scope

- New places (Chattogram, Sylhet, Cox's Bazar, the Sundarbans and others): the next map, once this one is done.
- Editing OpenStreetMap upstream: it publishes changes, so it's the user's separate choice; the bake uses local overrides.
- Photorealism, or exceeding the SPEC §2 budgets.
- Full detail across the whole 30 km / 40 km Flight Zones: it doesn't fit the per-Region-mode budget.
