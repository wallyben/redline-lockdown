# Readable pursuit candidate

Baseline preserved: 98f4972b483a35562af0b81f0e652b9b2d30ab18 on competition-rescue. rollback/c6bc057 retained.

Hypothesis: the prior dense HUD and small cars weakened screenshot readability. No per-match judge explanation is available and no new score is claimed.

Changes: focused ChaseHUD module; larger camera framing; visible capture warning; clear gate-closed consequence; alley sight-break label; lit hotel facade. Reset the upgrade continue button on each offer. Removed the misleading description of unbanked haul as secured. The driving and police simulations retain the validated baseline behavior.

Evidence: 23 unit tests passed. Offline Chrome at 1280x720 and 1920x1080 passed the three-job chain, vault, gate diversion, upgrades, escape, retry, contract selection and records. Optional cash alarm and capture passed at 1280x720. Visible Chrome at normal speed completed the three jobs and escape; the final four JPGs are genuine captures. The existing browser assertion was corrected to accept both Escaped and Clean getaway. No artificial game-state setup was added.

Limitations: this is a presentation and interaction correction candidate, not an AI or handling rewrite. The bank can still sit behind the HUD, and lower contact-sheet cells retain dense copy. No new judged result exists. No submission or push was made. Kit report, transcript bundle and export evidence are kept outside the public repository in the setup folder.
