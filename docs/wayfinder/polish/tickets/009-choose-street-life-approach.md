---
id: 009
title: Choose how street life is made and how dense it is
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Street life ranks second on the Dhaka corridor and is part of the Line 6 viaduct view and Bandarban's roadside life (see [Rank the fidelity gaps](006-rank-fidelity-gaps.md)): stacked signboards, billboards, overhead wires, tea stalls, bus counters, crowds, rooftop clutter. Should each be procedural, CC assets or hand-made, and how dense should they be per block? Prototype one Dhaka block at two or three densities from the cab view and judge it with the user.

## Prototype

[prototypes/street-life/PROTOTYPE-street-life.html](../../../../prototypes/street-life/PROTOTYPE-street-life.html): one 220 m Dhaka block seen from the cab, in four variants (A today's bake, B flat colour dense, C Bangla atlas medium, D Bangla atlas dense). Run it with `python -m http.server 5173 --directory prototypes` and open `/street-life/PROTOTYPE-street-life.html?variant=D`. The densest variant comes to about 6,800 triangles in 4 draw calls plus one 1024² texture atlas.

## Resolution

2026-10-31, judged with the user (all recommendations accepted):

1. **Signs carry painted Bangla text** from one shared 1024² atlas, generated at bake time: shop names, phone numbers and billboard slogans, with no real brands. Text is what makes the street read as Dhaka.
2. **Density:** D's on commercial stretches and C's on quieter residential ones, chosen from OSM shop and commercial tagging. D means boards stacked 3 floors up, blade signs over about half the frontages, 12 wires per pole span with coils, a tea stall every ~25 m, about 80 people per 200 m, and parked rickshaws. C means 2 floors, a quarter of the frontages, 6 wires, a stall every ~45 m and about 35 people.
3. **Everything is procedural low-poly**, built in the bake from boxes and quads like today's signs: people, stalls, rickshaws, poles and wires. No CC models, so no licences to track.
4. **Line 6** uses the same kit at C density, plus billboards facing the viaduct and rooftop clutter. **Bandarban** gets only stalls and roadside hand-painted signs, with no wires or stacked boards.
