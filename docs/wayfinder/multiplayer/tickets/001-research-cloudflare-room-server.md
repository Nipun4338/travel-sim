---
id: 001
title: Research hosting Rooms on Cloudflare
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

Can a Room live on Cloudflare next to the existing Pages site, and what does it cost? Check Durable Objects with WebSockets (the hibernation API), how a Worker with a Durable Object is deployed beside a Pages project and reached from it (same origin or a separate subdomain, CORS), the free and paid plan limits that matter (requests, duration, WebSocket messages, storage), and how messages count towards billing. Estimate the cost of a 6-player Room sending 10 updates a second each for an hour. List the alternatives only if Cloudflare rules itself out. Findings go in `docs/research/`.

## Research

[docs/research/cloudflare-rooms.md](../../../research/cloudflare-rooms.md), checked 2026-11-02 against Cloudflare's own docs, led by the user's $0 rule.

- **Workers Free alone can host Rooms.** It has included SQLite-backed Durable Objects since April 2025, and the WebSocket Hibernation API isn't limited by plan. One object per Room code (`getByName(code)`) relays each message to the other sockets.
- **Free daily limits:** 100,000 Durable Object requests (every 20 incoming WebSocket messages count as 1, each connection as 1, outgoing messages are free), 13,000 GB-s of duration, and 100,000 Worker requests.
- **At a limit, operations fail with an error; nothing bills.** The quota resets at 00:00 UTC (06:00 in Bangladesh). Overage prices exist only on the paid plan.
- **Requests are the limit that binds:** a 6-player Room at 10 updates a second costs 10,806 requests an hour, so about **9 Room-hours a day** fit for free, shared across all Rooms. At 5 updates a second it's about **18 Room-hours**. Fewer, fuller messages stretch this in direct proportion. Duration doesn't bind.
- **Deployment:** a Pages project can't hold a Durable Object, so a separate Worker is needed. Three shapes:
  - **A**, a Worker on workers.dev the game connects to directly (checking the `Origin` header), with no change to Pages;
  - **B**, a Pages Function that forwards to the Worker's object, keeping one origin;
  - **C**, the whole site moved into one Worker, which changes the URL without a custom domain.
- **Gaps in the docs:** whether Durable Object and Worker request quotas share a counter, and the per-object storage figure on Free.

## Resolution

Cloudflare's free plan meets the $0 rule: Rooms can run on Workers Free with Durable Objects and hibernating WebSockets, and they stop with an error, never a bill, when the day's quota is used. The capacity is small: about 9 Room-hours a day at 10 updates a second, or 18 at 5. So the update rate, batching and a daily cap become decisions. A separate Worker is needed in every deployment shape.
