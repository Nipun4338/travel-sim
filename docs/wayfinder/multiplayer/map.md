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
  - **Zero cost** (user, 2026-11-02): Rooms must cost $0 to run, with no paid plan and no chance of a surprise bill. When a free limit is reached, Rooms may stop working for the day; they must never start billing.
  - **Hosting:** the game is on Cloudflare Pages; prefer Cloudflare's free plan for the Room server unless research rules it out.
- Starting point (2026-11-02): no networking code exists. Bus physics is local Rapier, AI traffic is local and random per player, the Metro runs on the baked line, Flight Mode is a kinematic model. The menu is the Bangladesh map with a destination card per place (SPEC §13).

## Decisions so far

<!-- one line per closed ticket: [title](link): gist -->

- [Research hosting Rooms on Cloudflare](tickets/001-research-cloudflare-room-server.md): Workers Free with Durable Objects meets $0 (errors, never a bill, at the limit); only ~9 Room-hours a day at 10 updates/s or ~18 at 5, so rate and caps matter; a separate Worker is needed.
- [Measure what each mode would need to send](tickets/002-measure-what-each-mode-sends.md): ~30 bytes per bus or plane update and 12 for the Metro in binary; ~11–22 MB per player-hour (JSON would be ~52), so binary; data use isn't the constraint, the free quota is; time and weather must be Room-wide.

## Not yet specified

- **Presentation of other players:** name tags, which livery or plane colour each player gets, how other players show on the minimap, and what happens when two players are on the same spot (no collisions, but they overlap).
- **Menu and flow:** where Create Room and Join sit in the map menu, sharing the code (copy, share sheet), what a joiner sees while the host picks a Leg, and starting a trip together or freely.
- **Room lifetime and safety:** how long a Room lives, what happens when the host leaves, kicking, and whether any text chat exists at all (none is the default for a family-friendly game).
- **Offline and failure:** what the game does when the connection drops mid-trip, and how a PWA started offline offers Rooms.
- **Release plan:** which version ships Rooms. User direction (2026-11-02): start with **one Region**, then open the others; which Region and mode go first is still open.
- **Moving between Regions in a Room:** once Rooms span several Regions, a Room that moves on (for example Dhaka → Bandarban) plays a striking flying transition, such as the planes taking off and the camera sweeping over the Bangladesh map to the next Region. It's a cut-scene between Regions, not a flyable journey (SPEC §1 still rules out one continuous world). Open: who triggers the move, whether everyone travels together, and how long the animation runs while the next Region loads.

## Out of scope

- Racing or competitive play on the same Route, and shared scores or leaderboards: a different design (option (b)), possibly a later map.
- Riding together, one player driving and others as passengers (option (c)).
- Shared AI traffic: each player keeps their own random traffic.
- Collisions between players' vehicles.
- Accounts, friends lists, cloud saves and voice chat.
