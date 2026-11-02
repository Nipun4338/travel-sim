---
id: 010
title: Decide how Rooms behave offline and when a player reconnects
labels: [wayfinder:grilling]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

A Room dropping mid-trip carries on solo ([Choose how Rooms stay inside the free daily quota](006-stay-inside-the-free-quota.md)). Decide the rest:
- how the game started offline (PWA) shows "Play with friends": hidden, or shown with the offline message ([Prototype creating and joining a Room from the map menu](007-prototype-the-room-menu.md));
- whether a dropped player reconnects to the same Room automatically, for how long it keeps trying, and what the others see meanwhile (vehicle parked, then gone);
- what happens to the Host role while the Host is reconnecting;
- how a `?room=CODE` link behaves when opened offline or after the Room has closed.

## Resolution

2026-11-02, grilled with the user (all recommendations accepted):

1. **Started offline:** "Play with friends" shows greyed out with 📵. Tapping it opens the sheet with "রুমের জন্য ইন্টারনেট লাগবে। একা খেলা চলবে যেমন চলছে। / Rooms need the internet. Playing solo works as always." It lights up again on its own when the connection returns (the browser's `online` event), with no reload.
2. **Automatic reconnect:** on a drop, the game quietly retries the same Room for **2 minutes** with backoff (1, 2, 4, 8… seconds), showing "আবার যুক্ত হচ্ছে… / Reconnecting…" by the minimap. Success restores the same seat, name and colour; giving up shows "Connection lost, you're driving solo".
3. **What the others see:** the dropped player's vehicle stops where it was, slightly dimmed, with "⟳" on the name tag, and disappears after 2 minutes if they don't return (the same look as a paused player).
4. **Host dropping:** the Host keeps the role during those 2 minutes; if they don't return, the player who joined next becomes Host.
5. **Room links at a bad moment:** a `?room=CODE` link opened offline or after the Room closed opens the map menu as normal with the sheet showing the reason ("Rooms need the internet" or "No open Room has that code") and a "Create a Room" button, so the link is never a dead end.
