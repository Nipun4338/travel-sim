---
id: 018
title: Prototype the HUD, menus and mode select
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

What do the HUD and menus look like on desktop and in landscape on a phone: mode and Run select, the Bus Mode HUD (speed, Timetable, next Stop, door state, Taka earned), the Flight Mode HUD (speed, altitude, vertical speed, heading, stall warning), the results screen, settings (quality tier, invert pitch) and the licences/credits menu?

## Assets

- Prototype: [PROTOTYPE-hud-and-menus.html](../../../prototypes/hud-and-menus/PROTOTYPE-hud-and-menus.html). Static mock data; 7 screens (mode select, Run setup, Bus HUD, Flight HUD, results, settings, licences) in three directions: **A Glass** (light frosted corner panels), **B Bus art** (Dhaka bus/rickshaw-art colours, bilingual Bangla + English, bottom dashboard band), **C Instrument** (dark monospace cluster, bottom centre). Desktop and landscape-phone frames, with touch controls overlaid. URL params `?v=A|B|C&screen=…&frame=phone`.

## Resolution

A mix: **B's look with A's layout.**

- **Look (from B, Bus art):**
  - Dhaka bus and rickshaw-art palette: maroon, yellow, teal, red and blue, with patterned borders.
  - Rounded, chunky type (Baloo Da 2 / Noto Sans Bengali).
  - Bilingual labels.
  - The big **next-Stop banner** at the top centre in Bus Mode; the same banner style carries the STALL warning in Flight Mode.
  - Colourful tile menus.
- **Layout (from A, Glass):**
  - HUD widgets sit in the screen corners, not in a bottom dashboard band, so the bottom of the screen stays free for the touch controls from [Judge touch controls on a phone](017-judge-touch-controls.md).
  - Bus HUD: speed bottom-left; doors, junction phase and a mini route map top-left; Taka earned, passengers and comfort top-right; pause bottom-right.
  - Flight HUD: airspeed left-middle; altitude and vertical speed right-middle; heading top-centre; Rings and par time top-left; Taka earned top-right; throttle and glide-path cue at the bottom corners.
  - **On phones:** the bottom corners belong to the touch controls (steer area or virtual stick bottom-left; pedals or throttle bottom-right). Widgets placed there on desktop move to just above them: Bus speed sits above the steer area, and the throttle readout sits beside the throttle slider. The glide-path cue moves under the heading.
- **Screens:** as in the prototype:
  - mode select with career stats;
  - Run setup: Legs with stars, locks and Full Route; time and weather chips with the Taka multiplier; "Download for offline";
  - results: Taka breakdown and three star categories;
  - settings: quality, invert pitch, language, storage per Region with Delete, export/import save code;
  - licences, with the exact OSM and Copernicus credit lines.
- **Language:** a setting with English, বাংলা or Both. **Both is the default.** Stop announcements are decided in [Decide audio: sounds, sources and Stop announcements](019-decide-audio.md).
