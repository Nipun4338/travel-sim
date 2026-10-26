---
id: 017
title: Judge touch controls on a phone
labels: [wayfinder:prototype]
status: closed
assignee: nipun4338
blocked_by: []
---

## Question

Do the touch controls in both prototypes ([bus](007-prototype-bus-handling.md), [flight](008-prototype-flight-model.md)) work on the minimum phone from [Decide target devices and performance budget](011-decide-target-devices-and-budget.md)? Settle the bus scheme (steer area, pedals, door button) and the flight scheme (virtual stick vs tilt, throttle) by playing them on a real phone.

## Assets

- Bus: [PROTOTYPE-bus-handling.html](../../../prototypes/bus-handling/PROTOTYPE-bus-handling.html). Touch layout: a drag-to-steer area at the bottom left; GAS, BRAKE and a DOOR button (added for this ticket) at the bottom right. With the doors open the bus can't drive, and a Stop is served only with the doors open.
- Flight: [PROTOTYPE-flight-model.html](../../../prototypes/flight-model/PROTOTYPE-flight-model.html). Touch layout: a virtual stick (drag from anywhere in the bottom-left area), a vertical throttle slider at the bottom right, and a BRAKE button. Tilt steering is not in the prototype: browsers only allow motion sensors on HTTPS, and the LAN test server is plain HTTP.

## Resolution

The user played both prototypes on their phone, and both touch schemes work as-is. They are the v1 touch controls.

- **Bus Mode:**
  - Drag-to-steer area in the bottom-left ~45% × 45% of the screen; a 70 px drag is full lock.
  - GAS and BRAKE buttons at the bottom right; holding BRAKE when stopped reverses.
  - A DOOR button above GAS. It toggles the doors only when stopped; with the doors open the bus holds still.
- **Flight Mode:**
  - A floating virtual stick in the bottom-left area, starting wherever the finger lands; 70 px is full deflection, and dragging down raises the nose.
  - A vertical throttle slider and a BRAKE button at the bottom right.
  - No rudder on touch: banking turns the plane.
- **Tilt steering:** not in v1. Motion sensors need HTTPS, so it can be tried after launch on Cloudflare Pages.
- **Device:** the user's phone model wasn't recorded. The minimum-tier phone check noted in [Prototype hill fog, rain and night lighting](024-prototype-fog-and-rain.md) applies here too.
