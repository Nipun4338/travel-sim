---
id: 010
title: Decide how Rooms behave offline and when a player reconnects
labels: [wayfinder:grilling]
status: open
assignee:
blocked_by: []
---

## Question

A Room dropping mid-trip carries on solo ([Choose how Rooms stay inside the free daily quota](006-stay-inside-the-free-quota.md)). Decide the rest:
- how the game started offline (PWA) shows "Play with friends": hidden, or shown with the offline message ([Prototype creating and joining a Room from the map menu](007-prototype-the-room-menu.md));
- whether a dropped player reconnects to the same Room automatically, for how long it keeps trying, and what the others see meanwhile (vehicle parked, then gone);
- what happens to the Host role while the Host is reconnecting;
- how a `?room=CODE` link behaves when opened offline or after the Room has closed.
