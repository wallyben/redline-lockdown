# Test results · 16 November 2026

- Five Node tests passed. They cover pickup timing, reset, collision, interception arrival, hidden-player observations, capture, timeout and wreck.
- Offline desktop Chrome passed the complete scripted keyboard route at 1280×720 and 1920×1080. The player collected the recorder, paused and resumed, bypassed the active roadblock via the south route, extracted, restarted, hit a wall and was captured on a second run. Both viewport runs reported zero uncaught page errors and zero external requests. The final title and capture changes were rerun at 1280×720.
- Four 1280×720 JPEGs were captured from Chrome. The pursuit and lockdown frames came from the same keyboard-driven winning run.
- A three-second real-time headless Chrome sample during active play at the starting junction measured 55.9 FPS at 1280×720 (95th-percentile frame interval 16.8 ms) and 55.3 FPS at 1920×1080 (33.3 ms). This samples one scene on the development machine.
- Two clean exports on Node 24.22.0 matched path for path and byte for byte. The vendor file matched the kit by SHA-256.

## Recorder mission rework

- Eight simulation tests passed. The reacquisition test left the player stationary under cover and verified that the pursuing patrol returned to the last sighting, searched nearby roads and eventually reacquired the player. Hidden movements did not alter the stored sighting.
- South patrol, 1280×720. The keyboard boulevard run ended in capture; the tail closed from 225 m to 74 m at the photographed point. The alley run passed the inbound roadblock warning, broke sight under cover and won after 4.9 seconds continuously out of sight.
- North patrol, 1920×1080. The boulevard run ended in capture; the tail closed from 198 m to 55 m at the corresponding point. The alley run won after 4.8 seconds continuously out of sight.
- The two offline Chrome sessions also checked pause, replay and wall impact, with no external requests or uncaught errors. Four refreshed 1280×720 JPEGs came from those browser runs.
- These scripted routes exercise the mission mechanics. Human completion time and subjective siren balance remain unmeasured.
