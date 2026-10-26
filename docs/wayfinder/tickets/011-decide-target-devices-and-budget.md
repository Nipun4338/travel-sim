---
id: 011
title: Decide target devices and performance budget
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Which devices must the game run well on, desktop and mobile (minimum phone tier, e.g. a mid-range Android common in Bangladesh; iOS Safari or not; tablets), and in what form (browser tab, installable PWA, landscape only)? What frame-rate, download-size and memory budgets follow from that?

## Resolution

- **Minimum phone:** a 2022-era mid-range Android with 4 GB RAM and a Helio G99 or Snapdragon 680 class chip (e.g. Redmi Note 12, Galaxy A14/A24). Android Chrome is the primary mobile target.
- **iOS:** iPhone 11 or newer on iOS 17+, tested second.
- **Minimum desktop:** integrated graphics (Intel Iris Xe or Ryzen Vega class) at 1080p.
- **Graphics API:** WebGL2 is the baseline; WebGPU is an optional upgrade only.
- **Form:** an installable PWA. Fullscreen, landscape-only on phones; downloaded Regions are cached for offline replay.
- **Frame rate:** 60 fps on desktop; a stable 30 fps on the minimum phone; 60 fps on better phones. Stability matters more than peak frame rate.
- **Download size:** ≤ 15 MB to reach mode select; ≤ 60 MB per Region-mode on mobile, streamed and then cached. Desktop gets the same files.
- **Memory:** ≤ 600 MB total (scripts plus graphics) on mobile.
- **Quality tiers:** chosen automatically from the device, with a Low/Medium/High override. Phones start on Low or Medium, desktop on High.
- **Tablets:** treated as phones with a bigger screen: the same budget and touch controls.
