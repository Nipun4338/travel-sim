---
id: 011
title: Choose how the Bandarban road gets its ridge drops and long views
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

The Bandarban road reads as gentle slopes, but the real one runs along ridges with steep drops and views across ranges (see [Rank the fidelity gaps](006-rank-fidelity-gaps.md)). Should the road edges be carved or exaggerated in the terrain bake, should the DEM be resampled sharper, should a distant range be added as a skybox or a low-poly backdrop, and where do the painted parapets go? Prototype one stretch and judge it with the user.

## Prototype

[prototypes/bandarban-ridge/PROTOTYPE-bandarban-ridge.html](../../../../prototypes/bandarban-ridge/PROTOTYPE-bandarban-ridge.html) puts 6.7 km of the baked Route (Y Junction to Chimbuk, with its graded heights) on GLO-30 terrain. `prep.mjs` crops it into `data.json`: 5 km at 10 m near the road, and 36 km at 120 m from the Flight Zone DEM for the backdrop. There are five variants (A today, B long views, C steep valley edges and parapets, D deeper canopy strip, E 1.3× relief) and three cameras. Run `python -m http.server 5173 --directory prototypes` and open `/bandarban-ridge/PROTOTYPE-bandarban-ridge.html?variant=D`.

**Why it looks gentle today:** GLO-30 is a surface model, so the forest canopy is in it. With the bake's filter (a min over ±30 m, then a blur), the ground 40 m beside the road is a median 11 m below it. The cut-and-fill blend over 30 m then rounds that drop into a green bank. Before any filtering, the ground beside the road sits *above* the road (median +4.9 m): the road runs through a trench of treetops. A min over ±60 m drops the ground 40 m out to a median 27 m below the road, which reads as a ridge road.

## Resolution

2026-10-31, judged with the user (all recommendations accepted). For the Bandarban Region-mode:

1. **Long views:** clear-day visibility goes to about 16 km (from 1.5 km), plus a distant backdrop mesh from the Bandarban Flight Zone DEM (about 120 m spacing, 36 km across), sunk below the near terrain.
2. **Valley-side edges:** where the ground is below the road, it falls away steeply (about 2.2 : 1) from the shoulder to the real slope, instead of the 30 m blend. The uphill cut side keeps a bank, blended over about 18 m.
3. **Deeper canopy strip:** the ground filter takes the min over about ±60 m (two GLO-30 pixels) instead of ±30 m, so the road sits on its ridges.
4. **Parapets** (black-and-white painted roadside walls) go only where the ground falls at least **8 m within 12 m** of the road edge, so they come in stretches rather than lining the whole road.
5. **No relief exaggeration.** It breaks "exact", and the deeper strip already gives the layered views.

The costs (the far mesh and the longer draw distance) go to [Measure what the chosen fixes cost on the minimum phone](012-measure-budget-cost.md).
