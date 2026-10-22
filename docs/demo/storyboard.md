# Chog Swarm (Halloween Edition): Video Storyboard (Stage 1 Specification)

- **Target Runtime**: 2:50 (170 seconds) / Max Allowed: 3:00 (180 seconds)
- **Target Resolution**: 1920x1080 @ 60 FPS
- **Style Archetype**: Apple / Linear high-polish product film inspired by `assests/funded.mp4` and `assests/vano.mp4`.
- **Key Design Principles**: Pitch-black canvas (`#030206`), glossy 3D tilted browser viewports, smooth Bezier-eased cursor with glowing click ripples, living Halloween background, and kinetic Pirata One + Geist Mono typography.
- **Judging Criteria Mapping**: Novelty 30%, Fun 20%, Retention 20%, Clarity 15%, Execution 15%.
- **Core Test**: "Take the NFT out, does it still work? No."

---

## Storyboard Timeline Breakdown

| Timecode | Duration | Beat / Scene | Assets / Clip | Visual & Motion Treatment | Audio Cue & Sound Design |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **0:00 – 0:08** | 8s | **Scene 0: Cold Open Title Card** | `assets/capture/chog-logo.jpg`, bespoke CSS/Canvas | Monolithic black screen. Subtle breathing amber glow. Flame Chog logo zooms in with elastic ease. Title reveals letter-by-letter: `CHOG SWARM: HALLOWEEN EDITION`. Subtitle: `Autonomous Pinball on Monad`. | `music-bed.wav` starts with low-pass filter opening. Resonant `rollover.wav` swell on logo settle. |
| **0:08 – 0:32** | 24s | **Scene 1: The Essential NFT (The Blocked Gate)** | `assets/capture/scene1-nft-essential-blocked.mp4` | 3D browser tilts in (`rotateX(6deg)`, `rotateY(-8deg)`). Smooth cursor glides to wallet dropdown. Shows zero Chogs held. Immediate transition to dark-glass blocked screen. Big headline: `TAKE THE NFT OUT. DOES IT WORK? NO.` Spotlight illuminates shortened wallet address and MonadScan explorer link. | Low eerie bass pulse. Crisp `ui-tick.wav` as cursor traces address. Gate lock impact sound. |
| **0:32 – 0:58** | 26s | **Scene 2: Holder & Creator Pass Authentication** | `assets/capture/scene2-creator-pass-arena.mp4` | Smooth glide into Judge Pass unlock input. Instant unlock with persistent banner: `Creator pass: playing Chog #143`. Chog selection modal pops with authentic WebP avatars (Rule A intact). Cursor selects Flame Chog and sweeps down to **START RACE**. Glowing amber click ripple. | Sharp `flipper.wav` mechanical click on button press. Upbeat synth arpeggio from `music-bed.wav`. |
| **0:58 – 1:30** | 32s | **Scene 3: The Arena Simulation (Autonomous Chaos)** | `assets/capture/scene3-arena-race-finish.mp4`, `halloween-background-loop.mp4` | Camera dynamic push-in on the active table. Multi-tiered bumpers light up in sync with ball impacts. Kinetic HUD counters count up score and multipliers. Interactive turn scrubber scrubs back and forth to show deterministic tick rewind. Celebration banner triggers at finish. | High-frequency `bumper.wav` triggers on each hit. Cascading `jackpot.wav` chime sequence on multi-bumper ricochet. |
| **1:30 – 1:55** | 25s | **Scene 4: Trait Lab (Counterfactual Proof)** | `assets/capture/scene4-trait-lab-counterfactual.mp4` | Split-screen comparison or spotlight zoom. Cursor mutates `Eyes` to Cyber and toggles `Aura`. Real-time stat bars slide dynamically (`Aggression +34%`, `Risk Buffer -15%`). Simulation re-runs instantly showing altered ball trajectory. Headline: `TRAITS DICTATE PHYSICS`. | Soft `ui-tick.wav` on slider drag. Warm whoosh as simulation path shifts dynamically. |
| **1:55 – 2:25** | 30s | **Scene 5: Daily Gauntlet & Global Anti-Cheat** | `assets/capture/scene5-daily-gauntlet.mp4` | Camera dollies across the Gauntlet view with active seed `#133742`. Headline: `24-HOUR GLOBAL SEED • SERVER RE-SIMULATION`. Shows run submission with deterministic state hash validation. Callout box highlights: `Creator passes excluded from public rank` (honesty and integrity). | Driving bass drum rhythm. Crisp confirmation chime on server verification. |
| **2:25 – 2:40** | 15s | **Scene 6: Permissionless Leaderboard & Replay** | `assets/capture/scene5-daily-gauntlet.mp4`, `docs/demo/screenshots/08-leaderboard.png` | Smooth pan over the live leaderboard. Cursor clicks an archived match. Instant transition into `/demo` exhibition replay. Headline: `AUDIT ANY RUN IN REAL TIME`. Proves anyone can verify scores without trusting client calculations. | Sweeping atmospheric crescendo. |
| **2:40 – 2:50** | 10s | **Scene 7: Outro & Call to Action** | `assets/capture/chog-logo.jpg`, Typography | Browser smoothly recedes into deep 3D perspective. Blackout transition. Flame Chog emblem glows with warm Halloween embers. Final typography: `CHOG SWARM • BUILT FOR CHOGATHON 2026 • LIVE ON MONAD`. URL pill: `chog-swarm.vercel.app`. | Final descending harmonic chord from `music-bed.wav`. Deep cinematic boom to silence. |

---

## Sound Design Stems Mapping

All audio stems used in this production are 100% procedurally synthesized from `lib/halloween-audio.ts` (zero external sample licensing issues):
- `assets/audio-stems/music-bed.wav`: 92 BPM D harmonic minor groove supporting the entire runtime.
- `assets/audio-stems/bumper.wav`: High-resonance physical collision impact.
- `assets/audio-stems/rollover.wav`: Multi-tone frequency glide for UI highlights.
- `assets/audio-stems/flipper.wav`: Mechanical solenoid pulse for button interactions.
- `assets/audio-stems/drain.wav`: Low-frequency thud for gate rejection / hazard hits.
- `assets/audio-stems/jackpot.wav`: Harmonized dual-frequency celebration chime.
- `assets/audio-stems/ui-tick.wav`: Clean micro-click for cursor motion and scrubbing.
