---
id: 013
title: Order the per-place releases and fix what goes in each
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: [012]
---

## Question

Given the ranked fixes and the measured budget, in what order do the per-place releases ship (for example v1.3 Dhaka corridor, v1.4 Line 6, v1.5 Bandarban), which release carries the shared heights, and which conditional items make each cut?

## Resolution

2026-10-31, grilled with the user (all recommendations accepted). Every conditional item fits the budget ([Measure what the chosen fixes cost](012-measure-budget-cost.md)), so each place ships its whole ranked list.

| Release | Contents |
|---|---|
| **v1.2.2** (patch, now) | Bandarban correctness from [Ground-truth the Bandarban road](004-ground-truth-bandarban-road.md): reroute km 2.57–3.74 back onto the Thanchi Road (~22.8 km), move the Chimbuk Stop and landmark ~100 m to the summit, update the SPEC Stop km figures, remove the yellow centre line. |
| **v1.3**, Dhaka corridor | **Real heights for every Region and both Flight Zones** (rules in [Spot-check the heights](008-spot-check-building-heights.md)). The street-life kit at D/C density ([ticket](009-choose-street-life-approach.md)). The Kuril/Khilkhet built-up edge and a Kuril interchange that reads. Weathering (palette and texture). The Route-length check (12.58 against 13.94 km). |
| **v1.4**, Line 6 | The four station types ([ticket](010-shape-line6-station-models.md)), with Farmgate rebuilt. The street-life kit at C density along the viaduct, plus billboards facing the train and rooftop clutter. Campus and park trees at Dhaka University–Secretariat. Road traffic under the viaduct. The Line 6 announcements if they've been recorded. |
| **v1.5**, Bandarban | The ridge treatment ([ticket](011-ridge-feel-bandarban.md)): deeper canopy strip, steep valley edges, parapets at ≥ 8 m drops, ~16 km visibility, and a 240 m Flight Zone backdrop. Roadside life: stalls at Shoilo Propat, Chimbuk's canteen and registration point, Bawm stilt houses, Thanchi buses and chander gari. Jhum patches. |

- **Voices:** no release waits for them. Each set ships in the first release after its files arrive ([Record the Helper call-outs and Line 6 announcements](007-record-voices.md)).
- **Every release** bumps `package.json`, adds a Bangla/English `changelog.ts` entry, retakes the README screenshots, and is checked at 30 fps on a Helio G99 / Snapdragon 680-class phone.
- **Not on this map:** other landmark models and the Flight Zone skyline go to a short follow-up map after v1.3, when air shots and street views exist to judge from.
