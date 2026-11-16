# REDLINE: LOCKDOWN

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/wallyben/redline-lockdown/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/wallyben/redline-lockdown/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

An offline arcade getaway in rain-soaked Port Meridian. Recover a recorder, watch the interceptor commit to an intersection, then break line of sight and reach the docks. The boulevard gives you a straight run at speed. The narrow service alley by Hotel Iris breaks sight under cover. Choose North or South patrol to change where the interceptor starts.

Use WASD or arrows to drive, Space for the handbrake, E to scan, Escape to pause and R to restart. Park near the recorder, press E to begin the sweep, then press E again in the green band. Extract after the contact indicator clears.

## Run it

```sh
node serve.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>


You can also open game/index.html directly in desktop Chrome. The game needs no network or runtime packages.

Run the simulation checks with node --test tests/*.test.cjs. Run the keyboard integration check from the repository root with node tests/browser.cjs and playwright-core installed or REDLINE_PLAYWRIGHT set to its installed path. Set REDLINE_CHROME to use another Chrome installation. Add --shots to capture the four 1280×720 frames.
