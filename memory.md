# Project Memory: Chog Swarm

## 1. Project Overview
Chog Swarm is a premium-tier autonomous web game built for Chogathon 2026 (chogathon.chog.xyz). In Chog Swarm, each Chog NFT owned by a player determines how an autonomous agent plays in a short, strategic grid arena. The hackathon's core requirement is strict NFT essentiality: an agent cannot spawn with that identity and compiled policy without verified NFT ownership. Judging criteria: Novelty (30%), Fun (20%), Retention (20%), Clarity (15%), Execution (15%), with bonus for meaningful $CHOG utility.

## 2. Architecture
- **Engine Package (`packages/engine`)**: Framework-free, purely deterministic state transition machine (seed + policy + rules version -> identical state sequence).
- **Web App (`apps/web` or root Next.js app)**: Next.js + TypeScript, wagmi/viem for on-chain reads/verification on Monad, HTML5 Canvas arena renderer with high-fidelity HUD styling.
- **Audio Engine (`lib/halloween-audio.ts`)**: 100% Procedural Web Audio API synthesis engine (zero audio samples or files). D harmonic minor @ 92 BPM, lookahead scheduler, dynamic game reactions, 24-voice polyphony management, visibility automation.
- **Backend / Re-simulation**: Server-side engine execution for Daily Gauntlet leaderboard validation (anti-cheat verification) and ghost replay fetching.
- **Persistence**: Firestore (or equivalent) for ghost policies, daily seeds, and verified leaderboard scores.

## 3. Tech Stack
- **Framework**: Next.js (App Router), TypeScript (pinned versions)
- **Web3**: viem, wagmi (Monad chain integration)
- **Rendering**: HTML5 Canvas with custom sprite/vector rendering, smooth interpolation, responsive design
- **Audio**: Web Audio API (procedural synthesis, ConvolverNode reverb, DynamicsCompressor, WaveShaper tanh limiter)
- **State & Verification**: Deterministic TS engine, server-side re-simulation
- **Styling**: Tailwind CSS / CSS Modules with custom Chog design tokens (dark graphite base, authentic Chog brand accents, warm neutrals, bespoke typography)

## 4. Current State
- **LIVING HALLOWEEN BACKGROUND & PROCEDURAL WEB AUDIO ENGINE FULLY VERIFIED (ALL CHECKS 24–33 PASS)**:
  - **4-Quadrant Continuous Drift**: Replaced static collage with 4 independent image layers (`bg-frame1.webp` through `bg-frame4.webp`) positioned with soft radial gradient mask seams. Each quadrant drifts on its own prime keyframe path (31s, 37s, 43s, 47s; scale 1.06 to 1.14, translations up to 3% viewport). Runs continuously with zero pointer input!
  - **Elevated Parallax Motion**: Multi-depth translation layers with delta-time compensated 0.08 lerp: Layer 1 (18px, measured 23.6px), Layer 2 (30px, measured 39.3px), Layer 3 (42px, measured 55.0px), Layer 4 (56px, measured 73.3px).
  - **Breathing Light Pools**: Warm amber/pumpkin pulse (`glow-breathing-warm`, 8s) behind frames 1 & 4; cold ghost-blue/purple pulse (`glow-breathing-cold`, 9s) behind frames 2 & 3.
  - **Accessibility & Reduced Motion**: Full system `prefers-reduced-motion` compliance. Visible "Motion" toggle in footer; when system motion is reduced, displays banner with `"Turn on motion anyway"` override; state persists in `localStorage['chog_force_motion']`.
  - **Web Audio Generative Soundtrack**: D Harmonic Minor @ 92 BPM lookahead scheduler with Organ Drone/Pad, Celesta/Music Box random walk, Heartbeat Kick, Ghostly Theremin with portamento & vibrato, Distant Choir formant filters (800Hz, 1200Hz, 2400Hz), and Cathedral Bell toll.
  - **Game-Reactive Dynamic Audio**:
    - Combo $> 3$: BPM accelerates by $+4\%$ per level up to $+25\%$ (115 BPM) and celesta switches to 16th-note walk.
    - Multiball: Key modulates to G Harmonic Minor, continuous quarter-note kick.
    - Drain: Master dynamic lowpass filter plunges to 350Hz (recovers over 700ms) with descending celesta glissando and hollow groan.
    - Ghost Banish: 1.2s high choir chord swell.
    - Jackpot: D major fanfare resolution.
  - **Synthesized SFX Palette**: Flipper thud + high creak, Plunger AM charge + FM bone clack release, Pop Bumpers (3 distinct pitches + snap + chime), Slingshot triple-bandpass bone rattle, C-H-O-G ascending notes + FM ghost laugh, UI bone clicks, Graveyard ambient wind + random thunder.
  - **Audio UI & Navbar Controls**: Small speaker button with pumpkin badge in navbar, first-visit tooltip ("Tap for Halloween sound"), volume popover (Master, Music, SFX sliders), global 'M' key shortcut, safe `localStorage` persistence.
  - **Acceptance Deliverables**: `public/screenshots/halloween-sound-demo.webm` (3,971 KB) and `docs/halloween-audio-notes.md`.

## 5. Recent Changes
- Diagnosed root causes of static background (flat collage WebP, microscopic parallax, auto-drift idle delay, sticky adaptive quality tier).
- Implemented 4 drifting quadrant layers in `components/halloween-bg.tsx` with prime CSS keyframes in `app/globals.css`.
- Added breathing warm & cold light pool gradients behind quadrants.
- Implemented `<MotionToggle />` in `components/motion-toggle.tsx` and mounted in `app/layout.tsx`.
- Built procedural Web Audio engine in `lib/halloween-audio.ts` (D harmonic minor, lookahead scheduler, dynamic reactions, 24-voice polyphony cap, visibility automation).
- Built `<AudioControls />` in `components/audio-controls.tsx` and integrated into `components/navbar.tsx`.
- Created automated Playwright verification suite `scripts/verify-halloween-audio.ts` testing Checks 24 through 33.
- Documented synthesis formulas in `docs/halloween-audio-notes.md` and updated `docs/halloween-acceptance-report.md`.

## 6. Important Decisions
- **100% Synthesized Audio (No Audio Files)**: No .mp3, .wav, or .ogg files; every tone, transient, noise buffer, and reverb impulse is synthesized at runtime via Web Audio API.
- **Lazy Singleton Context**: Zero audio context instantiation or resume prior to explicit user gesture, strictly complying with browser autoplay policies.
- **Rule A Art Preservation**: Gameplay Chog Genesis NFT art (`/public/chogs/*.webp`) remains byte-identical.
- **Delta-Time Compensated Lerp**: Parallax lerp factor `1 - Math.pow(1 - 0.08, dt / 16.667)` maintains consistent physical motion across variable screen refresh rates and headless execution.

## 7. Known Issues
- None. All Checks 24–33 passed.

## 8. Current Task
- Complete git commit and push to `origin/master`.

## 9. Next Steps
- Await user feedback or new gameplay requirements.

## 10. Important Files
- `lib/halloween-audio.ts`: Web Audio procedural generative music & SFX engine.
- `components/audio-controls.tsx`: Navbar speaker toggle and volume control popover.
- `components/motion-toggle.tsx`: Accessibility reduced motion override control.
- `components/halloween-bg.tsx`: 4-quadrant living background with breathing light pools and parallax.
- `docs/halloween-audio-notes.md`: Mathematical synthesis formulas for all sounds and generative layers.
- `docs/halloween-acceptance-report.md`: Complete acceptance test report (Checks 9–33).

## 11. Environment & Configuration
- Monad Testnet / Mainnet RPC endpoints.
- Next.js Turbopack development server on `http://localhost:3000`.

## 12. Development Rules
- Maintain documentation integrity.
- Never write app code before Step 0 completion.
- No emoji as gameplay icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
