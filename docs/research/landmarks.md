# Landmarks: model candidates, locations and elevated-road tags

Research for ticket [014](../wayfinder/tickets/014-find-landmark-models-and-locations.md). It checks the 24 landmarks chosen in ticket [010](../wayfinder/tickets/010-pick-landmarks.md) against the Route paths and Flight Zones fixed in ticket [012](../wayfinder/tickets/012-adjust-region-bounds.md). Checked 2026-10-26. Nothing was downloaded. Methods follow [vehicle-models.md](vehicle-models.md) and [route-and-airport-coverage.md](route-and-airport-coverage.md); facts already recorded there are not repeated.

## How this was checked

- **Sketchfab**: search through `api.sketchfab.com/v3/search?type=models` (with and without `downloadable=true`). Every candidate's licence, author, downloadable flag and face count was then re-read from its own record, `api.sketchfab.com/v3/models/{uid}`, which is the data the model page shows. Sketchfab "faces" are triangles. Sketchfab's "CC Attribution" is CC BY 4.0. Downloadable Sketchfab models are offered as auto-converted glTF/GLB.
- **Poly Pizza**: search pages, then each model page (licence label, author, and the page's own `Tris` value). Poly Pizza "Creative Commons Attribution" is CC BY 3.0.
- **OpenGameArt**: advanced search, 3D art type; the licence was read from the asset page.
- **Locations**: Nominatim name lookups (one per second); OSM API v0.6 `way/{id}/full`, `way/{id}` and `map` calls on boxes of at most about 0.0003 deg²; Wikidata `wbgetentities` (P625 coordinate) where OSM has no feature. Wikidata points are labelled as non-OSM.
- **Overpass**: 3 queries, one at a time, 50 s server timeout, 60 s client timeout. 1 succeeded on `overpass-api.de` (data timestamp 2026-10-26T16:41Z). 2 failed (502 from `overpass-api.de`, then no response from `overpass.kumi.systems`; the first one was also tried on `overpass.private.coffee`, one attempt more than planned). Their results are marked **not measured** below.
- **Route paths**: rebuilt with the public OSRM demo router (car profile), as ticket 009 did.
  - Dhaka: the 9 Stop nodes from ticket 009, plus via points at Navy Mor (node 12078089390) and MES (node 12078082748) to keep the path off the Expressway, with northbound bearing constraints. Result: **13.94 km**, inside the 13.5–14.8 km arterial range accepted in ticket 012. Checked by OSM node IDs: the path shares no nodes with the Expressway, the Kuril Flyover or the New Airport Road bridge ways (see the elevated-roads section).
  - Bandarban: Ruma Bus stopage (node 477229972) → Milonchhari → Shoilo Propat → Chimbuk point (22.0576, 92.2549), as fixed in ticket 012. Result: **24.38 km**. Ticket 012's 25.3 km counts from the interdistrict stop, about 0.9 km further back, so the km figures below are about 0.9 km lower than ticket 012's.
- **Inside bounds**: for Routes, the minimum distance from the landmark's OSM geometry (all nodes of a way, or the node) to the routed polyline, compared with ±250 m. For Flight Zones, the landmark point is tested against the square: Dhaka centre 23.7628, 90.3913, ±15 km (lat 23.6279–23.8977, lon 90.2439–90.5387); Bandarban centre 22.054, 92.273, ±20 km (lat 21.8741–22.2339, lon 92.0789–92.4671).
- **Terrain at Chimbuk**: one read-only SRTM 30 m lookup through `api.opentopodata.org` (17 points). This is a cross-check only; the project's terrain source is GLO-30.
- **Budgets** (ticket 010): hero ≤ 8k triangles, simple ≤ 1.5k.

## 1. Dhaka Route

| Landmark (010 tier) | OSM id / coordinate | Distance to Route | Inside ±250 m? | Best model candidate |
|---|---|---|---|---|
| Farmgate metro station (hero) | [way 1125768748](https://www.openstreetmap.org/way/1125768748) `railway=station`, `building=train_station`, `layer=3`; 23.75906, 90.38708 | 174 m, at km 0.27 | **yes** | **None found.** "Dhaka Metro Rail 2023" by Sohaib Studio ([Sketchfab 20b148c8…](https://sketchfab.com/3d-models/dhaka-metro-rail-2023-20b148c8325f49deb68a69fc4e4529c0), 31,891 tris) and "Dhaka Metro Rail 2022" (943,227 tris) have **no licence and are not downloadable**. Generic stand-in only: "Low Poly American Metro Station" by Fr0g, [Sketchfab](https://sketchfab.com/3d-models/low-poly-american-metro-station-1fd4898142864627a52702061d0ee0f9), CC BY 4.0, credit "Low Poly American Metro Station" by Fr0g, 2,245 tris, glTF; fits hero. |
| …and elevated track (part of the same hero) | MRT Line 6 viaduct [way 612562211](https://www.openstreetmap.org/way/612562211) and [way 671984898](https://www.openstreetmap.org/way/671984898) | 4–6 m, crossing at km ~0.05 | **yes, at the start only** | Baked from OSM (ticket 010). The next station, Bijoy Sarani ([way 1125773738](https://www.openstreetmap.org/way/1125773738)), is 574 m off the Route. |
| Kuril flyover interchange (hero) | "Kuril Flyover" [way 316785308](https://www.openstreetmap.org/way/316785308) `bridge=yes`, `layer=1`; 23.82235, 90.42003. Second "Kuril Flyover" [way 1307888384](https://www.openstreetmap.org/way/1307888384) (`motorway_link`, no bridge tag) at 266 m | 0 m (passes over the Route), km 10.3 | **yes** | **None found.** "Kuril FBX" by Fazlul Karim ([Sketchfab d55ea376…](https://sketchfab.com/3d-models/kuril-fbx-d55ea3766b404374b2b517951ceebe83), 191,100 tris) has **no licence and is not downloadable**. |
| Airport Terminal 3 (hero) | "Terminal-3" [way 1172183216](https://www.openstreetmap.org/way/1172183216) `aeroway=terminal`, `building=construction`; 23.84325, 90.41205 | 70 m, at km 13.18 | **yes** | **None found.** Generic stand-in: "Airport" by Awesome Ploy 3D, [Sketchfab](https://sketchfab.com/3d-models/airport-8acd6dcbd6464f38a7e6687745b3eb33), CC BY 4.0, 3,398 tris, glTF (a whole toy airport, not T3). |
| Jahangir Gate (simple) | "Bir sheresto Jahangir Gate (Army Cantoment Gate)" [node 416019870](https://www.openstreetmap.org/node/416019870) `barrier=gate`; 23.77559, 90.38980 | 0 m, at km 2.07 | **yes** | **None found.** |
| Mohakhali flyover (simple) | "Mohakhali Flyover" [way 32109000](https://www.openstreetmap.org/way/32109000) and [way 141697339](https://www.openstreetmap.org/way/141697339), `bridge=yes`, `layer=1`; 23.77874, 90.39815 | 0–1 m (over the Route), km 3.0–3.65 | **yes** | Baked from OSM (ticket 010); no Mohakhali-specific model found. |
| Bangabandhu Novotheatre (simple) | "নভোথিয়েটার" / `name:en` "Novo Theatre" [way 737591047](https://www.openstreetmap.org/way/737591047) `amenity=planetarium`; 23.76385, 90.38783 (Wikidata [Q4855003](https://www.wikidata.org/wiki/Q4855003) "Novo Theatre, Dhaka") | 13 m, at km 0.77 | **yes** | **None found.** Generic dome stand-ins exist (e.g. "Planetarium" by NEEEU Spaces GmbH, 1,900 tris, CC BY 4.0); not verified on the model page. |
| Banani/Kakoli skyline (simple) | No single feature. Anchor: Kakoli Bus station [node 12078090908](https://www.openstreetmap.org/node/12078090908), 23.79523, 90.40090. Banani place node 5166963838 is 752 m off the Route. | 10 m (anchor), at km 6.19 | **yes** (anchor) | Not applicable: hand-placed towers. |

## 2. Dhaka Flight Zone

All points are well inside the square; the nearest edge is 8.7 km away.

| Landmark (010 tier) | OSM id / coordinate | Inside square? | Best model candidate |
|---|---|---|---|
| Jatiyo Sangsad Bhaban (hero) | [way 24448328](https://www.openstreetmap.org/way/24448328) `building=yes` (and office relation 18085267); 23.76229, 90.37855 | **yes** (13.7 km from edge) | **None free.** Three models exist; **none has a licence or is downloadable**: "Jatiya Sangsad Bhaban - BangladeshParliament" by Sabit Hasan ([Sketchfab c7a764c2…](https://sketchfab.com/3d-models/jatiya-sangsad-bhaban-bangladeshparliament-c7a764c290b747939c97dcaa304a0c08), 906 tris, low poly); "National Assembly Building, Bangladesh" by hrahaman (156,078 tris); "Parlamento de Bangladesh" by Trasancos (26,804 tris). |
| Ahsan Manzil (simple) | [relation 8665455](https://www.openstreetmap.org/relation/8665455) `tourism=museum`; 23.70848, 90.40560 | **yes** (9.0 km) | **None found** (Sketchfab, with and without the downloadable filter; Poly Pizza; OpenGameArt). |
| Shaheed Minar (simple) | Central Shaheed Minar [node 401826555](https://www.openstreetmap.org/node/401826555) `historic=monument`; 23.72721, 90.39664. Nominatim also returns several other "Shaheed Minar" monuments in Dhaka; this is the central one. | **yes** (11.0 km) | "Shahid Minar" by Eshtiaque Ahmad, [Sketchfab](https://sketchfab.com/3d-models/shahid-minar-96a5e08762f3425c8eb2aa7c277e324e), CC BY 4.0, credit "Shahid Minar" by Eshtiaque Ahmad, **80,808 tris**, glTF. That is about 54× the simple budget, so it needs heavy decimation. Also CC BY: "shahid minar kolpokar" (72,340 tris, painted in VR with Open Brush, so it is strokes, not solid geometry). Not downloadable / no licence: Jahidul Islam (51,338), Pranto (13,669), Studio 23 (27,722, "Standard" paid licence). |
| Hatirjheel lake and bridges (simple) | Lake [way 315929350](https://www.openstreetmap.org/way/315929350) and [relation 7390108](https://www.openstreetmap.org/relation/7390108) `water=lake`; 23.76363, 90.41084 | **yes** (13.0 km) | **None found**; the water comes from OSM. |
| Bashundhara City (simple) | [way 24448713](https://www.openstreetmap.org/way/24448713) `shop=mall`; 23.75114, 90.39064 | **yes** (13.7 km) | **None found.** |
| Baitul Mukarram (simple) | [way 186664126](https://www.openstreetmap.org/way/186664126) `amenity=place_of_worship`; 23.72947, 90.41262 | **yes** (11.3 km) | **None found.** Generic mosques (domes and minarets) do not match its cube form. |
| Lalbagh Fort (simple) | [relation 8665449](https://www.openstreetmap.org/relation/8665449) `historic=fort`; 23.71884, 90.38815 | **yes** (10.1 km) | Partial: "Lalbagh Fort Mosque" by talatmahmud, [Sketchfab](https://sketchfab.com/3d-models/lalbagh-fort-mosque-fe0cefe46cb940c580ff2cba0f20aa77), CC BY 4.0, credit "Lalbagh Fort Mosque" by talatmahmud, **51,166 tris**, glTF, 1 animation. It covers only the mosque in the complex, and is about 34× the simple budget. |
| Sadarghat launches (simple) | "BIWTA Dhaka River Port, Sadarghat" [node 13001984428](https://www.openstreetmap.org/node/13001984428) (tagged `natural=beach`); 23.70589, 90.40929 | **yes** (8.7 km) | **No launch model found** (multi-deck river ferry). Bangladeshi country boats exist: "Boat" by Tahm1d, [Sketchfab](https://sketchfab.com/3d-models/boat-defac59a212c42d19e2fdd1fa733561c), CC BY 4.0, 42,684 tris; "Traditional Bangladeshi Boat" by Zamir Uddin, [Sketchfab](https://sketchfab.com/3d-models/traditional-bangladeshi-boat-45ab977c53aa44c3b9c81052dcf19b57), CC BY 4.0, 114,608 tris. |

## 3. Bandarban Route

| Landmark (010 tier) | OSM id / coordinate | Distance to Route | Inside ±250 m? | Best model candidate |
|---|---|---|---|---|
| Chimbuk summit, rest house and tower (hero) | **Not in OSM.** Two Wikidata points, 1.67 km apart: "Chimbuk hill" [Q64517866](https://www.wikidata.org/wiki/Q64517866) 22.05757, 92.25491 (the Route end in ticket 012); "Chimbuk Tourist Centre" [Q122641873](https://www.wikidata.org/wiki/Q122641873) 22.05686, 92.27109. OSM API boxes around both found only a `tertiary` road and a `path`: no rest house, tower or viewpoint. | Hill point: 45 m, at km 24.42. Tourist Centre: **462 m**, at km 22.50 | Hill point: **yes**. Tourist Centre: **no** | **None found.** |
| Shoilo Propat falls and stalls (hero) | "Shailopropat waterfall" [node 477231481](https://www.openstreetmap.org/node/477231481) `tourism=attraction`; 22.15067, 92.21688 (Wikidata [Q137360613](https://www.wikidata.org/wiki/Q137360613) 43 m away) | 3 m, at km 5.71 | **yes** | Generic only: "Waterfall" by Poly by Google, [Poly Pizza](https://poly.pizza/m/7mrPbZToHh2), CC BY 3.0, credit "Waterfall" by Poly by Google, 1,329 tris, glTF/OBJ. Also "Toon Waterfall" by doodlebuilt, [OpenGameArt](https://opengameart.org/content/toon-waterfall), CC0, triangles not stated, GLB. |
| Milonchhari viewpoint (simple) | No viewpoint in OSM. Only "Milon Chori" [node 477234209](https://www.openstreetmap.org/node/477234209) `tourism=guest_house`; 22.16861, 92.22284 | 4 m, at km 2.24 | **yes** | **None found.** |
| Bandarban Bus Stand (simple) | "Ruma Bus stopage" [node 477229972](https://www.openstreetmap.org/node/477229972) (Thanchi Road stands, as in ticket 012); 22.18368, 92.21780 | 14 m, at km 0 | **yes** | **None found.** |

## 4. Bandarban Flight Zone

| Landmark (010 tier) | OSM id / coordinate | Inside square? | Best model candidate |
|---|---|---|---|
| Buddha Dhatu Jadi (hero) | [node 1544979770](https://www.openstreetmap.org/node/1544979770) `amenity=place_of_worship`, `religion=buddhist`; 22.22311, 92.19772 (same as Wikidata [Q4984151](https://www.wikidata.org/wiki/Q4984151)) | **yes**, but only **1.2 km** inside the north edge | **None found.** Nearest generic: "Golden Stupa" by Toku, [Sketchfab](https://sketchfab.com/3d-models/golden-stupa-8d7862c7592e4b6c9240bbac55cd92c9), CC BY 4.0, 6,358 tris, glTF. It is a Tibetan stupa, not the Burmese-style temple. |
| Nilgiri hilltop resort (simple) | No named resort in OSM. Unnamed `tourism=motel` [node 4563662790](https://www.openstreetmap.org/node/4563662790), 21.91284, 92.32448, next to "Nilgiri Heliport" (way 1279863989); 29 unnamed buildings in the box. | **yes** (4.3 km from the south edge) | **None found.** |
| Nilachal (simple) | "Nilachol Tourist Spot" [node 10089049705](https://www.openstreetmap.org/node/10089049705) `tourism=attraction`; 22.16863, 92.20988 | **yes** (7.3 km) | **None found.** |
| Meghla hanging bridge (simple) | No bridge way in OSM (in the OSM API box 92.183–92.193 E, 22.178–22.187 N). "Megla" [node 477232196](https://www.openstreetmap.org/node/477232196), 22.18138, 92.19112, a GPS waypoint with only `name` and `ele`. Wikidata "Meghla Hanging Bridge 1" [Q122644019](https://www.wikidata.org/wiki/Q122644019) 22.18157, 92.18936; "Meghla Parjatan Complex" [Q55232254](https://www.wikidata.org/wiki/Q55232254) 22.18278, 92.18767 | **yes** (5.8 km) | Generic: "Low Poly Hanging Bridge" by Jacobs Development, [Sketchfab](https://sketchfab.com/3d-models/low-poly-hanging-bridge-4f9cca8dba4d4c24b14112854682eafa), CC BY 4.0, credit "Low Poly Hanging Bridge" by Jacobs Development, **476 tris**, glTF; fits simple (modelled partly broken). Alternative: "rope bridge" by Jeremy Eyring, [Poly Pizza](https://poly.pizza/m/88e4zjTShuY), CC BY 3.0, 7,044 tris. |
| Sangu river boats (simple) | River [way 126408661](https://www.openstreetmap.org/way/126408661); "Kyaching Ghat" [node 4707928679](https://www.openstreetmap.org/node/4707928679) `waterway=boatyard`, 22.18331, 92.23059 | **yes** (5.6 km) | Generic: "Boat" by Pixel, [Poly Pizza](https://poly.pizza/m/YwdXrwbN3o), CC BY 3.0, credit "Boat" by Pixel, 412 tris, glTF/OBJ; fits simple. Bangladeshi country boats (Sadarghat row) would need decimation. |

### Provenance flags

- **"Halo 1>Multiplayer>Xbox>Damnation"** ([Sketchfab d8cc4f71…](https://sketchfab.com/3d-models/halo-1multiplayerxboxdamnation-d8cc4f71e9b9493eb163ce79d6914470), labelled CC BY, 7,532 tris). It came up in the "hanging bridge" search. The title and description match a map from the commercial game Halo, so the uploader probably has no right to license it. **Avoid.**
- **"Free Fire Bangladesh Jersey female 3D Model"** (labelled CC BY). The name points to the commercial game Free Fire. It is not a landmark, but avoid it.
- **"Mosque Low Poly"** by "Free Models." (CC BY). Its description names a different user (00amza), so who made it is unclear.
- **"Modern Urban Flyover (Lowpoly)"** (CC BY 4.0, 714 tris). The licence is fine, but the uploader's display name is "ANTISEMITIC". CC BY requires crediting that name in the credits.
- The landmark-specific Bangladeshi models (Sangsad Bhaban, Dhaka Metro, Kuril, three Shaheed Minars) are **not downloadable and carry no licence** in their API records. Using them would need the author's permission.

## 5. Elevated roads: OSM tags along the Dhaka Route

The OSM API `map` was called on 14 boxes (±0.0012°, about ±130 m) centred every 1 km along the routed path. Every way with `bridge`, `layer` ≠ 0, `highway=motorway` or a `railway` tag was listed. Selected ways:

| Structure | Way(s) | Route km (nearest) | `bridge` | `layer` | `height` / `level` | Other |
|---|---|---|---|---|---|---|
| Dhaka Metro Line 6 viaduct | 612562211, 671984898 | 0.05 (crosses the Route at Farmgate) | `viaduct` | **6** | none | `railway=subway` |
| Expressway ramp near Farmgate | 1558255166 | 0.15 | `yes` | 1 | none | `motorway_link`, `lanes=2`, **`maxheight=5.5`** (clearance under it, not deck height) |
| Farmgate foot over-bridges and steps | 1561039838, 223101282, 1561039834–44 | 0–0.15 | `yes` | 1 | none | `highway=pedestrian/footway/steps` |
| Untagged raised section | 33071363 | 2.05 | none | 1 | none | `secondary`. The **bus path uses 7 of its 42 nodes**. |
| Mohakhali Flyover | 32109000, 141697339 | 3.0–3.65 | `yes` | 1 | none | `trunk`, `lanes=2`, `oneway=yes`. The bus path shares only 2 end nodes of 32109000, so it stays at ground level. |
| Dhaka Elevated Expressway mainline | 1172183209, 1172183210, 1141567280, 1141567281, 1205224868 | 6.6–7.8 (3–34 m off) | `yes` | **3** | none | `motorway`, `lanes=2`, `oneway=yes`. Within 130 m of the Route only between about km 4.4 and 7.8; not seen in boxes km 8–13. |
| Expressway ramps | 1369887131, 1208216073, 1172183230, 1172183231–34, 1172183235 | 5.2, 6.9–7.2, 9.8–10.1, 12.7 | `yes` | 1, 2 or 3 | none | `motorway_link` |
| New Airport Road bridges | 490187951, 490187952 | 7.65 | `yes` | 1 | none | `trunk`, `lanes=1` (over the railway) |
| Kuril Flyover loops and ramps | 316785308, 316785312 (Pragati Sarani), 223107026, 223108055, 565413536 | 8.5–11.0 | `yes` | 1 (565413536: **2**) | none | `trunk_link` |
| Dhaka–Ashulia Elevated Expressway | 1415894103, 1415894105, 1558255165 | 11.9–12.6 (54–85 m off) | `yes` | 2 | none | **`highway=construction`** |

- **No sampled way has `height`, `min_height`, `level`, `est_height` or `bridge:structure`.** The only vertical figure is `maxheight` (clearance), on the Farmgate ramp and on Bir Uttam Ziaur Rahman Road (way 141697286, `maxheight=5.5`).
- `layer` is the only stacking signal: 1 for flyovers, foot bridges and most ramps; 2–3 for upper ramps; 3 for the Expressway; 6 for MRT Line 6. `layer` gives relative order only, not metres.
- Checked by OSRM node IDs, the bus path shares no nodes with Expressway ways 1141567280 and 1172183209, Kuril Flyover 316785308, ramps 1205235628, 1172183235 and 1558255166, the New Airport Road bridges, or the Pragati Sarani ramps. So the bus runs at ground level under or beside every elevated structure.

## 6. Implications (facts, not decisions)

- **The Chimbuk Route end appears to be in a valley, not on the summit.** SRTM puts the Wikidata "Chimbuk hill" point that ticket 012 uses at **212 m**. The Thanchi Road junction is at **534 m**, and the "Chimbuk Tourist Centre" Wikidata point is at **558 m**. The highest samples in the grid (~550 m) are at 22.057–22.058, 92.270–92.274, beside the junction and the Tourist Centre point. So the 2.2 km tertiary spur in ticket 012 **descends about 320 m away from that high ground**. The Tourist Centre point is 462 m from the routed path, **outside** ±250 m. None of these points (hill, rest house, tower) is mapped in OSM. This is SRTM only; GLO-30 was not checked.
- **"Bangabandhu Novotheatre" does not exist under that name in OSM or Wikidata.** Both call it "Novo Theatre" (নভোথিয়েটার). The location is right: 13 m from the Route.
- **The Farmgate "elevated track" meets the Route only at Farmgate.** MRT Line 6 crosses the Route at km ~0.05 and then leaves it; the next station (Bijoy Sarani) is 574 m off. The station itself is 174 m from the Route, inside ±250 m.
- **Airport Terminal 3 is inside the corridor (70 m) but tagged `building=construction`.** The main terminal (way 143950720) is **355 m** from the Route, outside ±250 m.
- **Kuril and Mohakhali flyovers pass directly over the Route.** The bus drives under them, not on them.
- **A structure not in ticket 010 is near the Route:** the Dhaka–Ashulia Elevated Expressway, `highway=construction`, 54–85 m from the Route near km 12–12.6.
- **Bake input:** no elevated way has a height tag. Deck heights must come from `layer` plus defaults, or be hand-set.
- **Buddha Dhatu Jadi is 1.2 km inside the north edge** of the Bandarban Flight Zone.
- **Not in OSM as named:** Nilgiri resort (only an unnamed motel node), Milonchhari viewpoint (only a guest house), Meghla hanging bridge (only a bare "Megla" waypoint; there is no bridge way), Chimbuk rest house and tower. The Sadarghat terminal node is tagged `natural=beach`.
- **Every other landmark exists** and is inside its Route corridor or Flight Zone.
- **Models:** no free, licensed, downloadable model of any of the 24 specific landmarks fits its budget as-is. Only the Shaheed Minar (80,808 tris) and the Lalbagh Fort mosque (51,166 tris) have CC BY landmark-specific models, and both are 34–54× over the simple budget. Bangladeshi models of Sangsad Bhaban (including a 906-tri one), Dhaka Metro and Kuril exist but carry no licence and are not downloadable. Generic CC stand-ins that fit simple budgets exist for the hanging bridge (476 tris), the river boats (412 tris) and the waterfall (1,329 tris).

### Not measured

- An Overpass name search across the whole Bandarban Flight Zone (Nilachal/Meghla/Nilgiri/Chimbuk/Golden Temple variants): 502, then no response on both mirrors. Nominatim, Wikidata and the OSM API filled most of it.
- An Overpass tourism/leisure/footbridge query for Meghla, Nilgiri and a tower at Chimbuk: 502, then no response. Small OSM API `map` boxes filled this.
- Triangle counts for the OpenGameArt Toon Waterfall (not stated on its page).
- Terrain from GLO-30 (only SRTM 30 m was sampled at Chimbuk).
