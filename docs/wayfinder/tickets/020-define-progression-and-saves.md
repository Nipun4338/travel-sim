---
id: 020
title: Define progression and saves
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

What unlocks what (Legs → Full Route, Flight challenges, Regions), which results are saved (best Taka earned and stars per Run, landing grades), where are they stored (browser storage only, or synced), and is there anything to spend Taka earned on?

Note from [Choose hosting and offline caching](022-choose-hosting-and-caching.md): browsers can evict everything the game stores at once, the game shell and saved progress included, if `persist()` is denied. Decide how saves survive eviction.

## Resolution

1. **Unlocks:** both modes and both Regions are open from the start.
   - Bus Mode: Leg 1 of each Route is open. Finishing a Leg (with any stars) opens the next. Finishing every Leg opens the Full Route.
   - Flight Mode: free flight is always open. The challenges in each Flight Zone unlock in order.
2. **What's saved:**
   - Best Taka earned and best stars per category, for each Run (Leg or Full Route).
   - Best grade or score for each flight challenge.
   - Settings: quality tier, invert pitch, controls.
   - Which Regions are downloaded.
   - No mid-Run saves: Runs are 5–15 minutes, and quitting one restarts it.
3. **Storage:** device-only browser storage (IndexedDB), covered by the `persist()` request from [Choose hosting and offline caching](022-choose-hosting-and-caching.md). **Export / Import save code** (a short copyable text code) covers eviction and moving to a new device. No accounts and no server.
4. **Taka earned:** career Taka (the total across all Runs) unlocks cosmetic **Liveries** at set thresholds, ~5 for the bus (Dhaka bus-company styles) and ~4 for the plane. Nothing is spent, so there is no economy to balance. Liveries are colour swaps on the same models.
5. **Leaderboards:** none in v1; ruled out of scope together with online accounts.
6. **Career stats:** a profile screen shows km driven, passengers carried, Stops served, flights landed and best landing.
