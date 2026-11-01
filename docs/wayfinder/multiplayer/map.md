---
title: Multiplayer rooms — see each other on the road
labels: [wayfinder:map]
---

## Destination

A build-ready spec for **Rooms**: a player creates a Room and shares a short code, friends join it, and everyone in the same Region and mode sees each other's buses, trains or planes moving live. Each player keeps their own vehicle, physics and AI traffic. Nothing is left to decide before building.

## Notes

- Domain: the glossary is `/CONTEXT.md` (Region, Route, Stop, Leg, Run, Flight Zone, **Room**…); v1 rules are in `/SPEC.md`. SPEC §1 put multiplayer out of scope for v1; this map scopes the first version of it (user, 2026-11-02: option (a), "see each other", not racing or riding together).
- Skills each session: `grilling` and `domain-modeling`; `prototype` when the feel of remote vehicles has to be judged; `research` for AFK fact-finding.
- Standing constraints:
  - **Single-player must not change.** It keeps working offline, with no sign-in, exactly as now; Rooms are an extra.
  - **No accounts.** A Room code and a display name are enough (SPEC §1 rules out online accounts).
  - **Budgets** from SPEC §2 hold (30 fps on the minimum phone), and network use should suit prepaid mobile data in Bangladesh.
  - **Hosting:** the game is on Cloudflare Pages; prefer Cloudflare for the Room server unless research rules it out.
- Starting point (2026-11-02): no networking code exists. Bus physics is local Rapier, AI traffic is local and random per player, the Metro runs on the baked line, Flight Mode is a kinematic model. The menu is the Bangladesh map with a destination card per place (SPEC §13).

## Decisions so far

<!-- one line per closed ticket: [title](link): gist -->

## Not yet specified

- **Presentation of other players:** name tags, which livery or plane colour each player gets, how other players show on the minimap, and what happens when two players are on the same spot (no collisions, but they overlap).
- **Menu and flow:** where Create Room and Join sit in the map menu, sharing the code (copy, share sheet), what a joiner sees while the host picks a Leg, and starting a trip together or freely.
- **Room lifetime and safety:** how long a Room lives, what happens when the host leaves, kicking, and whether any text chat exists at all (none is the default for a family-friendly game).
- **Cost and scale:** what Rooms cost to run at the expected player numbers, and limits that keep it inside a free or cheap tier.
- **Offline and failure:** what the game does when the connection drops mid-trip, and how a PWA started offline offers Rooms.
- **Release plan:** which version ships Rooms, and whether it starts with one mode (for example Bus in Dhaka) before the others.

## Out of scope

- Racing or competitive play on the same Route, and shared scores or leaderboards: a different design (option (b)), possibly a later map.
- Riding together, one player driving and others as passengers (option (c)).
- Shared AI traffic: each player keeps their own random traffic.
- Collisions between players' vehicles.
- Accounts, friends lists, cloud saves and voice chat.
