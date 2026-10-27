# Build plan

Milestones for building v1 from [SPEC.md](../SPEC.md). Each one ends with something you can run, and each lands on its own branch.

| # | Milestone | Done when | SPEC |
|---|---|---|---|
| M1 | **Scaffold + drivable bus** | `npm run dev` opens a Vite + TypeScript app where the Arcade-plus bus drives on a test track, with keyboard, gamepad and touch input, and a minimal HUD | §2, §3, §6 handling, §12 |
| M2 | **Bake script: Dhaka corridor** | `npm run bake` turns OSM + GLO-30 into 1 km chunk GLBs and Route/Stop/lane JSON for the Dhaka Route, and the bus drives it | §4, §5 |
| M2b | **Dhaka visual pass + vehicle models** | the corridor reads as Dhaka in flat low-poly: lane markings, medians and crossings; ground coloured by land use (paved, compounds, water, green); footpaths and foot-over-bridges; window bands, rooftop clutter (water tanks, rails) and a believable colour palette on buildings; trees, signs, shop awnings and rickshaw-art billboards; Google 2.5D heights once exported from Earth Engine; and the CC bus, CNG, rickshaw and jeep models from SPEC §11 replacing the placeholder blocks | §4, §10, §11 |
| M3 | **Bus gameplay** | Legs, Timetable, doors, passengers, Jerky Moments, Fines, Taka earned and the results screen all work on Dhaka Leg 1 | §6 |
| M4 | **AI traffic** | lane-following traffic, junction phases and per-tier caps | §7 |
| M5 | **Bandarban bake + Route** | the hill Route with graded hairpins, hand-placed Stops, oncoming jeeps | §4, §5 |
| M6 | **Flight Mode** | kinematic flight model, both Flight Zones, 5 Challenges, landing grade, free-flight checklist. Open with `?play=flight&world=dhaka\|bandarban` (`&challenge=1..3`) until M8's mode select | §8 |
| M7 | **Time of day and weather** | 4 times, rain and hill fog with the gameplay effects and per-tier techniques, in both modes. Pick with `?time=` and `?weather=` until M8's Run setup | §9 |
| M8 | **UI** | the bus-art look with the corner layout, all 7 screens, bilingual text | §13 |
| M9 | **Progression, saves and audio** | IndexedDB saves, export code, Liveries, career stats; the sound list and Helper call-outs | §14, §15 |
| M10 | **Landmarks** | 7 hero and 18 simple scripted low-poly models, placed | §10 |
| M11 | **PWA, caching and deploy** | Workbox shell and Region caching, offline download, Cloudflare Pages deploy | §16, §17 |
| M12 | **Verification pass** | the "Verify during the build" list in SPEC §18, including the minimum-phone 30 fps check | §18 |
| M13 | **Dhaka Metro Rail simulator** (requested 2026-10-27, the project's final milestone) | a third mode: drive MRT Line 6 trains as realistically as possible. Real alignment, stations and platforms from OSM; the viaduct; train controls (master controller, brakes, doors); station dwell and timetable; signalling; the cab view and Bangla announcements. Its own decision round first (scope, realism level, data sources) | new SPEC section |
