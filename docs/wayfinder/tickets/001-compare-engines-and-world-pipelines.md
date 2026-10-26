---
id: 001
title: Compare browser 3D engines and OSM/elevation world pipelines
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

For a TypeScript + Vite desktop-browser game that renders a stylized city (Dhaka: dense OSM buildings and roads) and hilly terrain (Bandarban: from elevation data), how do Three.js, Babylon.js, CesiumJS and any other credible option compare on: terrain from elevation data, extruding OSM buildings and roads, streaming/chunking ~30 km areas, vehicle-physics integration, performance, and ecosystem maturity? What pipelines exist for OSM + elevation → game-ready 3D (prebaked glTF/3D Tiles at build time vs runtime generation from vector tiles), and which tools (e.g. OSM2World, Blender-OSM, vector-tile extrusion) are maintained?

## Resolution

- Three.js (r186) and Babylon.js (9.32) are both active, game-suitable options. Three.js needs physics added (Rapier 0.21 ships a raycast vehicle controller and heightfields). Babylon has Havok with heightfields but no first-party raycast vehicle.
- CesiumJS (1.146) is best at terrain and 3D Tiles streaming but has no physics and is globe/ECEF-centric, which is a poor fit for an arcade game. MapLibre suits maps, not gameplay.
- Pipelines: a build-time bake (OSM2World 0.4.0 / Blosm / custom TS + Copernicus GLO-30 DEM → chunked GLB) vs runtime vector tiles (Planetiler → PMTiles). Baking keeps collision and the AI lane graph deterministic. OSM2World's terrain and 3D Tiles output is still on its 2026 roadmap.
- Details and sources: [docs/research/engines-and-world-pipelines.md](../../research/engines-and-world-pipelines.md)
