---
id: 024
title: Prototype hill fog, rain and night lighting
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: [023]
---

## Question

Can the chosen time-of-day and weather effects ([Define day/night and monsoon weather](023-define-day-night-and-weather.md)) look right in the flat-shaded low-poly style and hold 30 fps on the minimum phone? Settle the techniques by reacting to a rough visual prototype.

## Assets

- Prototype: [PROTOTYPE-fog-and-rain.html](../../../prototypes/fog-and-rain/PROTOTYPE-fog-and-rain.html). A bus drives itself on a Bandarban-style hill road or a Dhaka street. The bottom bar switches time (4 presets), weather (clear, rain, hill fog) and quality tier (Low, Medium, High); live FPS, draw calls and triangles are shown.

## Resolution

The user confirmed the effects look right and hold the 30 fps target on their phone at Low and Medium. Their phone model wasn't recorded, so the minimum-phone check from [Decide target devices and performance budget](011-decide-target-devices-and-budget.md) still needs repeating on a Helio G99 / Snapdragon 680-class device during the build. The prototype's techniques are adopted as the v1 approach:

- **Sky and light:** four time presets set the background, the fog colour, a directional sun/moon and hemisphere light. Rain and fog grey out the sky and dim the sun to ×0.4.
- **Visibility:** the built-in linear `Fog`. Far distance: day 1500 m, night 600 m, rain 400 m, hill fog ~220 m (near 15 m).
- **Valley mist (High only):** soft-edged transparent planes at valley height, shown in hill fog.
- **Rain:** camera-local `LineSegments` streaks: Low 800, Medium 2,000, High 4,000. Wet roads use a darker Phong material with specular on Medium and High, and just a darker colour on Low. Decorative puddles; a CSS wiper overlay in cockpit view.
- **Night:**
  - Building windows come from a small emissive window texture whose intensity turns on at night.
  - Street lamps are additive glow sprites plus additive light-pool decals; there are no real lights.
  - Headlights are one `SpotLight` on Medium and High, plus a faint additive beam cone on all tiers (the only headlight on Low).
  - No shadows.
- **Build note:** the prototype's Dhaka scene uses ~250 draw calls (one per building and lamp). The real build must batch them (merged chunk meshes, instanced lamps) as the bake already plans.

The prototype is kept, clearly marked as throwaway, in `prototypes/fog-and-rain/`.
