---
id: 015
title: Revise the Chimbuk Stop and landmark list after verification
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

[Find CC landmark models and verify landmark locations](014-find-landmark-models-and-locations.md) (details in `docs/research/landmarks.md`) found problems with [Adjust Region bounds after OSM measurement](012-adjust-region-bounds.md) and [Pick landmarks for each Route and Flight Zone](010-pick-landmarks.md). How do we settle each one?

1. **Chimbuk Stop:** the Wikidata "Chimbuk hill" point at the end of the 2.2 km spur is ~320 m *below* the Thanchi Road junction (SRTM). The high ground and the "Chimbuk Tourist Centre" point (22.0569, 92.2711, ~558 m) sit beside the main road, 462 m from the current Route. Should the Route drop the spur and end at the Tourist Centre?
2. **Airport Terminal 3** is under construction (70 m from the Route); the main terminal is 355 m away, outside the corridor. Which one is the hero?
3. **Dhaka–Ashulia Elevated Expressway** (under construction) runs 54–85 m from the Route near the airport. Include it, and as built or under construction?
4. **Naming:** "Bangabandhu Novotheatre" is "Novo Theatre" in OSM and Wikidata. Several Bandarban landmarks (Nilgiri resort, Milonchhari viewpoint, Meghla hanging bridge, Chimbuk rest house and tower) aren't named in OSM. Use which names, and place them how?
5. **Sourcing:** CC-first yields almost nothing. Confirm hand-modelling all 7 hero landmarks and most simple ones, and who does it.

## Resolution

These amend [Adjust Region bounds after OSM measurement](012-adjust-region-bounds.md), [Define bus scoring and passenger rules](005-define-bus-scoring-and-passengers.md) and [Pick landmarks for each Route and Flight Zone](010-pick-landmarks.md). Where they differ, this ticket wins.

1. **Chimbuk Stop:** the Bandarban Route no longer takes the 2.2 km spur. It ends at the **Chimbuk Tourist Centre** (22.0569, 92.2711, ~558 m by SRTM), beside the Thanchi Road ~630 m past the spur junction. The Route becomes ~23.7 km (was 25.3) and Bandarban Leg 2 (Shoilo Propat → Chimbuk) becomes ~17 km. The bake checks the summit height against Copernicus GLO-30.
2. **Airport terminal:** **Terminal 3** is the hero landmark (70 m from the Route; under construction in OSM). The **main terminal** is added as a simple landmark in the Dhaka Flight Zone. Totals: 7 hero, 18 simple.
3. **Dhaka–Ashulia Elevated Expressway:** baked from OSM construction ways as pillars and partial deck, showing the corridor as it is today.
4. **Names and placement:** landmarks use local names: Novo Theatre (as in OSM, replacing "Bangabandhu Novotheatre"), Nilgiri, Milonchhari, Meghla, Chimbuk. Landmarks not named in OSM are hand-placed at the coordinates in `docs/research/landmarks.md`.
5. **Sourcing:** the agent builds landmarks as scripted low-poly models from photo references, for the user to review. Generic CC models are used where they fit: the Meghla hanging bridge, Sangu boats and the Shoilo Propat waterfall. The user touches up the 7 hero landmarks in Blender only if they need it.
