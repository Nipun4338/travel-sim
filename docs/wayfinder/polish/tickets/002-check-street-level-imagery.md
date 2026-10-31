---
id: 002
title: Check street-level imagery coverage for the three places
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

What free street-level imagery exists along the Dhaka bus Route, under Line 6, and on the Bandarban → Chimbuk road? For Mapillary and KartaView (and any other free source): coverage per km, capture dates, licence for use as a modelling reference in a public game, and how to pull a frame at a given point (API, no account if possible). The answer says where references are good, thin or missing, so the user knows where their own photos are needed.

## Research

Findings: [docs/research/street-level-imagery.md](../../../research/street-level-imagery.md) (checked 2026-10-31). No free source has current street-level coverage of any of the three places. KartaView (no account, CC BY-SA 4.0) has a few flat 2019 frames along the Dhaka Route between Bijoy Sarani and Kakoli (5 of 13 sample points) and under Line 6 between Kazipara and Karwan Bazar (5 of 18), taken before the line opened. It has nothing north of Kakoli, nothing at the Uttara or Motijheel ends of Line 6, and nothing on the Bandarban → Chimbuk road (0 of 27). Panoramax has nothing in either box. Mapillary needs an account token, so it was not measured; the doc gives the one-request-per-point query to run with the user's own token. Google Street View is ruled out by its terms (§3.2.3: no scraping, no creating content from it). Wikimedia Commons has many photos of finished Line 6 stations but only a handful for Shoilo Propat and Chimbuk. The user's own photos are needed for the whole Bandarban road, the Dhaka Route north of Kakoli, and the finished Line 6 viaduct and stations.

## Resolution

No free source gives current coverage. KartaView's 2019 frames help only for Bijoy Sarani to Kakoli and the pre-opening Line 6 between Kazipara and Karwan Bazar. Mapillary is unmeasured because it needs the user's token, and Street View is ruled out by its terms. Ticket 005 relies on the user's own photos for the Bandarban road, the Route north of Kakoli and the finished Line 6. Wikimedia Commons supplements Line 6.
