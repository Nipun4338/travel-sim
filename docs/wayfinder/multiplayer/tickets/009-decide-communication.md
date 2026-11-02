---
id: 009
title: Decide whether players can communicate in a Room
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Free-text chat is ruled out for a family game with no accounts ([Define what a Room is and who can join](003-define-the-room.md)). Should there be anything at all: none, a handful of preset bilingual quick messages ("Wait for me", "See you at Mohakhali"), horn and headlight flashes that others can see and hear, or emotes over the name tag? And what can a player removed by the Host do next: rejoin straight away, or be blocked from that Room code for its lifetime?

## Resolution

2026-11-02, grilled with the user (all recommendations accepted). Free-text chat stays ruled out.

1. **Horn, headlight flash and indicators are shared:** they play on your vehicle for anyone nearby. The horn adds one flag bit to the update (the indicators and headlights are already in it); there's nothing to moderate.
2. **Six preset quick messages** from a small wheel, in Bangla and English:
   - "আমার জন্য অপেক্ষা করুন / Wait for me"
   - "চলুন যাই / Let's go"
   - "পরের স্টপে দেখা হবে / See you at the next Stop"
   - "ধন্যবাদ / Thanks"
   - "দারুণ! / Nice!"
   - "বিরতি নিচ্ছি / Taking a break"

   Each shows for 4 seconds beside the sender's name tag and in a small Room feed. At most one every 5 seconds per player. A message is a separate tiny event (a message number), not part of the position updates.
3. **No emotes.**
4. **Removed players stay out of that Room** while it's open. They see "হোস্ট আপনাকে এই রুম থেকে সরিয়ে দিয়েছেন / The Host removed you from this Room" and carry on solo. With no accounts, the Room server remembers the block by the player's connection identity for the Room's lifetime.
