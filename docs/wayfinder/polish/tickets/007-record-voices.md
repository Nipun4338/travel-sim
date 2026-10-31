---
id: 007
title: Record the Helper call-outs and Line 6 announcements
labels: [wayfinder:task]
status: open
assignee: nipun4338
blocked_by: []
---

## Question

HITL. The Helper call-outs ([script](../../../audio/helper-callouts.md)) and the Line 6 announcements (SPEC §20: next station, doors closing, arrival, in Bangla and English) have no recordings yet. Hand the user a precise checklist (lines, one phone, one quiet room, file naming, how `npm run audio` picks them up), then record what was delivered and anything still missing. Carried into this map by the user's choice (see Notes).

## Progress

2026-10-31: checklist handed to the user.

- [ ] **Helper call-outs:** 26 lines from [helper-callouts.md](../../../audio/helper-callouts.md), 2–3 voices, saved in `data/audio-src/voice/helper/`.
- [ ] **Line 6, Bangla:** 32 lines from [line6-announcements.md](../../../audio/line6-announcements.md), one announcer voice, saved in `data/audio-src/voice/metro/`. First check the draft wording against what the real train says.
- [ ] **Line 6, English:** the same 32 lines (second pass, optional for now).
- [ ] Note who recorded which file (for the credits screen).
- Setup for all of them: one phone, one quiet room, about 30 cm away, a second of silence around each take, 2–3 takes. Phone `.m4a` files are fine.

How they get into the game: `npm run audio` only reads the Freesound `.mp3` recipes in `scripts/audio/build.ts` today. Wiring the voices in means adding a voice recipe (trim the silence, normalise loudness, mono AAC into `public/audio/voice/`) and having the bus and metro play the clips. That's a build step for after the files arrive, not a decision on this map. The ticket closes when the files are delivered, recording what's still missing.
