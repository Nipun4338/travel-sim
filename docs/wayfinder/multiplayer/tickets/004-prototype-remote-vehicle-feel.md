---
id: 004
title: Prototype how other players' vehicles move
labels: [wayfinder:prototype]
status: open
assignee:
blocked_by: [002]
---

## Question

With updates arriving 5–10 times a second over a mobile connection (simulated delay, jitter and loss), how should another player's bus or plane be smoothed so it looks natural: interpolation delay, extrapolation when packets are late, snapping after a long gap? Prototype two players on one screen with adjustable network conditions and judge it with the user. The answer fixes the update rate and the smoothing rules.
