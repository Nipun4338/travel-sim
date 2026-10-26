---
id: 009
title: Measure OSM coverage for the Bandarban road and Dhaka airport
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

What OSM coverage exists along the Bandarban town → Chimbuk road (road geometry, surface, width, buildings) and at Hazrat Shahjalal International Airport (runway, taxiways, aprons, terminal footprints)? Do Dhaka bus route relations exist for the Farmgate → Airport corridor, and are the named Stops on both Routes present as OSM bus stops? Do the estimated Route lengths and Flight Zone extents in [Lock Region bounds](004-lock-region-bounds.md) hold up? These counts were left unmeasured by [Survey map data sources and licences](002-map-data-sources-and-licences.md) because the public Overpass servers were overloaded.

## Resolution

- **Dhaka Route:** about 14 km by road (13.5–14.8 km), not ~12 km. All 9 Stops exist as OSM bus stop nodes. The arterials are trunk dual carriageways with 3–4 lanes. No `route=bus` relation crosses Mohakhali–Banani; the city-wide count was not measured.
- **Bandarban Route:** 25.3 km, so the ~26 km estimate holds. The road is the Thanchi Road (`secondary`, Z1811) with no surface, lane or width tags, and about 60 buildings outside town. Chimbuk is not in OSM (coordinate from Wikidata: 22.0576, 92.2549, on an unnamed spur). Milonchhari and Shoilo Propat exist only as a guest house and a waterfall.
- **VGHS:** well mapped, with 278 aeroway features (1 runway, 148 taxiways, 64 stands, terminals). The runway 14 threshold is at 23.8550, 90.3885, 4.75 km from the Dhaka Flight Zone's north edge, so a runway 14 approach starts outside the zone.
- **Bandarban Flight Zone:** 40 km fits town → Nilgiri (31.8 km north–south) only if centred near 22.05 N.

Findings: [Route and airport coverage in OSM](../../research/route-and-airport-coverage.md)
