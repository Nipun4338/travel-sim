---
id: 004
title: Prototype how other players' vehicles move
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: [002]
---

## Question

With updates arriving 5–10 times a second over a mobile connection (simulated delay, jitter and loss), how should another player's bus or plane be smoothed so it looks natural: interpolation delay, extrapolation when packets are late, snapping after a long gap? Prototype two players on one screen with adjustable network conditions and judge it with the user. The answer fixes the update rate and the smoothing rules.

## Prototype

[prototypes/remote-vehicles/PROTOTYPE-remote-vehicles.html](../../../../prototypes/remote-vehicles/PROTOTYPE-remote-vehicles.html) (double-click; no server). A friend's bus drives a loop with a stop, a hard brake and tight corners, and a simulated network (rate, delay, jitter, loss, with presets from Home Wi-Fi to Bad signal) feeds four smoothing methods. The logic is a portable `RemoteVehicle` class in its own script block. Two simulated minutes per case, visible jumps per minute:

| Method | Good 4G 5/s | Good 4G 10/s | Patchy 3G 10/s | Bad signal 10/s |
|---|---|---|---|---|
| Jump to each update | 194 | 380 | 291 | 186 |
| Guess ahead from speed (dead reckoning, corrections eased) | 1 | 0 | 3 | 9 |
| Play ~0.2 s behind and blend | 13 | 9 | 119 | 161 |
| Blend, guess ahead when updates stop | 11 | 4 | 13 | 22 |

Dead reckoning also stayed closest to the real position (0.7–1.5 m average against 1.5–3.6 m for blending). Its weak spot: a short overshoot of a few metres after a hard brake.

## Resolution

2026-11-02, with the user (recommendations accepted, plus a realism rule):

1. **Smoothing:** dead reckoning from the last position, heading and speed, with corrections eased in (a quarter of the gap per frame), and a snap only after a gap of more than 30 m. This is the prototype's `RemoteVehicle` with `method: 'extrapolate'`.
2. **Update rate: 5 a second.** It looks nearly as good as 10 and halves the server use, to about 18 Room-hours a day on the free plan.
3. **Realism (user):** other players' vehicles must look as real as your own: the full bus model with its livery, wing mirrors on their arms, windscreen and windows, the amber next-Stop board, working headlights, indicators, brake and reversing lights, doors opening, wheels steering and spinning; the full Metro set with its doors; the full plane with propeller and control surfaces. No simplified ghosts. Your own cab mirrors reflect other players' buses like anything else in the scene. The measured update ([Measure what each mode would need to send](002-measure-what-each-mode-sends.md)) already carries the steering, lights and doors this needs. Mirror reflections are rendered only for your own cab, as today; on other buses the mirrors are drawn but don't render a reflection, which would cost a render pass per bus.
