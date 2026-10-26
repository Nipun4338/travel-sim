---
id: 005
title: Define bus scoring and passenger rules
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

How does a bus run play out and score: the timetable and punctuality scoring, what counts as a collision and its penalty, how comfort is measured (braking, cornering, potholes), how passengers board and alight at Stops (counts, fares, crowding), and what ends a run (finish and fail conditions)?

## Resolution

1. **Run length:** a Run covers one **Leg**. A **Full Route** Run unlocks once all of that Route's Legs are completed. Legs are split at Stops, using the measured distances in [Adjust Region bounds after OSM measurement](012-adjust-region-bounds.md):
   - Dhaka Leg 1: Farmgate → Mohakhali (~4.6 km)
   - Dhaka Leg 2: Mohakhali → Kuril Bishwa Road (~6.5 km)
   - Dhaka Leg 3: Kuril Bishwa Road → Airport (~3.7 km)
   - Bandarban Leg 1: Bandarban Bus Stand → Shoilo Propat (~6.6 km)
   - Bandarban Leg 2: Shoilo Propat → Chimbuk (~18.7 km)
2. **Timetable:** each Stop has a scheduled arrival time, from a target average speed of 22 km/h (Dhaka) or 30 km/h (Bandarban). Within ±30 s of schedule is on time. Departing early is penalised at twice the rate of arriving late.
3. **Serving a Stop:** stop inside the Stop zone, open the doors (a single door button on mobile), wait while passengers board and alight, close the doors, then depart. A Stop passed without opening the doors is a missed Stop.
4. **Passengers:** each Stop has a random number waiting, weighted by how busy it is (Farmgate and Mohakhali high, Chimbuk low). The bus holds 40 seated and 30 standing. Passengers left behind when the bus is full cost a small penalty. Standing passengers feel rough driving twice as much as seated ones.
5. **Score:** shown as **Taka earned**: fares collected, plus on-time bonuses, minus Fines for rough driving, collisions and missed or early-departure Stops. Exact fare and fine amounts are tuning values for the build.
6. **Comfort:** a **Jerky Moment** is more than 1.5 m/s² sideways or 1.8 m/s² forward/back (the thresholds from [Prototype arcade-plus bus handling](007-prototype-bus-handling.md)). Each Jerky Moment costs a small Fine per standing passenger and shows a passenger complaint.
7. **Collisions:** the Fine scales with impact speed. Scrapes under 5 km/h cost almost nothing. An impact above 30 km/h ends the Run as an accident.
8. **End of a Run:**
   - **Finish:** reaching the Leg's last Stop.
   - **Fail:** only a severe crash (> 30 km/h) or the bus leaving the road. Lateness costs money but never ends a Run.
   - **Results screen:** Taka earned, plus 1–3 stars each for punctuality, comfort and safety. Saving best scores is left to Progression and saves in Not yet specified.
