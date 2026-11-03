# Travel Sim: Rooms spec (multiplayer, v1.4 onwards)

This spec covers **Rooms**: a player creates a Room and shares a short code, friends join, and everyone in the same Region and mode sees each other's vehicles live. Each player keeps their own vehicle, physics and AI traffic. It consolidates the [multiplayer map](wayfinder/multiplayer/map.md) as of 2026-11-02 and gives only the final decisions; each section links the tickets that hold the reasoning. Domain terms (**Room**, **Room code**, **Host**, **Region**, **Leg**, **Run**…) are in [CONTEXT.md](../CONTEXT.md). The v1 rules in [SPEC.md](../SPEC.md) still hold: SPEC §1's "no multiplayer" is lifted only for what this spec describes.

**Standing rules**
- **Single-player doesn't change.** It keeps working offline, with no sign-in. Rooms are an extra, and every Room failure falls back to driving solo.
- **No accounts.**
- **Zero cost.** Rooms run on Cloudflare's free plan only. At a free limit they stop with an error; they never bill.
- **Budgets:** SPEC §2 holds (30 fps on the minimum phone), and data use suits prepaid mobile data.

---

## 1. Releases

*As built, v1.4.0 (2026-11-03):* the production Room server is `wss://travel-sim-rooms.nipun4338.workers.dev` (set in `.env.production`), the preview one `wss://travel-sim-rooms-preview.nipun4338.workers.dev` (3,000 free requests a day). On phones the Room pill and a 44 px 💬 sit at the top right under the touch buttons; on a gamepad, Select opens the quick-message wheel and A, B, X, Y, LB, RB pick messages 1–6. The menu itself has no gamepad navigation yet (true of every menu screen, not only Rooms).

[Plan which release ships Rooms and in what order](wayfinder/multiplayer/tickets/011-plan-the-releases.md)

| Release | Rooms in |
|---|---|
| **v1.4** | **Bus in Dhaka** |
| next | Plane in Dhaka (the Flight Zone) |
| after polish v1.5 | Metro on Line 6 |
| after polish v1.6 | Bus and Plane in Bandarban |
| last | Rooms moving between Regions (§10) |

- The polish releases moved back by one for this: Line 6 is v1.5, Bandarban v1.6 ([polish spec](polish-spec.md)).
- Every release follows the usual steps (version bump, bilingual changelog, release picture, README shots), plus a **GitHub Release** tagged `vX.Y.Z` on `main` with the changelog notes and picture.
- **Testing before players see v1.4:**
  - a preview Room server `travel-sim-rooms-preview` with a Pages preview deploy;
  - two phones on mobile data plus a desktop in one Room for a full Leg, including a forced drop and reconnect;
  - the 90% wind-down (§8) tested with a tiny threshold.

## 2. The Room server

[Research hosting Rooms on Cloudflare](wayfinder/multiplayer/tickets/001-research-cloudflare-room-server.md), [Choose how the Room server is deployed beside the site](wayfinder/multiplayer/tickets/005-choose-the-deployment-shape.md), [research](research/cloudflare-rooms.md)

- **A separate Worker** on the Workers Free plan, `travel-sim-rooms`, at `wss://travel-sim-rooms.<account>.workers.dev/room/<code>`. A Pages project can't hold a Durable Object, and the Pages site is left unchanged: no Pages Functions.
- **One Durable Object per Room code** (`env.ROOMS.getByName(code)`), class `Room`, SQLite-backed (declared with `new_sqlite_classes`, required on Free), using the **WebSocket Hibernation API** (`ctx.acceptWebSocket`, `webSocketMessage`, `webSocketClose`).
- **What the server does:** it relays each update to the other sockets and keeps the Room's state: players, seats, Host, time and weather, and removed connections. It runs no simulation.
- **Allowed origins:** the upgrade is accepted only from `https://travel-sim.pages.dev`, `https://*.travel-sim.pages.dev` and `http://localhost:*`. Anything else gets 403.
- **Code:** `server/rooms/`, with its own `wrangler.toml` (`workers_dev = true`, the `ROOMS` binding, migration `v1`) and `tsconfig.json`. The message formats (§4) live in `src/shared/`, so the game and the server share them.
- **Deploy:** `npm run deploy:rooms`, separate from `npm run deploy`. The game reads the server address from `VITE_ROOMS_URL`, defaulting to production.
- **Local:** `wrangler dev` on `localhost:8787` beside Vite, with a `rooms` entry in `.claude/launch.json`.

## 3. What a Room is

[Define what a Room is and who can join](wayfinder/multiplayer/tickets/003-define-the-room.md)

- **Room code:** 4 characters from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O, 1/I), such as `K7QM`. The share link is `https://travel-sim.pages.dev/?room=K7QM`.
- **Up to 6 players.** A Room is fixed to one **Region and mode**, chosen by its creator. Each player picks their own Leg (or flies freely in the Flight Zone) and sees whoever is near.
- **Joining and leaving:** at any time. A joiner starts at their chosen Leg's first Stop; someone leaving just disappears. Nobody's Run is interrupted.
- **Names:** picked from a generated bilingual list of six local vehicles plus a number, for example "সবুজ বাস ৭ / Green Bus 7" (Green Bus, Red Rickshaw, Blue CNG, Yellow Truck, Purple Bus, Orange Launch), with a reroll. There is no free text.
- **Host:** the creator. The Host chooses the time of day and weather at creation (or Random, picked once) and can remove a player. If the Host leaves, the next to have joined takes over.
- **Shared sky:** time of day and weather are **Room-wide** and fixed for the Room's life. This replaces `pickConditions`' per-player choice inside a Room.
- **Lifetime:** a Room closes 5 minutes after its last player leaves, and the code is freed.

## 4. What's sent

[Measure what each mode would need to send](wayfinder/multiplayer/tickets/002-measure-what-each-mode-sends.md)

Compact **binary** messages. Each has a 4-byte header: type, seat, sequence number.

| Mode | Per update | Bytes |
|---|---|---|
| Bus | position (3 × f32), orientation (3 × i16), velocity (3 × i16, cm/s), steering (i8), flags (headlights off/parking/low, high beam, indicator L/R, hazard, brake, reverse, doors, horn) | ~30 |
| Plane | position, orientation, velocity, throttle (u8), pitch and roll input (2 × i8), flags (landing light, horn) | ~32 |
| Metro | distance along the line (f32), speed (i16), doors left and right (2 × u8) | ~12 |

- **Once, on joining:** name, seat, livery or plane colour, mode and Region.
- **Separate tiny events:** quick messages (§7), a player removed, a Host change, a Region move (§10).
- **Derived locally, not sent:** wheel spin, suspension, indicator blink phase, the Metro car positions, beams.
- **Data use:** about 11–22 MB per player per hour in a full Room.

## 5. How other vehicles move

[Prototype how other players' vehicles move](wayfinder/multiplayer/tickets/004-prototype-remote-vehicle-feel.md), [prototype](../prototypes/remote-vehicles/PROTOTYPE-remote-vehicles.html)

- **5 updates a second** while moving, and **1 a second while stopped** (§8).
- **Dead reckoning:** the vehicle is drawn ahead from its last position, heading and speed. Corrections are eased in at a quarter of the gap per frame, with a snap only after a gap of more than 30 m. The prototype's `RemoteVehicle` class (`method: 'extrapolate'`) is the reference.
- In simulation this gave almost no visible jumps even on a bad signal, and stayed 0.7–1.5 m from the real position on average.

## 6. How other players look

[Decide how other players are shown and told apart](wayfinder/multiplayer/tickets/008-present-other-players.md)

- **Full, realistic models.** Buses get the livery, mirrors on their arms, windscreen and windows, the next-Stop board, all lights, opening doors, steering and spinning wheels. The Metro is the full set with doors; the plane has its propeller and control surfaces. No ghosts.
- Your own cab mirrors reflect other players' buses. Their mirrors are drawn but don't render reflections.
- **New for realism:** two low-poly **exterior wipers** on every bus, sweeping in rain. The weather is Room-wide, so no data is needed.
- **Name tags:** always on within about 300 m, small and fading with distance, with an arrow at the screen edge for players in range but off screen.
- **Colours:** each player shows their own unlocked livery or plane colour. Each **seat** also has one of six seat colours (`#f7c600`, `#e74c3c`, `#16a085`, `#2e86c1`, `#c2187a`, `#f07f13`), used on the name tag, the minimap dot and the player list.
- **Minimap:** a seat-coloured dot with the player's initial.
- **Overlap:** there are no collisions between players. Another player's vehicle turns see-through while it overlaps yours.

## 7. Communication

[Decide whether players can communicate in a Room](wayfinder/multiplayer/tickets/009-decide-communication.md)

- **Shared signals:** the horn, headlight flash and indicators play on your vehicle for nearby players.
- **Six preset quick messages** on a small wheel. Each shows for 4 s beside the sender's name tag and in a small Room feed, at most one per player every 5 s:
  - "আমার জন্য অপেক্ষা করুন / Wait for me"
  - "চলুন যাই / Let's go"
  - "পরের স্টপে দেখা হবে / See you at the next Stop"
  - "ধন্যবাদ / Thanks"
  - "দারুণ! / Nice!"
  - "বিরতি নিচ্ছি / Taking a break"
- **No free text and no emotes.**
- **Removed players** can't rejoin that Room while it's open. They see "হোস্ট আপনাকে এই রুম থেকে সরিয়ে দিয়েছেন / The Host removed you from this Room" and carry on solo. The server remembers the block by connection identity for the Room's lifetime.

## 8. Staying free

[Choose how Rooms stay inside the free daily quota](wayfinder/multiplayer/tickets/006-stay-inside-the-free-quota.md)

- **Free capacity:** 100,000 Durable Object requests a day; 20 incoming WebSocket messages count as 1 request, and outgoing messages are free. That's about **18 Room-hours a day** for full Rooms at 5 updates a second, resetting at 00:00 UTC (06:00 in Bangladesh). Fewer updates while stopped stretch it further.
- **Stopped vehicles** (under about 0.5 m/s with nothing changing) send 1 update a second. Nothing is batched.
- **Paused or hidden tab:** sending stops and the vehicle stays parked for others. The player auto-leaves after 10 minutes and can rejoin with the code.
- **Graceful wind-down:** a single budget Durable Object tallies the day's requests, with each Room reporting about once a minute. Past about 90%, no Room opens and no one joins; running Rooms finish. Cloudflare's hard limit is only the backstop.
- **When Rooms are closed:** "আজকের রুম ভর্তি, সকাল ৬টায় আবার খুলবে / Rooms are full for today, back at 6 am".
- **No other caps** beyond 6 players.

## 9. The menu, offline and reconnecting

[Prototype creating and joining a Room from the map menu](wayfinder/multiplayer/tickets/007-prototype-the-room-menu.md), [Decide how Rooms behave offline and when a player reconnects](wayfinder/multiplayer/tickets/010-offline-and-reconnecting.md)

**The flow lives in a sheet** (variant B, prototype on branch `prototype/room-menu`):
- **Entry:** a "👥 Play with friends / বন্ধুদের সাথে খেলুন" button on the destination card, under the picture, opens a sheet over the map with:
  - **Choice:** "Create a Room / রুম খুলুন" or "Join with a code / কোড দিয়ে যোগ দিন".
  - **Create:** the generated name with "🎲 Another", then time and weather chips (Random first), noting that everyone sees the same sky.
  - **Room panel:** the code in large letters, Copy, Share (the phone's share sheet with the link), the player list (👑 Host, "(you)", "Remove / বের করুন" for the Host, "Free seat / খালি জায়গা"), "Pick your Leg" and "Leave the Room".
  - **Join:** a 4-letter code box. "That Room has 6 players already" or "No open Room has that code" keep the player on the join screen.
- **Closing the sheet in a Room** keeps you in it and shows a Room chip on the card, for example "👥 3/6", which reopens the sheet. You pick your Leg on the card as usual.

**Offline and reconnecting:**
- **Started offline:** the button shows greyed with 📵. Tapping it explains "রুমের জন্য ইন্টারনেট লাগবে। একা খেলা চলবে যেমন চলছে। / Rooms need the internet. Playing solo works as always." It wakes up on the browser's `online` event, with no reload.
- **A drop mid-trip:** the game quietly retries the same Room for **2 minutes** with backoff (1, 2, 4, 8… s), showing "আবার যুক্ত হচ্ছে… / Reconnecting…" by the minimap. Success restores the seat, name and colour; giving up shows "Connection lost, you're driving solo".
- **Others see** a dropped vehicle parked, slightly dimmed, with "⟳" on its name tag. It disappears after 2 minutes.
- **A dropped Host** keeps the role for those 2 minutes, then it passes on.
- **A `?room=` link** opened offline or after the Room closed opens the menu with the sheet showing the reason, plus "Create a Room". It's never a dead end.

## 10. Moving between Regions (last release)

[Design the flying transition when a Room moves to another Region](wayfinder/multiplayer/tickets/012-design-region-transition.md), prototype on branch `prototype/region-transition`

- **Trigger:** the Host chooses "Move the Room to Bandarban". Everyone gets a **10-second countdown**; "Stay here" leaves the Room and carries on solo. Everyone else travels together, because a Room is one Region.
- **The cut-scene** is drawn over the menu's Bangladesh map, with clouds and a dashed trail. Each player appears as **their own vehicle in their own livery**, with seat-coloured name tags:
  - a Bus Room's buses travel in convoy along the Dhaka–Chattogram–Bandarban highway line;
  - a Plane Room's planes fly in a V on an arc;
  - Line 6 Rooms never move Region.
- **Timing:** about 4 s of travel. If the next Region is still loading, the group circles over it with "Loading Bandarban… n%". Then a red "বান্দরবান / BANDARBAN · রুম এসে পৌঁছেছে / Room arrived" passport stamp and a fade, taking 1–2 s. It never ends before the Region is ready.

## 11. Not in this spec

Not part of Rooms:
- racing or competitive play and shared scores;
- riding together;
- shared AI traffic;
- collisions between players;
- accounts, friends lists, cloud saves and voice chat.

See the map's Out of scope section.
