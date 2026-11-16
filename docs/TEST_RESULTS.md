# Test results · 16 November 2026

- Five Node tests passed. They cover pickup timing, reset, collision, interception arrival, hidden-player observations, capture, timeout and wreck.
- Offline desktop Chrome passed the complete scripted keyboard route at 1280×720 and 1920×1080. The player collected the recorder, paused and resumed, bypassed the active roadblock via the south route, extracted, restarted, hit a wall and was captured on a second run. Both viewport runs reported zero uncaught page errors and zero external requests. The final title and capture changes were rerun at 1280×720.
- Four 1280×720 JPEGs were captured from Chrome. The pursuit and lockdown frames came from the same keyboard-driven winning run.
- A three-second real-time headless Chrome sample during active play at the starting junction measured 55.9 FPS at 1280×720 (95th-percentile frame interval 16.8 ms) and 55.3 FPS at 1920×1080 (33.3 ms). This samples one scene on the development machine.
- Two clean exports on Node 24.22.0 matched path for path and byte for byte. The vendor file matched the kit by SHA-256.
