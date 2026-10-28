# Travel Sim: build spec (v1)

A browser 3D game, for desktop and mobile, where you drive a city bus and fly a light plane through stylized recreations of real **Dhaka** and **Bandarban**.

This spec consolidates the wayfinding map ([docs/wayfinder/map.md](docs/wayfinder/map.md)) as of 2026-10-26. It gives only the final decisions: where a later ticket amended an earlier one, the amendment is applied here. Each section links the tickets that hold the reasoning. Domain terms (**Region**, **Route**, **Stop**, **Leg**, **Run**, **Challenge**, **Ring**, **Fine**, …) are defined in [CONTEXT.md](CONTEXT.md); use them in code and docs.

---

## 1. Scope

**In v1:**
- Two independent modes, **Bus Mode** and **Flight Mode**, in two Regions, **Dhaka** and **Bandarban**.
- Realism target **Arcade-plus**: believable handling and simple rules, with no detailed simulation.
- **A relaxing drive, not a competition** (revised 2026-10-27, user direction): the default Bus Mode has no money, Fines, stars or failing Runs. The view while driving comes first: the game opens in the driver's cab, and on-screen text is kept to a minimum. The scored rules in §6 remain as an optional mode (`?mode=scored` now; a setting in M8).
- Desktop browser (keyboard, gamepad) and mobile browser (touch), shipped as an installable PWA.
- A personal/portfolio project.

**Planned after v1 (2026-10-27):** a third mode, a **Dhaka Metro Rail simulator** on MRT Line 6, as realistic as possible. It's the project's final milestone (build plan M13) and gets its own decision round before it's specified.

**Out of scope:**
- Multiplayer, online accounts, cloud saves, leaderboards.
- Mobile tilt steering (until it is hosted on HTTPS).
- Pedestrians in traffic.
- Photoreal Google 3D Tiles.
- One continuous Dhaka→Bandarban world, or a linked plane-then-bus journey.
- Sim-grade detail (ATC, detailed cockpits).
- Return-direction Runs.
- Boga Lake and Keokradong.
- Monsoon flooding that affects driving.
- In-game radio with real songs.

The full list, with reasons, is in the map's *Out of scope* section.

## 2. Platforms and budgets
[011](docs/wayfinder/tickets/011-decide-target-devices-and-budget.md)

| | Minimum | Frame rate |
|---|---|---|
| Phone | 2022 mid-range Android, 4 GB RAM, Helio G99 / Snapdragon 680 class (e.g. Redmi Note 12, Galaxy A14/A24), Android Chrome primary | stable **30 fps**; 60 on better phones |
| iPhone | iPhone 11+, iOS 17+ Safari (tested second) | 30 fps |
| Desktop | integrated GPU (Iris Xe / Ryzen Vega) at 1080p | **60 fps** |
| Tablet | treated as a phone | as phone |

- **Graphics:** WebGL2 baseline; WebGPU only as an optional upgrade.
- **Form:** installable PWA, fullscreen, landscape-only on phones.
- **Download:** ≤ **15 MB** to reach mode select; ≤ **60 MB per Region-mode**, streamed and then cached.
- **Memory:** ≤ **600 MB** on mobile.
- **Quality tiers:** Low, Medium and High, chosen automatically from the device with a manual override. Phones start on Low or Medium.

## 3. Tech stack
[006](docs/wayfinder/tickets/006-choose-engine-and-world-generation.md), [008](docs/wayfinder/tickets/008-prototype-flight-model.md), [001 research](docs/research/engines-and-world-pipelines.md)

- **Language and build:** TypeScript + Vite. Plain TypeScript with our own game loop; no React.
- **Rendering:** Three.js. The prototypes pin `three@0.170.0`; use the current release.
- **Bus physics:** Rapier (`@dimforge/rapier3d`), using `DynamicRayCastVehicleController` and heightfield/trimesh colliders.
- **Flight:** a hand-written kinematic arcade model, not Rapier. Ground contact is checked against the terrain height function.
- **AI traffic:** kinematic, driving along the baked lane graph; not physics bodies.
- **UI:** HTML/CSS overlays on top of the canvas.
- **Coordinates:** local metres from each Region's centre (no globe coordinates).

## 4. World and data pipeline
[006](docs/wayfinder/tickets/006-choose-engine-and-world-generation.md), [002](docs/research/map-data-and-licences.md), [009](docs/research/route-and-airport-coverage.md), [010](docs/wayfinder/tickets/010-pick-landmarks.md), [014](docs/research/landmarks.md), [015](docs/wayfinder/tickets/015-revise-chimbuk-and-landmarks.md)

A **custom TypeScript bake script** runs at build time and writes, per Region:
- **chunked GLB terrain and buildings:** 1 km chunks, 3 levels of detail, meshopt-compressed, content-hashed file names;
- **Route, Stop and lane-graph JSON**, used by the bus, the Timetable and AI traffic;
- **a versioned Region manifest** listing the chunks.

**Inputs:**
- **OSM:** Geofabrik Bangladesh extract (ODbL).
- **Terrain:** Copernicus GLO-30 DEM (30 m).
- **Building heights:** OSM `building:levels` or `height` first, then Google Open Buildings 2.5D (CC BY 4.0), then a per-area default. In Dhaka only 12.5% of OSM buildings have levels, so the Google data matters.

**Rules:**
- **Roads are graded into the terrain.** This matters for the Bandarban hairpins. The Bandarban road has no width or lane tags in OSM, so use defaults.
- **Dual carriageways** are mapped in OSM as one-way pairs; the lane graph must route each Stop on the correct side.
- **Elevated roads** are baked from OSM bridge ways as decks (top, sides and underside) on pillars, stacked by `layer` because OSM has no height tags. Where a deck's end meets a ground road it **ramps down to street level** at about 6%, on retaining walls once it's under 4.5 m; where it meets a deck at another height it eases between the two; ends cut off by the bake area stay up. Flyovers have parapets, lamp posts (lit at night) and pillars only where they're high enough; the Flight Zones show the same raised decks and ramps. In the hills (graded Regions) a road `layer` marks a river bridge, so it stays at road level: the Elevated Expressway (`layer=3`), MRT Line 6 (`bridge=viaduct`, `layer=6`), and the Mohakhali and Kuril flyovers (`layer=1`). The Dhaka–Ashulia Elevated Expressway is baked *as under construction* (pillars and partial deck). Decks are solid: the bus can drive up a ramp and along a flyover (the Route itself stays at ground level, and no deck crosses it low enough to block it).
- **Railways (real OSM lines):** ballast, concrete sleepers and broad-gauge rails; MRT Line 6 as a 12 m viaduct with two tracks and parapets; main-line bridges carry the track between steel girders. Level crossings come from OSM's `railway=level_crossing` nodes near the Route (28 in Dhaka, including the Mohakhali crossing on the Route itself), with booms, flashing lights and signs. Trains run on the joined lines: Bangladesh Railway sets (a red locomotive and 8–13 green coaches, ~30–45 km/h through the city) and six-car Dhaka Metro sets (~60 km/h). Crossings close from 350 m before a train until it has passed; AI traffic stops short of a closed crossing and the bus gets a warning. Across a road the track bed sits just under the road surface, so the bus drives over without a jolt; a train brakes to a stop short of a crossing the bus is standing on. The Flight Zones show the track beds, the metro viaduct and the trains from the air; in the Bandarban zone that's the new Dohazari–Cox's Bazar line along its western edge.
- **Detail:**
  - Bus Mode: full detail within **~250 m** of the Route, with a low-detail backdrop beyond.
  - Flight Mode: the whole Flight Zone at low and medium detail, baked separately (`npm run bake:flight -- <zone>`, output in `public/zones/`). It does not reuse the corridor chunks: the two use different origins and chunk grids.
    - **Terrain** is a 40 m height field, shared by the game for ground contact, drawn as 2 km chunks at 40 m (near) and 100 m (mid), over a whole-zone 400 m backdrop that sits just below them.
    - **Buildings** are read from the Geofabrik extract (`data/raw/osm/bangladesh-latest.osm.pbf`, ~356 MB; Overpass can't serve them all) and baked as boxes (each OSM footprint's smallest enclosing rectangle) drawn instanced and thinned with distance, largest first. The Dhaka zone holds ~900k OSM buildings, too many to bake as meshes. Heights come from tags, else from local building density. The plane crashes on contact with them.
    - Runways come from OSM and are flattened into the ground; roads, water and green space colour the terrain.
- **Style:** flat-shaded low-poly, vertex colours plus a small shared texture atlas. Sun shadows near the bus on Medium and High (clear days only).
- **Trees:** nine species mixed per setting (trees.ts): ashoka, rain, flame, mango, coconut and betel-nut trees on Dhaka's streets; mango, banana and palms in its greens; garjan/teak forest, bamboo clumps and bananas in Bandarban. Each varies in size, lean, rotation and colour. Trunks stand back from the carriageway by most of their crown, and none grow under flyovers or on railway tracks.
- **Batching:** chunk meshes must be merged and lamps instanced. The unbatched prototype Dhaka scene hit ~250 draw calls.

## 5. Regions, Routes and Flight Zones
[012](docs/wayfinder/tickets/012-adjust-region-bounds.md) as amended by [015](docs/wayfinder/tickets/015-revise-chimbuk-and-landmarks.md); Legs from [005](docs/wayfinder/tickets/005-define-bus-scoring-and-passengers.md)

### Dhaka Route: Farmgate → Airport (~14 km, outbound only)

The path runs along Old Airport Road and Bijoy Sarani, then Bir Uttam Ziaur Rahman Road to Mohakhali, then New Airport Road, which runs under the Elevated Expressway north of Banani. The bus stays on the arterials, with no detours into terminals.

| # | Stop | Lat, Lon (OSM node) | km (routed) | Leg |
|---|---|---|---|---|
| 1 | Farmgate | 23.75722, 90.39024 (2320379589) | 0 | Leg 1 start |
| 2 | Bijoy Sarani | 23.76494, 90.38917 (11934785542) | 1.1 | |
| 3 | Jahangir Gate | 23.77526, 90.38977 (12009429417) | 2.4 | |
| 4 | Mohakhali | 23.77818, 90.39815 (3499295181) | 4.6 | Leg 1 end / Leg 2 start |
| 5 | Chairman Bari | 23.78786, 90.40010 (12073083676) | 6.0 | |
| 6 | Kakoli | 23.79523, 90.40090 (12078090908) | 7.0 | |
| 7 | Kuril Bishwa Road | 23.82136, 90.41887 (3498521660) | 11.1 | Leg 2 end / Leg 3 start |
| 8 | Khilkhet | 23.82936, 90.41975 (3556399554) | 12.0 | |
| 9 | Airport | 23.85160, 90.40734 (3572490148) | 14.8 | Leg 3 end |

The routed km figures include short detours; staying on the arterials comes to ~13.5–14.8 km.

### Bandarban Route: Bandarban Bus Stand → Chimbuk (~22.6 km as baked, outbound only)

The road is the Bandarban–Thanchi Road (`secondary`, Z1811). Stops are hand-placed because they aren't bus stops in OSM.

| # | Stop | Lat, Lon | km | Leg |
|---|---|---|---|---|
| 1 | Bandarban Bus Stand (Thanchi Road stands) | ~22.1837, 92.2178 | 0 | Leg 1 start |
| 2 | Milonchhari | ~22.1686, 92.2228 | 3.2 | |
| 3 | Shoilo Propat | ~22.1507, 92.2169 | 6.6 | Leg 1 end / Leg 2 start |
| 4 | Chimbuk (Tourist Centre, on the main road at its ridge top; no side road) | 22.05755, 92.27342 | 22.6 | Leg 2 end (~17 km) |

### Flight Zones

| Zone | Size | Centre | Spawn |
|---|---|---|---|
| Dhaka | 30 × 30 km | Tejgaon, 23.7628, 90.3913 | on runway 14 (threshold 23.8550, 90.3885), taking off to the SE |
| Bandarban | 40 × 40 km | 22.054, 92.273 | airborne at ~600 m over the town, heading south |

Airport VGHS: one runway, 14/32, 3,202 × 45 m. It's richly mapped in OSM (148 taxiways, 64 stands, terminals).

## 6. Bus Mode
[007](docs/wayfinder/tickets/007-prototype-bus-handling.md), [005](docs/wayfinder/tickets/005-define-bus-scoring-and-passengers.md), [013](docs/wayfinder/tickets/013-define-ai-traffic-behaviour.md), [023](docs/wayfinder/tickets/023-define-day-night-and-weather.md), [015](docs/wayfinder/tickets/015-revise-chimbuk-and-landmarks.md)

### Handling (the Arcade-plus preset, validated in the prototype)

The bus is 12 t, 11 × 2.8 × 2.5 m, on 4 raycast wheels (radius 0.52 m, rest length 0.45 m, max travel 0.4 m). In Rapier, the forward axis is **+x** and the wheel axle is **+z**; −z drives backwards.

| Parameter | Value |
|---|---|
| Engine force | 9,000 N per rear wheel, tapering linearly to 0 at 80 km/h (0→35 km/h in ~10 s) |
| Brakes | 5.0 m/s² (per-wheel impulse = m·decel·dt/4) |
| Steering | max 38°, faded by speed as `max / (1 + kmh/50)`, at 80°/s; returns to centre 1.5× faster |
| Suspension | stiffness 22, compression 2.7, rebound 3.2, max force 1e6 |
| Grip (friction slip) | 1.6 dry, **1.2 in rain** |
| Centre of mass | 0.4 m below the body centre |
| Stability | anti-roll torque `3 · roll · m · 20`, angular damping 1.0 |
| Resistance | rolling 0.015·m·g, air 3.15·v² |
| Behaviours | brake to a stop, then hold brake to reverse (40% force, ≤ 15 km/h); auto-hold brake when idle and nearly stopped |

### Runs, Legs and Timetable
- A **Run** is one Leg, or a **Full Route**, which unlocks once every Leg of that Route is done. Runs take 5–15 minutes. There are no mid-Run saves.
- **Timetable:** target average speed 22 km/h in Dhaka and 30 km/h in Bandarban, **reduced 15% in rain**. Arriving within ±30 s of schedule is on time. **Departing early costs twice as much as arriving late.**

### Serving a Stop
- Stop inside the Stop zone, open the **doors** (F key, or the DOOR button), wait while passengers board and alight, close the doors, then depart.
- The doors only open when the bus is stopped, and the bus holds still while they're open.
- A Stop passed without opening the doors is a **missed Stop**.

### Passengers
- Each Stop has a random number waiting, weighted by how busy it is (Farmgate and Mohakhali high, Chimbuk low).
- Capacity is 40 seated + 30 standing. Passengers left behind when the bus is full cost a small penalty.
- Standing passengers feel rough driving ×2.

### Relaxed mode (default)
- Runs never fail. Collisions, leaving the road and running a junction are not penalised or announced.
- Messages only name the Stop you arrive at or pass.
- The end of a Leg shows a calm trip summary: distance, time, passengers carried, Stops served.

### Score: Taka earned (scored mode only)
Fares collected, plus on-time bonuses, minus **Fines**, then multiplied for conditions: **rain ×1.2, fog ×1.2, night ×1.1**, stacking. Fines:
- **Jerky Moment:** a Fine per standing passenger, plus a passenger complaint on screen. A Jerky Moment is when the bus goes above **1.5 m/s² sideways** or **1.8 m/s² forward/back** (smoothed, edge-triggered).
- **Collision:** scaled by impact speed; under 5 km/h is near zero.
- **Missed Stop.**
- **Early departure.**
- **Running a junction's stop phase.**

Exact fare and fine amounts are tuning values.

### End of a Run
- **Finish:** at the Leg's last Stop.
- **Fail (scored mode only):** an impact above **30 km/h**, or the bus leaving the road. Lateness never fails a Run.
- **Results screen (scored mode):** Taka earned, plus 1–3 stars each for **punctuality, comfort and safety**.

### Lights (revised 2026-10-27)
Worked like a real bus. Every light shows on the bus and on a matching tell-tale lamp on the dashboard.
- **Headlights:** off → parking → low beam.
- **High beam:** only with the low beam on.
- **Indicators:** cancel themselves once the bus has turned and straightened.
- **Hazards.**
- **Brake and reversing lights:** automatic.

### Horn
A HORN key and touch button, with no Fine.

## 7. AI traffic
[013](docs/wayfinder/tickets/013-define-ai-traffic-behaviour.md)

- **Simulated range:** only vehicles within ~400 m of the bus, capped by tier: **Low 25, Medium 45, High 80**.
- **Dhaka mix:** buses, CNGs, cars, motorbikes and trucks. Cycle rickshaws appear only crossing at junctions and in the kerb lane near Farmgate.
- **Bandarban:** ~1 vehicle per km, mainly oncoming chander gari jeeps and trucks, which take up the middle of the road on hairpins.
- **Driving:** vehicles follow lanes on the lane graph, keep a gap to the vehicle ahead, and change lanes to pass. A per-type "Dhaka aggression" setting is higher for CNGs and buses: weaving, cutting in to Stops, more horn.
- **Junctions:** Farmgate, Bijoy Sarani, Jahangir Gate, Mohakhali, Kakoli, Kuril and Khilkhet run **timed phases with a traffic police figure**.
- **Player interaction:**
  - AI never rear-ends the player, but doesn't yield either; AI buses compete for Stop zones.
  - A hit AI vehicle stops and honks for ~5 s, then resumes.
- **Rain:** AI traffic slows.
- **Look and motion:** vehicles are drawn between physics steps, with heading and pitch taken from the road 3 m behind and ahead and eased through turns, so they don't twitch at the lane graph's 10 m vertices. City buses carry one of six made-up Dhaka companies' liveries: a Bangla company name on the sides and back, a route board over the windscreen (real places, e.g. গুলিস্তান ⇄ মিরপুর ১২) and "ঢাকা মেট্রো-ব" number plates. Trucks carry "ঢাকা মেট্রো-ট" plates and painted rear slogans (মায়ের দোয়া, সাবধানে চালান).

## 8. Flight Mode
[008](docs/wayfinder/tickets/008-prototype-flight-model.md), [016](docs/wayfinder/tickets/016-design-flight-challenges.md)

### Flight model (the Arcade-plus preset, validated in the prototype)
| Parameter | Value |
|---|---|
| Thrust | 4 m/s² at full throttle; quadratic drag gives 330 km/h top speed |
| Stall | 100 km/h, soft: lift fades from 75% of stall speed down; nose drops (−35°/s × lost lift) and the plane sinks (up to 22 m/s); STALL warning below 110% of stall speed |
| Lift-off | ≥ 110 km/h and > 3° nose-up; no nose-up below that (~10 s ground roll) |
| Rates | pitch 50°/s, roll 110°/s, rudder 20°/s; response 5; authority scales with speed/stall (min 0.25) |
| Wing levelling | 0.6 × bank, when there's no roll input |
| Turning | banking yaws by `9.81·tan(bank)/speed`, coordination 1.0 |
| Climbs and dives | 0.6 of gravity's effect on speed |
| Ground | nosewheel steering 25°/s; rolling drag 0.25 m/s²; brakes 3.5 m/s² |
| Crash | sink ≥ 4 m/s, bank > 15° or pitch < −6° at touchdown. Off-runway landings are allowed on flat ground below 160 km/h. No auto-flare. |
| Rain | reduced visibility plus light turbulence |

### Challenges (unlock in order per Flight Zone)
- **Dhaka:**
  1. **Take-off:** from runway 14, climb to 300 m above ground while staying near the centreline.
  2. **Runway 32 landing:** follow approach Rings on a 3° glide path.
  3. **City tour:** a Ring course past Sangsad Bhaban, Hatirjheel and Ahsan Manzil, below 500 m.
- **Bandarban:**
  1. **Sangu valley run:** Rings low in the valley.
  2. **Ridge tour:** a Ring course over Chimbuk, Nilgiri and Buddha Dhatu Jadi.

**Score:** a charter fee, plus a Ring bonus, a par-time bonus and (for landings) a landing-grade bonus, minus a Fine per missed Ring, times the conditions multipliers. Each Challenge gets 1–3 stars.
- A missed Ring is a Fine; the Challenge continues.
- **Fail:** a crash, or > 10 s outside the Flight Zone after a warning. There's no hard time limit.

**Landing grade:**
- Sink rate: **Butter < 1 m/s, Good < 2 m/s, Firm < 4 m/s**.
- Distance off the centreline.
- Touchdown inside the first 600 m of runway.
- **3 stars** needs Butter or Good, ≤ 5 m off the centreline, and touchdown in the first 600 m.

**Free flight:** unscored, with a **landmark checklist**: flying near a landmark ticks it off, and the count shows in career stats.

**Relaxed mode (default)** applies to Flight Mode too: Challenges never fail and pay no Taka or stars; a crash puts you back at the start after a moment. The end card shows Rings, time against par and, for landings, the grade with its sink rate, centreline offset and touchdown distance. `?mode=scored` adds Taka, stars and the fail conditions above.

## 9. Time of day and weather
[023](docs/wayfinder/tickets/023-define-day-night-and-weather.md), [024](docs/wayfinder/tickets/024-prototype-fog-and-rain.md)

- **Time of day:** four fixed times, **Morning, Midday, Golden hour, Night**, picked in Run setup. There's no cycle within a Run.
- **Weather:** **Clear**, **Monsoon rain**, or **Hill fog** (Bandarban only).
- **Default:** "Random", which weights monsoon higher in Bandarban.
- **Gameplay effects:** see Bus Mode, AI traffic and Flight Mode. Night changes no rules.
- **Until Run setup (M8):** `?time=morning|midday|golden|night` and `?weather=clear|rain|fog`; without them it's Random (Dhaka 70% clear / 30% rain; Bandarban 45% clear / 35% rain / 20% hill fog). Today's conditions show as a toast after the start, with a headlights reminder at night.
- **Flight visibility:** the quality tier's clear-day range (9–20 km), half at night, 4 km in rain, 1.8 km in hill fog. Rain turbulence rocks the wings and bumps the height a little; it never builds up.
- **Flight night lights:** runway edge, threshold (green), end (red) and approach lights, also in rain and fog; Dhaka's window lights (every third building) and street lights along the main roads.

**Rendering techniques (validated at 30 fps on a phone at Low and Medium):**
- **Sky and light:** a sky dome shading from the fog colour at the horizon to a deeper zenith, with the sun's disc and glow, drifting clouds (heavy and grey in rain) and stars on clear nights. Sun/moon directional light at about three times the hemisphere fill, so shade reads. Rain and fog grey the sky and cut the sun to ×0.3. On Medium and High, a clear day's sun casts shadows within 60/90 m of the bus (1024/2048 shadow map, redrawn every other frame: ~60 fps on High in Dhaka).
- **Visibility:** the built-in linear `Fog`. Far distance: day 1500 m, night 600 m, rain 400 m, hill fog ~220 m (near 15 m).
- **Rain:** camera-local `LineSegments` streaks: Low 800, Medium 2,000, High 4,000.
- **Wet roads:** darker Phong with specular on Medium and High; darker only on Low. Puddles are decorative only.
- **Wipers:** a cab-view overlay in rain: drops land and build up on the glass (faster when driving), big ones run down, and two blades sweep their arcs, clearing exactly the drops they pass; the corners they don't reach stay wet.
- **Valley mist:** soft-edged transparent planes, High only, in hill fog.
- **Night:**
  - Dhaka windows come from an emissive window texture, switched on at night.
  - Street lamps are additive glow sprites plus light-pool decals; there are no real lights.
  - Runway and approach lights.
  - Headlights are one `SpotLight` on Medium and High, plus a faint additive beam cone on all tiers.
  - Bandarban is dark apart from the headlights.

## 10. Landmarks
[010](docs/wayfinder/tickets/010-pick-landmarks.md) as amended by [015](docs/wayfinder/tickets/015-revise-chimbuk-and-landmarks.md); locations in [docs/research/landmarks.md](docs/research/landmarks.md)

A **hero** landmark is ≤ 8k triangles and recognisable at a glance. A **simple** landmark is a ≤ 1.5k-triangle block-out with the right silhouette and colour. All landmarks together are ≤ 5 MB per Region.

| Where | Hero (7) | Simple (18) |
|---|---|---|
| Dhaka Route | Farmgate metro station + track · Kuril flyover interchange · Airport Terminal 3 | Jahangir Gate · Mohakhali flyover · Novo Theatre · Banani/Kakoli skyline |
| Dhaka Flight Zone | Jatiyo Sangsad Bhaban | Ahsan Manzil · Shaheed Minar · Hatirjheel lake + bridges · Bashundhara City · Baitul Mukarram · Lalbagh Fort · Sadarghat launches · main airport terminal |
| Bandarban Route | Chimbuk summit (Tourist Centre) · Shoilo Propat falls + stalls | Milonchhari viewpoint · Bandarban Bus Stand |
| Bandarban Flight Zone | Buddha Dhatu Jadi | Nilgiri · Nilachal · Meghla hanging bridge · Sangu river boats |

- **Making them:** the agent builds landmarks as **scripted low-poly models from photo references**, for the user to review. The user touches up hero landmarks in Blender only if they need it.
- **As built (M10):** 22 scripted models in `src/landmarks/models.ts` (100–940 triangles each, far under budget), placed from `src/shared/landmarks.ts`; the bakes clear OSM buildings off each footprint and record ground heights, and in Flight Mode each landmark is solid. Route landmarks also appear in their Flight Zone. Not modelled: the Mohakhali and Kuril flyovers (baked from OSM as elevated decks) and the Banani/Kakoli skyline (it comes with the building-heights work). Jahangir Gate spans the cantonment road beside the Route, as in OSM, so the bus passes it rather than under it. The generic CC bridge, boat and waterfall models were not needed.
- **Free models:** none exist for the landmarks themselves. Generic CC models are used for the Meghla bridge, Sangu boats and Shoilo Propat waterfall.
- **Names and placement:** local names throughout. Landmarks that OSM doesn't name are hand-placed at the research coordinates.

## 11. Vehicles
[003 research](docs/research/vehicle-models.md). These defaults come from research; there was no separate decision ticket.

| Role | Model | Licence | Work |
|---|---|---|---|
| Player bus | "3D Bus" (OpenGameArt) | CC0 | convert to glTF, reskin in Dhaka colours |
| AI buses | Ashok Leyland bus (2.5k) / Meshmill buses | see research | |
| Rickshaw, CNG | asrafullislamsiam (Sketchfab) | CC BY | decimate from 905k / 271k faces to < 10k; fallbacks in research |
| Chander gari | Jeep Willys (skudgee) | CC BY | add open rear tub, benches, canopy |
| Plane | Cessna 172Kr (TonyWony) | CC BY | ~20k faces; fallback Piper L-4H (CC0) |

Check each model's separable parts (wheels, doors, control surfaces) in Sketchfab's inspector before committing. Liveries are colour swaps on these models.

## 12. Controls
[007](docs/wayfinder/tickets/007-prototype-bus-handling.md), [008](docs/wayfinder/tickets/008-prototype-flight-model.md), [017](docs/wayfinder/tickets/017-judge-touch-controls.md), [019](docs/wayfinder/tickets/019-decide-audio.md)

| | Keyboard | Gamepad | Touch (validated on a phone) |
|---|---|---|---|
| Bus | W/↑ gas · S/↓ brake/reverse · A/D steer · F doors · H horn · L headlights · K high beam · Q/E indicators · X hazards · V camera · Tab details · ` language · mouse-drag to look around in the cab | left stick steer, RT gas, LT brake | drag-to-steer area bottom-left (~45% × 45%, 70 px = full lock); GAS and BRAKE bottom-right; DOOR and HORN above GAS; ◀ 💡 ▶ (indicators, headlights) top-right |
| Plane | W/S pitch (**W = nose down**, invert option) · A/D roll · Q/E rudder · Shift/Z throttle · B brakes · V camera | left stick, RT/LT throttle, LB/RB rudder, A brakes | floating virtual stick bottom-left (70 px = full deflection; drag down = nose up); vertical throttle slider and BRAKE bottom-right; no touch rudder |

**Touch, as built (mobile-simulator style, revised 2026-10-28):**
- **Bus:** a steering wheel you turn with a finger (1.25 turns lock to lock, self-centring, tap the hub for the horn), or tilt steering, or ◀ ▶ buttons (Settings); analog brake and accelerator pedals (press lower to press harder); a D/N/R gear lever (R drives backwards on the accelerator, the brake only brakes); a door button; and an icon row for view, lights, indicators, hazards, map and pause.
- **Plane:** a floating joystick under the left thumb (drag down = nose up), or tilt to fly with a re-centre button; a throttle lever with its percentage; wheel brakes; rudder buttons; and the same icon row.
- **Phone:** fullscreen and landscape lock on the first tap, a "turn your phone sideways" screen in portrait, a smaller minimap, and the next-Stop banner left of the icon row.

Cameras: the **driver's cab is the default** (right-hand drive, as Bangladesh drives on the left), with a dashboard, analog speedometer, tell-tale lamps, a steering wheel that turns with the steering, live side mirrors and an amber next-Stop display; V switches to the chase camera. The plane also defaults to its **cockpit**: a panel with airspeed, attitude, altimeter, throttle, heading and vertical-speed instruments, a yoke that follows the controls, the high wing overhead; mouse drag looks around. L toggles the landing light; nav lights, beacon and strobes are always on.

## 13. UI
[018](docs/wayfinder/tickets/018-prototype-hud-and-menus.md), prototype [prototypes/hud-and-menus](prototypes/hud-and-menus/PROTOTYPE-hud-and-menus.html)

- **Look ("Bus art"):**
  - Dhaka bus and rickshaw-art palette: maroon, yellow, teal, red and blue, with patterned borders.
  - Chunky rounded type (Baloo Da 2 / Noto Sans Bengali).
  - Bilingual labels.
  - A big **next-Stop banner** at the top centre in Bus Mode, which also carries STALL in Flight Mode.
  - Colourful tile menus.
- **Layout ("Glass"):** widgets in the screen corners.
  - Bus: speed bottom-left; doors, junction phase and a mini route map top-left; Taka earned, passengers and comfort top-right; pause bottom-right.
  - Flight: airspeed left-middle; altitude and vertical speed right-middle; heading top-centre; Rings and par time top-left; Taka earned top-right; throttle and glide-path cue at the bottom corners.
  - **On phones** the bottom corners belong to the touch controls. Speed moves above the steer area, the throttle readout sits beside the slider, and the glide-path cue moves under the heading.
- **Screens:**
  - mode select with career stats;
  - Run setup: Legs with stars and locks, Full Route, time and weather chips with the live Taka multiplier, "Download for offline";
  - results;
  - settings: quality, invert pitch, language, storage per Region with Delete, export/import save code;
  - licences.
- **As built (M8):**
  - The game opens on the mode select; starting a trip loads it with its choices in the URL (`?play=bus|flight&world=…&leg=1..3|full` or `&challenge=1..3`, `&time=`, `&weather=`), and Menu returns there. Pause is Esc or the ❚❚ button: resume, restart, menu.
  - Driving view first: in relaxed mode the HUD is the next-Stop banner, the minimap (top-left), speed bottom-left in the chase view, and pause. Taka, passengers and comfort appear top-right only in scored mode; details stay behind Tab.
  - Flight adds heading top-centre, airspeed and altitude at the sides and throttle bottom-left in the chase view, and a glide-path cue (bottom-right, under the heading on phones) on the landing Challenge's final.
  - Settings: language, quality (Auto picks Low on phones), play style (relaxed or scored), invert pitch, and the controls list. Storage per Region and the save code arrive with M11 and M9; progress and career stats are kept in localStorage until M9.
- **Loading (v1.0.1):** a bus-art splash painted from `index.html` before any script runs: title, a striped progress bar fed by real loading stages (map, streets around you, traffic and trains, getting ready; flight: zone, terrain, getting ready), a status line and rotating tips in the player's language, and the version. It stays up until the nearby chunks (with their colliders) are in and every shader is compiled, then fades after the first frame. Menu screens that fetch data show a thin progress line across the top.
- **Version and What's new (v1.0.0, 2026-10-28):** the version (`package.json`, built in by Vite) shows quietly in the bottom-left corner of the menu and pause screens. After an update, the menu shows a What's new card once, listing the releases since the player's last version from `src/config/changelog.ts` in their language; first-time players don't see it, and a save from before versions existed sees only the latest release. A **Version history** screen (from the corner version label or the mode-select links) lists every release with its date, newest first, the current one marked. Each release bumps `package.json`'s version and adds a changelog entry. Versions: **0.9.0** was the first public release (M11, 2026-10-27), **0.9.1** added the phone controls and headlight fix, **1.0.0** is the game through M12; the Metro Mode (M13) ships as **1.1.0**.
- **Map menu (v1.2.0):** the game opens on an illustrated map of Bangladesh (land, islands, divisions and big rivers from the OSM extract via `npx tsx scripts/menu-map.ts`, simplified to ~0.8 km into `src/ui/map/bdMap.ts`, 32 KB) with pins for Dhaka and Bandarban and dimmed coming-soon pins (Chattogram, Sylhet, Cox's Bazar, Sundarbans). Choosing a place (its pin, or the matching button) glides the view in (the SVG viewBox is animated) and slides in a destination card: mode tabs (Dhaka: Bus, Plane, Metro; Bandarban: Bus, Plane), a picture of each, then the existing trip setup (Legs or Challenges, time and weather, Start, offline download). On phones under 640 px wide it's a bottom sheet; on short landscape screens the picture is dropped. Routes light up once a Leg on them is done; found landmarks are dots. **Continue** restarts the last trip started from the menu (kept in the save). A **List** toggle (remembered per device) shows the classic card menu. Each release in the changelog has a picture (`public/releases/`), shown in the Version history and the What's new card.
- **Language (revised 2026-10-27):** **বাংলা by default**, English optional. That covers Bangla text and Stop names, Bangla numerals (৳ ১,২৪০, ৩৫ কিমি/ঘণ্টা) and the Noto Sans Bengali font. The choice is remembered on the device.

## 14. Audio
[019](docs/wayfinder/tickets/019-decide-audio.md)

- **Stop announcements:** **Helper call-outs**: the bus Helper shouts each Stop in Bangla, with subtitles that follow the language setting. There are ~20–30 lines, recorded by the user and native-speaker friends on one phone in one quiet room. No text-to-speech.
- **Sounds:**
  - Bus: engine as a three-band pitched loop, brakes and air hiss, doors, horn.
  - Traffic: CNG and bus horns, rickshaw bells, police whistle.
  - Plane: propeller pitched by throttle, wind by airspeed, stall horn, touchdown squeal.
  - Ambience: Dhaka city hum; Bandarban birds, wind, river, and night insects.
  - Weather: rain, wipers.
  - Interface: clicks, a results jingle.
  - No call to prayer.
- **Sources:** Freesound CC0 and CC BY (each clip's licence checked and credited) and the Sonniss GDC bundles, plus field recordings. Engines are pitched loops via Web Audio.
- **Music:** one CC-licensed loop, menus only.
- **Format:** AAC `.m4a`, mono, 64–96 kbps.
- **Budget:** ≤ 5 MB in the shell and ≤ 4 MB per Region, inside the overall budgets.
- **Settings:** volume sliders for master, music, effects and voice; audio mutes when the tab is hidden.
- **As built (M9):** 22 Freesound clips (16 CC0, 6 CC BY 4.0, credited on the Licences screen) taken from Freesound's public HQ previews, which carry the same licence and don't need an account. `npm run audio` cuts, loops, loudness-normalises and encodes them from `data/audio-src/` into `public/audio/` (2.55 MB in all). Engines and the propeller are pitched loops; the stall horn and CNG/car horns are synthesised in Web Audio; the wiper sound is timed to each on-screen sweep. Dhaka traffic honks every few seconds (rickshaw bells, CNG beeps, bus horns), the hill road hardly ever; a police whistle marks phase changes at the junction ahead. The Helper call-outs wait for the recordings ([script](docs/audio/helper-callouts.md)).

## 15. Progression and saves
[020](docs/wayfinder/tickets/020-define-progression-and-saves.md)

- **Unlocks:**
  - Everything is playable from the start.
  - Bus Legs unlock in order (any stars), then the Full Route.
  - Each zone's Challenges unlock in order; free flight is always open.
- **Saved:**
  - best Taka earned and stars per Run;
  - best Challenge grades;
  - settings;
  - downloaded Regions;
  - career stats: km driven, passengers carried, Stops served, flights landed, best landing, landmarks found.
- **Storage:** device-only IndexedDB, plus an **Export / Import save code**. No accounts, no server.
- **Liveries:** career Taka earned unlocks ~5 bus and ~4 plane Liveries at thresholds. Nothing is ever spent.
- **As built (M9):** one IndexedDB record (settings, progress, career, landmarks, chosen Liveries), loaded at start-up; older localStorage progress is carried over once. The save code is that record deflated and base64url-encoded (`TS1-…`, ~300 characters). Career Taka counts fares and charter fees in both play styles, so relaxed players unlock Liveries too (bus at ৳ 5k / 15k / 30k / 60k, plane at ৳ 8k / 20k / 40k). The Helper call-out script is in [docs/audio/helper-callouts.md](docs/audio/helper-callouts.md).

## 16. Hosting, caching and deploy
[022](docs/wayfinder/tickets/022-choose-hosting-and-caching.md), [021 research](docs/research/hosting-and-caching.md)

- **Host:** **Cloudflare Pages** for everything, on the same origin (no CORS, no opaque cache entries). It has PoPs in Dhaka and Chittagong. v1 uses a `*.pages.dev` domain.
- **Limits:** 20,000 files and 25 MiB per file. ~2,500 chunks × 3 detail levels fits. R2 is the fallback if the world outgrows Pages.
- **Shell:** precached by Workbox (≤ 15 MB). Raise Workbox's 2 MiB per-file precache limit where needed.
- **Regions:**
  - By default they stream as you play, cached with `CacheFirst` and `ExpirationPlugin`.
  - An optional **"Download for offline"** fetches a whole Region-mode.
  - Settings show storage used per Region, with Delete.
- **Persistence:**
  - Call `navigator.storage.persist()` after the first Region download. If it's denied, show a one-line warning; cleared data is re-downloaded silently.
  - On iOS, prompt **Add to Home Screen** before the first Region download, and don't offer offline downloads in a Safari tab (it has separate storage).
- **Updates:**
  - Hashed chunk files are served `immutable` with a one-year max-age.
  - When a Region manifest changes, only the changed chunks download, the swap happens once they're all in, and old chunks are deleted.
  - A shell update shows "Update available, restart".
- **Deploy:**
  - Code lives in GitHub; baked Regions are build output and stay out of git.
  - Deploy with `wrangler pages deploy`, from a local machine first and GitHub Actions later.

- **As built (M11):** `vite-plugin-pwa` (Workbox) precaches a 7.4 MB shell (code, styles, icons, sounds) and serves Regions and Flight Zones `CacheFirst` from one cache, with manifests `NetworkFirst`. "Download for offline" in Run setup fills that same cache with every file a Region-mode lists (Dhaka bus: 22.8 MB), then asks `persist()` and shows the one-line warning if it's refused; Settings lists storage per Region-mode with Delete; iPhone Safari tabs get the Add to Home Screen hint instead. A new shell shows "Update available, restart". `public/_headers` serves hashed files `immutable` for a year and manifests and `sw.js` as `no-cache`. The build is 2,752 files and 94 MB, inside Cloudflare Pages' free plan (20,000 files, 25 MiB per file, unlimited bandwidth). `npm run deploy` builds and runs `wrangler pages deploy` from a machine that has the baked data.

## 17. Licences and credits the game must show
[002](docs/research/map-data-and-licences.md), [003](docs/research/vehicle-models.md), [019](docs/wayfinder/tickets/019-decide-audio.md)

- **OSM:** "© OpenStreetMap contributors", ODbL, with a link to openstreetmap.org/copyright. Show it on the splash screen or in the game view, and in the licences menu. **Baked OSM-derived Region data must be offered under ODbL**; the game code and art are not affected.
- **Copernicus**, verbatim: `produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`.
- **Building heights:** Google Open Buildings 2.5D, CC BY 4.0.
- **CC BY credits** for every vehicle model, generic landmark model, sound clip and the music track. Attribution text is in the research files and per clip.

## 18. Verify during the build

These were known gaps the build had to check. None of them is an open decision. Results from M12 (2026-10-28) follow each item.

1. **Minimum phone:** repeat the 30 fps checks on a Helio G99 / Snapdragon 680-class phone. The user's test phone wasn't recorded ([024](docs/wayfinder/tickets/024-prototype-fog-and-rain.md), [017](docs/wayfinder/tickets/017-judge-touch-controls.md)). **Open: needs the user's phone.** Add `?fps=1` to the URL for a frame-rate readout (green at 30 fps or more). On a desktop GPU, High holds ~60 fps in Dhaka with shadows.
2. **Chimbuk height:** **confirmed.** GLO-30 gives 556 m at the Wikidata "Tourist Centre" point (SRTM said ~558 m). That point lies ~210 m off the road and below it; the Thanchi Road tops out at 579 m beside a 592 m knoll. The Stop now stands on the road at that ridge top (22.05755, 92.27342) and the landmark on the knoll beside it (22.0573, 92.2732).
3. **Approximate coordinates:** **snapped.** Bandarban Stops snap to the baked road within 19 m (Bus Stand), 3 m (Milonchhari, Shoilo Propat) and 1 m (Chimbuk). The bake now takes a node within 60 m for hand-placed Stops; a wide radius had let the Route end short of the last one.
4. **Rickshaw ban:** **researched.** DMP orders ban rickshaws and other slow vehicles from Dhaka's main roads (Mirpur Road since 2019; VIP Road and Pragati Sarani named in July 2024), but reports describe wide breaches since August 2024. The game keeps rickshaws off the corridor's carriageways except crossing at junctions and in the kerb lane near Farmgate.
5. **Terminal 3:** **checked.** The building is complete but not open to passengers; the latest target (CAAB, 2026) is a soft opening on 16 December 2026, pending the Japanese operator deal. It's modelled as a finished building with no activity.
6. **Tuning values:** **reviewed.** The fare follows BRTA's May 2026 Dhaka city rate, Tk 2.53 per km with a Tk 10 minimum (was 2.45). Fines, bonuses, par times and Livery thresholds are game balance and stay as set.
7. **OSM figures:** **measured** from the Geofabrik extract (`npx tsx scripts/research/osm-figures.ts`): 3 `route=bus` relations in Bangladesh, 1 touching Dhaka; the Dhaka corridor box has 812 major ways (266 km), 45% with `lanes`, 79% `oneway`, 27% `maxspeed`, 55% `surface`, almost none with `width`; the Bandarban box has 2,688 buildings (none with levels), 575 highway ways (74 major, none with lanes), 8 bus stops, one unnamed bus station, 14 places, and **no** mapped peaks or viewpoints.
8. **Vehicle models:** **not applicable.** All vehicles and landmarks are scripted low-poly models with their moving parts (wheels, doors, wipers, control surfaces) built separately.
9. **Elevated roads:** **done.** Deck heights per `layer` (7 / 12 / 16 m) with ramps to street level; decks are solid and drivable.

## 19. Reference material

- **Prototypes** (throwaway; each starts with a comment explaining it):
  - [bus-handling](prototypes/bus-handling/PROTOTYPE-bus-handling.html)
  - [flight-model](prototypes/flight-model/PROTOTYPE-flight-model.html)
  - [fog-and-rain](prototypes/fog-and-rain/PROTOTYPE-fog-and-rain.html)
  - [hud-and-menus](prototypes/hud-and-menus/PROTOTYPE-hud-and-menus.html)
- **Research:** [docs/research/](docs/research/)
- **Decision trail:** [docs/wayfinder/map.md](docs/wayfinder/map.md) and its 25 tickets.

## 20. Metro Mode (M13)
[025](docs/wayfinder/tickets/025-define-metro-simulator.md); data in [docs/research/metro-line-6.md](docs/research/metro-line-6.md)

A third mode: drive a six-car MRT Line 6 train along the real elevated line, Uttara North ↔ Motijheel. Like the bus, it's relaxed by default; scored play adds stop accuracy, punctuality and comfort.

- **Line:** all 16 open stations, ~20 km, both directions, baked as its own Region (`line6`) from OSM: the viaduct and its two tracks with the 1,500 V overhead line, the 16 station nodes, and the city along it (buildings, roads and traffic below, landmarks such as Farmgate). The Kamalapur extension is out of scope.
- **Legs:** Uttara North → Agargaon (9 stations) and Agargaon → Motijheel (8 stations), and the same two southbound legs reversed; 4 Legs in all.
- **Train:** six cars, ~120 m, top speed 100 km/h. One-dimensional along the track (no physics engine): position, speed and the master controller drive it, with a traction curve that tapers above ~40 km/h, rolling and air resistance and gradients from the viaduct profile.
- **Master controller:** one handle with power notches P1–P4, coast (N), service brake B1–B7 and emergency brake (EB). Full power gives ~0.9 m/s² from rest; B7 ~1.0 m/s²; EB ~1.25 m/s² and stays applied until the train stops. Notch changes are rate-limited so the train doesn't jerk.
- **Signalling and ATP (CBTC-style cab signalling):**
  - The cab display shows the current speed, the permitted speed and the target (distance to the end of movement authority).
  - Permitted speed comes from the static limits (100 km/h line maximum, lower through tight curves and turnouts) and a braking curve to the end of authority: the next station's stop mark, or behind the train ahead.
  - Over the permitted speed: a warning chime at +3 km/h, then a penalty brake at +6 km/h until the train is back under; passing the end of authority triggers the emergency brake.
- **Stations:** elevated, with side platforms (OSM maps no platforms; the user confirms any station that differs), platform screen doors, roofs, Bangla and English name boards, waiting passengers who walk to the doors, board and alight. The stop mark is shown on the platform and in the cab.
- **Stopping and doors:** stop with the train's doors aligned to the screen doors: within ±0.5 m is good, within ±0.3 m perfect. Short or long by more than that, the player can creep (≤5 km/h) to correct within 5 m; beyond it the stop is an overrun. Doors open on the platform side (the cab shows which), passengers board and alight over a ~30 s dwell, then close doors and depart on the dispatch signal.
- **Timetable:** run times between stations add up to ~35 minutes end to end; the on-time window is ±15 s. Other trains run the opposite track on the same timetable, and one runs ahead on yours at the line's 8–10 minute headway, so its tail sets your end of authority if you catch up.
- **Scoring (scored play):** Taka per passenger carried, a stop-accuracy bonus, on-time bonuses, and Fines for overruns, ATP interventions, emergency brakes and Jerky Moments (as on the bus). Relaxed play shows the same feedback without Fines.
- **Cab:** the default view: windscreen, desk with the master controller, speedometer with the permitted-speed marker, the ATP display, door buttons and the dispatch light. Outside views: chase and platform.
- **Announcements:** a chime and Bangla (and English) text for "next station", "doors closing" and arrival, with recorded voices to follow (like the Helper call-outs). The user, who rides the line, checks the wording.
- **Controls:**
  - Keyboard: `W` / `S` notch up (power) and down (brake), `Space` emergency brake, `Q` / `E` open left / right doors, `C` close doors, `V` camera, `M` map.
  - Gamepad: not yet (planned: the right stick moves the master controller; bumpers open doors; A closes them).
  - Touch: a vertical master-controller lever on the right, door buttons on the left, EB on screen.
- **Menu:** a third card, মেট্রো (Metro), with Leg and direction choice; career stats add stations served and kilometres driven.
- **As built (M13a):** `npm run bake -- line6` reads OSM from the Geofabrik extract (no Overpass) and bakes a 19.2 km line (with 180 m of tail track past each terminus): a centreline midway between OSM's two tracks (4.9 m apart), smoothed; rail level 13 m over the 400 m running average of the ground; trains keep left. `line.json` holds both directions' tracks every 5 m with the 16 stations' stop marks (the train's front 60 m past the station centre) and 16 curve speed zones from the curve radius (30–90 km/h; 100 elsewhere). The Region bakes the city along the line (144 chunks, 33.5 MB) with one viaduct from that centreline: deck, parapets, two slab tracks with rails, 680 piers with caps in the road medians, and overhead-line masts, arms and contact wires. Stations and the train come in M13b–d. **As built (M13b):** `?play=metro&world=line6&leg=1..4` drives a six-car train (stainless cars with red and green bands, four doors a side, pantographs on cars 2 and 5) locked to its track: it can't leave the rails, only its speed changes. The master controller has P1–P4, N, B1–B7 and EB (`W`/`S`, `Space`); full power reaches 80 km/h in ~33 s, B7 is ~1.0 m/s² and EB stops from 48 km/h in ~85 m. Six cameras on `V`: cab (default; desk, controller and a screen with speed, limit, notch and next station), chase, alongside, aerial, a passenger seat inside car 3, and trackside. OSM buildings within 8 m of the viaduct are cleared (62 on Line 6). **As built (M13c):** ATP supervises against the most restrictive target ahead: every lower speed zone within 1.5 km and the end of authority (the next stop mark + 10 m), each on a 0.8 m/s² braking curve; a zone's limit holds until the whole train has cleared it. It warns (pulsed chime, OVERSPEED) at +3 km/h and applies a penalty brake at +6 km/h, both judged on the speed 1.5 s ahead while accelerating; the penalty brake builds up twice as fast as the driver's and holds until the train is back under and the controller is off power; passing the EoA fires the emergency brake. The driver display (in the cab and as a bottom-centre panel in every view) shows a 0–100 km/h dial with the permitted-speed hook, the target speed and distance bar, the notch and the ATP lamp. Tested on Line 6: a driver who holds full power gets one penalty brake and is stopped (never over by more than 1.8 km/h, no emergency); a careful driver gets no interventions, stops within 0.35 m of the mark, and reaches Uttara Center in 1.9 min. **As built (M13d):** the bake builds all 16 stations: 180 m side platforms at train-floor height with yellow edges, platform screen doors 0.45 m back with an opening at each of the 24 train doors when the train stops on the mark, back walls, a roof over both platforms on columns, and a concourse block over the street; buildings are cleared 14 m either side of the line at stations (96 on Line 6). Metro Mode adds bilingual name boards (Bangla over English, white on Line 6 green), a yellow car-count stop marker, sliding screen-door and train-door leaves, and a crowd of waiting passengers (busier at Uttara North, Mirpur 10, Agargaon, Farmgate, Karwan Bazar, Shahbag and Motijheel). A stop runs: arriving announcement ~400 m out (with the door side) → stop rated on its error (±0.3 m perfect, ±0.5 m good, up to +1.5 m rough; short means creep up; beyond +1.5 m an overrun skips the station) → `Q`/`E` opens the platform side (the wrong side is refused) → riders get off, then the queue boards, about one person per door per second → "doors may close" after 15 s → `C` closes them with a chime → dispatch: ATP authority to the next station and a "next station" announcement. The door interlock holds the brake while doors aren't locked. The trip starts at the first station with the doors open and people boarding; at the last, everyone gets off. A platform camera joins the set. **As built (M13e):** at start-up the game drives a reference run over each whole track (a careful driver with the same train and ATP); due times are its running times between stations with 6% slack plus a 30 s dwell each, which puts the whole line at about 35 minutes. The banner shows the next station, its distance and "due in" or "late by". Other trains run to the same profile: one 8 minutes ahead on your track (its tail, less 60 m, limits your authority if you catch up) and the two nearest on the other track; ghosts open their doors at stations. Scored play books fares at Dhaka Metro rates (Tk 20 + Tk 5/km, rounded to Tk 5, Tk 20–100, on half the remaining Leg as the average ride), Tk 30/15 for perfect/good stops, Tk 20 on time (±15 s), late arrivals −Tk 1/s and early departures −Tk 2/s (capped at 60), −Tk 5 per passenger left behind, −Tk 100 per overrun, −Tk 50 per penalty brake and −Tk 150 per emergency brake; stars for punctuality, comfort and safety. The Leg ends at its last station with the results screen (Next Leg, Retry, Menu) and is recorded in career stats under `line6`. A test Leg 1 (Uttara North → Agargaon, 8 stops) ran 10.4 km in about 19 minutes with every stop within 0.5 m. **As built (M13f, v1.1.0):** the menu has a third card, মেট্রো, opening Line 6's four Legs (all open from the start) with time and weather and offline download; Settings' storage lists the line. On phones: a vertical master-controller lever (drag up for power, down for brake, snapping to the 12 notches, with haptic ticks), an emergency-brake button, door buttons (left, close, right) and the icon row. Sounds are synthesised: the traction inverters' whine rising with speed, rolling rumble, brake hiss, a squeal in the last metres, and rising/falling door chimes. Gamepad control for the train isn't done yet (keyboard and touch only).
