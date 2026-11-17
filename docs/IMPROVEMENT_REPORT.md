# Cut the Grid candidate

Preserved submitted baseline: 98f4972b483a35562af0b81f0e652b9b2d30ab18. Work is on improvement/readable-pursuit; competition-rescue and rollback/c6bc057 remain intact.

## Comparison and design

On 17 November, the public leaderboard's leading entry was KINGFISHER at 94.56%. Its public cover showed a named seventh-stage fire, several abilities, upgrades, visible win/loss rules and detailed terrain. Its private code and full play experience were not inspected. These are visual observations, not an explanation from the judge of REDLINE's score.

REDLINE's response is its own street-control identity: close roads, deploy limited smoke, evade the projected interception, then decide whether to risk another job. No competitor assets or code were copied.

## Implemented

- Two tactical smoke charges with a seven-second cooldown. Clouds persist at their deployment location for 4.5 seconds, obstruct distant police sight and preserve close-range capture. Police continue using last-known-position search.
- Visible interceptor road-path and junction commitment cues; police and current objective on the minimap.
- Original procedural roof machinery, pavement gardens and road lettering, plus illuminated hotel facade and impact sparks.
- Engine audio responds to speed and impact, alongside existing spatial sirens.
- Three mission cards and contract mastery on the title screen; clearer escape/failure identity and large banked score on results.
- Ability availability, objective, heat, condition, capture risk and win/loss consequences in the HUD.
- Preserved bank drill, moving pickup and courier, optional alarm, upgrades, route relays, extraction and records.

## Validation

23 existing simulation tests passed. Two new smoke tests passed for sight obstruction, close contact, position, lifetime, cooldown and finite inventory. Offline Chrome at 1280x720 and 1920x1080 passed the mission, vault, upgrades, route diversion, escape, retry, pause, contract selection, records, smoke input and cooldown. Optional alarm and capture passed at 1280x720. Normal-speed visible Chrome runs passed; final screenshots are real Chrome captures, not composites or fabricated scenes.

During development, a duplicate declaration and mixed text encodings caused a failed startup; these were fixed and browser checks repeated. Result-panel sizing was corrected after visual review.

## Limits

The local official check is not a game-quality grade. No new entry was submitted, and no new win rate exists. A competition win is unproven. The original grid-based city layout and driving simulation remain; this candidate expands tactical play, presentation and feedback rather than replacing the entire game. The top game's apparent breadth still exceeds this three-job mission. Private competitor gameplay and judge reasons remain unavailable.

Final kit report and native transcript bundle are kept in the setup directory, outside the public repository. Server-only checks remain pending until a separately authorized submission.
