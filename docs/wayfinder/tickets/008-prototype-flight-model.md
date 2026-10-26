---
id: 008
title: Prototype arcade-plus flight model
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: [006]
---

## Question

What should flying feel like: take-off speed, stall behaviour (if any), roll and pitch response, landing assistance, and camera? Settle it by reacting to a rough flyable prototype over test terrain.

## Assets

- Prototype: [PROTOTYPE-flight-model.html](../../../prototypes/flight-model/PROTOTYPE-flight-model.html). Three.js only, using a hand-written kinematic arcade model (no physics engine). Three presets (Gentle, Arcade-plus, Sim-lite) plus live sliders. Scenes: a 3.2 km runway with a terminal, a city to the west, 3° approach rings, and hills with a river valley to the east.

## Resolution

The **Arcade-plus** preset, unchanged, is the flight target: the user found it the closest of the three presets and asked for no changes.

| Parameter | Value |
|---|---|
| Thrust | 4 m/s² at full throttle (lift-off after ~10 s of runway roll) |
| Max speed | 330 km/h, from quadratic drag |
| Stall | 100 km/h, soft: lift fades from 75% of stall speed down; nose drops and the plane sinks; STALL warning below 110% of stall speed |
| Lift-off | needs ≥ 110 km/h and > 3° nose-up; no nose-up before that |
| Rates | pitch 50°/s, roll 110°/s, rudder 20°/s; control response 5; authority scales down below stall speed |
| Wing levelling | 0.6 (rolls back toward level when the stick is centred) |
| Turning | banking turns the plane: `9.81·tan(bank)/speed`, coordination 1.0 |
| Climbs and dives | 0.6 of gravity's effect on speed |
| Landing | crash above 4 m/s sink, > 15° bank or < −6° pitch; no auto-flare; graded Butter < 1 m/s, Good < 2 m/s, else Firm; off-runway landing allowed on flat ground below 160 km/h |
| Ground | nosewheel steering 25°/s; rolling drag 0.25 m/s²; brakes 3.5 m/s² |

Other decisions from the prototype:
- **Flight is a hand-written kinematic model, not Rapier.** This refines [Choose the 3D engine and world-generation approach](006-choose-engine-and-world-generation.md): Rapier stays for Bus Mode; Flight Mode checks ground contact against the terrain height function directly.
- **Controls:** W/↑ = nose down by default (stick convention), with an invert-pitch option. Shift and Z set throttle; B is the wheel brakes.
- **Landing challenge:** approach rings on a 3° glide path; the landing grade (from sink rate, with distance off the centreline shown alongside) is the first draft of challenge scoring.

Not settled here:
- **Touch controls** (virtual stick and throttle slider) were included but not judged; they stay in Not yet specified.
- **Flight challenge** design and scoring beyond this draft stays in Not yet specified.

The prototype is kept, clearly marked as throwaway, in `prototypes/flight-model/` (the project isn't in git yet, so there is no branch).
