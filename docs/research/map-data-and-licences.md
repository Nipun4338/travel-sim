# Map data sources and licences: Dhaka and Bandarban

Research for ticket [002](../wayfinder/tickets/002-map-data-sources-and-licences.md). Checked 2026-10-26. Nothing large was downloaded; OSM figures come from small read-only Overpass `out count` queries.

## How this was checked

- **OSM coverage**: Overpass API (`overpass-api.de`, data timestamp `2026-10-26T14:58Z`), `out count` queries over a bounding box. The public Overpass servers were overloaded during the session (HTTP 502 "at capacity"), so several planned queries never returned; those figures are marked **not measured** below. Nothing was guessed to fill them.
- **Licences and attribution**: read from the licence owner's own pages (OSMF, Open Data Commons, Copernicus Data Space, JAXA, USGS, OurAirports, Google Research, Microsoft). Where only a secondary source was reachable, the row says so.

## 1. OpenStreetMap

### Dhaka corridor (Gulistan → Farmgate → Uttara)

Bounding box `23.72,90.38,23.88,90.42` (S,W,N,E). It is about 4 km wide and 18 km long, and runs from Gulistan north through Farmgate to Uttara. It is a box, not a buffer around the road, so it also counts neighbourhoods on either side of the corridor.

| Measure | Count | Share |
|---|---|---|
| Building ways (`way[building]`) | 114,029 | — |
| …with `building:levels` | 14,238 | 12.5% of buildings |
| …with `height` | 466 | 0.4% of buildings |
| All highway ways | 8,197 | — |
| Major road ways (motorway/trunk/primary/secondary/tertiary) | 1,016 | — |
| …with `lanes` | 552 | 54% of major ways |
| …with `oneway` | 798 | 79% of major ways |
| `highway=bus_stop` nodes | 223 | — |
| `public_transport=platform` | 146 nodes + 5 ways | — |
| `route=bus` relations | **not measured** (query result lost) | — |

What this means:

- **Footprints**: dense. More than 114k buildings in the strip suggests near-complete footprint coverage, which fits Microsoft adding 19M Bangladesh footprints in 2023 (see §3). Spot checks of footprint quality were not done.
- **Heights**: thin. Only 1 building in 8 has a floor count, and almost none has a metric height. Most buildings will need procedural or default heights.
- **Lanes**: about half of the major road ways carry a `lanes` tag, and most have `oneway`. That is enough to seed a road model for the main arterials, but gaps need defaults.
- **Bus stops**: 223 `bus_stop` nodes exist in the strip. Whether the named real Stops (Gulistan, Farmgate, Uttara, …) are among them, and whether they are named in English or Bangla, was **not measured**.
- **History**: the 2013 [Dhaka Building Import](https://wiki.openstreetmap.org/wiki/Dhaka_Building_Import) (CEGIS shapefiles, about 12,000 buildings) covered only Old Dhaka wards 67–69, south of the corridor. It planned to map `STR_FLOOR` to `building:levels`. The [Bangladesh wiki page](https://wiki.openstreetmap.org/wiki/Bangladesh) records HOT/MissingMaps mapping in Kamrangirchar and Hazaribagh from 2015, but gives no current coverage status.

### Bandarban → Chimbuk → Nilgiri road

Planned box `21.90,92.18,22.22,92.40`. **Not measured**: every Bandarban query (buildings, levels, highway ways, major roads with lanes, bus stops, place names) was still queued when the servers went to capacity and was cancelled. Run these before you lock the Bandarban Route.

### Hazrat Shahjalal International Airport (VGHS) in OSM

The aeroway feature count (`nwr[aeroway]` in `23.82,90.38,23.87,90.42`) is **not measured**.

### Getting the data

The Geofabrik extract `asia/bangladesh-latest.osm.pbf` is **339 MB** (data up to 2026-10-25) ([Geofabrik](https://download.geofabrik.de/asia/bangladesh.html)). It is too big to ship. A clipped extract per Region is the realistic input to a build pipeline.

### Licence: ODbL 1.0

- OSM data is licensed under the Open Database License 1.0 ([OSM copyright](https://www.openstreetmap.org/copyright)).
- **Produced Work** (ODbL §1): "a work (such as an image, audiovisual material, text, or sounds) resulting from using" the database. A rendered game world is a Produced Work. If it is Publicly Used, it needs a notice (ODbL §4.3) but no share-alike for the work itself ([ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)).
- **Derivative Database** (ODbL §1): any adaptation or modification of the database or of a substantial part of it. If the game ships processed OSM data (for example a JSON or binary road/building extract bundled with the build), that file is a Derivative Database. Publicly using a Produced Work made from it triggers §4.4(c), so **that data file must be offered under ODbL**, with attribution and the licence text or a link in a readme or metadata ([OSMF Attribution Guidelines](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)). Game code, models and art are not part of the database and stay under their own licences.

### Attribution obligations (OSMF Attribution Guidelines, "Games and simulations" and general requirements)

- **Text**: must name OpenStreetMap and make clear the data is under ODbL. "© OpenStreetMap contributors" linked to `https://www.openstreetmap.org/copyright` is enough. "Map data from OpenStreetMap" is allowed when the data is rendered in your own style.
- **Placement for games**: the credit may appear on a startup splash screen, in the game view, during gameplay, on a credits page or in a menu. Splash text must be legible and stay on screen long enough to read. If the first credit is brief, give fuller details somewhere easy to find.
- **General safe-harbour rules**: anyone exposed to the work must see the credit without interacting first. It must sit near the work or where users would expect credits. Nothing may suggest the data came from elsewhere. There must be a way to learn the licence (for example a link, or a "Data licences" menu item when a splash screen can't link).
- **Fading**: a credit may fade or collapse after 5 seconds, on dismiss, or on interaction, provided it stays reachable via "(i)" or an About menu.
- The ODbL legal text overrides the guidelines.

## 2. Elevation models (Bandarban hills)

| Dataset | Grid | Model type | Accuracy (vendor-stated) | Epoch | Licence | Required credit |
|---|---|---|---|---|---|---|
| **Copernicus DEM GLO-30** | 1 arc-sec (~30 m) | DSM (includes trees and buildings; water flattened, airports edited) | absolute vertical < 4 m (LE90); relative < 2 m on slopes ≤ 20%, < 4 m on slopes > 20%; horizontal < 6 m (CE90) | TanDEM-X, 2011–2015; releases 2019_1 to 2024_1 | free licence, worldwide (except Armenia/Azerbaijan for GLO-30); commercial use allowed | see below |
| Copernicus DEM GLO-90 | 3 arc-sec (~90 m) | DSM | as above | as above | same free licence | as below, but with "WorldDEM-90" |
| **SRTM 1 Arc-Second Global** (USGS) | 1 arc-sec (~30 m) | DSM (C-band radar) | not stated on the USGS page | Feb 2000 | USGS-produced data is US public domain | none required; USGS suggests "Credit: U.S. Geological Survey"; DOI 10.5066/F7PR7TFT |
| **ALOS AW3D30** (JAXA) v4.1 (Apr 2024) | ~1 arc-sec (~30 m) | DSM | no figures on the JAXA page | ALOS PRISM 2006–2011 | JAXA Terms of Use: free; may use, modify and distribute; commercial use free but **notify JAXA in advance** | credit JAXA as source, e.g. "Credit: AW3D30 (JAXA)"; JAXA asks to be told about publications "where possible" |
| FABDEM (Fathom/Univ. Bristol) | 1 arc-sec (~30 m) | bare-earth DTM (trees and buildings removed from GLO-30) | — | from GLO-30 | **CC BY-NC-SA 4.0** (secondary source; the Bristol data page could not be reached) | Copernicus notice plus FABDEM credit |

Sources: [Copernicus Data Space – Copernicus DEM](https://dataspace.copernicus.eu/node/1306), [GEE GLO-30 entry](https://developers.google.com/earth-engine/datasets/catalog/COPERNICUS_DEM_GLO30), [USGS SRTM 1 arc-second](https://www.usgs.gov/centers/eros/science/usgs-eros-archive-digital-elevation-shuttle-radar-topography-mission-srtm-1), [USGS copyrights and credits](https://www.usgs.gov/information-policies-and-instructions/copyrights-and-credits), [JAXA AW3D30](https://www.eorc.jaxa.jp/ALOS/en/dataset/aw3d30/), [JAXA Terms of Use](https://earth.jaxa.jp/en/data/policy/), [GEE community catalog – FABDEM](https://gee-community-catalog.org/projects/fabdem/).

**Copernicus notices** (from the Copernicus Data Space page):

- Unmodified data: `© DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`
- **Modified or adapted** (resampled, cropped into terrain meshes; this is the game's case): `produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved`
- The licence also says the Copernicus entities accept no liability for use of the data. Citation DOI: 10.5270/ESA-c5d3d65.
- The full licence PDF ([License-COPDEM-30.pdf](https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Data/DEM/resources/license/License-COPDEM-30.pdf)) could not be parsed as text. The notice wording above comes from Copernicus's own Data Space page.

**Resolution over the Bandarban hills**: all free global options are ~30 m. Nothing finer is freely available globally; WorldDEM-10 is explicitly excluded from public release. At 30 m, a hairpin road on a ridge falls between only a few cells. The road will need to be cut or flattened into the terrain from the OSM geometry rather than read from the DEM. Every free option except FABDEM is a DSM, so forest canopy on the hills is baked into the "ground" heights. The tree cover in the Chittagong Hill Tracts was not quantified.

## 3. Supplementary building data (heights and footprints)

| Dataset | Covers Bangladesh | Heights | Licence | Attribution |
|---|---|---|---|---|
| Google Open Buildings v3 (polygons) | yes (BGD in country list) | no (footprint, confidence, area only) | **CC BY 4.0 or ODbL 1.0**, user's choice | cite Sirko et al. 2021 (arXiv:2107.12283) |
| Google Open Buildings 2.5D Temporal | yes (South Asia) | yes: `building_height` raster, 0–100 m, 4 m effective resolution, yearly 2016–2023; no accuracy figure published | CC BY 4.0 or ODbL 1.0 | Sentinel-2 based; cite Sirko et al. 2023 (arXiv:2310.11622); Sentinel data legal notice applies |
| Microsoft Global ML Building Footprints | yes (19M Bangladesh footprints added 2023-10) | heights exist for some regions; South Asia height coverage not stated; -1 = none | **CDLA Permissive 2.0** | no stated attribution requirement; no right to use Microsoft names or logos |

Sources: [Open Buildings](https://sites.research.google/gr/open-buildings/), [Open Buildings 2.5D Temporal on GEE](https://developers.google.com/earth-engine/datasets/catalog/GOOGLE_Research_open-buildings-temporal_v1), [Microsoft GlobalMLBuildingFootprints](https://github.com/microsoft/GlobalMLBuildingFootprints).

## 4. Airport layout: Hazrat Shahjalal International (VGHS/DAC)

- **OurAirports**: one runway, **14/32, 10,499 × 148 ft** (≈ 3,200 × 45 m). It lists the field elevation and the runway surface. Data is **public domain**; credit is requested as a courtesy but not required ([runways](https://ourairports.com/airports/VGHS/runways.html), [data licence](https://ourairports.com/data/)). The `runways.csv` export carries threshold coordinates and headings (see their data dictionary).
- **OSM**: runway, taxiway, apron and terminal geometry is normally mapped with `aeroway=*`. The feature count for VGHS is **not measured** (see §1). Its licence and attribution are the same as for OSM.
- The official layout source would be the Civil Aviation Authority of Bangladesh AIP aerodrome chart. It was not checked, and its licence is unknown.

## 5. Attribution checklist for a public portfolio game

If all of these are used, the credits screen (and the splash screen for OSM) must carry:

1. **OSM**: "© OpenStreetMap contributors", data under ODbL, link to openstreetmap.org/copyright. Show it legibly on the splash screen or in the game view, plus a findable "Data licences" entry. Any shipped OSM-derived data file must be offered under ODbL.
2. **Copernicus GLO-30** (modified): the full "produced using Copernicus WorldDEM-30 © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved" line.
3. **AW3D30** (if used): "Credit: AW3D30 (JAXA)". Notify JAXA in advance if any commercial use is planned.
4. **SRTM** (if used): optional "Credit: U.S. Geological Survey".
5. **Google Open Buildings** (if used under CC BY 4.0): attribution to Google with the licence named. Under ODbL, it is handled like OSM.
6. **Microsoft footprints** (if used): CDLA Permissive 2.0 notice.
7. **OurAirports**: optional courtesy credit.

## 6. Implications (facts for the decision, not the decision)

- Dhaka footprints are dense in OSM, but floor counts cover about 12% of buildings and metric heights under 1%. Heights will be procedural unless you add the Google 2.5D height raster, which is ODbL/CC BY compatible and 4 m effective.
- About half of the Dhaka arterial ways carry `lanes`, and most carry `oneway`. This bears on the AI traffic open item on the map: lane data exists for main roads but not everywhere.
- 223 bus stop nodes exist in the corridor box. Whether the named Stops are present and named was not checked.
- Every free DEM is ~30 m. Only Copernicus GLO-30, SRTM and AW3D30 permit public and commercial use. FABDEM's bare-earth model is non-commercial and share-alike, which matters if the project ever stops being purely personal.
- Copernicus GLO-30 has the best stated accuracy and the most recent epoch, and its credit line is long but fixed.
- Shipping preprocessed OSM data inside the game makes that data file ODbL. Building the world at runtime from an ODbL-offered extract has the same effect. Code and art are unaffected.
- **Not measured, run before ticket 004 (Region bounds)**: all Bandarban OSM coverage figures, VGHS `aeroway` feature counts, and bus `route` relations in Dhaka.
