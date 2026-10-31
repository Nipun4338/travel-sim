---
id: 006
title: Rank the fidelity gaps and pick what each place fixes
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: [001, 005]
---

## Question

With the side-by-sides and the height sources in hand, which gaps does each place fix, in what order, and which are left as they are? The answer is a ranked list per place (Dhaka corridor, Line 6, Bandarban, Flight Zone skylines), and it decides which **Not yet specified** patches become tickets.

## Resolution

2026-10-31, grilled with the user (all recommendations accepted). The last item in each place is conditional: it ships only if the budget check leaves room.

**Shared foundation, in the first release:** real building heights (Open Buildings 2.5D filling in after OSM), spot-checked against about 5 named Dhaka towers, with implausible values dropped and Bandarban capped near 3 storeys outside the town. It fixes the Dhaka skyline, the Line 6 viaduct view and Bandarban's stray tower at once.

**Line 6**
1. Station models: the four types from [Research how the Line 6 stations really differ](003-research-line6-stations.md), including a Farmgate rebuild.
2. Viaduct view: real heights plus rooftop clutter and billboards facing the train.
3. Dhaka University–Secretariat: dense campus and park trees instead of bare ground.
4. *(conditional)* Traffic on the road under the viaduct.
Left as is: the open Diabari stretch.

**Dhaka bus corridor**
1. Skyline: towers of 15–25+ floors at Banani, Kakoli and Mohakhali, with lower and narrower side buildings.
2. Street life: stacked signboards, billboards, overhead wires, tea stalls, bus counters, footpath crowds.
3. Kuril and Khilkhet: a built-up Bishwa Road edge, and a Kuril interchange that reads.
4. *(conditional)* Weathering as a cheap palette and texture pass (dust, white tile and glass, patched road, worn markings, median rails), with no new geometry.
Also: check the baked Route length (12.58 km against 13.94 km).

**Bandarban road**
1. Route correctness: the km 2.57–3.74 reroute, moving Chimbuk about 100 m, updating the SPEC Stop km figures.
2. Remove the yellow centre line.
3. Terrain feel: ridge drops, long views across the ranges, painted parapets at the drops.
4. Roadside life: stalls at Shoilo Propat, Chimbuk's army canteen and registration point, Bawm stilt houses at the three villages, Thanchi buses and chander gari jeeps.
5. *(conditional)* Vegetation: undergrowth and jhum patches.

**Flight Zone skylines:** they inherit the real heights and nothing more for now. Whether they need district height bands or river and lake shapes waits for air shots taken after the heights land.

**Left as they are:** a closer pass on the existing vehicles, and time-of-day traffic and haze. The comparisons didn't flag them, and the new Bandarban vehicles are covered under roadside life.
