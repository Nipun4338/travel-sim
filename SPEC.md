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
- **Elevated roads** are baked from OSM bridge ways as decks on pillars, stacked by `layer` because OSM has no height tags: the Elevated Expressway (`layer=3`), MRT Line 6 (`bridge=viaduct`, `layer=6`), and the Mohakhali and Kuril flyovers (`layer=1`). The Dhaka–Ashulia Elevated Expressway is baked *as under construction* (pillars and partial deck). The bus drives at ground level under all of them.
- **Detail:**
  - Bus Mode: full detail within **~250 m** of the Route, with a low-detail backdrop beyond.
  - Flight Mode: the whole Flight Zone at low and medium detail, baked separately (`npm run bake:flight -- <zone>`, output in `public/zones/`). It does not reuse the corridor chunks: the two use different origins and chunk grids.
    - **Terrain** is a 40 m height field, shared by the game for ground contact, drawn as 2 km chunks at 40 m (near) and 100 m (mid), over a whole-zone 400 m backdrop that sits just below them.
    - **Buildings** are read from the Geofabrik extract (`data/raw/osm/bangladesh-latest.osm.pbf`, ~356 MB; Overpass can't serve them all) and baked as boxes (each OSM footprint's smallest enclosing rectangle) drawn instanced and thinned with distance, largest first. The Dhaka zone holds ~900k OSM buildings, too many to bake as meshes. Heights come from tags, else from local building density. The plane crashes on contact with them.
    - Runways come from OSM and are flattened into the ground; roads, water and green space colour the terrain.
- **Style:** flat-shaded low-poly, vertex colours plus a small shared texture atlas, no real-time shadows.
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

### Bandarban Route: Bandarban Bus Stand → Chimbuk (~23.7 km, outbound only)

The road is the Bandarban–Thanchi Road (`secondary`, Z1811). Stops are hand-placed because they aren't bus stops in OSM.

| # | Stop | Lat, Lon | km | Leg |
|---|---|---|---|---|
| 1 | Bandarban Bus Stand (Thanchi Road stands) | ~22.1837, 92.2178 | 0 | Leg 1 start |
| 2 | Milonchhari | ~22.1686, 92.2228 | 3.2 | |
| 3 | Shoilo Propat | ~22.1507, 92.2169 | 6.6 | Leg 1 end / Leg 2 start |
| 4 | Chimbuk (Tourist Centre, on the main road; no side road) | 22.0569, 92.2711 | ~23.7 | Leg 2 end (~17 km) |

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
- **Sky and light:** per-time sky colour, fog colour, sun/moon directional light and hemisphere light. Rain and fog grey the sky and cut the sun to ×0.4.
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

## 17. Licences and credits the game must show
[002](docs/research/map-data-and-licences.md), [003](docs/research/vehicle-models.md), [019](docs/wayfinder/tickets/019-decide-audio.md)

- **OSM:** "© OpenStreetMap contributors", ODbL, with a link to openstreetmap.org/copyright. Show it on the splash screen or in the game view, and in the licences menu. **Baked OSM-derived Region data must be offered under ODbL**; the game code and art are not affected.
- **Copernicus**, verbatim: `produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`.
- **Building heights:** Google Open Buildings 2.5D, CC BY 4.0.
- **CC BY credits** for every vehicle model, generic landmark model, sound clip and the music track. Attribution text is in the research files and per clip.

## 18. Verify during the build

These are known gaps the build must check. None of them is an open decision.

1. **Minimum phone:** repeat the 30 fps checks on a Helio G99 / Snapdragon 680-class phone. The user's test phone wasn't recorded ([024](docs/wayfinder/tickets/024-prototype-fog-and-rain.md), [017](docs/wayfinder/tickets/017-judge-touch-controls.md)).
2. **Chimbuk height:** confirm with GLO-30. The decision used SRTM ([015](docs/wayfinder/tickets/015-revise-chimbuk-and-landmarks.md)).
3. **Approximate coordinates:** the Bandarban Stops and the landmarks not named in OSM are approximate; snap them to the baked road.
4. **Rickshaw ban:** whether cycle rickshaws are banned from the corridor is assumed, not researched ([013](docs/wayfinder/tickets/013-define-ai-traffic-behaviour.md)).
5. **Terminal 3:** it is tagged under construction in OSM; check its current state before modelling.
6. **Tuning values:** fare, Fine and bonus amounts, par times, and Livery thresholds.
7. **OSM figures not measured** (Overpass was overloaded): city-wide bus-route relations, corridor tag statistics, Bandarban peaks and places. See the research files.
8. **Vehicle models:** check separable parts before committing.
9. **Elevated roads:** pick deck heights per `layer`, since OSM has no height tags.

## 19. Reference material

- **Prototypes** (throwaway; each starts with a comment explaining it):
  - [bus-handling](prototypes/bus-handling/PROTOTYPE-bus-handling.html)
  - [flight-model](prototypes/flight-model/PROTOTYPE-flight-model.html)
  - [fog-and-rain](prototypes/fog-and-rain/PROTOTYPE-fog-and-rain.html)
  - [hud-and-menus](prototypes/hud-and-menus/PROTOTYPE-hud-and-menus.html)
- **Research:** [docs/research/](docs/research/)
- **Decision trail:** [docs/wayfinder/map.md](docs/wayfinder/map.md) and its 24 tickets.
