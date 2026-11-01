---
id: 003
title: Define what a Room is and who can join
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

What exactly is a Room? Decide the code format, the player cap, whether everyone must be in the same Region and mode (and the same Route or Line), whether players can join or leave mid-trip, display names (typed or generated, Bangla or English), whether a Room has a host with powers, and how long a Room survives with nobody in it. Also decide who sets the Room's time of day and weather: today each player gets their own (`pickConditions`), so they must become Room-wide ([Measure what each mode would need to send](002-measure-what-each-mode-sends.md)). The answer fixes the Room terms in `CONTEXT.md`.

## Resolution

2026-11-02, grilled with the user (all recommendations accepted):

1. **Room code:** 4 characters from an unambiguous set (letters and digits without 0/O and 1/I), like `K7QM`, plus a share link `travel-sim.pages.dev/?room=K7QM` that opens straight into the Room.
2. **Player cap:** 6.
3. **A Room fixes the Region and mode** (for example Dhaka, Bus), chosen by its creator. Each player can be on any Leg of that Route, or anywhere in that Flight Zone or on that Line, and sees whoever is near.
4. **Join and leave at any time.** A joiner picks their own Leg and starts at its first Stop; a player who leaves just disappears for the others. Nobody's Run is interrupted.
5. **Display names** come from a generated bilingual list (for example "সবুজ বাস ৭ / Green Bus 7"), with a reroll button. No free text, so nothing to moderate.
6. **The creator is the Host:** they choose the time and weather when creating the Room and can remove a player. If the Host leaves, the player who joined next becomes Host.
7. **Time and weather are Room-wide** and fixed for the Room's life: chosen by the Host, or Random picked once at creation.
8. **A Room closes 5 minutes after the last player leaves**, and its code is freed. Any cap on Room length belongs to [Choose how Rooms stay inside the free daily quota](006-stay-inside-the-free-quota.md).
