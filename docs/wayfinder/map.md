---
title: Travel Sim — Dhaka & Bandarban
labels: [wayfinder:map]
---

## Destination

A build-ready spec for a browser 3D game, playable on desktop and mobile, with two independent modes, **Bus Mode** and **Flight Mode**, set in stylized recreations of real Dhaka and Bandarban. The spec fixes the stack, data pipeline, region bounds, vehicle feel and game rules, so implementation can start without open decisions.

**Destination reached (2026-10-26):** every ticket is closed, and the consolidated spec is [SPEC.md](../../SPEC.md).

## Notes

- Domain: browser 3D game; the glossary is in `/CONTEXT.md` (use its terms: Region, Bus Mode, Flight Mode, Route, Stop, Helper, Leg, Full Route, Run, Timetable, Taka earned, Fine, Jerky Moment, Livery, Flight Zone, Challenge, Ring, Arcade-plus).
- Skills to consult each session: `grilling` and `domain-modeling`; `prototype` for feel questions; `research` for AFK fact-finding.
- Settled while charting:
  - Look: real geography (OpenStreetMap + elevation data), stylized rendering, a few hand-modelled low-poly landmarks. No photoreal tiles.
  - Bus Mode: one Dhaka city Route and one Bandarban hill Route, each with real Stop names (exact bounds in Decisions so far).
  - Flight Mode: two separate Flight Zones, one per Region (exact bounds in Decisions so far).
  - Light AI traffic in Dhaka Bus Mode (rickshaws, CNGs, buses); occasional jeeps in Bandarban; none in flight.
  - Loops: bus = run the Route on time, serve Stops, scored on punctuality, collisions and comfort; plane = free flight plus a few challenges (take-off, landing at the Dhaka airport, valley run in Bandarban).
  - TypeScript + Vite; desktop browser (keyboard + gamepad) and mobile browser (touch). Mobile was added after charting, so earlier research assumed desktop only.
  - Free CC-licensed vehicle models with credits; custom low-poly landmarks only.
  - Personal/portfolio project.
- Planning only: tickets produce decisions, not game code.

## Decisions so far

<!-- one line per closed ticket: [title](link): gist -->

- [Compare browser 3D engines and OSM/elevation world pipelines](tickets/001-compare-engines-and-world-pipelines.md): Three.js + Rapier or Babylon + Havok are the game-fit engines (Cesium has no physics); a build-time bake of OSM + GLO-30 into chunked GLB keeps collision and the AI lane graph deterministic.
- [Find CC-licensed models for buses, rickshaws, CNGs, jeeps and planes](tickets/003-find-cc-vehicle-models.md): free CC models cover everything except a Dhaka-style bus and the chander gari (reskin and kitbash those); real Bangladeshi rickshaw and CNG models need heavy decimation; Cessna 172 for the plane.
- [Survey map data sources and licences for Dhaka and Bandarban](tickets/002-map-data-sources-and-licences.md): Dhaka OSM has dense footprints but few heights (12.5% levels), so fill heights from Google Open Buildings 2.5D; Copernicus GLO-30 for terrain; ODbL credit plus a Copernicus credit required. Bandarban and airport OSM coverage not yet measured.
- [Lock Region bounds - exact bus Routes, Stops and Flight Zones](tickets/004-lock-region-bounds.md): Dhaka Route is Farmgate → Airport (9 Stops); Bandarban Route is town → Chimbuk (4 Stops); both outbound only; Flight Zones are 30 km (Dhaka, runway 14 spawn) and 40 km (Bandarban, airborne spawn). Amended by Adjust Region bounds below.
- [Measure OSM coverage for the Bandarban road and Dhaka airport](tickets/009-measure-bandarban-and-airport-osm-coverage.md): Dhaka Route is ~14 km (not 12) and all 9 Stops exist in OSM; Bandarban Route holds at 25.3 km but its road is lightly tagged and 3 of 4 Stops aren't in OSM; the airport is richly mapped (278 aeroway features). Some Region bounds need adjusting.
- [Adjust Region bounds after OSM measurement](tickets/012-adjust-region-bounds.md): amends Lock Region bounds. Dhaka Route is ~14 km on the arterials and its Stop is renamed Chairman Bari. The runway 32 approach is used for landing, so the Dhaka zone stays 30 km. The Bandarban zone is centred at 22.054, 92.273. Bandarban Stops are hand-placed, ending at the Chimbuk summit.
- [Decide target devices and performance budget](tickets/011-decide-target-devices-and-budget.md): minimum phone is a 4 GB mid-range Android from about 2022, plus iPhone 11+; installable PWA on WebGL2; 30 fps minimum on phones and 60 on desktop; ≤ 15 MB first load, ≤ 60 MB per Region-mode, ≤ 600 MB memory on mobile; automatic quality tiers.
- [Choose the 3D engine and world-generation approach](tickets/006-choose-engine-and-world-generation.md): Three.js + Rapier in plain TypeScript. A custom bake script turns OSM + GLO-30 + Google 2.5D heights into 1 km chunks with 3 detail levels, plus Route and lane-graph JSON. Full detail only along the bus corridor; flat-shaded low-poly style.
- [Prototype arcade-plus bus handling](tickets/007-prototype-bus-handling.md): the Arcade-plus preset, unchanged: 0–35 km/h in ~10 s, 80 km/h top speed, 5 m/s² braking, speed-faded 38° steering, light anti-roll assist. Touch controls not yet judged.
- [Prototype arcade-plus flight model](tickets/008-prototype-flight-model.md): the Arcade-plus preset, unchanged: soft stall at 100 km/h, lift-off ~10 s, 110°/s roll with mild wing levelling, no landing assist, crash above 4 m/s sink. Flight uses a hand-written kinematic model, not Rapier.
- [Define bus scoring and passenger rules](tickets/005-define-bus-scoring-and-passengers.md): Runs are Legs (3 in Dhaka, 2 in Bandarban), with a Full Route unlock. There's a timetable with ±30 s on-time windows (early departure costs double). Stops are served by door-button dwell. The score is Taka earned minus Fines for Jerky Moments, collisions and missed Stops. Only a crash above 30 km/h or leaving the road fails a Run.
- [Define AI traffic behaviour on the baked lane graph](tickets/013-define-ai-traffic-behaviour.md): kinematic lane-following traffic within 400 m of the bus, capped at 25, 45 or 80 vehicles by quality tier. Dhaka has buses, CNGs, cars, motorbikes and trucks (rickshaws only at junctions and near Farmgate), with per-type aggression. Junctions run timed police phases, and running one is a Fine. AI never rear-ends the player. Bandarban has oncoming jeeps on hairpins.
- [Pick landmarks for each Route and Flight Zone](tickets/010-pick-landmarks.md): 7 hero landmarks (≤ 8k triangles): Farmgate metro, Kuril flyover, Airport Terminal 3, Sangsad Bhaban, Chimbuk summit, Shoilo Propat, Buddha Dhatu Jadi. 17 simple block-outs (≤ 1.5k), ≤ 5 MB per Region. Elevated roads are baked from OSM bridge ways. CC models are tried first.
- [Find CC landmark models and verify landmark locations](tickets/014-find-landmark-models-and-locations.md): no usable CC model exists for any landmark itself (only generic boats, bridge and waterfall fit), so expect to hand-model nearly all. 23 of 24 landmarks are in bounds. Elevated roads exist in OSM with `layer` tags only. The Chimbuk Stop is at the wrong spot: the spur runs ~320 m downhill from the real high ground.
- [Compare hosting options for the PWA and Region files](tickets/021-compare-hosting-options.md): Cloudflare is the only host with free unlimited static bandwidth and PoPs inside Bangladesh (25 MiB per-file cap; Pages answers range requests with a full 200). The Netlify and Firebase free tiers run out after ~130–200 new players a month. Storage quota isn't a risk on Android or iOS, but eviction, iOS's separate Home Screen storage and opaque cross-origin caching are.
- [Choose hosting and offline caching](tickets/022-choose-hosting-and-caching.md): everything on Cloudflare Pages (same origin, pages.dev for v1). Regions stream and cache as you play, with an optional "Download for offline" per Region-mode. `persist()` is requested; iOS prompts Add to Home Screen first. Hashed chunks plus versioned Region manifests handle updates. Deploys use `wrangler pages deploy`, with baked Regions kept out of git.
- [Revise the Chimbuk Stop and landmark list after verification](tickets/015-revise-chimbuk-and-landmarks.md): amends earlier bounds, scoring and landmark decisions. The Bandarban Route ends at the Chimbuk Tourist Centre on the main road (~23.7 km; Leg 2 ~17 km). Terminal 3 is the hero and the main terminal is added as a simple landmark (7 hero, 18 simple). The Ashulia expressway is baked as under construction. Local names are used. The agent scripts the landmark models for you to review.
- [Define progression and saves](tickets/020-define-progression-and-saves.md): everything is playable from the start; Legs unlock in order, then the Full Route; flight challenges unlock in order. Saves (bests, settings) live only on the device, with an export/import save code and no mid-Run saves. Career Taka unlocks cosmetic Liveries. There's a career-stats profile.
- [Define day/night and monsoon weather](tickets/023-define-day-night-and-weather.md): 4 fixed times picked per Run (no cycle); weather is clear, monsoon rain, or hill fog (Bandarban only). Night has headlights, street and window lights, and runway lights, with no shadows. Rain cuts grip 25% and the Timetable speed 15%. Taka bonus: rain or fog ×1.2, night ×1.1. The default is Random. Puddles are decorative.
- [Prototype hill fog, rain and night lighting](tickets/024-prototype-fog-and-rain.md): looks right and holds 30 fps on your phone at Low and Medium. Techniques: built-in fog, camera-local rain streaks, an emissive window texture, glow sprites for lamps, and a spotlight plus beam cone for headlights (cone only on Low). The Dhaka draw calls must be batched in the build, and the minimum-tier phone still needs a check.
- [Judge touch controls on a phone](tickets/017-judge-touch-controls.md): both prototype schemes work as-is. Bus: drag-to-steer area, GAS/BRAKE and a DOOR button. Flight: a floating virtual stick and a throttle slider, with no touch rudder. Tilt steering is deferred until it's hosted on HTTPS.
- [Design flight challenges and scoring](tickets/016-design-flight-challenges.md): 5 Challenges: Dhaka take-off, runway 32 landing and city tour; Bandarban Sangu valley run and ridge tour. They pay Taka earned (fee, rings, par time and landing grade, minus missed-ring Fines) with 1–3 stars. A crash or 10 s outside the zone fails. Free flight has a landmark checklist.
- [Prototype the HUD, menus and mode select](tickets/018-prototype-hud-and-menus.md): B's bus-art look (local palette, chunky bilingual type, a next-Stop banner) with A's corner layout, keeping the bottom free for touch controls. There are 7 screens as prototyped. The language setting is English, বাংলা or Both, defaulting to Both.
- [Decide audio: sounds, sources and Stop announcements](tickets/019-decide-audio.md): Bangla Helper call-outs recorded by native-speaker friends, with subtitles. A full SFX list from CC0/CC BY sources and Sonniss bundles, plus a HORN button. Menu music only. AAC mono, ≤ 5 MB in the shell and ≤ 4 MB per Region.

## Not yet specified

Nothing left in the fog: every remaining question is now a ticket.

## Out of scope

- Multiplayer.
- [In-game radio with real Bangla songs](tickets/019-decide-audio.md): copyright. There's menu music only, from one CC-licensed loop.
- [Monsoon flooding that affects driving](tickets/023-define-day-night-and-weather.md): it needs water simulation and changes to the road data. Puddles are decorative only.
- [Online accounts, cloud saves and leaderboards](tickets/020-define-progression-and-saves.md): they need a server and sign-in. Saves stay on the device, with an export/import code.
- [Pedestrians in traffic](tickets/013-define-ai-traffic-behaviour.md): no people walking on or crossing the road in v1, because collisions with people are a sensitive outcome and crowds are costly on phones. Waiting passengers at Stops are scenery only.
- Photorealistic Google 3D Tiles.
- One continuous Dhaka→Bandarban world, or a linked plane-then-bus journey.
- Sim-grade detail: ATC, detailed cockpits, full-system flight sim.
- Return-direction Runs on both Routes: they reuse the same world, so they're a cheap follow-up after v1, not part of this spec.
- Extending the Bandarban Flight Zone east to Boga Lake and Keokradong: it would push the zone past 40 km and the per-Region budget.
