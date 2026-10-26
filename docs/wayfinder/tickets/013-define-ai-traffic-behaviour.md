---
id: 013
title: Define AI traffic behaviour on the baked lane graph
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

How do AI vehicles behave on the lane graph that the bake script produces ([Choose the 3D engine and world-generation approach](006-choose-engine-and-world-generation.md))? Cover: which vehicle types appear, and how many per km on the Dhaka Route and on the Bandarban road; how they follow lanes, overtake, stop at bus stops and junctions, and yield (or don't) to the player; how they react to a collision; and how traffic density scales across the quality tiers on phones.

## Resolution

1. **Dhaka vehicle mix:** buses, CNGs, cars, motorbikes and trucks on the main roads. Cycle rickshaws appear only crossing at junctions and in the kerb lane near Farmgate. This rests on the understanding that rickshaws are banned from most of the corridor; it was not researched.
2. **Density:** only vehicles within ~400 m of the bus are simulated, capped by quality tier: Low 25, Medium 45, High 80. Dhaka runs dense. Bandarban gets ~1 vehicle per km.
3. **Driving behaviour:** vehicles follow lanes on the baked lane graph and keep a gap to the vehicle ahead. They change lanes to pass slower vehicles. A per-type "Dhaka aggression" setting covers CNGs weaving into gaps, buses cutting in to Stops and horn use; it is higher for CNGs and buses than for cars.
4. **Junctions:** the main junctions (Farmgate, Bijoy Sarani, Jahangir Gate, Mohakhali, Kakoli, Kuril, Khilkhet) cycle through timed phases with a traffic police figure. Driving through on a stop phase is a **Fine**. This extends the Fine list in [Define bus scoring and passenger rules](005-define-bus-scoring-and-passengers.md).
5. **Yielding:** AI never rear-ends the player. Otherwise it does not give way: the player must find gaps, and AI buses compete for Stop zones.
6. **Collisions:** AI vehicles are kinematic (lane-driven, not physics bodies). When hit, a vehicle stops, sounds its horn for ~5 s, then resumes. The Fine follows the scoring rules, based on the bus's impact speed.
7. **Pedestrians:** none on the road in v1; waiting passengers at Stops are visual only. Pedestrians in traffic are ruled out of scope.
8. **Bandarban:** occasional oncoming chander gari jeeps and trucks (~1 per km). They take up the middle of the road on hairpins, so the player must slow and squeeze past.
