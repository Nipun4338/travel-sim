# Hosting Rooms on Cloudflare

Research for ticket [multiplayer 001](../wayfinder/multiplayer/tickets/001-research-cloudflare-room-server.md). Checked 2026-11-02. A Room here is a short-code session of up to 6 players in one Region. Each player sends about 10 small position updates a second. The server only relays them: no authoritative simulation, no accounts, no stored state.

**Hard constraint (user, 2026-11-02):** Rooms must cost exactly $0, with no paid plan and no chance of a surprise bill. §1 answers that first. The rest of the brief follows.

## How this was checked

- Read Cloudflare's own docs pages only, all on 2026-11-02. The Durable Objects pricing page reports its last update as 2026-10-18. Pages read:
  - Durable Objects: [pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [WebSockets best practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/), [lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/), [namespace API](https://developers.cloudflare.com/durable-objects/api/namespace/), [migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/), and the [free-tier changelog](https://developers.cloudflare.com/changelog/post/2025-04-07-durable-objects-free-tier/).
  - Workers: [pricing](https://developers.cloudflare.com/workers/platform/pricing/), [limits](https://developers.cloudflare.com/workers/platform/limits/), [custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), and [migrating from Pages](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/).
  - Pages Functions: [bindings](https://developers.cloudflare.com/pages/functions/bindings/), [pricing](https://developers.cloudflare.com/pages/functions/pricing/) and [routing](https://developers.cloudflare.com/pages/functions/routing/).
  - Fallbacks: Realtime [TURN](https://developers.cloudflare.com/realtime/turn/) and [SFU pricing](https://developers.cloudflare.com/realtime/sfu/pricing/), plus [Firebase pricing](https://firebase.google.com/pricing).
  - [RFC 6455 §10.2](https://www.rfc-editor.org/rfc/rfc6455#section-10.2) for WebSocket origin checks.
- Read the repo: `package.json` (`deploy` runs `wrangler pages deploy dist`), the README (the site is `travel-sim.pages.dev`, no custom domain), and the project root, which has no `functions/` directory and no `wrangler.*` file.
- Nothing was deployed, created or signed in to. The arithmetic below is mine, worked from the published rates and quotas.

## 1. The $0 question: the Workers Free plan alone

**Durable Objects and hibernation are on Free.** "Durable Objects are available both on Workers Free and Workers Paid plans" ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). Free supports only SQLite-backed classes, so a new class must be declared with `new_sqlite_classes` ([migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/)). It has been this way since 2025-04-07 ([changelog](https://developers.cloudflare.com/changelog/post/2025-04-07-durable-objects-free-tier/)). The WebSocket Hibernation API has no plan restriction in the docs.

**Free daily limits that matter** ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/)):

| Quota | Workers Free |
|---|---|
| Durable Object requests | 100,000 / day. Incoming WebSocket messages count **20 to 1**. Each new WebSocket connection counts as 1. Outgoing messages and incoming protocol pings are free. |
| Durable Object duration | 13,000 GB-s / day, billed at a flat 128 MB per active object |
| SQLite rows read / written | 5 million / day and 100,000 / day |
| SQLite storage | 5 GB per account. The per-object figure conflicts on the limits page: its FAQ says 1 GB on Free, but its table gives 10 GB with no Free exception. |
| Worker requests (Workers and Pages Functions together) | 100,000 / day. Pages Functions count towards the Workers Free quota ([Pages Functions pricing](https://developers.cloudflare.com/pages/functions/pricing/)). |
| Worker CPU per request | 10 ms on Free. A Durable Object gets 30 s per incoming request or message, and each message resets that budget. |
| Durable Object classes | 100 per account |

The Workers pricing page lists the Durable Object request quota and the Worker request quota on separate lines. I did not find a sentence that says whether they share one counter.

**What happens at a free limit: errors, not a bill.**
- Durable Objects: "If you exceed any one of the free tier limits, further operations of that type will fail with an error." Also, "Daily free limits reset at 00:00 UTC." ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/))
- Workers: past 100,000 requests a day, "Cloudflare returns Error 1027". The count resets at midnight UTC. ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/))
- Storage: once a SQLite object is full, writes fail with `SQLITE_FULL` ([DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/)). A relay stores nothing, so this does not apply.
- The overage rates exist only on Workers Paid, which costs at least $5 a month ([Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/)). No page says in so many words that "Free accounts are never billed". The documented behaviour at a limit is failure, and the only priced tiers belong to the paid plan.
- After the reset at 00:00 UTC (06:00 in Bangladesh), Rooms work again.

**Room-hours per day inside the free limits** (one 6-player Room, hibernation API, nothing stored):

| | 10 updates/s | 5 updates/s |
|---|---|---|
| Incoming messages per hour | 6 × 10 × 3,600 = 216,000 | 6 × 5 × 3,600 = 108,000 |
| DO requests per hour (÷ 20, plus 6 connects) | 10,800 + 6 = **10,806** | 5,400 + 6 = **5,406** |
| Room-hours per day by requests (100,000 ÷ that) | **9.25** | **18.5** |
| Duration per hour at 1 ms of work per message (216,000 or 108,000 × 0.001 s × 0.125 GB) | 27 GB-s | 13.5 GB-s |
| Duration per hour at 10 ms per message (Cloudflare's own example figure) | 270 GB-s | 135 GB-s |
| Room-hours per day by duration (13,000 ÷ that) | 481 (1 ms) / 48 (10 ms) | 963 / 96 |
| Rows and storage | 0 | 0 |

**Requests are the binding limit:** about **9 Room-hours a day at 10 updates/s** and about **18 at 5 updates/s**, summed across all Rooms in one UTC day. Any of these fit the same budget: 9 one-hour Rooms, 18 half-hour Rooms, or 3 Rooms of 3 hours. Every 20 incoming messages cost one request, whatever their size. So sending fewer, fuller messages stretches the cap in direct proportion. For example, 5 messages a second that each carry 2 samples gives the 18-hour figure.

If players join through a Pages Function (§3 option B), each join also costs one Worker request. That is 6 per Room, which is negligible against 100,000.

## 2. How a relay Room is built

- **One object per Room code.** `env.ROOMS.getByName(code)`, or `get(idFromName(code))`, returns a stub for the object with that name. The same name always reaches the same single instance worldwide. On first use, the system checks that the object "has not been created anywhere else", which can take a few hundred milliseconds. Creating an ID does not create the object; the object starts lazily on first use. `newUniqueId()` is the alternative, but its random ID must be stored, so it does not suit short codes. ([namespace API](https://developers.cloudflare.com/durable-objects/api/namespace/))
- **Accepting players.** The object's `fetch` creates a `WebSocketPair` and calls `this.ctx.acceptWebSocket(server)` instead of `server.accept()`. It then returns the client end with status 101. The runtime calls `webSocketMessage(ws, msg)` and `webSocketClose(...)`, and `this.ctx.getWebSockets()` lists the sockets that are still connected. A relay's whole job is to send each incoming message to every other socket. ([WebSockets best practices](https://developers.cloudflare.com/durable-objects/best-practices/websockets/))
- **Per-player state across hibernation.** `ws.serializeAttachment(value)` keeps up to 16,384 bytes per socket, such as a display name or vehicle type, while the connection lives. In-memory fields are lost when the object hibernates, and the constructor runs again on the next event. (same page)
- **Pings.** The runtime answers incoming ping frames itself, without waking the object. Messages answered by `setWebSocketAutoResponse()` "add no wall-clock time and are not charged" ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)). An application keep-alive should use one of those two mechanisms.
- **Hibernation rules.** Billed duration stops whenever the object is idle and could hibernate. It is evicted after 10 s of inactivity. Four things block it: a pending `setTimeout` or `setInterval`, unfinished I/O or `waitUntil`, use of the standard `accept()` API, or an open outbound connection ([lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)). So a relay must not run a server tick timer. It should forward on each message. With `accept()`, duration is billed for the whole connection ([pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)).
- **Connection and rate limits.** No per-object WebSocket connection cap is published. The best-practices page says one object can serve "thousands of clients". An object has a soft limit of 1,000 requests a second; a 6-player Room at 10 updates/s makes 60 incoming messages a second. Received messages can be up to 32 MiB. Memory is 128 MB per isolate. ([DO limits](https://developers.cloudflare.com/durable-objects/platform/limits/), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/))

## 3. Deploying beside the Pages site

A Pages project cannot define a Durable Object class: "You cannot create and deploy a Durable Object within a Pages project" ([Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)). The class has to live in a Worker. The game is served from `travel-sim.pages.dev` with no custom domain. Worker routes and custom domains need a zone on Cloudflare ([custom domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), [migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)). So no Worker can sit on a path of `travel-sim.pages.dev` itself. There are three shapes.

**A. A separate Worker on `workers.dev`, reached cross-origin.** For example, a `travel-sim-rooms` Worker at `wss://travel-sim-rooms.<account>.workers.dev/room/<code>`.
- The Pages project does not change at all.
- Browsers do not apply CORS to WebSocket handshakes. Instead the browser sends an `Origin` header, and RFC 6455 says a server meant only for certain sites "SHOULD verify the |Origin|" and reply 403 otherwise ([§10.2](https://www.rfc-editor.org/rfc/rfc6455#section-10.2)). The Worker should accept only `https://travel-sim.pages.dev`, plus localhost for development.
- The Worker's wrangler config needs `name`, `main`, `compatibility_date`, `workers_dev = true`, a `[[durable_objects.bindings]]` entry (`name = "ROOMS"`, `class_name = "Room"`), and a `[[migrations]]` entry with `tag = "v1"` and `new_sqlite_classes = ["Room"]`. The migrations page notes that newer `exports` entries are an alternative to `migrations`, and that the two are mutually exclusive.

**B. Same origin through a Pages Function bound to the Worker's object.**
- Add `functions/api/room/[code].ts`. It forwards the upgrade request to `env.ROOMS.getByName(code).fetch(request)` and returns the 101 response.
- The binding points at the other Worker's class: `class_name` plus `script_name` ([migrations](https://developers.cloudflare.com/durable-objects/reference/durable-objects-migrations/) shows the `script_name` form). It is set in the dashboard under Settings → Bindings → Durable Object, or in a Pages wrangler file ([Pages bindings](https://developers.cloudflare.com/pages/functions/bindings/)). The bindings page shows no Pages wrangler example for this.
- Local development runs `wrangler dev` for the Room Worker and `wrangler pages dev --do ROOMS=Room@travel-sim-rooms` for the site.
- Adding a `functions/` directory makes Pages generate `_routes.json`. The docs warn that once Functions exist, "all requests by default will invoke your Function" unless they are excluded ([routing](https://developers.cloudflare.com/pages/functions/routing/)). The generated file, or one written by hand with `include: ["/api/*"]`, decides whether static asset requests stay free and out of the 100,000/day count. Get this wrong and every page and tile request eats the free quota.
- This shape has two deployables. The docs do not say whether the Function stays billed or involved after it returns the 101.

**C. Move the site from Pages to a Worker with static assets, holding the object in the same Worker.**
- The site and Rooms share one origin and one deploy. The config uses `assets.directory = "./dist"` and `not_found_handling`, plus the Durable Object binding and migration. Static asset requests are free on Workers too ([migration guide](https://developers.cloudflare.com/workers/static-assets/migration-guides/migrate-from-pages/)).
- The guide says "Using Durable Objects with Workers is simpler and recommended."
- Without a custom domain the public URL becomes `*.workers.dev` instead of `travel-sim.pages.dev`. That breaks the README link and existing PWA installs, unless Pages is kept as a redirect.

## 4. Cost if the paid plan were used (for reference only, ruled out by the $0 constraint)

Workers Paid rates: $5 a month minimum. Included each month: 1 million requests (then $0.15 per million) and 400,000 GB-s (then $12.50 per million GB-s). Usage above the included amounts rounds up to the next billable unit. Egress is not charged. ([DO pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/), [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/))

**One Room-hour (6 players, 10 updates/s), at marginal rates:**
- Requests: 10,806 × $0.15 / 1,000,000 = **$0.0016**.
- Duration with hibernation: 27–270 GB-s × $12.50 / 1,000,000 = **$0.0003–$0.0034**.
- Duration without hibernation (object held for the full 3,600 s): 3,600 × 0.125 = 450 GB-s, which is **$0.0056**.

**100 Room-hours a month:**
- Requests: 1,080,600. That is 80,600 over the 1 million included, which rounds up to 1 million billable, so **$0.15**.
- Duration with hibernation: 2,700–27,000 GB-s. Without hibernation: 45,000 GB-s. Either way it is inside the 400,000 included, so **$0**.
- Total: **$5.15 a month**. Nearly all of it is the plan minimum.

On Free, the same 100 Room-hours a month (about 3.3 a day on average) fit, *as long as no UTC day goes past about 9 Room-hours* at 10 updates/s.

## 5. Free fallbacks (only relevant if ~9–18 Room-hours a day is too small)

Cloudflare Free does meet $0, within the daily cap, so these are listed only for completeness:

- **WebRTC peer-to-peer data channels, with the Room object used only for signalling.** Signalling is a handful of messages per join, so the Durable Object request count drops to almost nothing, and position traffic flows player to player. 6 players make 15 peer links. Cloudflare's STUN server, `stun.cloudflare.com:3478`, is free ([TURN docs](https://developers.cloudflare.com/realtime/turn/)). Players behind strict NATs need TURN relay, though. Cloudflare TURN costs $0.05 per GB after a 1,000 GB a month free allowance that it shares with the SFU ([SFU pricing](https://developers.cloudflare.com/realtime/sfu/pricing/)). That is a billed product, so it carries the surprise-bill risk the constraint rules out. I did not check whether it needs a payment method. Without TURN, some players could not connect. Carrier-grade NAT on mobile networks makes that likely, but this is not measured.
- **Firebase Realtime Database, Spark plan.** It needs "No payment method". Limits: 100 simultaneous connections, 1 GB stored, 10 GB downloaded a month ([Firebase pricing](https://firebase.google.com/pricing)). A rough estimate from me, not a sourced figure: each player receives 5 × 10 × ~50 bytes a second, so a Room downloads about 54 MB an hour before protocol overhead. That gives roughly 180 Room-hours a month. The pricing page does not say what happens at the Spark limits.

## Implications (facts for the decision, not the decision)

- A $0 Room server on Cloudflare is possible on the Workers Free plan. It uses SQLite-backed Durable Objects with the WebSocket Hibernation API, one object per Room code via `getByName(code)`, and stores nothing.
- At a free limit, operations fail with an error, and Workers return error 1027. Limits reset at 00:00 UTC, which is 06:00 in Bangladesh. The documented behaviour is failure, not billing. Overage prices exist only on Workers Paid, which needs an explicit upgrade.
- The cap that binds is Durable Object requests: about **9.25 Room-hours a day at 10 updates/s** and **18.5 at 5 updates/s**, for all Rooms together. Duration (13,000 GB-s) and storage do not bind if the relay uses hibernation, runs no timers and stores nothing.
- Fewer incoming messages per second raise the cap in direct proportion, because messages are counted per message, not per byte. Batching samples or lowering the send rate changes the free capacity directly. Outgoing fan-out is free.
- When the cap is hit, Rooms stop working until 06:00 Bangladesh time. The game needs a clear "Rooms are unavailable" path, and single-player is unaffected.
- The Pages project cannot hold the object, so a separate Worker deployable is needed in every shape. There are three choices:
  - (A) cross-origin `workers.dev` WebSocket with an `Origin` check, and no Pages change;
  - (B) a same-origin Pages Function, which adds `functions/` and `_routes.json` and costs a Worker request per join;
  - (C) moving the site into one Worker with static assets, which changes the public URL away from `travel-sim.pages.dev` unless a custom domain is added.
- Even on the paid plan, 100 Room-hours a month would cost $5.15, almost all of it the plan minimum.
