---
id: 002
title: Measure what each mode would need to send
labels: [wayfinder:task]
status: open
assignee:
blocked_by: []
---

## Question

AFK. From the code (`src/bus`, `src/metro`, `src/flight`, the views in `src/render`), list the state another player needs to draw each vehicle believably: for the bus, position, heading, speed, indicators, lights, doors and wipers; for the Metro, position along the line and doors; for the plane, pose and gear. Size one update per mode in bytes (compact binary or JSON), and work out the data use per player per hour at 10 and 5 updates a second for a 6-player Room, against what a prepaid mobile data pack in Bangladesh gives. The answer records the state lists and the numbers.
