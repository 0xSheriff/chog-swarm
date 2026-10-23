# Project Memory: Chog Swarm

## 1. Project Overview
Chog Swarm is a premium-tier autonomous web game built for Chogathon 2026 (chogathon.chog.xyz). In Chog Swarm, each Chog NFT owned by a player determines how an autonomous agent plays in a short, strategic grid arena. The hackathon's core requirement is strict NFT essentiality: an agent cannot spawn with that identity and compiled policy without verified NFT ownership. Judging criteria: Novelty (30%), Fun (20%), Retention (20%), Clarity (15%), Execution (15%), with bonus for meaningful $CHOG utility.

## 2. Architecture
- **Engine Package (`packages/engine`)**: Framework-free, purely deterministic state transition machine (seed + policy + rules version -> identical state sequence).
- **Web App (`apps/web` or root Next.js app)**: Next.js + TypeScript, wagmi/viem for on-chain reads/verification on Monad, HTML5 Canvas arena renderer with high-fidelity HUD styling.
- **Audio Engine (`lib/halloween-audio.ts`)**: 100% Procedural Web Audio API synthesis engine (zero audio samples or files). D harmonic minor @ 92 BPM, lookahead scheduler, dynamic game reactions, 24-voice polyphony management, visibility automation.
- **Backend / Re-simulation**: Server-side engine execution for Daily Gauntlet leaderboard validation (anti-cheat verification) and ghost replay fetching.
- **Persistence**: Firestore (or equivalent) for ghost policies, daily seeds, and verified leaderboard scores.
- **Motion & Video Engine (`demo-video/`)**: Modular Hyperframes composition with decoupled vector cursor SVG keyframing, 60fps CBR capture pipeline, and deterministic GPU rendering.

## 3. Tech Stack
- **Framework**: Next.js (App Router), TypeScript (pinned versions)
- **Web3**: viem, wagmi (Monad chain integration)
- **Rendering**: HTML5 Canvas with custom sprite/vector rendering, smooth interpolation, responsive design
- **Audio**: Web Audio API (procedural synthesis, ConvolverNode reverb, DynamicsCompressor, WaveShaper tanh limiter)
- **State & Verification**: Deterministic TS engine, server-side re-simulation
- **Styling**: Tailwind CSS / CSS Modules with custom Chog design tokens (dark graphite base, authentic Chog brand accents, warm neutrals, bespoke typography)
- **Video Production**: HyperFrames 0.8.186, GSAP 3.14.2, FFmpeg 7.1

## 4. Current State
- **NETLIFY PRODUCTION DEPLOYMENT ACTIVE & VERIFIED**:
  - Production URL: `https://chog-swarm.netlify.app`
  - Site ID: `90ecd53e-762b-4004-b2d2-2e9d75c49e30` (Site: `chog-swarm`)
  - Deployed via `@netlify/plugin-nextjs` (Next.js Runtime v5.16.3). Packaged 2,115 static assets, 1 SSR server handler function (`___netlify-server-handler`), and 3 Edge middleware handlers.
  - Live route HTTP 200 verification:
    - `/` -> HTTP 200
    - `/arena` -> HTTP 200
    - `/demo` -> HTTP 200
    - `/lab` -> HTTP 200
    - `/gauntlet` -> HTTP 200
    - `/leaderboard` -> HTTP 200
  - Live security verification:
    - Non-holder wallet blocked with Halloween dark-glass Access Gate on `/arena`.
    - Judge Pass unlock flow tested end-to-end: POST `/api/auth/judge` issues signed HTTP-only cookie, successfully unlocking Chog #143 simulation, with persistent Judge banner and excluded leaderboard scores.
- **DEMO FILM STUTTER & DEAD STRETCHES ELIMINATED (100% STUTTER GATE PASS ON ALL 8 SCENES)**:
  - **Final Film Output**: `assets/capture/chog-swarm-demo-film.mp4` (120.3 MB, 170.000s / 2m 50s, 10,200 frames @ 60 FPS, 1920x1080, H.264 High Profile, CRF 16, stereo AAC audio).
  - **Part 1 GPU & Diagnostics**:
    - Chromium GPU acceleration confirmed active via Apple Metal (`ANGLE (Intel, ANGLE Metal Renderer: Intel(R) Iris(TM) Plus Graphics 645)`).
    - Initial baseline pointer move trace revealed severe stutter: Arena 71.0% frames > 20ms (avg 30.89ms, p50 33.3ms, max 1166ms); Trait Lab 64.3% frames > 20ms; Gauntlet 60.7% frames > 20ms.
    - Root causes:
      1. Global CSS variable thrashing in `components/halloween-bg.tsx` mutating `--mx`/`--my` on root document every pointer event, causing broad style invalidation.
      2. Broad `backdrop-filter: blur(10px)` applied indiscriminately across `.glass-panel, .bg-chog-card, .bg-chog-surface1, .bg-chog-surface2` nodes.
      3. In-page cursor DOM manipulation colliding with video recording frame drops.
  - **Part 2 Application Pointer Cost Optimization**:
    - Removed root style property thrashing from `components/halloween-bg.tsx` and eliminated redundant duplicate pointer event listeners.
    - Scoped `backdrop-filter: blur(6px)` strictly to `.glass-panel` in `app/globals.css`.
    - Added `contain: 'paint'` and `will-change: 'transform'` to moving background layers.
    - Post-optimization verification trace:
      - Arena: frames > 20ms dropped from 71.0% to **5.4%** (avg 17.90ms / 55.9 FPS, p50 16.70ms).
      - Trait Lab: frames > 20ms dropped from 64.3% to **3.1%** (avg 17.11ms / 58.5 FPS, p50 16.70ms).
      - Gauntlet: frames > 20ms dropped from 60.7% to **2.4%** (avg 17.07ms / 58.6 FPS, p50 16.70ms, 0 frames > 50ms).
  - **Part 3 Clean Re-Capture**:
    - All gameplay footage captured with cursor hidden (`* { cursor: none !important; }`) via `scripts/record-clean-clips.ts`.
    - Re-captured real recorded footage for Scene 6 (`scene6-leaderboard.mp4`), replacing static image slides with continuous scrolling and `/demo` exhibition match inspection.
  - **Part 4 Decoupled Vector Cursor**:
    - Built vector cursor SVG overlay (`.vector-cursor`) and click ripple rings (`.cursor-ripple`) in Hyperframes compositions, scaled 1.4x for mobile legibility.
    - Cursor trajectories driven independently via eased GSAP keyframes (`power2.inOut`), completely decoupled from underlying video playback.
  - **Part 5 Dead Stretches Eliminated**:
    - Scene 0: Added continuous slow camera push-in (`scale: 0.94 -> 1.05`), living background loop, and specular light sweeps across Flame Chog logo.
    - Scene 3: Extended continuous camera drift (`scale: 1.05 -> 1.32`, `y: 0 -> -60`) through turn 24 and the finish celebration, with pulsing score multiplier.
    - Scene 6: Integrated real footage video with continuous drift and interactive scrubber verification.
    - Scene 7: Added continuous slow camera pull-back (`scale: 1.06 -> 0.96`), living background loop, and repeating light sweeps.
  - **Part 6 Stutter Gate Results (`scripts/check-video-smoothness.py`)**:
    - Scene 0 (Cold Open, 0-8s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS** (was 30.8% / 3100ms stall)
    - Scene 1 (Blocked Gate, 8-32s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS**
    - Scene 2 (Auth & Pick, 32-58s): **99.6% distinct**, 33 ms still, 0 gaps > 3f -> **PASS**
    - Scene 3 (Arena Simulation, 58-86s): **99.9% distinct**, 17 ms still, 0 gaps > 3f -> **PASS** (was 62.7% / 4133ms stall)
    - Scene 4 (Trait Lab, 86-114s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS**
    - Scene 5 (Daily Gauntlet, 114-140s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS**
    - Scene 6 (Leaderboard, 140-160s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS** (was 60.2% / 4133ms stall)
    - Scene 7 (Outro CTA, 160-170s): **100.0% distinct**, 0 ms still, 0 gaps > 3f -> **PASS** (was 17.5% / 4133ms stall)
    - **Overall Result**: **PASSED** (0 frozen spans > 0.5s, 0 gaps > 3f, >99.6% distinct frames).
  - **Part 7 Deliverables**:
    - Eight 8-frame contact sheets at 10 fps in `docs/demo/contact-sheet-scene[0-7].png` (1920x540, 4x2 tiles).
    - `npx hyperframes check`: 0 errors, 0 warnings across all lint, runtime, layout, motion, contrast, and craft checks.

## 5. Recent Changes
- Removed `--mx` and `--my` style mutations from `components/halloween-bg.tsx` to stop DOM style recalculation thrashing during pointer movement.
- Scoped CSS `backdrop-filter: blur(6px)` exclusively to `.glass-panel` in `app/globals.css`.
- Authored `scripts/trace-pointer-performance.ts` using Chrome DevTools Protocol to profile pointer performance before and after optimization.
- Authored `scripts/record-clean-clips.ts` to re-capture all gameplay footage at 1080p 60fps with page cursor hidden.
- Created `assets/capture/scene[1-6]-cursor-path.json` trajectory coordinate data.
- Updated `demo-video/compositions/c0-cold-open.html` through `c7-outro.html` with decoupled vector cursor overlays and continuous motion.
- Authored and verified `scripts/check-video-smoothness.py` measuring per-scene frame differences.
- Rendered final production film `assets/capture/chog-swarm-demo-film.mp4` (170.0s @ 60fps).
- Exported contact sheets `docs/demo/contact-sheet-scene[0-7].png`.
- Added `.npmrc` with `legacy-peer-deps=true` to resolve npm ERESOLVE peer dependency conflict (`wagmi` 3.7.7 vs `@rainbow-me/rainbowkit` 2.2.11 peer requirement of `wagmi ^2.9.0`) across Netlify, Railway, and Vercel.
- Added `netlify.toml` configuring build command (`npm run build`), publish directory (`.next`), and `NODE_VERSION = "22"`.
- Verified end-to-end installation from clean clone (`npm ci`, `npm run build`, `npm test` 21/21 passed) and verified RainbowKit wallet connect modal renders and functions properly.
- Pushed all commits through `44e39e3` to GitHub `origin master`. Confirmed `.npmrc` is tracked and live on GitHub (`legacy-peer-deps=true`), and verified a fresh clone from GitHub builds and tests cleanly.
- Handled literal `\n` conversion for Firestore private keys in `lib/leaderboard-store.ts` via branch `netlify-fix` (merged in `9782085`).
- Configured Netlify build environment (`NPM_CONFIG_LEGACY_PEER_DEPS=true`, site ID: `90ecd53e-762b-4004-b2d2-2e9d75c49e30`).
- Deployed production release to Netlify (`https://chog-swarm.netlify.app`) with Next.js Runtime v5, bundling SSR functions and Edge middleware.
- Verified live HTTP 200 responses across all core routes (`/`, `/arena`, `/demo`, `/lab`, `/gauntlet`, `/leaderboard`) and verified Judge Pass authentication unlock flow live in headless browser.

## 6. Important Decisions
- **Legacy Peer Deps via `.npmrc`**: Configured `legacy-peer-deps=true` at repo root so Netlify, Railway, and Vercel automated CI/CD pipelines bypass the peer dependency mismatch between wagmi v3 and RainbowKit without mutating application code.
- **RainbowKit Version Policy**: RainbowKit's latest published release on npm is `2.2.11` (which specifies peer `wagmi: ^2.9.0`); no published version on npm supports wagmi v3 yet. We preserve existing working versions and avoid unverified upgrades.
- **Decoupled Cursor Architecture**: Page cursors are never baked into captured footage; vector cursors are rendered directly in Hyperframes via GSAP, ensuring silky 60fps cursor movement regardless of underlying canvas paint timing.
- **Fail-Closed Security**: Monad RPC errors fail CLOSED, preventing unauthorized access during network partitions.
- **Rule A Preservation**: All Chog NFT art displayed byte-exact without tint, blur, crop, or filters.

## 7. Known Issues
- None. All 8 scenes pass the Stutter Gate with 0 stalls > 3 frames.

## 8. Current Task
- Production deployment to Netlify complete and verified; live URL `https://chog-swarm.netlify.app` operational.

## 9. Next Steps
- Deliver submission banner and finalize hackathon submission questions.

## 10. Important Files
- `assets/capture/chog-swarm-demo-film.mp4`: Final production demo video (2:50 @ 60fps).
- `scripts/check-video-smoothness.py`: Stutter gate verification tool.
- `scripts/trace-pointer-performance.ts`: Pointer-move frame profiling tool.
- `scripts/record-clean-clips.ts`: Clean 1080p 60fps footage capture pipeline.
- `docs/demo/contact-sheet-scene[0-7].png`: 8 contact sheets inspecting motion across all scenes.
- `demo-video/compositions/`: Hyperframes modular compositions.
- `netlify.toml`: Netlify build and runtime configuration.
- `.npmrc`: `legacy-peer-deps=true` configuration for cloud builders.

## 11. Environment & Configuration
- Production Hosting: Netlify (`https://chog-swarm.netlify.app`)
- Monad RPC: `https://rpc.monad.xyz` (Chain ID 143)
- Required Environment Variables:
  - `NPM_CONFIG_LEGACY_PEER_DEPS`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
  - `MONAD_RPC_URL`
  - `OWNER_ALLOWLIST`
  - `JUDGE_CODE`
  - `SESSION_SECRET`
  - `PUBLIC_REPLAY`
  - `PUBLIC_LEADERBOARD_READ`
  - `FIREBASE_PROJECT_ID`
  - `FIREBASE_CLIENT_EMAIL`
  - `FIREBASE_PRIVATE_KEY`

## 12. Development Rules
- Maintain documentation integrity.
- Never write app code before Step 0 completion.
- No emoji as gameplay icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
