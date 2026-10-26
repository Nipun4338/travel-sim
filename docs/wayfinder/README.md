# Wayfinder tracker (local markdown)

- The map is `map.md` (label `wayfinder:map`). Tickets are its children in `tickets/NNN-slug.md`.
- Each ticket's frontmatter holds `labels` (`wayfinder:<type>`), `status` (`open` | `closed`), `assignee` (the claim) and `blocked_by` (ticket ids).
- **Frontier** = tickets with `status: open`, an empty `assignee`, and every `blocked_by` ticket closed.
- **Claim**: set `assignee` before starting any work.
- **Resolve**: add a `## Resolution` section, set `status: closed`, and append a line to the map's *Decisions so far*.
- Research findings go in `docs/research/<name>.md`, linked from the ticket.
