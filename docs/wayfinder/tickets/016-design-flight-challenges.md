---
id: 016
title: Design flight challenges and scoring
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Which Flight Mode challenges ship in v1 for each Flight Zone (take-off, the runway 32 landing, a Bandarban valley run, others?), how is each scored (building on the ring-and-landing-grade draft in [Prototype arcade-plus flight model](008-prototype-flight-model.md)), and what are the finish and fail conditions?

## Resolution

1. **Challenges** (each Flight Zone's unlock in order, per [Define progression and saves](020-define-progression-and-saves.md)):
   - Dhaka:
     1. **Take-off:** from runway 14, climb to 300 m above ground while staying near the centreline.
     2. **Runway 32 landing:** follow the approach rings and touch down.
     3. **City tour:** a ring course past Sangsad Bhaban, Hatirjheel and Ahsan Manzil, below 500 m.
   - Bandarban:
     1. **Sangu valley run:** rings low in the valley, below the ridgelines.
     2. **Ridge tour:** a ring course over Chimbuk, Nilgiri and Buddha Dhatu Jadi.
2. **Scoring:** challenges pay **Taka earned** as a charter fee, so Liveries progress from both modes. The total is:
   - a base fee;
   - a bonus per ring;
   - a time bonus against a par time;
   - for landings, a landing-grade bonus;
   - minus **Fines** for missed rings.

   Each challenge gets 1–3 stars. The time-and-weather multipliers from [Define day/night and monsoon weather](023-define-day-night-and-weather.md) apply. Exact amounts and par times are tuning values for the build.
3. **Missed rings:** a Fine; the challenge continues.
4. **Fail conditions:** a crash, or more than 10 s outside the Flight Zone after a warning. There is no hard time limit.
5. **Landing grade:**
   - Sink rate: Butter < 1 m/s, Good < 2 m/s, Firm < 4 m/s; 4 m/s or more is a crash.
   - Distance off the centreline.
   - Touchdown inside the first 600 m of the runway.
   - 3 stars needs Butter or Good, ≤ 5 m off the centreline, and touchdown in the first 600 m.
6. **Free flight:** unscored, with a **landmark checklist**: flying near a landmark ticks it off, and the count appears in career stats.
