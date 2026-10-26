---
id: 023
title: Define day/night and monsoon weather
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

What time-of-day and weather does v1 support: a fixed set of times or a cycle, monsoon rain (visuals, wet-road handling, reduced visibility), hill fog in Bandarban, and how do they affect gameplay (bus grip, flight visibility) and the phone budget? Is the choice per Run or random?

## Resolution

1. **Time of day:** four fixed times: Morning, Midday, Golden hour, Night. One is chosen per Run and stays fixed for the Run; there is no cycle.
2. **Night:**
   - Bus headlights.
   - Street lights along the Dhaka Route.
   - Lit windows on Dhaka buildings, baked into vertex colour / emissive.
   - Runway and approach lights.
   - Bandarban is dark apart from the headlights.
   - No real-time shadows.
3. **Weather:**
   - **Clear.**
   - **Monsoon rain:** camera-local rain streaks, darker and shinier wet roads, wipers in cockpit view, reduced visibility.
   - **Hill fog:** Bandarban only.
4. **Gameplay effects:**
   - Rain, bus: tyre grip −25% (friction slip 1.6 → 1.2) and longer braking; the Timetable target speed drops 15%; AI traffic slows too.
   - Rain, plane: reduced visibility and light turbulence.
   - Hill fog: visibility ~150–300 m.
   - Night: no rule changes.
5. **Choice and reward:** the player picks time and weather in Run setup. The default is "Random", which weights monsoon higher in Bandarban. Taka earned is multiplied for hard conditions: rain ×1.2, fog ×1.2, night ×1.1, stacking. This extends [Define bus scoring and passenger rules](005-define-bus-scoring-and-passengers.md).
6. **Low quality tier:** fewer rain streaks, wet roads darkened only (no sheen), headlights as a simple glowing cone, and fog using the renderer's built-in fog. [Prototype hill fog, rain and night lighting](024-prototype-fog-and-rain.md) confirms it holds 30 fps.
7. **Monsoon flooding:** decorative puddles only. Flooding that affects driving is out of scope.
