---
id: 019
title: Decide audio: sounds, sources and Stop announcements
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Which sounds does v1 need (bus engine, horns, doors, traffic, junction police whistle, plane engine, stall warning, ambience per Region), where do they come from (CC libraries, recorded, synthesised), are Stop announcements in Bangla, English or both, and what download budget does audio get within the per-Region limit?

## Resolution

1. **Stop announcements:** **Helper call-outs**: the bus helper shouts each Stop from the door, voiced in Bangla. Subtitles follow the language setting from [Prototype the HUD, menus and mode select](018-prototype-hud-and-menus.md) (Both by default). No formal recorded announcements.
2. **Voices:** ~20–30 short lines (each Stop name plus phrases such as "get on" and "the bus is full"), recorded by the user and friends who are native speakers, on one phone in one quiet room. No text-to-speech.
3. **Sound list:**
   - Bus: engine as a three-band pitched loop, brakes with an air hiss, doors, the player's horn, Helper call-outs.
   - Traffic: CNG and bus horns, rickshaw bells at junctions, the traffic police whistle.
   - Plane: propeller pitched by throttle, wind by airspeed, stall warning horn, touchdown squeal.
   - Ambience: Dhaka city hum; Bandarban birds, wind, river, and insects at night.
   - Weather: rain, wipers.
   - Interface: clicks, a results jingle.
   - No call to prayer: it is religious audio and best left out of a game.
4. **Horn:** a HORN key and a touch button next to DOOR, with no Fine.
5. **Sources:** CC0 and CC BY clips from Freesound (each clip's licence checked and credited) and the free Sonniss GDC bundles, plus any field recordings the user makes. Engines are pitched loops via Web Audio, not synthesis. Choosing the clips is build work.
6. **Music:** one CC-licensed loop with a local flavour, for the menus only. No in-game radio (copyright); ruled out of scope.
7. **Format and budget:**
   - AAC `.m4a`, mono, 64–96 kbps.
   - ≤ 5 MB in the game shell (vehicles, interface, music); ≤ 4 MB per Region (ambience, call-outs). Both come out of the 15 MB and 60 MB limits in [Decide target devices and performance budget](011-decide-target-devices-and-budget.md).
   - Volume sliders for master, music, effects and voice; audio mutes when the tab is hidden.
