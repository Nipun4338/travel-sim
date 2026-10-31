---
id: 010
title: Shape the four Line 6 station models
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Line 6's top fix is replacing the generic station with the four types from [Research how the Line 6 stations really differ](003-research-line6-stations.md): A standard, B with an end arch, C Uttara North, D the Farmgate hero. How much detail does each get within the low-poly style, which stations are type B, and what is Uttara North's real layout (the user to confirm as a rider)? Prototype type A and the Farmgate rebuild next to the photos and judge them with the user.

## Prototype

[prototypes/line6-stations/PROTOTYPE-line6-stations.html](../../../../prototypes/line6-stations/PROTOTYPE-line6-stations.html) shows today's generic station, type A simple and detailed, type B (Uttara Center), type C (an Uttara North guess) and type D (the Farmgate rebuild), with cameras for arriving in the cab, standing on the platform, the street and the air. Run `python -m http.server 5173 --directory prototypes` and open `/line6-stations/PROTOTYPE-line6-stations.html?variant=A2`. Station models come to about 1,700 triangles today, 7,600 for A detailed, about 8,000 for B and 6,600 for D. Signage comes from one small canvas atlas per station.

## Resolution

2026-10-31, judged with the user (all recommendations accepted):

1. **Type A at the detailed level (A2)** for the 12 standard stations:
   - terracotta walls with grey pilasters and cream bands;
   - an arched grey roof with a skylight band, a green edge and visible curved trusses;
   - 6 m side platforms with half-height PSDs, stairs, escalators and benches;
   - the concourse box straddling the road on piers, with a white Bangla | logo | English fascia over the road opening;
   - green platform roundels, and street entrances with green canopies and exit letters.
2. **Type B** (A2 plus an arch end) at **Uttara Center**, with a green-and-red panelled arch at each roof end, and at **Bijoy Sarani**, with a glazed fan arch with a green rim and brick stair towers. No others until someone sees one.
3. **Type C, Uttara North:** the user didn't confirm the layout. Model two side platforms on the through tracks and draw the other two OSM tracks as depot track without platforms. Add the branching columns, the open sides above a low parapet and the widest roof. Revisit if a rider's check says otherwise.
4. **Type D replaces the current Farmgate hero model** (the white barrel roof). It has a cream grid façade over terracotta, a low teal roof, and green-roofed skywalks on terracotta trusses reaching both pavements.
