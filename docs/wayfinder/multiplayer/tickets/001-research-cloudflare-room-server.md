---
id: 001
title: Research hosting Rooms on Cloudflare
labels: [wayfinder:research]
status: open
assignee:
blocked_by: []
---

## Question

Can a Room live on Cloudflare next to the existing Pages site, and what does it cost? Check Durable Objects with WebSockets (the hibernation API), how a Worker with a Durable Object is deployed beside a Pages project and reached from it (same origin or a separate subdomain, CORS), the free and paid plan limits that matter (requests, duration, WebSocket messages, storage), and how messages count towards billing. Estimate the cost of a 6-player Room sending 10 updates a second each for an hour. List the alternatives only if Cloudflare rules itself out. Findings go in `docs/research/`.
