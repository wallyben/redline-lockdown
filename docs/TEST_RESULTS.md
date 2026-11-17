# Final release verification · 17 November 2026

- Nine deterministic Node tests passed: driving and pickup, wall collisions, interceptor dispatch, hidden-player observations, capture, timeout, wreck, search and reacquisition, patrol layouts, alley cover, score banking and records.
- Offline desktop Chrome passed the full keyboard route at 1280×720 and 1920×1080. Each run drilled the vault, showed the boulevard interception, then used the alley to break sight and reach the docks. Tail distance fell from 184 m to 70 m at 1280×720 and from 161 m to 47 m at 1920×1080; both runs escaped after 4.7 seconds out of sight.
- Browser checks also covered pause/resume, retry, collision damage, capture, zero score on capture, record persistence after reload, and contract selection from the results screen. Both viewport runs reported no uncaught page errors and no external requests.
- The optional cash alarm run escaped through the alley with 6,694 points. A second run was intercepted after the optional pickup and correctly banked zero points.
- Four fresh screenshots were captured directly from visible Chrome running the local game. Each is 1280×720 and below 104 KiB; no image was edited.
- Two Node v24.22.0 exports each produced 15 files with identical paths and SHA-256 hashes. Node printed its module type-detection performance notice on each run; both exports completed successfully. The unchanged kit vendor file SHA-256 is `DC67187521B24025FF952F8C231485A6EB92D6D71D29EDD2A08154FFB4376129`.

The official Make.fun kit check for the final commit and native transcript bundle is recorded here after it completes. The entry is not submitted; signing and platform receipt remain the owner's final step.
