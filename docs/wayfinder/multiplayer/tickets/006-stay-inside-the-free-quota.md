---
id: 006
title: Choose how Rooms stay inside the free daily quota
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: [002, 004]
---

## Question

The free plan gives about 9 Room-hours a day at 10 updates a second, or 18 at 5, shared across all Rooms ([Research hosting Rooms on Cloudflare](001-research-cloudflare-room-server.md)). With the measured message sizes ([Measure what each mode would need to send](002-measure-what-each-mode-sends.md)) and the update rate the prototype settled on (5 a second, ≈18 Room-hours a day; [Prototype how other players' vehicles move](004-prototype-remote-vehicle-feel.md)), decide whether to batch, any caps (players per Room, Room length, Rooms per day), and what players see when the day's quota runs out ("Rooms are full for today, back at 6 am") while single-player carries on.

## Resolution

2026-11-02, grilled with the user (all recommendations accepted). Baseline: 5 updates a second, a full 6-player Room ≈ 5,406 free requests an hour, ≈ 18 Room-hours a day, reset at 00:00 UTC (06:00 in Bangladesh).

1. **Send less when nothing changes, no batching.** A vehicle that is stopped (at a Stop, parked, in a jam; speed under about 0.5 m/s with nothing else changing) sends 1 update a second instead of 5. Batching is rejected: it would add about 0.2 s of delay that hurts dead reckoning. The saving depends on how much time buses spend stopped and isn't measured yet.
2. **Paused or hidden tab:** the player stops sending; the others see their vehicle parked where it was. After 10 minutes paused or hidden they leave the Room automatically, and can rejoin with the same code.
3. **Graceful wind-down:** the Room server keeps a running tally of the day's requests in a single small budget object (each Room reports its usage about once a minute). Past about 90% of the free daily quota, no new Rooms open and no one new joins; Rooms already running carry on to the end. Cloudflare's hard limit is the backstop, not the plan.
4. **Messages:** creating or joining when closed: "আজকের রুম ভর্তি, সকাল ৬টায় আবার খুলবে / Rooms are full for today, back at 6 am". A Room dropping mid-trip: "Connection lost, you're driving solo". Either way the trip carries on as single-player; there is no error screen.
5. **No other hard caps** beyond 6 players per Room: no limit on Room length or Rooms per day.
