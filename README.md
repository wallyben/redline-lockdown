# REDLINE: LOCKDOWN

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wallyben/redline-lockdown/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wallyben/redline-lockdown/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Rob the Port Meridian bank, hijack the city's street controls, lure police into the wrong intersection, and get out before lockdown. A real-time tactical map reveals interceptor routes, closures and both final exits.

## Three contracts, three different challenges

**Ghost Run:** break police sight with smoke and traverse the covered alley before banking the haul.

**Break the Grid:** lure an interceptor into committing to a junction, seal a service-yard relay, then raid the distinct Grid Switch cache before an inner-city courier transfer.

**High-Risk Payday:** take the optional cash depot and attempt the dangerous West Quay extraction for a 1,750-point premium. Abandoning the job allows safer early cashout.

## Run it

```sh
node serve.ts
```

The game also works offline by opening `game/index.html` directly in desktop Chrome.

## Controls

- **W/Up:** accelerate; **S/Down:** brake or reverse; **A/D or arrows:** steer; **Space:** handbrake.
- **Tab (hold):** inspect the actual live police route network and interceptor orders.
- **Shift near a relay:** close a road, physically disrupting the police route; occupancy and escape connectivity are checked.
- **F:** send a limited-use radio decoy that redirects the pursuers to another reachable junction.
- **Q:** deploy a limited smoke cloud to break sight.
- **E:** interact with the bank, optional depot and courier. For the drill, press E once to start and again in the green timing window.
- **1 / 2 during lockdown:** choose East Dock (safer) or West Quay (farther and more dangerous, with a full-run bonus).
- **R:** retry; **C:** contract selection; **Escape:** pause.

Complete the rolling pickup, vault and moving courier chain, satisfying the selected contract's additional conditions, then break police contact long enough to bank the score at the chosen exit. Early cashout is possible, but capture, wreck or timeout loses the haul. Upgrades between jobs alter handling, damage resistance and relay tactics. Records remain local to the browser.

The entire playable game and its original art and sound are self-contained and require no network requests.

---

<sub>Built for the [make.fun “Make the best game” bounty](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
