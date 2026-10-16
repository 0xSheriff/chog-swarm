# Project Memory: Chog Swarm

## 1. Project Overview
Chog Swarm is a premium-tier autonomous web game built for Chogathon 2026 (chogathon.chog.xyz). In Chog Swarm, each Chog NFT owned by a player determines how an autonomous agent plays in a short, strategic grid arena. The hackathon's core requirement is strict NFT essentiality: an agent cannot spawn with that identity and compiled policy without verified NFT ownership. Judging criteria: Novelty (30%), Fun (20%), Retention (20%), Clarity (15%), Execution (15%), with bonus for meaningful $CHOG utility.

## 2. Architecture
- **Engine Package (`packages/engine`)**: Framework-free, purely deterministic state transition machine (seed + policy + rules version -> identical state sequence).
- **Web App (`apps/web` or root Next.js app)**: Next.js + TypeScript, wagmi/viem for on-chain reads/verification on Monad, HTML5 Canvas arena renderer with high-fidelity HUD styling.
- **Backend / Re-simulation**: Server-side engine execution for Daily Gauntlet leaderboard validation (anti-cheat verification) and ghost replay fetching.
- **Persistence**: Firestore (or equivalent) for ghost policies, daily seeds, and verified leaderboard scores.

## 3. Tech Stack
- **Framework**: Next.js (App Router), TypeScript (pinned versions)
- **Web3**: viem, wagmi (Monad chain integration)
- **Rendering**: HTML5 Canvas with custom sprite/vector rendering, smooth interpolation, responsive design
- **State & Verification**: Deterministic TS engine, server-side re-simulation
- **Styling**: Tailwind CSS / CSS Modules with custom Chog design tokens (dark graphite base, authentic Chog brand accents, warm neutrals, bespoke typography)

## 4. Current State
- **ALL 6 FIX PASS PHASES COMPLETE & FULLY VERIFIED**:
  - **Phase 1 (Images)**: 1,969 local 512px WebP images in `/public/chogs/{id}.webp`, SVG fallback, build verification script in `package.json`.
  - **Phase 2 (Favicon & Brand)**: `/app/icon.png`, `/app/apple-icon.png`, `/app/favicon.ico`, Open Graph tags & image, metadata configured.
  - **Phase 3 (Honest Data)**: Zero seeded rows, contract addresses forbidden, designed empty state, real on-chain owner checks, Firestore + persistent disk fallback.
  - **Phase 4 (Wallet)**: RainbowKit modal, Monad Mainnet (Chain ID 143), network switch prompt, NFT selector, server-side re-simulation on spawn & score submit, viem signed proofs.
  - **Phase 5 (Clarity)**: 3-step "How it works" on landing, first-visit overlay in arena, full interactive tile legend, 1-sentence goals on all modes, pre-match turn 0 cars on grid, auto-run on first load, typography (body >= 14px, labels >= 12px, mono for numbers/hashes/logs), full screen width (1680px max-width), large Chog art in inspector.
  - **Phase 6 (Race Mode - Primary Mode)**:
    - Pure deterministic ruleset `race-v1` with closed-circuit 14x14 track, start grid, 3 sequential checkpoints (CP1, CP2, CP3), checkered finish line, boost pads (`+BOOST`), oil slicks, risky shortcut corridor, turbo fuel management, and slipstream drafting.
    - Traits mapped: Speed -> top speed & sprints; Risk -> shortcut tendency; Cooperation -> slipstream drafting & slingshot pass; Special Action -> turbo burst ignition.
    - 4-car championship races with live circuit rank badges (`1st`, `2nd`, `3rd`, `4th`), live fuel gauges, and flame trails.
    - Balance benchmark across 1,000 championship races: Sprinter 25.0%, Safe Cruiser 19.2%, Shortcut Daredevil 34.6%, Drafting Tactician 21.2% (spread 19%–35%, no trait dominates).
    - Daily Gauntlet updated to daily track seed scored by fastest finish time, server re-simulated with anti-cheat verification and cryptographic signatures.
    - Trait Lab updated to race-v1 track with counterfactual mutation and prominent first-divergence detection & jump-to-turn controls.
    - Classic grid ruleset `v1.0` untouched and versioned for full backward compatibility.
    - 8/8 unit tests pass in Vitest; production build passes with 0 errors.

## 5. Recent Changes
- Completed Phase 6 (Race Mode):
  - Authored `packages/engine/src/race-engine.ts` with complete track generation, checkpoint progression, physics, drafting, and checksum calculations.
  - Extended `packages/engine/src/types.ts` and `packages/engine/src/engine.ts` to dispatch `race-v1`.
  - Implemented high-fidelity `renderRaceMode` in `components/arena-canvas.tsx` with asphalt texturing, energy gates, boost chevrons, and aerodynamic racer sprites.
  - Updated `app/arena/page.tsx`, `app/gauntlet/page.tsx`, and `app/lab/page.tsx` to `race-v1`.
  - Updated `app/api/gauntlet/submit/route.ts` and `lib/leaderboard-store.ts` for finish time scoring and 4-car server re-simulation.
  - Verified 1,000-race Monte Carlo simulation via `scripts/race-balance-test.ts`.
  - Verified 8/8 unit tests in `tests/race.test.ts` and `tests/engine.test.ts`.
  - Built and verified production Next.js bundle with all 16 routes.
  - Captured full-resolution screenshots of every page in `/public/screenshots/`.

## 6. Important Decisions
- **Race Mode as Primary Game Loop**: `race-v1` ruleset is default in Arena, Gauntlet, and Trait Lab, while `v1.0` is preserved for historical and offline replay safety.
- **Sequential Checkpoint Enforcement**: Racers must clear CP1 -> CP2 -> CP3 in exact order before the finish line registers.
- **Finish Time Metric**: Leaderboard prioritizes lowest finish turn (earliest cross of the line) with total match score as the tiebreaker.
- **Dynamic Shortcut Navigation**: When an agent commits to the high-risk shortcut, targeting switches dynamically from shortcut entrance to apex to exit, avoiding backward ping-pong.
- **Cryptographic Score Attestation**: Every submitted leaderboard entry requires a wallet signature binding address + seed + score + checksum, validated on the server via viem `verifyMessage`.

## 7. Known Issues
- None.

## 8. Current Task
- Deliver comprehensive Final Report for FIX PASS FOR CHOG SWARM covering fixes per phase, test limitations without real wallet, and page screenshots.

## 9. Next Steps
- Present the final report to the user.

## 10. Important Files
- `memory.md`: Core living project context.
- `/data/chogs.json`: Complete 1,969 Chogs metadata fixture (to be populated).
- `/fixtures/`: Sample metadata JSONs & cached art assets.
- `/docs/trait-distribution.md`: Trait frequency analysis.
- `/docs/trait-map.md`: Trait-to-engine gameplay parameter mapping.
- `/docs/design-tokens.md`: Brand palette, typography, visual tokens.

## 11. Environment & Configuration
- Monad Testnet / Mainnet RPC endpoints.
- Node.js / TypeScript environment.
- Safe credentials protocol for private keys/RPC keys if applicable (via `~/.env`).

## 12. Development Rules
- Maintain documentation integrity.
- Never write app code before Step 0 completion and user sign-off on `/docs/trait-map.md`.
- No emoji as UI icons; use SVGs or custom pixel sprites.
- Update `memory.md` after every meaningful milestone.
- All derived traits must be visibly flagged as "derived" in the UI.
