---
id: 021
title: Compare hosting options for the PWA and Region files
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

Which static hosts (e.g. Cloudflare Pages/R2, GitHub Pages, Netlify, Vercel) suit an installable PWA that streams ~60 MB of chunked GLB per Region-mode: free-tier limits and bandwidth, file-size caps, HTTP range and caching headers, latency from Bangladesh, and how service-worker caching (e.g. Workbox) handles large offline Region caches within mobile storage quotas on Android Chrome and iOS Safari?

## Resolution

- **Hosts:** Cloudflare Pages/Workers (+ R2 via a custom domain) is the only free option with no transfer cap and PoPs inside Bangladesh (Dhaka, Chittagong). GitHub Pages (via Fastly's Kolkata PoP) and Vercel Hobby (Mumbai) each give ~100 GB/month. Netlify Free (~15 GB) and Firebase (10 GB) pause the site when the allowance runs out.
- **File limits and headers:** 25 MiB per file on Cloudflare; Netlify flags files over 10 MB; Vercel Hobby allows 100 MB per CLI deploy and non-commercial use only. GitHub Pages fixes `max-age=600` with no custom headers. Cloudflare answers Range requests with a full 200, not a 206.
- **Storage:** quota is 60% of disk on both Android Chrome and iOS 17+ Safari, including Home Screen apps. `persist()` is silent and heuristic on both; installation helps but isn't guaranteed. An iOS Home Screen app has its own storage, separate from Safari tabs, and is exempt from the 7-day ITP rule. Workbox skips precaching files over 2 MiB by default.
- Details: [docs/research/hosting-and-caching.md](../../research/hosting-and-caching.md)
