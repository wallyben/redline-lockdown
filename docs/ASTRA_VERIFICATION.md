# Astra build verification

Verified on 16 November 2026.

- Native Codex session discovered by the official kit, including the continuing Astra work.
- Nine deterministic tests passed, covering collision, pickup, interception, hidden observations, search and reacquisition, bank idempotence, failure retention, ordering and malformed/unavailable storage.
- Offline Chrome keyboard runs passed at 1280×720 and 1920×1080. Boulevard capture, alley bank, pause, retry and reload persistence were exercised. Both sessions reported zero external requests and uncaught errors.
- Cargo double bonus route completed through actual keyboard controls in approximately 15.6 seconds, with 99% integrity and 6,772 points. Gold target is 6,500. A deliberate failure carrying bonus cargo banked zero. The first two contracts have 5,100 and 5,200 Gold targets, within their verified clean-feint scoring ceiling.
- Comparable 2.8-second active boulevard chase samples in real-time headless Chrome at 1280×720 measured median 16.7 ms and p95 16.8 ms for both c6bc057 and this build. These are short samples on this machine.
- Live audio graph RMS measured 0.0061 at long range and 0.0970 at close range, decaying to 0.0074 after muting. Subjective listening comfort remains unverified.
- Official current kit worktree check passed 13, failed 0, skipped 6, and deferred 5 to submission.
- Four browser JPEGs are the original capture outputs. No saved records are packaged in the source. Testing uses separate browser contexts.
- Current work prioritised the tested bank/bonus loop. Daily contracts and ghosts were omitted.

Outstanding verification
- Persistent records survived reloading in the same browser context. Full browser restart with a persistent profile remains unverified.
- The latest pairwise judge score and eligibility decision require server submission.
- Human control feel and completion time remain unmeasured.
- A new contact-sheet comparison against two current leaders remains outstanding.
