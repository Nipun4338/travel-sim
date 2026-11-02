---
id: 005
title: Choose how the Room server is deployed beside the site
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

A Pages project can't hold a Durable Object, so Rooms need a separate Worker ([Research hosting Rooms on Cloudflare](001-research-cloudflare-room-server.md)). Pick the shape:
- **A**, the game connects straight to a Worker on workers.dev, which checks the `Origin` header;
- **B**, a Pages Function forwards to the Worker's object, keeping one origin (adds `functions/` and `_routes.json` so static files stay free);
- **C**, the whole site moves into one Worker.

Also decide how it deploys (a second `wrangler deploy` step in `npm run deploy` or a separate script) and how a local dev server runs it (`wrangler dev` next to Vite).

## Resolution

2026-11-02, grilled with the user (all recommendations accepted):

1. **Shape A:** the game connects straight to a separate Worker at `wss://travel-sim-rooms.<account>.workers.dev/room/<code>`, one Durable Object per Room code (`getByName(code)`, SQLite-backed class `Room` declared with `new_sqlite_classes`, hibernating WebSockets). The Pages site doesn't change. No Pages Functions, so static requests can never eat the free quota.
2. **Code location:** this repo, under `server/rooms/`, with its own `wrangler.toml` and `tsconfig.json`. The update format (the binary layouts from [Measure what each mode would need to send](002-measure-what-each-mode-sends.md)) lives in `src/shared/` so the game and the server share it.
3. **Deploying:** its own script, `npm run deploy:rooms`, run only when the server changes. The game reads the server address from a build setting (for example `VITE_ROOMS_URL`) with the production address as default, so `npm run deploy` never touches the Room server.
4. **Local testing:** `wrangler dev` runs the Worker on `localhost:8787` beside the Vite dev server, with a `rooms` entry in `.claude/launch.json`; two tabs can join one Room.
5. **Allowed origins:** the Worker accepts the WebSocket upgrade only from `https://travel-sim.pages.dev`, `https://*.travel-sim.pages.dev` (previews) and `http://localhost:*`, and answers anything else with 403, so other sites can't spend the free quota.
