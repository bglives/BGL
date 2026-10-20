---
name: LiveArena milestone workflow
description: Scope boundaries for incremental feature work in LiveArena.
---

For this project, implement only the milestone currently requested; finish it, show the result, and wait for the user before starting the next milestone.

**Why:** The user specified a staged project plan with an explicit stop-and-review point at the end of each milestone.

**How to apply:** Leave later stages untouched until the user explicitly requests them. Keep persistence, scoring/realtime, and TikTok integration out of earlier stages unless that milestone explicitly includes them.

## Approved reducer defaults

- Likes events arrive with a side already assigned by the upstream event source.
- Each `!a` / `!b` chat vote adds 1 point, limited to one vote per person every 10 seconds.
- “Chuva de bônus” adds 1 point per gift unit for 15 seconds.
- Power-ups last 5 seconds; shield blocks freeze effects, and freeze pauses the rival’s score.
- “Quase virando” means a score difference below 3% of the combined points.

**Why:** The user approved these proposed defaults while specifying the Batalha de Votos reducer.

**How to apply:** Keep the shared reducer behavior and the future normalized-event mapping consistent with these choices.
