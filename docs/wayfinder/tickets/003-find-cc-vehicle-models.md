---
id: 003
title: Find CC-licensed models for buses, rickshaws, CNGs, jeeps and planes
labels: [wayfinder:research]
status: closed
assignee: claude-research
blocked_by: []
---

## Question

Which free, CC-licensed (or similarly permissive) 3D models exist for a Dhaka-style city bus, a cycle rickshaw, a CNG auto-rickshaw, a Bandarban "chander gari" jeep, and a small passenger or light aircraft suited to arcade flight? For each candidate: source URL, licence and attribution terms, polygon count, format (glTF preferred), and whether parts are separable (wheels, doors, control surfaces).

## Resolution

- Free CC BY or CC0 models exist for every type except two. No Dhaka-specific city bus and no chander gari exists; reskin an Ashok Leyland/Tata bus and kitbash a Willys jeep.
- Authentic Bangladeshi rickshaw and CNG models exist (Sketchfab, asrafullislamsiam, CC BY), but at 905k/271k faces they need decimation. Low-poly Indian tuk-tuks (4–8k) are the fallback.
- Picks: 3D Bus (OGA, CC0, separate wheels) for the player bus; Jeep Willys (skudgee, CC BY) for jeeps; Cessna 172Kr (TonyWony, CC BY, control surfaces in mind) for the aircraft.
- All Sketchfab picks come in glTF. Separable parts are unverified for most; check the model inspector before committing.
- Details: [docs/research/vehicle-models.md](../../research/vehicle-models.md)
