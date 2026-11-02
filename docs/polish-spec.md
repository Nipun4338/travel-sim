# Travel Sim: polish spec (v1.2.2 – v1.6)

*Renumbered 2026-11-02: multiplayer Rooms ship as v1.4 ([multiplayer map](wayfinder/multiplayer/map.md)), so Line 6 moved from v1.4 to v1.5 and Bandarban from v1.5 to v1.6.*

This spec makes the places already in the game faithful to the real ones: the Dhaka bus corridor (Farmgate → Airport), MRT Line 6, and the Bandarban road (town → Chimbuk). Their skylines carry into the Flight Zones. It consolidates the [polish map](wayfinder/polish/map.md) as of 2026-10-31 and gives only the final decisions. Each section links the tickets that hold the reasoning. Domain terms (**Region**, **Route**, **Stop**, **Leg**, **Flight Zone**, **Helper**, …) are defined in [CONTEXT.md](../CONTEXT.md). The v1 rules in [SPEC.md](../SPEC.md) still hold unless a section here changes them.

"Exact" means proportions, placement, colour and density, not photorealism. The look stays flat-shaded low-poly.

---

## 1. Releases

[Order the per-place releases](wayfinder/polish/tickets/013-order-the-releases.md)

| Release | Contents | Sections |
|---|---|---|
| **v1.2.2** (patch) | Bandarban correctness fixes | §5.1 |
| **v1.3**, Dhaka corridor | real heights everywhere, the street-life kit, the Dhaka fixes | §2, §3, §4 |
| **v1.5**, Line 6 | stations, the viaduct view, the corridor under it | §6 |
| **v1.6**, Bandarban | the ridge treatment, roadside life | §5.2–§5.4 |

- **Every release** bumps `package.json`, adds a Bangla and English entry to `src/config/changelog.ts`, retakes the README screenshots, and is checked at 30 fps on a Helio G99 / Snapdragon 680-class phone (§7).
- **Voice recordings don't gate any release.** The Helper call-outs and the Line 6 announcements ship in the first release after their files arrive ([Record the Helper call-outs and Line 6 announcements](wayfinder/polish/tickets/007-record-voices.md)). Wiring them in needs a voice recipe in `scripts/audio/build.ts`: trim the silence, normalise loudness, and write mono AAC to `public/audio/voice/`.

## 2. Real building heights (v1.3, every Region and both Flight Zones; built 2026-11-01)

[Find how to get real building heights](wayfinder/polish/tickets/001-get-real-building-heights.md), [Spot-check the Open Buildings heights](wayfinder/polish/tickets/008-spot-check-building-heights.md), [research](research/building-heights.md)

- **Source:** Google Open Buildings 2.5D Temporal, the 2023 layer. Range-read the 4 m overview (IFD 12) of the public COGs at `storage.googleapis.com/open-buildings-temporal-data/v1/`; no account is needed. Use the same pattern as `copernicusWindow` in `scripts/bake/fetch.ts`, and cache under `data/raw/`.
  - Dhaka and Line 6: `3755c_2023_06_30/tile_XYLMruB9JYI.tif` and `tile_RVWusgMM8gU.tif`.
  - Bandarban: all three tiles under `30ad4_2023_06_30/`, not just the town tile.
  - Bands are in the order fractional_count, height, presence. The decoder needs deflate with predictor 3 (floating point), planar-separate.
- **Precedence for each building** (replaces the OSM-only rule in `buildingHeight`, `scripts/bake/build.ts`):
  1. OSM `height`.
  2. OSM `building:levels` × 3.2 m + 1 m. Ignore any tag above 45 floors.
  3. Google **p75** of the built pixels (presence > 0.5) whose centres fall inside the footprint. Use it unscaled.
  4. **1 floor** when no pixel falls inside and the footprint is under 100 m².
  5. Otherwise the per-type default.
- **Accepted error:** a mean of 1.6 floors against 12,462 OSM-tagged buildings (the flat default's is 2.6). Mid-rise reads about 1.7 floors low. The dataset clips at 100 m (about 31 floors); the few taller towers have OSM tags or are landmarks.
- **Bandarban:** cap anything more than about 2 km from the town centre at 10 m.
- **Credit** in the credits screen and README: Google Open Buildings 2.5D Temporal, CC BY 4.0. It contains modified Copernicus Sentinel data (2016–2023) processed by ESA; cite Sirko et al. 2023.

## 3. The street-life kit (built in v1.3, reused in v1.5 and v1.6; built 2026-11-01 for Dhaka)

[Choose how street life is made](wayfinder/polish/tickets/009-choose-street-life-approach.md), [prototype](../prototypes/street-life/PROTOTYPE-street-life.html)

- **Procedural low-poly, generated in the bake** from boxes and quads like today's signboards. No CC models.
- **Painted Bangla signage** from **one 1024² atlas per Region**, generated at bake time: shop names, phone numbers in Bangla digits, and billboard slogans. No real brands. It adds one material, so one draw call per chunk.
- **Parts:**
  - ground-floor boards and awnings;
  - boards stacked up the façades;
  - blade signs over the footpath;
  - rooftop billboards facing the road;
  - electric poles every ~30 m with sagging wire bundles (line segments), junction boxes, coils and posters strapped to the poles;
  - tea stalls (counter, tarp, bench, kettle);
  - parked rickshaws with bright hoods;
  - static low-poly people, clustered at stalls and Stops.
- **Density D (busy):** boards stacked 3 floors up, blade signs over about half the frontages, 12 wires per pole span with coils, a stall every ~25 m, about 80 people and 10 rickshaws per 200 m, and rooftop billboards on about 45% of buildings 12 m or taller.
- **Density C (medium):** 2 floors, a quarter of the frontages, 6 wires, a stall every ~45 m, about 35 people and 4 rickshaws per 200 m, and billboards on 25% of buildings.
- **Where each density applies:** D on commercial stretches (OSM shop or commercial tagging along the frontage) and C elsewhere on the Dhaka corridor. C along Line 6. Bandarban gets only stalls and hand-painted roadside signs: no wires and no stacked boards.

## 4. Dhaka bus corridor (v1.3, built 2026-11-01)

As built: the bake code is `scripts/bake/heights.ts`, `streetlife.ts` and `infill.ts`; Kuril and Khilkhet got 343 infill lots (km 8.6–11) because OSM lacks the roadside shophouses there; the sign atlas is painted in the browser (`src/render/signAtlas.ts`), so it adds nothing to the download. Dhaka's Region is 28 MB.

[Rank the fidelity gaps](wayfinder/polish/tickets/006-rank-fidelity-gaps.md), [comparison shots](images/polish/README.md)

1. **Skyline:** real heights (§2). The Banani, Kakoli and Mohakhali towers come out at 15–25+ floors, and side buildings come out lower.
2. **Street life:** the kit at D and C (§3).
3. **Kuril and Khilkhet:** build up the Kuril Bishwa Road edge, which is busy and built up in reality, and make the Kuril interchange read as the hero landmark planned in v1.
4. **Weathering:** a palette and texture pass with no new geometry. Dustier, more weathered walls, white-tile and glass façades on the newer towers, a patched road surface, worn markings, and railings on the medians.
5. **Route length:** the baked Route is 12.58 km against the 13.94 km routed in [landmarks.md](research/landmarks.md). *Checked in v1.3:* the bake is right (trunk and primary roads, no loops; stop to stop in straight lines is 12.0 km); the OSRM figure carried snapping and via-point detours, so SPEC §5 now gives the baked km.

## 5. Bandarban road

### 5.1 Correctness (v1.2.2, built 2026-10-31)

As built: the Route is 22.82 km (Stops at 0, 2.2, 5.7 and 22.8 km). The summit complex is 103 m off the road, so the Stop stayed on the road and only the landmark moved; from the cab it is hidden by forest, which the user accepted for accuracy.

[Ground-truth the Bandarban road](wayfinder/polish/tickets/004-ground-truth-bandarban-road.md), [research](research/bandarban-road.md)

- **Reroute km 2.57–3.74** back onto the Thanchi Road (Z1811). The baked Route leaves it for two untagged unclassified ways. The real Route is about 22.8 km.
- **Chimbuk:** satellite imagery puts the summit complex at about 22.0571, 92.2724, roughly 100 m from today's Stop and 85 m from the landmark. Move the Stop and landmark there, provided the Stop stays **on the Thanchi Road**. SPEC §18 item 2 put the Stop at the road's ridge top (22.05755, 92.27342) because the Tourist Centre point lies off and below the road. If the summit complex isn't on the road, move only the landmark.
- **Update SPEC §5:** the Stop km figures. The baked Route puts the intermediate Stops at 2.22 and 5.46 km, against SPEC's stale 3.2 and 6.6; recompute them after the reroute.
- **Remove the yellow centre line.** The real road is one unmarked paved lane of about 4–6 m. The baked 5.5 m width stays.

### 5.2 Ridge drops and long views (v1.6)

[Choose how the Bandarban road gets its ridge drops](wayfinder/polish/tickets/011-ridge-feel-bandarban.md), [prototype](../prototypes/bandarban-ridge/PROTOTYPE-bandarban-ridge.html)

GLO-30 includes the forest canopy. The current filter (min ±30 m, blur ±30 m) plus the 30 m cut-and-fill blend leaves the road in rounded green banks.

- **Ground filter:** take the min over **±2 GLO-30 pixels (±60 m)** instead of ±1 (`terrainFilter.minPx: 2` for Bandarban), then the same blur.
- **Valley side:** where natural ground is below the road, drop from the shoulder at about **2.2 : 1** to the real slope, with no 30 m fill blend.
- **Uphill side:** the cut bank blends over about **18 m**.
- **Parapets:** black-and-white painted roadside walls, about 0.6 m high, only where the ground falls **≥ 8 m within 12 m** of the road edge.
- **Visibility:** on a clear day the road fog goes out to about **16 km** in Bandarban (SPEC §9's 1500 m stays for Dhaka). Night, rain and fog keep their SPEC §9 values.
- **Backdrop:** a distant terrain mesh from the Bandarban Flight Zone DEM at **240 m** spacing (about 45k triangles), 36 km across and sunk below the near terrain. Chunk LOD distances stay as they are (350, 1100 and 2800 m).
- **No relief exaggeration.**

### 5.3 Roadside life and traffic (v1.6)

- Stalls at Shoilo Propat.
- The army canteen and registration point at Chimbuk.
- Bawm stilt houses at Laimi, Saron and Murolong Para (OSM villages).
- Hand-painted roadside signs (§3).
- Thanchi buses and chander gari jeeps join the Bandarban AI traffic (SPEC §7).

### 5.4 Vegetation (v1.6)

- **Jhum patches** (slash-and-burn clearings) on the slopes, as ground colour only.
- **No undergrowth.** Bandarban's chunks are already the heaviest (287k triangles at LOD 0).

## 6. MRT Line 6 (v1.5)

[Research how the Line 6 stations really differ](wayfinder/polish/tickets/003-research-line6-stations.md), [Shape the four station models](wayfinder/polish/tickets/010-shape-line6-station-models.md), [prototype](../prototypes/line6-stations/PROTOTYPE-line6-stations.html), [research](research/line6-stations.md)

### 6.1 Stations

These replace the generic platform in `buildStations` (`scripts/bake/metro.ts`) and the Farmgate hero (`farmgateMetro` in `src/landmarks/models.ts`). All stations are about 180 m long and straight along the track.

| Type | Stations | Model |
|---|---|---|
| **A** (detailed, ~7.6k tris) | Uttara South, Pallabi, Mirpur 11, Mirpur 10, Kazipara, Shewrapara, Agargaon, Karwan Bazar, Shahbag, Dhaka University, Bangladesh Secretariat, Motijheel | see the parts list below |
| **B** (~8k) | Uttara Center: an arch of alternating green and red curved panels at each roof end. Bijoy Sarani: a glazed fan arch with a green rim, plus brick stair towers with green caps | type A plus the arch end |
| **C** | Uttara North | two side platforms on the through tracks; the other two OSM tracks drawn as depot track with no platforms; tree-like branching steel columns; open sides above a low terracotta parapet; the widest roof. **Unconfirmed:** revise if a rider's check says otherwise. |
| **D** (~6.6k) | Farmgate | a full-height cream grid façade over terracotta, a low teal roof, and covered skywalks (green roofs on terracotta trusses) out to both pavements. Replaces the white barrel-roof hero. |

**Type A parts:**
- terracotta wall panels between grey pilasters every ~9 m, with thin cream bands;
- an arched grey steel roof with a green edge, a skylight band and visible curved trusses;
- 6 m side platforms (track centres about 5 m apart), half-height PSDs (1.55 m), and stairs, escalators and benches;
- a concourse box straddling the road on piers.

**Signage** (one small canvas atlas per station):
- over the road opening, a white fascia reading Bangla name | red-and-green logo | English name;
- on the platforms, green-ring roundels with a white name bar;
- at the street entrances, green canopies and a green sign with white Bangla and English text and an exit letter.

### 6.2 The view from the viaduct and the corridor below

- Real heights (§2), and the street-life kit at C (§3).
- Billboards facing the viaduct, and rooftop clutter: water tanks, rails, dish antennas.
- Dense campus and park trees between Dhaka University and the Secretariat (Suhrawardy Udyan, Ramna) instead of bare ground.
- AI road traffic on the road under the viaduct. Metro mode already downloads the lane graph.
- Diabari (Uttara Center–Uttara South) stays open ground.

## 7. Budgets and verification

[Measure what the chosen fixes cost](wayfinder/polish/tickets/012-measure-budget-cost.md)

- **Budgets unchanged** (SPEC §2: ≤ 60 MB per Region-mode, ≤ 600 MB memory, 30 fps on the minimum phone).
- **Expected worst-case downloads** after all releases, counting the GLBs as uncompressed in transit: Dhaka ~22 MB, Line 6 ~45 MB, Bandarban ~35 MB.
- **Line 6 has the least headroom.** Serving `lanes.*.json` compressed (it shrinks 20.6 → 8.9 MB) or trimming it for metro wins most of it back.
- **Each release, verify:**
  - 30 fps at Low and Medium on a Helio G99 / Snapdragon 680-class phone, on the busiest stretch (Banani for v1.3, Farmgate and Karwan Bazar for v1.5, the Chimbuk ridge for v1.6);
  - the Region download size from the manifest;
  - fresh in-game vs real comparison shots at the spots in [the comparison sheet](images/polish/README.md).

## 8. Not in this spec

- **Other landmark models** (beyond the Line 6 stations and the Kuril interchange), and **whether the Flight Zone skyline needs more than real heights:** a short follow-up map after v1.3, judged from air shots and street views.
- **A closer pass on the existing vehicles**, and **time-of-day traffic and haze:** not flagged by the comparisons.
- **New places**, **upstream OSM edits**, **photorealism**, and **full detail across the 30–40 km Flight Zones:** see the map's Out of scope section.
