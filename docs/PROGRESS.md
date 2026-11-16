# Build progress

- Driving checkpoint: cc32464. Browser and fixed-input checks passed before pursuit work began.
- Mission checkpoint: one recorder objective, road-graph pursuit, physically dispatched roadblock, southbound alternate route, extraction, scoring, results and replay.
- Assessed with the original native Codex rollout. The official kit accepted explicit selection of its full session log and the run record identifies the original user prompt as a pasted-text attachment.
- Remaining release work: signed entry under the owner's Make.fun account, remote commit verification and server validation. No submission or judging result exists.

## Pursuit rework

- Fallback retained on branch fallback/6a2f840.
- The tail tracks visible road positions. The interceptor commits to a predicted junction and drives the road network to deploy. The tail searches from the last sighting and can reacquire the player; extraction requires 3.8 seconds without detection.
- North and South patrols are selectable at the start and on replay. The exposed boulevard and screened service alley lead toward the dock gate.
- Added the Hotel Iris marquee, alley lane lighting, dock containers and crane silhouettes, moving police reflections, tyre spray, distance-based siren and a chase camera that fits the player, nearby tail and junction.
