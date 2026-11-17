# Competition rescue plan

Candidate branch: `competition-rescue`, based on the submitted SHA `aed1ed846522e022496f63c039cf9197b5dfa45f`. The submitted build stays on `main`; `checkpoint/pre-rescue-aed1ed8` points to the same known-good commit.

## Critical path

1. **Road gates:** three relay-controlled segments, warning animation, physical collision, shared graph state, safe-close validation, HUD/minimap, pursuit rerouting and one-time physical-feint scoring.
2. **Three-job run:** street pickup, stopped vault drill, moving-courier transfer; persistent hull/heat, seeded upgrades, partial cashout, full escape, capture and retry.
3. **Presentation:** job progress and risk/cash HUD, gate and courier readability, upgrade cards, run report, recognisable district silhouettes.
4. **Release candidate:** Node tests, visible offline Chrome at both sizes, normal-clock run, ten restarts, screenshots, two deterministic exports, vendor hash, native transcript bundle and official exact-commit check.

## Checkpoints and acceptance

- **G1 — Gates (checkpoint complete):** a gate warns for 0.8 seconds, then blocks both the car and graph route for 5 seconds. Activation is rejected with the charge restored if an occupied barrier or disconnected escape would result. Pursuit orders re-route after a closure. Thirteen Node checks pass; offline Chrome confirmed a gate closes, appears in the HUD and blocks the road without page errors. Existing alley and boulevard playthroughs pass at 1280×720 and 1920×1080.
- **G2 — Jobs:** all three distinct objectives can complete; damage and heat carry over; the moving transfer and timed vault are readable; seeded upgrades have measured effects; partial escape, full escape, capture, retry and local records work.
- **G3 — Polish:** title, active chase, upgrade and results views make the current job, threat, cash at risk and next action obvious.
- **G4 — Submission prep:** exact commit and whole native session bundle pass the official kit check. No entry is signed or submitted by this task.

Time is short. If a phase threatens the playable core, cut traffic and decorative art first; retain working gates, three jobs, scoring outcomes and restart.
