---
id: 008
title: Decide how other players are shown and told apart
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Other players' vehicles use the full, realistic models ([Prototype how other players' vehicles move](004-prototype-remote-vehicle-feel.md)). How do you tell them apart and find them? Decide:
- name tags over vehicles (always, only near, only in chase view; size and fade distance);
- which livery or plane colour each player shows (their own unlocked one, or one assigned per seat so no two match);
- how players appear on the minimap and the map menu's Room chip;
- what happens when two players' vehicles overlap (no collisions): see-through, nudged, or left alone;
- whether to add working exterior wipers to the bus model so other buses look right in rain (today rain is a cab-only overlay).

## Resolution

2026-11-02, grilled with the user (all recommendations accepted):

1. **Name tags:** always on, but only within about 300 m, fading with distance, drawn small so they don't clutter the cab. A player in range but off screen gets a small arrow at the screen edge.
2. **Liveries:** each player shows their own unlocked livery or plane colour (sent once on joining), so earned liveries show off to friends. Each seat also has one of **six distinct seat colours**, used on the name tag, the minimap dot and the player list, so players are told apart even when liveries match.
3. **Minimap and Room chip:** each player is a dot in their seat colour with their initial; the Room chip on the destination card shows the count, for example "👥 3/6".
4. **Overlap:** no collisions and no nudging. When your vehicle and another player's overlap, theirs turns see-through until you're apart, so neither blocks the view.
5. **Exterior wipers:** the bus model gets two low-poly wipers that sweep in rain on every bus, yours seen from outside and other players'. No extra data is needed: weather is Room-wide, so each game knows when to sweep.
