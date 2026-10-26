# Browser 3D engines and OSM + elevation world pipelines

Research for [ticket 001](../wayfinder/tickets/001-compare-engines-and-world-pipelines.md). Checked 2026-10-26 against GitHub repos, the npm registry and official docs. Release dates come from GitHub releases or npm `time` metadata. Claims marked **(unverified)** rest on forum or secondary sources only.

## 1. Engine comparison

| | **Three.js** | **Babylon.js** | **CesiumJS** | **PlayCanvas engine** | **MapLibre GL JS** (map engine, for reference) |
|---|---|---|---|---|---|
| Latest release | r186 / npm `three@0.186.1`, 2026-09-24 | 9.32.0, 2026-10-22 | 1.146, 2026-10-01 | v2.23.3, 2026-10-15 | v6.16.0, 2026-10-25 |
| Activity / stars | Daily commits, ~117k stars | Daily commits, ~26k | Daily commits, ~16k | Daily commits, ~17k | Daily commits, ~12k |
| License | MIT | Apache-2.0 | Apache-2.0 | MIT | BSD-3 |
| TypeScript | Types in `@types/three` (community-maintained) | Written in TS | Ships its own `.d.ts` | Written in JS, ships types | Written in TS |
| Terrain from elevation | Nothing built in. Options: a heightmap mesh you build yourself, `3d-tiles-renderer` with its quantized-mesh plugin, or community libs (`geo-three`, last release 2023-07; `three-tile` 0.12.2, 2026-08) | Built-in `CreateGroundFromHeightMap` / dynamic terrain; `3d-tiles-renderer` also targets Babylon | Its core feature: a streamed globe terrain via `CesiumTerrainProvider.fromUrl` (quantized-mesh or heightmap, self-hostable, ion not required) or `CustomHeightmapTerrainProvider` | Nothing built in; a heightmap mesh you build yourself | Native `raster-dem` 3D terrain (Terrarium, Mapbox RGB or custom encoding); a quantized-mesh plugin example exists |
| OSM buildings / roads | No built-in support. Extrude footprints yourself (`ExtrudeGeometry`) or load prebaked glTF / 3D Tiles | No built-in support. Extrude yourself (`ExtrudePolygon`, needs earcut) or load glTF / 3D Tiles | Native 3D Tiles streaming. Cesium OSM Buildings is an ion-hosted tileset (needs an ion account and token) | No built-in support; glTF loading | Native `fill-extrusion` for buildings from vector tiles. Roads render flat as `line` layers |
| Streaming / chunking ~30 km | Do it yourself, or use `3d-tiles-renderer` (LOD by screen-space error, LRU cache) | Do it yourself, or use `3d-tiles-renderer` (Babylon build) | Built in (quadtree terrain plus 3D Tiles LOD) | Do it yourself | Built in (tiles) |
| Vehicle physics | Bring your own: Rapier (`@dimforge/rapier3d` 0.21.0, 2026-09-25) has `DynamicRayCastVehicleController` and heightfield colliders; Jolt (`jolt-physics` 1.1.1, 2026-10-23) has a wheeled-vehicle constraint; cannon-es is stale (last release 2022-08) | Havok plugin (`@babylonjs/havok` 1.3.14, 2026-07-29, MIT) has `PhysicsShapeHeightField` in core source but **no first-party raycast vehicle**; the forum points to community ports **(unverified that none exists in 9.x)**. Rapier and Jolt also work | **None.** No physics engine. You would run Rapier or Jolt in a local frame and sync the results to Cesium's Earth-centred (ECEF) coordinates | Ammo.js integration built in (`ammo.js` has no releases); Rapier and Jolt also work | None; not a game engine |
| Fit to a stylized arcade game | General-purpose renderer, full control of shaders and look | Full game engine (scene, inspector, GUI, audio, physics plugin) | Geospatial globe. Strong data streaming, weak game ergonomics (globe-centric camera, WGS84 frames, no physics, opinionated lighting) | Game engine, editor-centric workflow (cloud editor optional) | Map renderer; can host a Three.js custom layer (`maplibre-gl-three`) |
| Ecosystem maturity | Largest ecosystem (r3f, drei, pmndrs, `3d-tiles-renderer`, many examples) | Mature, well-documented, active forum, first-party tooling | Mature for GIS; small game ecosystem | Mature; smaller open-source community | Mature for maps |

Sources: GitHub repo and release APIs for each repo; npm registry `time` fields; [Rapier JS getting started](https://rapier.rs/docs/user_guides/javascript/getting_started_js); [Rapier `DynamicRayCastVehicleController`](https://rapier.rs/javascript3d/classes/DynamicRayCastVehicleController.html); [Babylon Havok plugin docs](https://doc.babylonjs.com/features/featuresDeepDive/physics/havokPlugin); Babylon `packages/dev/core/src/Physics/v2/physicsShape.ts` (`PhysicsShapeHeightField`, line 433); [Babylon forum: Havok raycast vehicle](https://forum.babylonjs.com/t/havok-physics-raycast-vehicle-support/40180); [CesiumTerrainProvider ref](https://cesium.com/learn/cesiumjs/ref-doc/CesiumTerrainProvider.html); [MapLibre sources spec](https://maplibre.org/maplibre-style-spec/sources/); [MapLibre examples](https://maplibre.org/maplibre-gl-js/docs/examples/); [3DTilesRendererJS README](https://github.com/NASA-AMMOS/3DTilesRendererJS).

Notes:
- `dimforge/rapier.js` is **archived**. The JS bindings moved into the main `dimforge/rapier` repo (`/typescript`), and npm releases continue (0.21.0, 2026-09).
- Precision: 30 km fits comfortably in float32 world units if the world uses a local origin (for example, metres from the Region centre). CesiumJS uses ECEF with relative-to-centre rendering, so game logic has to convert frames.

## 2. Pipelines: OSM + elevation to game-ready 3D

### Source data
- **OSM**: Geofabrik country extract (`asia/bangladesh-latest.osm.pbf`), ODbL. In Dhaka, building heights and `building:levels` tags are sparse, so expect default heights plus heuristics.
- **Elevation**: Copernicus GLO-30 DEM (30 m, Cloud-Optimized GeoTIFFs on the [AWS Open Data registry](https://registry.opendata.aws/copernicus-dem/), Copernicus licence, attribution required). Or SRTM 30 m. The AWS "Terrain Tiles" set (Mapzen/Tilezen Terrarium format) is SRTM/GMTED-based and its generator `tilezen/joerd` has had no commits since 2021, but the hosted tiles remain usable without a key. For Bandarban's hills, 30 m DEM resolution is the practical ceiling for open global data.

### Option A: prebake at build time (glTF or 3D Tiles, shipped as static assets)
| Tool | What it does | Maintenance (2026-10) |
|---|---|---|
| **OSM2World** (Java, CLI and library) | OSM to glTF/GLB/OBJ: buildings with roof shapes, roads with lane markings, 250+ tags. Optional SRTM terrain (`srtmDir`), documented as experimental | Active: commits 2026-10-15. Last numbered release 0.4.0 (2025-01-21); a "latest" build is published. The 2026 Prototype Fund roadmap adds better terrain (GeoTIFF, XYZ tiles, LAS/LAZ), road and bridge grading, and **3D Tiles output**, all still planned ([roadmap](https://osm2world.org/blog/2026/06/03/ptf-roadmap-2026-osm-3d-terrain/), [releases](https://osm2world.org/categories/releases/index.xml)) |
| **Blosm** (Blender add-on, formerly blender-osm) | Imports OSM buildings (roof shapes), roads as curves draped on terrain, and ~30 m terrain into Blender. Export glTF from Blender after manual art passes | Active: commits 2026-09. Free base version, paid Pro (textures, trees); GPL source. GitHub releases are stale (v2.4.21, 2021); distributed via Gumroad ([repo](https://github.com/vvoovv/blosm)) |
| **CesiumGS/3d-tiles-tools** (Node CLI) | Packages existing glTF into tilesets (`createTilesetJson`, `glbToB3dm`, `upgrade`, `merge`). **Does not** spatially split or LOD a large glTF | Active: v0.5.4 (npm 2026-07-15). Pipeline feature marked "preliminary" ([repo](https://github.com/CesiumGS/3d-tiles-tools)) |
| Custom Node/TS bake script | Reads OSM (GeoJSON via osmium or Overpass) plus DEM, extrudes and triangulates (earcut), and writes per-chunk GLB with gltf-transform/Draco | Your own code; full control of the stylized look and chunk grid |

Pros: fast runtime, full art control, deterministic collision meshes, and the road graph and stops can be baked at the same time. Cons: a build step, data refreshes need a rebuild, and asset size has to be managed (chunk + Draco/meshopt).

### Option B: generate at runtime from vector tiles plus DEM tiles
| Tool | Role | Maintenance |
|---|---|---|
| **Planetiler** (Java) | OSM `.pbf` to MVT/MLT vector tiles in MBTiles or **PMTiles**, configured with custom YAML or Java profiles. Apache-2.0 | Active ([repo](https://github.com/onthegomap/planetiler)) |
| **tippecanoe** (felt) | GeoJSON to vector tiles | 2.79.0 (2025-07-24), commits 2026-09 |
| **PMTiles** | Single-file tile archive served from static hosting via HTTP range requests (`pmtiles` npm 4.5.0, 2026-08) | Active |
| **MapLibre GL JS** | Renders vector-tile buildings with `fill-extrusion` and `raster-dem` terrain out of the box. Three.js can sit in a custom layer | Active (6.16.0, 2026-10-25) |
| **3d-tiles-renderer** | In Three.js or Babylon: streams 3D Tiles and quantized-mesh terrain, with overlay plugins for MVT/Protomaps and GeoJSON | Active (0.5.3, 2026-09-18), Apache-2.0 |

Pros: small download, streaming built in, no bake step. Cons: you write the mesh generation (extrude, drape roads on terrain, collision) in the client and pay its CPU cost on load. Collision meshes and the road graph for AI traffic have to be rebuilt per tile at runtime. Visual control is harder.

### Hybrid
Bake terrain and buildings to chunked GLB at build time. Ship roads and the Route as baked data, both a mesh and a lane/graph JSON for AI traffic, then stream chunks by distance. Most of the tooling above supports this (OSM2World or a custom script, gltf-transform, an optional 3d-tiles-tools wrap).

## 3. Implications for the decision (ticket 006)

- **CesiumJS** is best at terrain and tile streaming but is a poor fit for an arcade game. It has no physics, so vehicle physics would need a parallel Rapier or Jolt world with ECEF↔local conversion. Its globe camera and lighting fight a stylized look, and its OSM Buildings set is ion-hosted. The streaming advantage matters less at a ~30 km, two-Region scale.
- **Three.js** has the largest ecosystem and full control of the look, plus `3d-tiles-renderer` for optional streaming. Physics must be added: Rapier is the most direct path because it ships a raycast vehicle controller and heightfields. The trade-off is more assembly work (scene management, UI, audio).
- **Babylon.js** is the most batteries-included game engine, written in TypeScript, with Havok heightfields. Its gap is vehicles: no first-party raycast vehicle was found, so the options are a community port or plugging in Rapier/Jolt. `3d-tiles-renderer` also supports it.
- **PlayCanvas** is viable but editor-centric; its built-in physics is Ammo.js, which has no tagged releases.
- **Pipeline**: Runtime vector-tile generation (MapLibre-style) suits maps, not gameplay that needs stable collision and a lane graph for AI traffic. A **build-time bake** (OSM2World or a custom TS script, plus Copernicus DEM, to chunked GLB) is engine-agnostic and keeps collision and the Route/Stop data deterministic. OSM2World's terrain and 3D Tiles support is still on its roadmap, so terrain draping and road grading may need custom code. Blosm adds a manual art pass in Blender, which suits the hand-modelled landmarks.
- **Data risk, independent of engine**: sparse building heights in Dhaka OSM, and the 30 m DEM limit in Bandarban (smooth hills; road cuts on hill roads will need flattening).
