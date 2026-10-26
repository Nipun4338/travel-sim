---
id: 006
title: Choose the 3D engine and world-generation approach
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: [001, 002, 004, 009, 011, 012]
---

## Question

Given the engine and pipeline comparison, the data available, the locked Region bounds, and the device budget (including mobile): which engine do we build on, and is the world prebaked at build time or generated at runtime (and with which tools)?

## Resolution

- **Engine:** Three.js with Rapier physics (`@dimforge/rapier3d`), which brings a raycast vehicle controller and heightfield colliders. Babylon.js was rejected because it has no first-party vehicle controller and is heavier to download.
- **Code style:** plain TypeScript with our own game loop; no React or react-three-fiber. Menus and the HUD are DOM overlays.
- **World pipeline:** a custom TypeScript bake script run at build time. It reads OSM (Geofabrik Bangladesh extract) and Copernicus GLO-30 elevation and writes per-chunk GLB files (meshopt-compressed) per Region, plus Route, Stop and lane-graph JSON for AI traffic. Roads are graded into the terrain, which matters for the Bandarban hairpins. Blender is used only for hand-modelled landmarks. OSM2World and Blosm were rejected: OSM2World's terrain support is experimental, and both give too little control over the stylized look.
- **Coordinates:** local metres from each Region's centre (no globe coordinates).
- **Building heights:** OSM `building:levels` or `height` where present, else Google Open Buildings 2.5D (CC BY 4.0, credited), else a per-area default.
- **Detail and streaming:** Bus Mode gets full detail within ~250 m either side of the Route, with a low-detail backdrop beyond. Flight Mode covers the whole Flight Zone at low and medium detail, reusing the corridor detail where it overlaps. The world is cut into 1 km chunks with 3 levels of detail, streamed by distance, to fit the ≤ 60 MB per Region-mode budget.
- **Visual style:** flat-shaded low-poly, coloured with vertex colours plus a small shared texture atlas.
