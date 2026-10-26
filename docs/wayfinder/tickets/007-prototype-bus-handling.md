---
id: 007
title: Prototype arcade-plus bus handling
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: [006]
---

## Question

What should driving the bus feel like: acceleration, braking, steering, body roll, and how it behaves on Dhaka's flat streets vs Bandarban's hairpins? Settle it by reacting to a rough drivable prototype on test terrain.

## Assets

- Prototype: [PROTOTYPE-bus-handling.html](../../../prototypes/bus-handling/PROTOTYPE-bus-handling.html). Three.js + Rapier from a CDN; three presets (Heavy, Arcade-plus, Snappy) plus live sliders; a Dhaka-style 4-lane street with 3 Stops and a Bandarban-style hairpin climb.

## Resolution

The **Arcade-plus** preset, unchanged, is the handling target: the user found it the closest of the three presets and asked for no changes.

| Parameter | Value |
|---|---|
| Engine force per rear wheel | 9,000 N (12 t bus: 0 to 35 km/h in about 10 s) |
| Top speed | 80 km/h, with force tapering linearly to it |
| Braking | 5.0 m/s² |
| Max steer | 38°, faded by speed: `max / (1 + kmh / 50)` |
| Steering speed | 80°/s; returns to centre 1.5× faster |
| Suspension | stiffness 22, compression 2.7, rebound 3.2 |
| Tyre grip (friction slip) | 1.6 |
| Centre of mass | 0.4 m below the body centre |
| Anti-roll assist | 3; angular damping 1.0 |
| Resistance | rolling 0.015·m·g, air 3.15·v² |

Other parts of the prototype the build should keep:
- Brake to a stop, then hold brake to reverse.
- When there is no input and the bus is nearly still, it holds itself with a light brake.
- Rapier `DynamicRayCastVehicleController` with forward axis +x and wheel axle +z (−z drives the bus backwards).

Not settled here:
- **Touch controls** were included but not judged; they stay in Not yet specified.
- **Comfort thresholds** in the prototype (sideways 1.5 m/s², forward/back 1.8 m/s²) are only a starting point for [Define bus scoring and passenger rules](005-define-bus-scoring-and-passengers.md).

The prototype is kept, clearly marked as throwaway, in `prototypes/bus-handling/` (the project isn't in git yet, so there is no branch).
