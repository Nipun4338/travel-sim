---
id: 014
title: Find CC landmark models and verify landmark locations
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

For each landmark chosen in [Pick landmarks for each Route and Flight Zone](010-pick-landmarks.md):
- Does a free CC-licensed (or similarly permissive) 3D model exist? Give the source URL, licence and attribution, triangle count, format, and whether it fits the hero (≤ 8k) or simple (≤ 1.5k) budget, or could be decimated to fit.
- What is its exact location (OSM feature or coordinate)? Is it inside its Route corridor (±250 m) or Flight Zone as fixed in [Adjust Region bounds after OSM measurement](012-adjust-region-bounds.md)?
- Do OSM bridge ways exist for the Elevated Expressway, MRT Line 6 and the Mohakhali and Kuril flyovers along the Dhaka Route, with `layer`, `bridge` and `height` (or similar) tags the bake can use?

## Resolution

- **Models:** no free, licensed, downloadable model of any specific landmark fits its budget. Only Shaheed Minar (80.8k tris) and the Lalbagh Fort mosque (51.2k) have CC BY models. Bangladeshi Sangsad Bhaban, Dhaka Metro and Kuril models exist but have no licence. Generic CC stand-ins fit for the hanging bridge, boats and waterfall. Plan to hand-model the rest.
- **Locations:** 23 of 24 landmarks are inside their corridor or zone. Chimbuk is the problem. The ticket 012 Route end (Wikidata "Chimbuk hill") is at ~212 m in SRTM, ~320 m below the Thanchi Road junction. The high ground and the "Chimbuk Tourist Centre" point (558 m) are 462 m off the Route. Novotheatre is "Novo Theatre" in OSM, and the MRT track meets the Route only at Farmgate.
- **Elevated roads:** bridge ways exist for the Expressway (`layer=3`), MRT Line 6 (`bridge=viaduct`, `layer=6`) and the Mohakhali and Kuril flyovers (`layer=1`). None has `height` or `level` tags. The bus path stays at ground level.
- Details: [docs/research/landmarks.md](../../research/landmarks.md)
