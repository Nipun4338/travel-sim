---
id: 005
title: Choose how the Room server is deployed beside the site
labels: [wayfinder:grilling]
status: open
assignee:
blocked_by: []
---

## Question

A Pages project can't hold a Durable Object, so Rooms need a separate Worker ([Research hosting Rooms on Cloudflare](001-research-cloudflare-room-server.md)). Pick the shape:
- **A**, the game connects straight to a Worker on workers.dev, which checks the `Origin` header;
- **B**, a Pages Function forwards to the Worker's object, keeping one origin (adds `functions/` and `_routes.json` so static files stay free);
- **C**, the whole site moves into one Worker.

Also decide how it deploys (a second `wrangler deploy` step in `npm run deploy` or a separate script) and how a local dev server runs it (`wrangler dev` next to Vite).
