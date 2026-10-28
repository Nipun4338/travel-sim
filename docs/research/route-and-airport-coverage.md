# Route and airport coverage in OSM: Dhaka, Bandarban, VGHS

Research for ticket [009](../wayfinder/tickets/009-measure-bandarban-and-airport-osm-coverage.md). It checks the estimates in ticket [004](../wayfinder/tickets/004-lock-region-bounds.md) and fills the gaps left as "not measured" in [map-data-and-licences.md](map-data-and-licences.md). Checked 2026-10-26. Licences and attribution are covered in that earlier file and are not repeated here.

## How this was checked

- **Overpass API** (`overpass-api.de`, data timestamp `2026-10-26T15:30–15:44Z`): small read-only queries, one at a time, 40–50 s timeouts, bounding boxes no larger than a few km. Each query was tried at most twice: first on `overpass-api.de`, then on `overpass.private.coffee` or `overpass.kumi.systems`. The servers were overloaded again: 5 of 10 queries returned HTTP 502 on the main server and then timed out on the fallback. Those queries are marked **not measured**. Every successful query ran on `overpass-api.de`; neither fallback returned a result.
- **OSM API v0.6** (`api.openstreetmap.org`): single-object reads (`way/{id}/full`, `node/{id}/ways`) and three `map` calls on boxes of at most 0.002 deg² (0.5–1.7 MB each). They replaced two Overpass queries that failed: road tags and building counts in Bandarban.
- **Nominatim** (`nominatim.openstreetmap.org`): name lookups against the same OSM data.
- **OSRM**: the public demo router (`router.project-osrm.org`, car profile) measured road distance. The FOSSGIS foot router (`routing.openstreetmap.de`) was used as a cross-check. Both run on OSM extracts that are a few days older than the live data, so a few node IDs they return no longer exist in live OSM.
- **Wikidata**: used only for Chimbuk's coordinate, because OSM has no feature with that name. It is labelled as non-OSM wherever it appears.

## 1. Dhaka Route (Farmgate → Airport)

### Named Stops in OSM

All nine Stops exist as `highway=bus_stop` nodes. Most have only an English `name`; a few older nodes have a Bangla `name` plus `name:en`. Spellings vary between nodes ("Bijoy Shoroni", "Biman Bandar"). Where several nodes share a name, the table gives the one used for routing.

| Stop (004) | OSM node | Lat, Lon | OSM name | Notes |
|---|---|---|---|---|
| Farmgate | [2320379589](https://www.openstreetmap.org/node/2320379589) | 23.75722, 90.39024 | Farmgate Bus Stop | Four Farmgate stop nodes within 100 m. |
| Bijoy Sarani | [11934785542](https://www.openstreetmap.org/node/11934785542) | 23.76494, 90.38917 | Bijoy Shoroni Bus stop | Only one node. |
| Jahangir Gate | [12009429417](https://www.openstreetmap.org/node/12009429417) | 23.77526, 90.38977 | Jahangir Gate Bus stop | A second node at 23.77577, 90.39004. |
| Mohakhali | [3499295181](https://www.openstreetmap.org/node/3499295181) | 23.77818, 90.39815 | মহাখালী বাস স্টেশন / Mohakhali Bus Station | Also Mohakhali Rail Gate and Commercial Area stops. |
| Banani (Chairman Bari) | [12073083676](https://www.openstreetmap.org/node/12073083676) | 23.78786, 90.40010 | Chairman Bari Bus Stop | Separate "Banani" stops at 23.794 (Banani Bus Station, Banani South). |
| Kakoli | [12078090908](https://www.openstreetmap.org/node/12078090908) | 23.79523, 90.40090 | Kakoli Bus station | Also "Kakoli / Banani Bus stop" at 23.79432, 90.40145. |
| Kuril Bishwa Road | [3498521660](https://www.openstreetmap.org/node/3498521660) | 23.82136, 90.41887 | কুড়িল বিশ্বরোড বাস স্টেশন / Kuril Bishwa Road Bus Stop | Four nodes in total. |
| Khilkhet | [3556399554](https://www.openstreetmap.org/node/3556399554) | 23.82936, 90.41975 | খিলক্ষেত বাস স্টপ / Khilkhet Bus Stop | Also "Khilkhet South" at 23.82824. |
| Airport | [3572490148](https://www.openstreetmap.org/node/3572490148) | 23.85160, 90.40734 | বিমান বন্দর বাস স্টপ / Biman Bandar Bus Stop | BRTC counter next to it. |

Source: Overpass `node[highway=bus_stop]` in `23.750,90.383,23.858,90.412` (73 nodes) and `23.810,90.412,23.856,90.428` (21 nodes). Between the named Stops, OSM also has Navy Mor, Staff Road, MES, Army Golf Club, Shewra and Kawla Rail Gate stops. A real bus also stops at these.

### Road tags (sampled)

Ten ways were sampled along the routed path (OSM API, one node in every 40 on the route):

- **Kazi Nazrul Islam Avenue / Old Airport Road**: `highway=trunk`, `oneway=yes`, `lanes=3–4`, `surface=asphalt`, `maxspeed=60` on some ways.
- **New Airport Road** (`name:en`; Bangla নতুন বিমানবন্দর সড়ক): `highway=trunk`, `ref=N3` north of Banani, `oneway=yes`, `lanes=3–4`, `surface=asphalt`, `maxspeed=60` on some ways.
- **Bir Uttam Ziaur Rahman Road / Bir Uttam A. K. Khandakar Road** (the Jahangir Gate–Mohakhali section): `primary`, `oneway=yes`, with no lanes or surface tags on the sampled way.
- Both carriageways are mapped as separate one-way ways (dual carriageway). Routers therefore snap a stop to the wrong side unless direction is constrained.
- The **Dhaka Elevated Expressway** is mapped and routable. With no constraint, OSRM put 2.0–2.2 km of the trip on it between Kakoli and Kuril, near the Banani toll plaza at 23.7887, 90.4002.
- A full corridor query of major ways (tag statistics and summed lengths) was **not measured**: Overpass returned 502, then a timeout.

### Dhaka bus route relations

- `rel[route=bus]` in `23.776,90.395,23.800,90.405` (Mohakhali–Banani, the core of the Route): **0 relations**.
- The same query over all of Dhaka (`23.68,90.33,23.90,90.46`): **not measured** (502, then timeout).
- What can be said: no bus route relation passes through the Mohakhali–Banani section of the Route. A relation elsewhere in the city cannot be ruled out from this data.

## 2. Bandarban Route (town → Chimbuk)

### Named Stops in OSM

| Stop (004) | In OSM? | Feature | Lat, Lon |
|---|---|---|---|
| Bandarban bus terminal | Partly. No feature named "terminal". The nearest candidates are bus stops: | "Bandarban Interdistrict bus stop" [479696056](https://www.openstreetmap.org/node/479696056) (on N108, the Chittagong road) | 22.18841, 92.21404 |
| | | "Bandarban" bus stop [12169802678](https://www.openstreetmap.org/node/12169802678) | 22.18849, 92.21414 |
| | | Thanchi Road stands: "Ruma Bus stopage" [477229972](https://www.openstreetmap.org/node/477229972), "Lama Bus Station", "Hafaz Ghona New Bus Station", "Thanchi Bus Stop" | 22.18368, 92.21780 (Ruma) to 22.19031, 92.21899 (Thanchi) |
| Milonchhari | Only as a guest house, not as a stop or place | "Milon Chori" `tourism=guest_house` [477234209](https://www.openstreetmap.org/node/477234209) | 22.16861, 92.22284 |
| Shoilo Propat | Yes, as an attraction, not as a stop | "Shailopropat waterfall" `tourism=attraction` [477231481](https://www.openstreetmap.org/node/477231481); a duplicate node is named "Shoilopropat waterfall" | 22.15067, 92.21688 |
| Chimbuk | **No.** Nothing matches Chimbuk/Chimbook/চিম্বুক (Overpass regex over `21.85–22.25, 92.15–92.40`, and Nominatim) | Wikidata [Q64517866](https://www.wikidata.org/wiki/Q64517866) "Chimbuk hill" (non-OSM) | 22.0576, 92.2549 |

Also present: "Nilgiri Bus Stop" [12169802641](https://www.openstreetmap.org/node/12169802641) at 21.91139, 92.32473 and "Nilgiri Heliport" (way 1279863989).

A wider query of peaks, viewpoints and places around Chimbuk was **not measured**. Neither was a dedicated Overpass query for town bus stations; the OSM nodes above came from Nominatim.

### Road geometry and tags

- From town to the Chimbuk turn-off, the route is a single named road: **Bandarban - Thanchi Road**, `highway=secondary`, `ref=Z1811`. Five distinct way IDs were sampled (1551986950, 1551986948, 162681787, 1551130592, 1551130593). **None carries `surface`, `lanes`, `width`, `maxspeed` or `smoothness`.** The town end starts from N108, the Chittagong Bandarban Highway (`trunk`, `surface=asphalt`).
- The last ~2.2 km, from the Thanchi Road junction at **22.06265, 92.27026** to the Wikidata Chimbuk point, is an **unnamed `highway=tertiary`** spur (way 512137841). The Wikidata point snaps to it at 42 m.
- Summed way lengths from an Overpass `out geom` query were **not measured** (502, then timeout). Lengths below come from OSRM.

### Buildings (OSM API `map`, 2026-10-26)

| Box (S,W,N,E) | Covers | Buildings | With `building:levels` | Highway ways (by type) |
|---|---|---|---|---|
| 22.170,92.200,22.200,92.230 | Bandarban town | 915 | 0 | 75 residential, 28 unclassified, 20 service, 8 trunk, 4 primary, 2 secondary |
| 22.100,92.210,22.170,92.245 | Milonchhari – Shoilo Propat – lower climb | 46 | 0 | 22 residential, 14 unclassified, 10 secondary, 8 path |
| 22.050,92.235,22.100,92.275 | Ridge to Chimbuk | 11 | 0 | 10 path, 3 secondary, 2 tertiary, 2 unclassified |

The town has some footprint coverage; outside it, the road corridor is nearly empty in OSM. No building in any box has a floor count.

## 3. Hazrat Shahjalal International Airport (VGHS)

Overpass `nwr[aeroway]` in `23.825,90.385,23.870,90.415`, 278 features in total:

| aeroway | Count | Notes |
|---|---|---|
| aerodrome | 1 way | `icao=VGHS`, centre 23.8423, 90.4017 |
| runway | 1 way | [13858653](https://www.openstreetmap.org/way/13858653): `ref=14/32`, `length=3200`, `surface=asphalt`. Endpoints: **runway 14 threshold (NW) 23.85502, 90.38854**; runway 32 threshold (SE) 23.83171, 90.40702. Measured 3.20 km; true bearing 144.1°. |
| taxiway | 148 ways | refs C, F, V, X, "North Taxiway", "South Taxiway"; most are unreferenced |
| apron | 6 ways | |
| parking_position | 64 ways | |
| jet_bridge | 27 ways | |
| gate | 11 nodes | |
| terminal | 2 ways + 2 nodes | Main terminal way 143950720 (`building=yes`); Terminal-3 way 1172183216 (`building=construction`); Air Cargo Terminal and Terminal-3 as nodes |
| hangar | 11 ways | |
| tower | 1 way | |
| helipad | 1 node | |
| holding_position | 1 node | |
| windsock | 2 nodes | |

The runway length matches OurAirports (3,200 m), which the earlier research recorded.

## 4. Lengths: measured vs estimated

| Item | 004 estimate | Measured | Method / caveat |
|---|---|---|---|
| Dhaka Route, Farmgate → Airport via all 9 Stops | ~12 km | **14.8 km** by road | OSRM car, with bearing constraints so stops snap to the northbound carriageway, plus a via point at Navy Mor to keep the route off the Expressway. Cumulative: Bijoy Sarani 1.1, Jahangir Gate 2.4, Mohakhali 4.6, Chairman Bari 6.0, Kakoli 7.0, Kuril 11.1, Khilkhet 12.0, Airport 14.8. Legs 3–4 detour into the Mohakhali bus terminal and Banani Road No 2 (about 1–1.5 km), so a bus that stays on the arterials would cover about **13.5–14.8 km**. Straight-line sum of stop-to-stop distances is 12.0 km; Farmgate → Airport in a straight line is 10.6 km. |
| Dhaka, unconstrained routing | — | 17.9–23.2 km | Shown only as a warning: without direction constraints, routers U-turn at stops and use the Expressway. |
| Bandarban Route, town → Chimbuk | ~26 km | **25.3 km** (interdistrict stop → Chimbuk summit point); 24.4 km from the Ruma bus stand | OSRM car. Cumulative: Milonchhari 3.2, Shoilo Propat 6.6, Chimbuk turn-off 23.1, summit 25.3. Straight line 15.1 km, so the road winds (ratio about 1.7). |
| Town → Nilgiri (context) | — | ~44.6 km by road along the Thanchi Road (the routed 50.2 km went through the Chimbuk summit point: 4.5 km for the spur both ways plus a 1.2 km U-turn overshoot); 33.5 km straight | OSRM car |
| Runway 14/32 | 3,200 m (OurAirports) | 3,202 m | OSM way endpoints |

## 5. Flight Zone extents

**Dhaka** (30 × 30 km, "centred near Tejgaon"). Using the OSM Tejgaon place node (23.76282, 90.39130) as the centre, the square spans **lat 23.628–23.898, lon 90.244–90.539**.

- The whole Dhaka Route (lat 23.757–23.852) and the airport are inside.
- The Uttara place node (23.8693) is 3.2 km inside the north edge. Uttara's northern sectors reach close to that edge.
- The runway 14 threshold is **4.75 km** from the north edge. Runway 14 is approached from the NW (true bearing 144°), so a straight-in approach to runway 14 begins outside the zone beyond about 4.7 km out. A standard 3° glide path reaches 600 m above ground at about 11 km out. Approaches to runway 32 come from the SE, over the city, and stay well inside.
- The Buriganga river way's bounding box (23.627–23.785) touches the south edge (23.628). The Old Dhaka/Sadarghat reach (~23.71) is well inside.

**Bandarban** (40 × 40 km; 004 gives no centre).

- Town (22.1973, 92.2217), Chimbuk (22.0576, 92.2549, Wikidata) and Nilgiri (21.9114, 92.3247) span **31.8 km north–south** and **10.6 km east–west**. They fit in a 40 km square only if it is centred near lat 22.054. That leaves about 4 km of margin to the north and south.
- The Sangu river way through Rowangchhari/town (way 126408661) has a bounding box of 21.89–22.23, 92.17–92.42, so a 40 km square covers that reach.
- Terrain heights (Chimbuk and Nilgiri relative to the 600 m spawn altitude) were not measured. GLO-30 is the source for them.

## 6. Implications (facts, not decisions)

- **Dhaka Route length is about 14 km, not about 12 km** (+15–25%). At an average city speed of 15–20 km/h, that is roughly 45–55 minutes of real driving.
- **Dhaka Route path**: between Farmgate and Mohakhali the Route runs on Old Airport Road, Bijoy Sarani and Bir Uttam Ziaur Rahman Road, not on New Airport Road. The routed path met the Elevated Expressway only around Banani–Kuril, so "under the Elevated Expressway" describes only the northern part. The Expressway's alignment south of Banani was not checked.
- **All nine Dhaka Stops exist** as OSM bus stops, often as several nodes per Stop (one per carriageway side or duplicates). Names are mostly English-only and inconsistently spelled, so Bangla Stop names would need a hand-made table.
- **No bus route relation** crosses the Mohakhali–Banani section of the Route in OSM. The Route's path has to come from routing or hand-picked ways, not from an OSM relation.
- **Dhaka arterials are dual carriageways** mapped as one-way pairs, with lanes (3–4) on most sampled ways. Any routing or lane graph has to pick the correct side.
- **Bandarban Route length holds** (25.3 km vs ~26 km).
- **Bandarban Stops are weak in OSM.** No feature is named "bus terminal"; the town has several bus-stand nodes. Milonchhari exists only as a guest house and Shoilo Propat only as a waterfall attraction. **Chimbuk is absent.** Its coordinate here comes from Wikidata, and it sits on an unnamed tertiary spur about 2.2 km off the Thanchi Road.
- **The Bandarban road has no surface, lane or width tags**, and the corridor outside town has about 60 OSM buildings in total (46 + 11). Road width and roadside buildings would be defaults or hand-placed.
- **The airport is well mapped**: one runway with exact thresholds, 148 taxiway ways, aprons, 64 stands, jet bridges, gates and terminal footprints (Terminal 3 is tagged as under construction).
- **Dhaka Flight Zone**: runway 14's threshold is 4.75 km from the north edge, so a landing challenge on runway 14 begins its approach outside the zone. Runway 32 approaches stay inside.
- **Bandarban Flight Zone**: the named places fit in 40 km only with the centre near 22.05 N. The ticket's spawn "over the town" then sits about 16 km north of centre and about 4 km from the north edge.

### Not measured (Overpass 502, then fallback timeout)

- Dhaka bus route relations city-wide.
- Tag statistics and summed way lengths for the Dhaka corridor's major ways.
- Bandarban peaks, viewpoints and places around Chimbuk.
- A dedicated Overpass query for Bandarban town bus stations (Nominatim filled this).
- Overpass Thanchi Road geometry and length (OSRM filled this).
- Overpass building counts for Bandarban (the OSM API filled this).

## Measured later (M12, 2026-10-28)

The Overpass gaps above were measured from the local Geofabrik extract (`data/raw/osm/bangladesh-latest.osm.pbf`) with `npx tsx scripts/research/osm-figures.ts`:

- `route=bus` relations: 3 in all of Bangladesh, 1 with a way in Dhaka (`23.68,90.33,23.90,90.46`).
- Dhaka corridor (`23.750,90.383,23.858,90.428`) major ways: 812 ways, 265.7 km inside the box; `lanes` 45%, `oneway` 79%, `maxspeed` 27%, `surface` 55%, `width` under 1%.
- Bandarban (`21.90,92.18,22.22,92.40`): 2,688 buildings (none with `building:levels`), 575 highway ways, 74 major (none with `lanes`), 8 bus stops, one unnamed `amenity=bus_station` (21.9832, 92.2369), 14 places, no `natural=peak` and no `tourism=viewpoint`.
- Chimbuk by GLO-30: 556 m at the Tourist Centre point; the Thanchi Road's high point beside it is 579 m, next to a 592 m knoll.

