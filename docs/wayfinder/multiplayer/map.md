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
- [Define what a Room is and who can join](tickets/003-define-the-room.md): 4-character code plus share link, 6 players, one Region and mode per Room, join or leave any time on your own Leg, names from a bilingual list, the creator is Host (time and weather, removing players), closes 5 min after it empties.
- [Prototype how other players' vehicles move](tickets/004-prototype-remote-vehicle-feel.md): dead reckoning with eased corrections at 5 updates a second (≈18 free Room-hours a day); other players' vehicles use the full, realistic models (mirrors, windscreen, lights, doors, wheels), not ghosts.
- [Choose how the Room server is deployed beside the site](tickets/005-choose-the-deployment-shape.md): a separate free Worker on workers.dev reached directly (no Pages Functions), code in `server/rooms/`, deployed by its own `npm run deploy:rooms`, `wrangler dev` locally, only the game's origins accepted.
- [Choose how Rooms stay inside the free daily quota](tickets/006-stay-inside-the-free-quota.md): stopped vehicles send 1 update/s instead of 5, paused players stop sending and leave after 10 min, a budget tally closes new Rooms at ~90% of the day's quota while running ones finish, friendly "full for today" and "driving solo" messages, no other caps.
- [Prototype creating and joining a Room from the map menu](tickets/007-prototype-the-room-menu.md): a "Play with friends" button on the destination card opens a sheet over the map with the whole flow (create, join by code, Room panel with code, share and players); closing it leaves a Room chip on the card so you can pick your Leg; generated vehicle names.
- [Decide how other players are shown and told apart](tickets/008-present-other-players.md): name tags within ~300 m plus edge arrows; own liveries plus six seat colours; coloured minimap dots and a "👥 3/6" chip; overlapping vehicles turn see-through; exterior wipers on every bus.
- [Decide whether players can communicate in a Room](tickets/009-decide-communication.md): horn, flash and indicators shared; six preset bilingual quick messages (one per 5 s); no emotes or free text; removed players can't rejoin that Room.

## Not yet specified

Nothing at the moment: every open question is now a ticket.

## Out of scope

- Racing or competitive play on the same Route, and shared scores or leaderboards: a different design (option (b)), possibly a later map.
- Riding together, one player driving and others as passengers (option (c)).
- Shared AI traffic: each player keeps their own random traffic.
- Collisions between players' vehicles.
- Accounts, friends lists, cloud saves and voice chat.
