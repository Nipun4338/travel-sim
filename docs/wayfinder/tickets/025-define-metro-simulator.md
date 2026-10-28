---
id: 025
title: Define the Dhaka Metro Rail simulator (M13)
labels: [wayfinder:decision]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

The user asked (2026-10-27) for a third mode: drive MRT Line 6 trains as realistically as possible. How much of the line, how realistic the driving, and how detailed the stations?

## Research

[docs/research/metro-line-6.md](../../research/metro-line-6.md): what OSM has for the line (alignment, stations, platforms), and the public facts on the trains, timetable and stations.

## Resolution

Decided with the user on 2026-10-28:

1. **Scope: the whole line.** All 16 open stations, Uttara North → Motijheel (~20 km), in both directions, split into Legs like the bus Routes. It needs its own baked Region along the viaduct.
2. **Driving: manual with ATP.** The player drives with the master controller (power notches, coast, service brake steps, emergency brake). Cab signalling shows the permitted and target speeds; ATP warns on overspeed and applies a penalty brake if the player doesn't slow, and never lets the train pass the end of its movement authority. The player stops at the platform stop mark, works the doors and departs on the dispatch signal. (The real line runs ATO; that stays out of scope.)
3. **Stations: full platforms.** Elevated stations with platform screen doors, roofs, Bangla and English name boards, waiting passengers who board and alight, and Bangla announcements.
