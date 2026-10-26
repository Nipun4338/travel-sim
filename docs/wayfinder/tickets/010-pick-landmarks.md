---
id: 010
title: Pick landmarks for each Route and Flight Zone
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Which real landmarks get hand-modelled low-poly models along the Dhaka Route, the Bandarban Route and in each Flight Zone (bounds in [Lock Region bounds](004-lock-region-bounds.md)), how many in total, and at what level of detail? Candidates include the Elevated Expressway, the airport terminal, Banani's skyline, Shoilo Propat falls, Chimbuk hill and Nilgiri resort.

## Resolution

Landmark names and locations come from general knowledge. [Find CC landmark models and verify landmark locations](014-find-landmark-models-and-locations.md) will check them.

**Detail levels:** a **hero** landmark is custom-modelled, recognisable at a glance, ≤ 8k triangles. A **simple** landmark is a low-poly block-out with the right silhouette and colour, ≤ 1.5k triangles. Landmarks share a budget of ≤ 5 MB per Region; everything else comes from the OSM bake. The total is 7 hero and 17 simple. The question round said "about 6 hero", but its own per-area lists add up to 7; the lists are what was agreed.

| Where | Hero | Simple |
|---|---|---|
| Dhaka Route | Farmgate metro station and elevated track; Kuril flyover interchange; Airport Terminal 3 | Jahangir Gate; Mohakhali flyover; Bangabandhu Novotheatre (near Bijoy Sarani); Banani/Kakoli skyline (a few hand-placed towers) |
| Dhaka Flight Zone | Jatiyo Sangsad Bhaban | Ahsan Manzil; Shaheed Minar; Hatirjheel lake and bridges; Bashundhara City; Baitul Mukarram; Lalbagh Fort; Sadarghat launches |
| Bandarban Route | Chimbuk summit (rest house and tower); Shoilo Propat falls and roadside stalls | Milonchhari viewpoint; Bandarban Bus Stand |
| Bandarban Flight Zone | Buddha Dhatu Jadi (golden temple) | Nilgiri hilltop resort; Nilachal; Meghla hanging bridge; Sangu river boats |

**Elevated roads:** the Elevated Expressway, the metro track and the flyovers are baked from OSM bridge ways as decks on pillars, not hand-modelled. Only the Kuril loops get hand tuning. This adds a requirement to the bake script in [Choose the 3D engine and world-generation approach](006-choose-engine-and-world-generation.md).

**Sourcing:** look for existing free CC-licensed models first. Model in Blender only where nothing suitable exists.
