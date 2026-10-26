---
id: 012
title: Adjust Region bounds after OSM measurement
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

[Measure OSM coverage for the Bandarban road and Dhaka airport](009-measure-bandarban-and-airport-osm-coverage.md) found gaps in [Lock Region bounds](004-lock-region-bounds.md) (details in `docs/research/route-and-airport-coverage.md`). How do we settle each one?

1. **Dhaka Route length:** it is ~14 km, not ~12, and runs under the Elevated Expressway only north of Banani. Accept it, or trim it?
2. **Dhaka Flight Zone:** centred on Tejgaon, the runway 14 approach (from the NW) starts outside the zone. Should the zone centre move north?
3. **Bandarban Flight Zone:** where is its centre? A 40 km zone covering town to Nilgiri must be centred near 22.05 N, which puts the town spawn ~4 km from the north edge.
4. **"Banani (Chairman Bari)":** OSM has Chairman Bari and Banani stops ~700 m apart. Which one is the Stop?
5. **Bandarban Stops:** "bus terminal", Milonchhari and Chimbuk are not stop features in OSM, and Chimbuk sits ~2.2 km up a spur off the main road. Where exactly is each Stop placed, and does the Route drive up the Chimbuk spur?

## Resolution

These amend [Lock Region bounds](004-lock-region-bounds.md); where they differ, this ticket wins.

1. **Dhaka Route:** accept ~14 km (13.5–14.8 km measured). The bus stays on the arterials, with no detours into the Mohakhali terminal or Banani Road No 2. Path: Old Airport Road and Bijoy Sarani, Bir Uttam Ziaur Rahman Road to Mohakhali, then New Airport Road, under the Elevated Expressway north of Banani. The ending stays at the Airport.
2. **Dhaka Flight Zone:** unchanged at 30 x 30 km, centred on Tejgaon (23.7628, 90.3913). The spawn stays on runway 14 (threshold 23.8550, 90.3885), taking off to the SE. The landing challenge uses **runway 32**, approaching from the SE over the city, inside the zone.
3. **Bandarban Flight Zone:** 40 x 40 km, centred at **22.054, 92.273**. Spawn at ~600 m over the town, heading south.
4. **Dhaka Stop rename:** "Banani (Chairman Bari)" becomes **Chairman Bari** (OSM node 12073083676, 23.7879, 90.4001).
5. **Bandarban Stops**, hand-placed:
   - **Bandarban Bus Stand** (Thanchi Road stands, ~22.1837, 92.2178), at 0 km
   - **Milonchhari** (roadside by the guest house, ~22.1686, 92.2228), at 3.2 km
   - **Shoilo Propat** (roadside by the waterfall, ~22.1507, 92.2169), at 6.6 km
   - **Chimbuk** (the Route drives the 2.2 km side road to the summit, 22.0576, 92.2549, a Wikidata point not in OSM), at 25.3 km
