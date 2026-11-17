# Competition rescue plan

Candidate branch: `competition-rescue`, based on the submitted SHA `aed1ed846522e022496f63c039cf9197b5dfa45f`. The submitted build stays on `main`; `checkpoint/pre-rescue-aed1ed8` points to the same known-good commit.

## Critical path

1. **Road gates:** three relay-controlled segments, warning animation, physical collision, shared graph state, safe-close validation, HUD/minimap, pursuit rerouting and one-time physical-feint scoring.
2. **Three-job run:** street pickup, stopped vault drill, moving-courier transfer; persistent hull/heat, seeded upgrades, partial cashout, full escape, capture and retry.
3. **Presentation:** job progress and risk/cash HUD, gate and courier readability, upgrade cards, run report, recognisable district silhouettes.
4. **Release candidate:** Node tests, visible offline Chrome at both sizes, normal-clock run, ten restarts, screenshots, two deterministic exports, vendor hash, native transcript bundle and official exact-commit check.

## Checkpoints and acceptance

- **G1 — Gates (checkpoint complete):** three relay segments warn for 0.8 seconds, block physical crossing and change graph routes. Base closure is five seconds; upgrades can extend it. Unsafe closures refund their charge. Patrol dispatch uses the shared road state. Twenty-three Node checks pass; offline Chrome confirmed visible gate closure, contact-safe occupancy and HUD/minimap state.
- **G2 — Jobs (playable checkpoint):** offline Chrome keyboard runs completed the rolling pickup, vault drill, moving courier transfer and full escape at 1280×720 and 1920×1080. Damage/heat carry over; three seeded choices alter handling, collision, relay behavior or scoring. Node checks cover partial cashout, failed capture, heat patrols, records, and retry. Latest full run scored 8,247 points in 25.3 simulated seconds. A separate 1280×720 normal-clock browser run escaped in 26.0 game seconds; this is below the brief's two-to-four-minute tuning target.
- **G3 — Polish (partial):** the title, pursuit HUD, upgrade intermission, city landmarks, loading-bay hiding pocket and results report are present and readable in current Chrome captures. The requested full 2.5D city, civilians/traffic pool, and broad audio/flash/performance audit are not complete.
- **G4 — Submission prep (in progress):** four new offline Chrome captures are refreshed. The 23-test Node suite passes; full Chrome playthroughs pass at 1280×720 and 1920×1080; the normal-clock 1280×720 playthrough passes; ten consecutive retries, pause/resume, contract selection, persistence, and no-network/no-page-error checks pass. Exact-commit official-kit validation, paired deterministic exports, final vendor/screenshot checks, and rescue-branch push remain. The submitted build on `main` is unchanged; no entry has been signed or submitted.

Time is short. If a phase threatens the playable core, cut traffic and decorative art first; retain working gates, three jobs, scoring outcomes and restart.
