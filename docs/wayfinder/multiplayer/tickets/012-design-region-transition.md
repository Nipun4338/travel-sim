---
id: 012
title: Design the flying transition when a Room moves to another Region
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: [011]
---

## Question

Once Rooms span several Regions, a Room can move on (for example Dhaka → Bandarban) with a striking flying cut-scene, not a flyable journey (SPEC §1 rules out one continuous world). Decide who triggers the move (the Host, or a vote), whether everyone travels together or each player follows when ready, what the animation shows (the planes taking off, the camera sweeping over the Bangladesh map from the menu, landing in the next Region) and how long it runs while the next Region loads. Prototype the animation and judge it with the user. Blocked until the release plan says when multi-Region Rooms arrive.

## Prototype

Built over the real game, dev server only: `src/ui/transitionPrototype.ts` mounted from `src/entry.ts` with `?transitionproto=A|B|C`, drawn on the menu's own Bangladesh map (`bdMap.ts`), with a slider for how long the next Region takes to load. Captured on the throwaway branch `prototype/region-transition` (not merged). Three takes:
- **A, map sweep:** one plane, the camera following it on an arc with a trail and clouds;
- **B, formation:** the Room's planes in a V in their seat colours with name tags, and a passport stamp on arrival;
- **C, postcard:** the Dhaka card slides out, a plane zips across, the Bandarban card slides in.

In A and B the planes circle over the destination in a holding pattern while the Region is still loading, so the screen never freezes.

## Resolution

2026-11-02, judged with the user (recommendations accepted):

1. **Take B, the formation, showing what everyone is using (user):** each player appears as **their own vehicle in their own livery**, with their seat colour on the name tag, not a generic plane. A Bus Room's buses travel in convoy along the real Dhaka–Chattogram–Bandarban highway line drawn on the map; a Plane Room's planes fly in a V on an arc; a Metro Room (Line 6 only) never moves Region. Vehicles are top-down low-poly icons drawn from the same livery colours as the 3D models. Clouds and a dashed trail as prototyped. On arrival a red "বান্দরবান / BANDARBAN · রুম এসে পৌঁছেছে / Room arrived" passport stamp thumps down, then the screen fades into the new Region.
2. **The Host triggers it** ("Move the Room to Bandarban"), and everyone gets a **10-second countdown**.
3. **Everyone travels together:** a Room is one Region, so at the end of the countdown the whole Room flies. "Stay here" leaves the Room and carries on solo.
4. **Timing:** about 4 seconds of flight; if the next Region isn't loaded yet, the formation circles over it with "Loading Bandarban… n%"; then 1–2 seconds for the stamp and fade. It never ends before the Region is ready.
