---
id: 002
title: Measure what each mode would need to send
labels: [wayfinder:task]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

AFK. From the code (`src/bus`, `src/metro`, `src/flight`, the views in `src/render`), list the state another player needs to draw each vehicle believably: for the bus, position, heading, speed, indicators, lights, doors and wipers; for the Metro, position along the line and doors; for the plane, pose and gear. Size one update per mode in bytes (compact binary or JSON), and work out the data use per player per hour at 10 and 5 updates a second for a 6-player Room, against what a prepaid mobile data pack in Bangladesh gives. The answer records the state lists and the numbers.

## Findings

2026-11-02, AFK, from `src/render/BusView.ts` (`sync`, `syncLights`), `src/bus/lights.ts`, `src/render/TrainView.ts` (`sync`), `src/metro/Train.ts` and `src/render/PlaneView.ts` (`update`). Byte counts assume a compact binary message; the wire overhead is an estimate (WebSocket frame, TLS record and TCP/IP headers, about 70 bytes per message when each update goes in its own packet).

**What another player needs, per update**

| Mode | State | Binary bytes |
|---|---|---|
| All | header: message type, player slot, sequence number | 4 |
| Bus | position (3 × f32); orientation (3 × i16 yaw/pitch/roll, or a 32-bit smallest-three quaternion); velocity for extrapolation (3 × i16, cm/s); steering angle (i8); flags: headlights off/parking/low, high beam, indicator left/right, hazard, brake, reverse, doors open | 30 |
| Metro | distance along the line `s` (f32); speed (i16); doors open left and right (2 × u8) | 12 |
| Plane | position (3 × f32); orientation (3 × i16); velocity (3 × i16); throttle for the propeller (u8); pitch and roll input for the control surfaces (2 × i8); flags: landing light | 32 |

- **Derived locally, not sent:** wheel spin (from speed), suspension, indicator blink phase (from the indicator state), the Metro's car positions (from `s` on the baked line), the beam and cone.
- **Not needed:** wipers and windscreen rain (a cab-only overlay), the Metro master controller (only seen from inside), the bus dashboard.
- **Sent once on joining, not per update:** display name, livery or plane colour, mode and Region.
- **Found along the way:** time of day and weather are picked per player today (`pickConditions`), so two players in one Room would see different skies. A Room must fix them for everyone; added to [Define what a Room is and who can join](003-define-the-room.md).

**Data per player per hour, 6-player Room** (each player sends their own updates and receives the other five's)

| Format, rate | Per message on the wire | Sent + received per second | Per hour | Hours per GB |
|---|---|---|---|---|
| Binary bus, 10/s | ~100 B | 1.0 + 5.0 KB | ~22 MB | ~45 |
| Binary bus, 5/s | ~100 B | 0.5 + 2.5 KB | ~11 MB | ~90 |
| Binary bus, 5 messages/s carrying 2 samples each | ~126 B | 0.6 + 3.2 KB | ~14 MB | ~70 |
| JSON bus, 10/s | ~240 B | 2.4 + 12 KB | ~52 MB | ~19 |

The Metro's messages are smaller still (12 bytes), so per-packet overhead is nearly all of its cost. At these rates even a small prepaid data pack lasts dozens of hours of Room play, so data use is not the constraint; the free server quota is ([Research hosting Rooms on Cloudflare](001-research-cloudflare-room-server.md)).

## Resolution

A remote vehicle needs about **30 bytes** per update for the bus and plane and **12 bytes** for the Metro in a compact binary format, plus a once-per-join profile. A 6-player Room uses about **11–22 MB per player per hour** at 5–10 updates a second in binary, against about 52 MB in JSON, so the format should be binary. Time of day and weather must become Room-wide.
