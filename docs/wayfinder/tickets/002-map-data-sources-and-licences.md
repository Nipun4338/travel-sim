---
id: 002
title: Survey map data sources and licences for Dhaka and Bandarban
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

What data is available, at what quality and under what licence, for recreating Dhaka and Bandarban? Specifically: OSM coverage (roads, lanes, buildings, building heights/levels, bus stops) along a Gulistan → Farmgate → Uttara corridor and the Bandarban → Chimbuk → Nilgiri road; free elevation models (Copernicus GLO-30, SRTM, ALOS, others) and their resolution over the Bandarban hills; airport layout data for Hazrat Shahjalal International Airport; and the attribution obligations a public portfolio game must meet.

## Resolution

- OSM Dhaka corridor box (Gulistan–Uttara): about 114k building footprints, but only 12.5% have `building:levels` and 0.4% have `height`; 54% of arterial ways have `lanes`; 223 `bus_stop` nodes. Bandarban, airport `aeroway` and bus-route counts were not measured (Overpass was overloaded).
- DEMs: Copernicus GLO-30, SRTM and AW3D30 are all ~30 m DSMs and free for public and commercial use; FABDEM (bare earth) is CC BY-NC-SA. Google Open Buildings 2.5D gives a building-height raster (CC BY 4.0 / ODbL). OurAirports VGHS runway 14/32, 3,200 × 45 m, public domain.
- Obligations: OSM credit ("© OpenStreetMap contributors", ODbL, link) on splash screen or in-game plus a licences menu; shipped OSM-derived data must be offered under ODbL; fixed Copernicus "produced using Copernicus WorldDEM-30 …" line; JAXA credit and advance notice for commercial use.
- Findings: [docs/research/map-data-and-licences.md](../../research/map-data-and-licences.md)
