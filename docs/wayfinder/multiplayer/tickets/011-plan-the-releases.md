---
id: 011
title: Plan which release ships Rooms and in what order
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

The user wants Rooms to start in **one Region** and open the others later. Decide which Region and mode go first (for example Bus in Dhaka), which version ships it relative to the polish releases (v1.4 Line 6 and v1.5 Bandarban), and the order the other Regions and modes follow. Also decide how the first release is tested before players see it (two phones on mobile data, a preview deployment of the Room Worker).

## Resolution

2026-11-02, grilled with the user (all recommendations accepted):

1. **Rooms start with Bus in Dhaka**, just polished in v1.3 with real heights and street life.
2. **Rooms ship next, as v1.4.** The polish releases move back by one: Line 6 becomes **v1.5** (it still waits on the Uttara North layout) and Bandarban **v1.6**. The [polish spec](../../../polish-spec.md) is renumbered to match.
3. **Opening the rest, one per release:** Plane in Dhaka (the Flight Zone) → Metro on Line 6, after its polish release → Bus and Plane in Bandarban, after its polish release → last, Rooms moving between Regions with the flying transition ([Design the flying transition when a Room moves to another Region](012-design-region-transition.md)). Each step reuses the same Room server; only the updates sent change.
4. **Testing before players see it:**
   - a separate preview Room server, `travel-sim-rooms-preview`, paired with a Pages preview deploy;
   - two phones on mobile data plus a desktop in one Room for a full Leg, including a forced drop and reconnect;
   - the 90% quota wind-down tested on the preview server with a tiny threshold.

   Players get it only once that passes.
