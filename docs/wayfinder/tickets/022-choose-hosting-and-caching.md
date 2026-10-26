---
id: 022
title: Choose hosting and offline caching
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: [021]
---

## Question

Given the hosting comparison, where are the game and its Region files hosted, how are Regions downloaded and cached for offline replay, and how are updates to baked Regions rolled out?

## Resolution

Based on [Compare hosting options for the PWA and Region files](021-compare-hosting-options.md).

1. **Host:** Cloudflare Pages for everything; the game and the Region files are served from the same domain (no CORS, no opaque-response quota blow-up). ~2,500 1 km chunks × 3 detail levels fits under Pages' 20,000-file cap, and chunks are far under its 25 MiB per-file cap. R2 stays the fallback if the world outgrows Pages.
2. **Domain:** the free `*.pages.dev` subdomain for v1; a custom domain can come later.
3. **Region download:**
   - By default, the world streams as you play, and every downloaded chunk is cached (runtime `CacheFirst` with `ExpirationPlugin`).
   - An optional **"Download for offline"** button per Region-mode fetches everything at once.
   - Settings show the storage each Region uses, with a Delete button.
   - The ≤ 15 MB game shell is precached by Workbox.
4. **Persistence:** the game calls `navigator.storage.persist()` after the first Region download. If it's denied, a one-line note says the phone may clear offline Regions when storage is low. Cleared data is re-downloaded silently. Saved progress needs a home that survives eviction; that question is handed to [Define progression and saves](020-define-progression-and-saves.md).
5. **iOS:** prompt **Add to Home Screen** before the first Region download, and don't offer "Download for offline" in a Safari tab (Safari and the Home Screen app have separate storage).
6. **Updates:**
   - Chunk files have content-hashed names and are served `immutable` with a one-year max-age.
   - Each Region has a small versioned manifest. When it changes, only the changed chunks download in the background, the swap happens once they're all in, and old chunks are deleted.
   - A game-code update shows "Update available, restart" on the next visit.
7. **Deploy:**
   - Code lives in a GitHub repo; baked Region files are build output and stay out of git.
   - The shell and Regions deploy together with `wrangler pages deploy`, first from the developer's machine, later from GitHub Actions.
   - Where CI gets the baked Region files from is left to the build.
