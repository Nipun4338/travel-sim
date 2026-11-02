---
id: 007
title: Prototype creating and joining a Room from the map menu
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

With the Room rules settled ([Define what a Room is and who can join](003-define-the-room.md)), how does it look in the map menu (SPEC §13)? Prototype, in the menu's own style and at phone width:
- where Create Room sits on the destination card (it fixes that place and the chosen mode);
- the Host's choices (time, weather) and the generated name with its reroll button;
- the Room panel with the code, a copy button and the phone's share sheet, and the player list (Host marked, remove button for the Host);
- joining by typing a code or opening a `?room=` link, including a full Room, a closed code and being offline.

Judge it with the user; the answer fixes the screens and wording in Bangla and English.

## Prototype

Built inside the real map menu, dev server only: `src/ui/roomPrototype.ts` mounted from `src/ui/menu.ts` when the URL has `?roomproto=A|B|C`, with fake players and no server. Captured on the throwaway branch `prototype/room-menu` (not merged); the docs branch keeps only this decision. Three placements on the destination card:
- **A**, a "With friends" strip under the picture that grows into the Room in place;
- **B**, a "Play with friends" button opening a sheet over the map;
- **C**, a fourth 👥 Room tab beside Bus, Plane and Metro.

All three share the same flow: create (generated name with reroll, Host time and weather) → Room panel (code, Copy, Share, player list with 👑 Host, Remove, free seats) → join by code, plus Room full, code closed and offline states.

## Resolution

2026-11-02, judged with the user (recommendations accepted):

1. **Variant A:** the Room lives in a "With friends / বন্ধুদের সাথে" strip on the destination card, under the picture and above the Leg list, so choosing your own Leg stays part of the same screen. It grows in place:
   - **Entry:** "Create a Room / রুম খুলুন" and "Join with a code / কোড দিয়ে যোগ দিন".
   - **Create:** the generated name with "🎲 Another", then time and weather chips (Random first), with the note that everyone sees the same sky.
   - **Room panel:** the code in large letters with Copy and Share (the phone's share sheet; the link `travel-sim.pages.dev/?room=CODE`), the player list (👑 Host, "(you)", "Remove / বের করুন" for the Host, "Free seat / খালি জায়গা"), a reminder to pick a Leg below, and "Leave the Room".
   - **Join:** a 4-letter code box; "That Room has 6 players already" or "No open Room has that code" stay on the join screen.
   - **Offline:** "Rooms need the internet. Playing solo works as always."
   - B (a sheet) is the fallback if A proves cramped on small phones.
2. **Wording** as prototyped, in Bangla and English.
3. **Names:** six local vehicles plus a number, for example "সবুজ বাস ৭ / Green Bus 7" (Green Bus, Red Rickshaw, Blue CNG, Yellow Truck, Purple Bus, Orange Launch); the list can grow later.
